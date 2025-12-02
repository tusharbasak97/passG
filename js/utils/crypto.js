/* Cryptographic utilities for secure random number generation */

export function randInt(n) {
  if (n <= 0) return 0;
  const cryptoAPI = window.crypto || window.msCrypto;
  if (cryptoAPI && cryptoAPI.getRandomValues) {
    const range = Math.floor(0xffffffff / n) * n;
    const buf = new Uint32Array(1);
    let candidate;
    do {
      cryptoAPI.getRandomValues(buf);
      candidate = buf[0];
    } while (candidate >= range);
    return candidate % n;
  }
  return Math.floor(Math.random() * n);
}

export function pick(str) {
  return str.charAt(randInt(str.length));
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
