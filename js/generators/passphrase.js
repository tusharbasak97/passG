/* Passphrase Generator Module */
import { randInt, pick, shuffle } from "../utils/crypto.js";

let wordlist = null;

// Load EFF long wordlist
export async function loadWordlist() {
  if (wordlist) return wordlist;

  try {
    const response = await fetch("assets/data/eff_large_wordlist.txt");
    const text = await response.text();
    wordlist = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/).pop()) // Get word from "dice word" format
      .filter((word) => word && word.length > 0);
    return wordlist;
  } catch (error) {
    // Fallback wordlist
    wordlist = [
      "abandon",
      "ability",
      "able",
      "about",
      "above",
      "absent",
      "absorb",
      "abstract",
      "absurd",
      "abuse",
      "access",
      "accident",
      "account",
      "accuse",
      "achieve",
      "acid",
      "acoustic",
      "acquire",
      "across",
      "act",
      "action",
      "actor",
      "actress",
      "actual",
      "adapt",
      "add",
      "addict",
      "address",
      "adjust",
      "admit",
      "adult",
      "advance",
    ];
    return wordlist;
  }
}

export async function generatePassphrase(wordCount = 5, options = {}) {
  const { advanced = false } = options;
  const words = await loadWordlist();
  if (!words || words.length === 0) {
    throw new Error("Wordlist not loaded");
  }

  const numbers = "0123456789";
  const symbols = "!@#$%^&*+-_=?:|";
  const separators = [];

  if (advanced) {
    for (let i = 0; i < wordCount - 1; i++) {
      const num = pick(numbers);
      const sym = pick(symbols);
      separators.push(num + sym);
    }
  }

  // Pick random words - collect all indices first, then shuffle them
  const availableIndices = Array.from({ length: words.length }, (_, i) => i);
  const shuffledIndices = shuffle(availableIndices);
  const selectedIndices = shuffledIndices.slice(0, wordCount);

  // Apply additional entropy shuffle to selected indices
  const finalIndices = entropicShuffle(selectedIndices);

  // Map to words and format
  const selectedWords = finalIndices.map((idx) => {
    const word = words[idx];
    const lower = word.toLowerCase();
    return advanced ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
  });

  if (!advanced) {
    return selectedWords.join(" ");
  }

  let passphrase = "";
  for (let i = 0; i < selectedWords.length; i++) {
    passphrase += selectedWords[i];
    if (i < separators.length) {
      passphrase += separators[i];
    }
  }

  return passphrase;
}

export function calculatePassphraseEntropy(wordCount, options = {}) {
  const { advanced = false } = options;
  // EFF long wordlist has 7776 words (log2(7776) ≈ 12.92 bits per word)
  const bitsPerWord = 12.92;
  let totalEntropy = wordCount * bitsPerWord;

  if (advanced && wordCount > 1) {
    const separatorCount = wordCount - 1;
    const bitsPerSeparator = Math.log2(150); // ≈ 7.23 bits
    totalEntropy += separatorCount * bitsPerSeparator;
  }

  totalEntropy = Math.round(totalEntropy);

  let label = "Weak";
  if (totalEntropy >= 150) label = "Quantum Resistant";
  else if (totalEntropy >= 100) label = "Very Strong";
  else if (totalEntropy >= 60) label = "Strong";

  return { entropy: totalEntropy, label };
}

function entropicShuffle(words) {
  if (words.length < 2) return words;
  let result = shuffle(words);
  const primeOffsets = [3, 5, 7];

  primeOffsets.forEach((prime, idx) => {
    if (result.length <= 1) return;
    const offset = prime % result.length;
    const rotated = result.slice(offset).concat(result.slice(0, offset));
    const tweaked = idx % 2 === 0 ? rotated.reverse() : rotated;
    result = shuffle(tweaked);
  });

  return result;
}
