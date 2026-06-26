import { createRNG } from "./rng";
import { WORDS } from "./words";

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function pick<T>(arr: T[], rng: () => number) { return arr[Math.floor(rng() * arr.length)]; }

export function generateSentence(rng: () => number, minWords = 6, maxWords = 10) {
  const n = Math.floor(rng() * (maxWords - minWords + 1)) + minWords;
  const words: string[] = [];
  for (let i = 0; i < n; i++) words.push(pick(WORDS, rng));
  let sentence = capitalize(words.join(" "));
  if (n > 6 && rng() < 0.25) {
    const commaIdx = Math.floor(rng() * (n - 3)) + 2;
    const parts = sentence.split(" ");
    parts[commaIdx] = parts[commaIdx] + ",";
    sentence = parts.join(" ");
  }
  return sentence + ".";
}

export function generatePassage(seed = Date.now()) {
  const rng = createRNG(seed);
  return generateSentence(rng, 15, 18);
}
