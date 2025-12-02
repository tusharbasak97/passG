/* Username Generator Module */
import { randInt, pick } from "../utils/crypto.js";

const adjectives = [
  "Swift",
  "Bright",
  "Dark",
  "Silent",
  "Mighty",
  "Fierce",
  "Noble",
  "Wild",
  "Cosmic",
  "Electric",
  "Quantum",
  "Crystal",
  "Shadow",
  "Thunder",
  "Neon",
  "Cyber",
  "Digital",
  "Mystic",
  "Phoenix",
  "Dragon",
  "Storm",
  "Frost",
  "Blaze",
  "Steel",
  "Iron",
  "Gold",
  "Silver",
  "Crimson",
  "Azure",
  "Emerald",
];

const nouns = [
  "Wolf",
  "Tiger",
  "Eagle",
  "Lion",
  "Bear",
  "Fox",
  "Hawk",
  "Panther",
  "Ninja",
  "Samurai",
  "Knight",
  "Warrior",
  "Hunter",
  "Ranger",
  "Sage",
  "Wizard",
  "Striker",
  "Phantom",
  "Specter",
  "Ghost",
  "Viper",
  "Cobra",
  "Raven",
  "Falcon",
  "Dragon",
  "Phoenix",
  "Titan",
  "Guardian",
  "Champion",
  "Legend",
];

const modernAdjectives = [
  "Nova",
  "Prime",
  "Core",
  "Next",
  "True",
  "Urban",
  "North",
  "Blue",
  "Clear",
  "Flex",
  "Pure",
  "Apex",
  "Pulse",
  "Smart",
  "Bright",
  "Edge",
];

const modernNouns = [
  "Labs",
  "Works",
  "Desk",
  "Link",
  "Grid",
  "Ops",
  "Logic",
  "Layer",
  "Mode",
  "Flow",
  "Shift",
  "Loop",
  "Form",
  "Point",
  "Nest",
  "Peak",
];

const professionalFirstNames = [
  "Alex",
  "Jordan",
  "Morgan",
  "Taylor",
  "Avery",
  "Cameron",
  "Sydney",
  "Drew",
  "Logan",
  "Riley",
  "Casey",
  "Parker",
  "Reese",
  "Emerson",
  "Harper",
  "Rowan",
  "Blake",
  "Hayden",
  "Payton",
  "Quinn",
];

const professionalLastNames = [
  "Hughes",
  "Carter",
  "Bennett",
  "Morgan",
  "Reynolds",
  "Clark",
  "Dawson",
  "Ellis",
  "Foster",
  "Grant",
  "Hayes",
  "Jensen",
  "Keller",
  "Lawson",
  "Monroe",
  "Nash",
  "Porter",
  "Quincy",
  "Ramsey",
  "Sutton",
];

const prefixes = [
  "xX",
  "i",
  "The",
  "Mr",
  "Dr",
  "Sir",
  "Lord",
  "Dark",
  "Pro",
  "Xx",
  "iAm",
  "Its",
  "Real",
  "Official",
  "True",
  "Epic",
  "Super",
  "Ultra",
];

const suffixes = [
  "Xx",
  "Gaming",
  "TV",
  "YT",
  "TTV",
  "HD",
  "Pro",
  "Elite",
  "Master",
  "King",
  "Boss",
  "Lord",
  "God",
  "Legend",
  "Official",
  "Real",
  "OG",
];

const leetMap = {
  a: ["4", "@", "α"],
  e: ["3", "€", "ε"],
  i: ["1", "!", "í"],
  o: ["0", "ø", "ω"],
  s: ["5", "$", "ş"],
  t: ["7", "+", "ţ"],
  l: ["1", "|", "ł"],
  g: ["9", "&", "ğ"],
};

function applyLeetSpeak(text, intensity = 0.5) {
  let result = "";
  for (const char of text) {
    const lower = char.toLowerCase();
    if (leetMap[lower] && Math.random() < intensity) {
      const replacements = leetMap[lower];
      result += replacements[randInt(replacements.length)];
    } else {
      result += char;
    }
  }
  return result;
}

export function generateUsername(options = {}) {
  const { keyword = "", style = "random" } = options;
  // OWASP: Input Validation - Sanitize keyword to prevent injection/XSS
  // We allow alphanumeric characters, removing special chars that could be dangerous
  const safeKeyword = keyword.replace(/[^a-zA-Z0-9\s]/g, "").trim();

  switch (style) {
    case "professional":
      return generateProfessional(safeKeyword);
    case "gamer":
      return generateGamer(safeKeyword);
    case "random":
    default:
      return generateRandom(safeKeyword);
  }
}

function generateProfessional(seed) {
  if (seed) {
    const parts = seed.split(/\s+/);
    if (parts.length >= 2) {
      const first = sanitizeName(parts[0]);
      const last = sanitizeName(parts[parts.length - 1]);
      if (first && last) {
        return formatProfessionalHandle(first, last);
      }
    }
    const sanitized = sanitizeName(seed);
    if (sanitized) {
      // If only one word, treat as surname or firstname randomly
      const isSurname = Math.random() > 0.5;
      if (isSurname) {
        const first = sanitizeName(
          professionalFirstNames[randInt(professionalFirstNames.length)]
        );
        return formatProfessionalHandle(first, sanitized);
      } else {
        const last = sanitizeName(
          professionalLastNames[randInt(professionalLastNames.length)]
        );
        return formatProfessionalHandle(sanitized, last);
      }
    }
  }

  const first = sanitizeName(
    professionalFirstNames[randInt(professionalFirstNames.length)]
  );
  const last = sanitizeName(
    professionalLastNames[randInt(professionalLastNames.length)]
  );
  return formatProfessionalHandle(first, last);
}

function generateGamer(seed) {
  let base = "";
  if (seed) {
    // For gamer tags, we might want to keep the casing or just capitalize first letter
    // But sanitizeName lowercases everything. Let's just use the sanitized version for safety
    // and then maybe leet speak it.
    base = sanitizeName(seed);
    if (!base)
      base =
        adjectives[randInt(adjectives.length)] + nouns[randInt(nouns.length)];
  } else {
    base =
      adjectives[randInt(adjectives.length)] + nouns[randInt(nouns.length)];
  }

  // Apply leetspeak
  base = applyLeetSpeak(base, 0.4);

  // Add prefix/suffix randomly
  const usePrefix = Math.random() < 0.5;
  const useSuffix = Math.random() < 0.5;

  if (usePrefix) {
    base = prefixes[randInt(prefixes.length)] + base;
  }

  if (useSuffix) {
    base = base + suffixes[randInt(suffixes.length)];
  }

  // Sometimes add numbers
  if (Math.random() < 0.6) {
    base += randInt(999) + 100;
  }

  return base;
}

function generateRandom(seed) {
  if (seed && seed.length > 0) {
    const cleaned = sanitizeName(seed);
    if (cleaned) {
      const adj = modernAdjectives[randInt(modernAdjectives.length)];
      // 50% chance to put keyword first or second
      if (Math.random() > 0.5) {
        return `${capitalize(cleaned)}${
          modernNouns[randInt(modernNouns.length)]
        }`;
      }
      return `${adj}${capitalize(cleaned)}`;
    }
  }

  const adj = modernAdjectives[randInt(modernAdjectives.length)];
  const noun = modernNouns[randInt(modernNouns.length)];
  let handle = `${adj}${noun}`;

  if (handle.length < 12 && Math.random() < 0.5) {
    handle += String(randInt(90) + 10);
  }

  return handle;
}

export const usernameStyles = [
  {
    value: "professional",
    label: "Professional",
    description: "Clean, business-appropriate",
  },
  { value: "gamer", label: "Gamer", description: "With leetspeak and tags" },
  { value: "random", label: "Random", description: "Adjective + Noun combo" },
];

function sanitizeName(value = "") {
  // Allow a-z and 0-9. Remove everything else.
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function capitalize(value = "") {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatProfessionalHandle(first, last) {
  const safeFirst = first || "user";
  const safeLast = last || "team";
  const options = [
    `${safeFirst}.${safeLast}`,
    `${safeFirst}_${safeLast}`,
    `${safeFirst}${safeLast}`,
    `${safeLast}.${safeFirst}`,
    `${safeFirst[0]}${safeLast}`,
    `${safeFirst}.${safeLast}${randInt(40) + 10}`,
  ];
  return options[randInt(options.length)];
}
