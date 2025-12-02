/* Password Generator Module */
import { randInt, pick, shuffle } from "../utils/crypto.js";

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

export function generateUniversal(len) {
  // Advanced mode: ensures at least 1 lowercase, 1 uppercase, 1 number, 1 symbol
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*+-_=?:|";

  // Extended ranges for diversity
  const ranges = [
    { range: [0x0021, 0x007e], group: "ascii" },
    { range: [0x00a1, 0x00ff], group: "latin1" },
    { range: [0x0100, 0x017f], group: "latinext" },
    { range: [0x0370, 0x03ff], group: "greek" },
    { range: [0x0400, 0x04ff], group: "cyrillic" },
    { range: [0x0590, 0x05ff], group: "hebrew" },
    { range: [0x0600, 0x06ff], group: "arabic" },
    { range: [0x0900, 0x097f], group: "devanagari" },
    { range: [0x0e00, 0x0e7f], group: "thai" },
    { range: [0x1100, 0x11ff], group: "hangul" },
    { range: [0x2200, 0x22ff], group: "math" },
    { range: [0x3040, 0x309f], group: "hiragana" },
    { range: [0x30a0, 0x30ff], group: "katakana" },
    { range: [0x4e00, 0x9fbf], group: "cjk" },
    { range: [0x1f300, 0x1f64f], group: "emoji" },
  ];

  const usedGroups = new Set();
  const usedChars = new Set();

  // Generate diverse password
  let chars = [];
  for (let i = 0; i < len; i++) {
    let attempts = 0;
    let char = "";
    let selectedRange;

    while (attempts < 100) {
      selectedRange = ranges[randInt(ranges.length)];

      if (
        usedGroups.has(selectedRange.group) &&
        !["ascii", "latin1", "latinext", "math"].includes(selectedRange.group)
      ) {
        attempts++;
        continue;
      }

      const r = selectedRange.range;
      char = String.fromCodePoint(randInt(r[1] - r[0] + 1) + r[0]);

      if (usedChars.has(char)) {
        attempts++;
        continue;
      }

      break;
    }

    if (attempts >= 100) {
      const fallbackRange = ranges[0].range;
      for (let fb = 0; fb < 200; fb++) {
        char = String.fromCodePoint(
          randInt(fallbackRange[1] - fallbackRange[0] + 1) + fallbackRange[0]
        );
        if (!usedChars.has(char)) break;
      }
    }

    chars.push(char);
    usedChars.add(char);
    usedGroups.add(selectedRange.group);
  }

  // Ensure required character types
  const hasLower = chars.some((c) => lowercase.includes(c));
  const hasUpper = chars.some((c) => uppercase.includes(c));
  const hasNumber = chars.some((c) => numbers.includes(c));
  const hasSymbol = chars.some((c) => symbols.includes(c));

  const positions = shuffle(Array.from({ length: chars.length }, (_, i) => i));
  let posIdx = 0;

  if (!hasLower) chars[positions[posIdx++]] = pick(lowercase);
  if (!hasUpper) chars[positions[posIdx++]] = pick(uppercase);
  if (!hasNumber) chars[positions[posIdx++]] = pick(numbers);
  if (!hasSymbol) chars[positions[posIdx++]] = pick(symbols);

  // Final shuffle
  return shuffle(chars).join("");
}

export function calculateEntropy(pwd) {
  if (!pwd) return { entropy: 0, label: "Weak" };

  let pool = 0;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSymbol = /[^0-9a-zA-Z]/.test(pwd);
  const hasUnicode = /[^\u0000-\u007f]/.test(pwd);

  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasNumber) pool += 10;
  if (hasSymbol) pool += 33;
  if (hasUnicode) pool += 100;

  const uniqueChars = new Set(pwd).size;
  pool = Math.max(pool, uniqueChars);

  const freq = Object.create(null);
  for (const ch of pwd) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let penalty = 0;
  for (const count of Object.values(freq)) {
    if (count > 1) penalty += (count - 1) * 1.5;
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
