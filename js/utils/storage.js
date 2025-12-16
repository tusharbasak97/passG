/* Storage utilities */

export function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    return [];
  }
}

export function saveJSON(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

export function getItem(key, defaultValue = null) {
  return localStorage.getItem(key) || defaultValue;
}

export function setItem(key, value) {
  localStorage.setItem(key, value);
}

export function getCache(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
}

export function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
