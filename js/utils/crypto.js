/* Cryptographic utilities for secure random number generation */

const cryptoAPI = window.crypto || window.msCrypto;

export function randInt(n) {
  if (n <= 0) return 0;
  if (!cryptoAPI || !cryptoAPI.getRandomValues) {
    throw new Error("Secure random number generation is not supported.");
  }
  const range = Math.floor(0xffffffff / n) * n;
  const buf = new Uint32Array(1);
  let candidate;
  do {
    cryptoAPI.getRandomValues(buf);
    candidate = buf[0];
  } while (candidate >= range);
  return candidate % n;
}

export function randFloat() {
  if (!cryptoAPI || !cryptoAPI.getRandomValues) {
    throw new Error("Secure random number generation is not supported.");
  }
  const buf = new Uint32Array(1);
  cryptoAPI.getRandomValues(buf);
  return buf[0] / 0x100000000;
}

export function pick(collection) {
  if (!collection || collection.length === 0) return "";
  const items =
    typeof collection === "string" ? Array.from(collection) : collection;
  return items[randInt(items.length)];
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sample(array, size) {
  if (!array || array.length === 0 || size <= 0) return [];
  const n = array.length;
  if (size >= n) return shuffle(array);

  // Optimization: For small samples from large arrays (like emojis),
  // pick random indices to avoid cloning/shuffling the entire array (O(N)).
  if (size * 4 < n) {
    const result = [];
    const selectedIndices = new Set();
    while (result.length < size) {
      const idx = randInt(n);
      if (!selectedIndices.has(idx)) {
        selectedIndices.add(idx);
        result.push(array[idx]);
      }
    }
    return result;
  }

  // Otherwise, perform a partial Fisher-Yates shuffle on a copy
  const result = [...array];
  for (let i = 0; i < size; i++) {
    const j = i + randInt(n - i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, size);
}
