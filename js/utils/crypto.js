/* Cryptographic utilities for secure random number generation */

export function randInt(n) {
  if (n <= 0) return 0;
  const cryptoAPI = window.crypto || window.msCrypto;
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
  const cryptoAPI = window.crypto || window.msCrypto;
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
