/* Password Generator Module */
import { randInt, pick, shuffle, sample } from "../utils/crypto.js";
import { getCache, setCache } from "../utils/storage.js";

// Optimization 1: Pre-compute static arrays to avoid .split() overhead on every generation
const LOWERCASE_ARR = "abcdefghijklmnopqrstuvwxyz".split("");
const UPPERCASE_ARR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS_ARR = "0123456789".split("");
const SYMBOLS_ARR = "!@#$%^&*+-_=?:|".split("");
const EXTENDED_SYMBOLS_ARR = "~`^[]{}()<>/\\;.,'\"".split("");

let loadedEmojis = null;

export async function loadEmojis() {
  // Optimization 2: Cache emojis in LocalStorage to avoid network requests on repeat visits
  const CACHE_KEY = "passg_emojis_v14"; // Bump version if emoji file changes

  try {
    const cached = getCache(CACHE_KEY);
    if (cached) {
      loadedEmojis = cached;
      return;
    }

    const response = await fetch("./assets/data/emojis.txt");
    if (!response.ok) throw new Error("Failed to load emojis");
    const text = await response.text();
    loadedEmojis = text
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    // Save to cache
    setCache(CACHE_KEY, loadedEmojis);
  } catch (e) {
    console.warn("Could not load emojis, using fallback:", e);
  }
}

export function generateBasic(len) {
  // Basic mode: include lowercase, uppercase, numbers, symbols (ambiguous included)
  // Exclude only lookalikes (o,0,i,l,1) and guarantee non-repeating characters
  const lowercase = "abcdefghjkmnpqrstuvwxyz"; // exclude i, l, o
  const uppercase = "ABCDEFGHJKMNPQRSTUVWXYZ"; // exclude I, L, O
  const numbers = "23456789"; // exclude 0,1
  const symbolsAll = "!@#$%^&*+-_=?:|~;:.{}<>[]()/\\'`";
  const uniquePool = Array.from(
    new Set((lowercase + uppercase + numbers + symbolsAll).split(""))
  );

  if (len > uniquePool.length) {
    len = uniquePool.length;
  }

  // Fisher-Yates shuffle and take the first len characters
  const shuffled = shuffle(uniquePool);
  return shuffled.slice(0, len).join("");
}

export function generateUniversal(len, options = {}) {
  const settings = {
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
    extendedSymbols: true,
    nonLatin: true,
    emoji: true,
    excludeSymbols: "",
    ...options,
  };

  // Restored extensive ranges from previous commit for "unstypable" feature
  const ranges = [
    { range: [0x00a1, 0x00ff], group: "latin1" },
    { range: [0x0100, 0x017f], group: "latinext" },
    { range: [0x0370, 0x03ff], group: "greek" },
    { range: [0x0400, 0x04ff], group: "cyrillic" },
    { range: [0x0590, 0x05ff], group: "hebrew" },
    { range: [0x0600, 0x06ff], group: "arabic" },
    { range: [0x0900, 0x097f], group: "devanagari" },
    { range: [0x0e00, 0x0e7f], group: "thai" },
    { range: [0x1100, 0x11ff], group: "hangul" },
    { range: [0x1d00, 0x1d2b], group: "small_caps" },
    { range: [0x2070, 0x209f], group: "super_sub" },
    { range: [0x2200, 0x22ff], group: "math" },
    { range: [0x3040, 0x309f], group: "hiragana" },
    { range: [0x30a0, 0x30ff], group: "katakana" },
    { range: [0x4e00, 0x9fbf], group: "cjk" },
  ];

  const defaultEmojiChars =
    "😀😁😂🤣😅😊😍🤩🥳😎🛡️✨🔥⭐⚡🌟🚀🎯🔒🔑🧠🛰️🧮🧭🧲📡🔭".split(""); // Split default too

  // Use loaded array directly
  const emojiChars =
    loadedEmojis && loadedEmojis.length > 0 ? loadedEmojis : defaultEmojiChars;

  const excludeSet = new Set((settings.excludeSymbols || "").split(""));

  // Optimization: Helper to filter arrays instead of splitting strings
  const filterArray = (arr) => {
    if (!arr) return [];
    if (excludeSet.size === 0) return arr;
    return arr.filter((ch) => !excludeSet.has(ch));
  };

  const filteredSymbols = filterArray(SYMBOLS_ARR);
  const filteredExtendedSymbols = filterArray(EXTENDED_SYMBOLS_ARR);

  // 1. Collect Pools
  const pools = [];

  // Use pre-computed arrays
  if (settings.lowercase) pools.push({ type: "chars", data: LOWERCASE_ARR });
  if (settings.uppercase) pools.push({ type: "chars", data: UPPERCASE_ARR });
  if (settings.numbers) pools.push({ type: "chars", data: NUMBERS_ARR });
  if (settings.symbols && filteredSymbols.length)
    pools.push({ type: "chars", data: filteredSymbols });
  if (settings.extendedSymbols && filteredExtendedSymbols.length)
    pools.push({ type: "chars", data: filteredExtendedSymbols });
  if (settings.emoji && emojiChars && emojiChars.length)
    pools.push({ type: "chars", data: emojiChars });
  if (settings.nonLatin) pools.push({ type: "ranges", data: ranges });

  if (pools.length === 0) {
    // Absolute fallback if nothing is enabled
    return generateBasic(len);
  }

  // 2. Calculate Distribution (Evenly distributed counts)
  const groupCount = pools.length;
  const baseCount = Math.floor(len / groupCount);
  const remainder = len % groupCount;

  const counts = new Array(groupCount).fill(baseCount);

  // Distribute remainder randomly using crypto shuffle
  const indices = Array.from({ length: groupCount }, (_, i) => i);
  const shuffledIndices = shuffle(indices);

  for (let i = 0; i < remainder; i++) {
    counts[shuffledIndices[i]]++;
  }

  // 3. Generate Characters
  const password = [];
  const usedChars = new Set();

  for (let i = 0; i < groupCount; i++) {
    const pool = pools[i];
    const count = counts[i];
    if (count === 0) continue;

    if (pool.type === "chars") {
      // For finite sets, we can use sample() to guarantee uniqueness
      // without a "guess-and-check" loop. This uses browser crypto efficiently.
      const poolArr = Array.isArray(pool.data)
        ? pool.data
        : pool.data.split("");

      if (count <= poolArr.length) {
        // Efficient: Sample exactly what we need
        const selected = sample(poolArr, count);
        password.push(...selected);
        selected.forEach((c) => usedChars.add(c));
      } else {
        // If we need more chars than the pool has (e.g. 12 numbers),
        // take all of them, then pick the rest randomly.
        password.push(...poolArr);
        poolArr.forEach((c) => usedChars.add(c));

        const remaining = count - poolArr.length;
        for (let k = 0; k < remaining; k++) {
          password.push(pick(poolArr));
        }
      }
    } else if (pool.type === "ranges") {
      // For ranges (infinite/large sets), we pick randomly
      const rangeList = pool.data;
      for (let k = 0; k < count; k++) {
        let char = "";
        let attempts = 0;
        // We still use a safety loop here for ranges, but it's backed by crypto randInt
        while (attempts < 50) {
          const selected = rangeList[randInt(rangeList.length)];
          const r = selected.range;
          char = String.fromCodePoint(randInt(r[1] - r[0] + 1) + r[0]);
          if (!usedChars.has(char)) break;
          attempts++;
        }
        password.push(char);
        usedChars.add(char);
      }
    }
  }

  // Final shuffle using browser crypto
  return shuffle(password).join("");
}

export function calculateEntropy(pwd) {
  if (!pwd) return { entropy: 0, label: "Weak" };

  let pool = 0;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSymbol = /[^0-9a-zA-Z]/.test(pwd);
  const hasExtended = /[~`^\[\]{}()<>/\\;.,'"]/.test(pwd);
  const hasUnicode = /[^\u0000-\u007f]/.test(pwd);

  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasNumber) pool += 10;
  if (hasSymbol) pool += 33;
  if (hasExtended) pool += 20; // Boost for extended symbols
  if (hasUnicode) pool += 100;

  const uniqueChars = new Set(pwd).size;
  pool = Math.max(pool, uniqueChars);

  // Calculate repetition penalty (NIST 800-63b inspired)
  const freq = Object.create(null);
  for (const ch of pwd) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let penalty = 0;
  for (const count of Object.values(freq)) {
    if (count > 1) penalty += (count - 1) * 2;
  }

  const entropy = Math.max(
    0,
    Math.round(Math.log2(Math.max(2, pool)) * pwd.length - penalty)
  );

  let label = "Weak";
  if (entropy >= 150) label = "Quantum Resistant";
  else if (entropy >= 100) label = "Very Strong";
  else if (entropy >= 60) label = "Strong";

  return { entropy, label };
}
