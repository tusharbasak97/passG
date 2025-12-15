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

  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*+-_=?:|";
  const extendedSymbols = "~`^[]{}()<>/\\;.,'\"";

  const accentRanges = [
    [0x00c0, 0x00ff],
    [0x0100, 0x017f],
    [0x0180, 0x024f],
    [0x0370, 0x03ff],
    [0x0400, 0x04ff],
  ];

  const emojiChars = "😀😁😂🤣😅😊😍🤩🥳😎🛡️✨🔥⭐⚡🌟🚀🎯🔒🔑🧠🛰️🧮🧭🧲📡🔭";

  const excludeSet = new Set((settings.excludeSymbols || "").split(""));

  const stripExcluded = (chars) => {
    if (!chars) return "";
    return chars
      .split("")
      .filter((ch) => !excludeSet.has(ch))
      .join("");
  };

  const filteredSymbols = stripExcluded(symbols);
  const filteredExtendedSymbols = stripExcluded(extendedSymbols);

  const pickers = [];
  const required = [];

  const addCharGroup = (enabled, chars, isRequired = false) => {
    if (!enabled || !chars || !chars.length) return;
    const fn = () => pick(chars);
    pickers.push(fn);
    if (isRequired) required.push(fn);
  };

  const addRangeGroup = (enabled, ranges, isRequired = false) => {
    if (!enabled) return;
    const fn = () => {
      const r = ranges[randInt(ranges.length)];
      return String.fromCodePoint(randInt(r[1] - r[0] + 1) + r[0]);
    };
    pickers.push(fn);
    if (isRequired) required.push(fn);
  };

  addCharGroup(settings.lowercase, lowercase, true);
  addCharGroup(settings.uppercase, uppercase, true);
  addCharGroup(settings.numbers, numbers, true);
  addCharGroup(settings.symbols, filteredSymbols, true);
  addCharGroup(settings.extendedSymbols, filteredExtendedSymbols, true);
  addRangeGroup(settings.nonLatin, accentRanges, true);
  addCharGroup(settings.emoji, emojiChars, true);

  if (!pickers.length) {
    const fallback = () => pick(lowercase + uppercase + numbers);
    pickers.push(fallback);
    required.push(fallback);
  }

  const password = [];
  const requiredCount = Math.min(required.length, len);

  for (let i = 0; i < requiredCount; i++) {
    password.push(required[i]());
  }

  while (password.length < len) {
    password.push(pickers[randInt(pickers.length)]());
  }

  return shuffle(password).join("");
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
