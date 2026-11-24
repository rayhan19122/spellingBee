// Everything about comparing what the learner typed with the real spelling.
// Pure functions: no React, no storage.
import { shuffle } from './random'

/** Lower-case, trimmed, single-spaced, with curly apostrophes made straight. Hyphens and spaces still count. */
export const normalizeSpelling = (text) =>
  String(text ?? '')
    .normalize('NFKC')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[‐‑‒–—]/g, '-')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

/** Levenshtein distance (insert, delete, substitute; each costs 1). */
export function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const above = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return prev[b.length]
}

/**
 * Checks an answer.
 * Returns { correct, variant, soundsLike, distance }:
 *  - variant: the accepted other spelling that was typed (e.g. "realise" for "Realize"), or null
 *  - soundsLike: the sound-alike word that was typed instead (e.g. "peace" for "Piece"), or null
 */
export function checkSpelling(word, typed, { acceptVariants = true } = {}) {
  const answer = normalizeSpelling(typed)
  const target = normalizeSpelling(word.word)
  if (answer === target) return { correct: true, variant: null, soundsLike: null, distance: 0 }
  const variant = acceptVariants ? (word.variants || []).find((item) => normalizeSpelling(item) === answer) : undefined
  if (variant) return { correct: true, variant, soundsLike: null, distance: 0 }
  const soundsLike = (word.soundsLike || []).find((item) => normalizeSpelling(item) === answer) || null
  return { correct: false, variant: null, soundsLike, distance: editDistance(answer, target) }
}

/**
 * Letter-by-letter comparison for feedback. Returns a list of cells:
 *   { type: 'match' | 'wrong' | 'missing' | 'extra', letter, typed }
 * 'letter' is the correct letter (absent for 'extra'); 'typed' is what the learner typed there (absent for 'missing').
 */
export function letterDiff(expected, typed) {
  const a = [...expected]
  const b = [...typed]
  const lower = (char) => char.toLowerCase()
  const rows = a.length + 1
  const cols = b.length + 1
  const cost = Array.from({ length: rows }, () => new Array(cols).fill(0))
  for (let i = 0; i < rows; i += 1) cost[i][0] = i
  for (let j = 0; j < cols; j += 1) cost[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const same = lower(a[i - 1]) === lower(b[j - 1])
      cost[i][j] = Math.min(cost[i - 1][j] + 1, cost[i][j - 1] + 1, cost[i - 1][j - 1] + (same ? 0 : 1))
    }
  }
  const cells = []
  let i = a.length
  let j = b.length
  // Walk back from the end. On ties, extra/missing letters are placed as late as possible
  // ("catt" -> c a t +t), which reads more naturally than flagging an earlier letter.
  while (i > 0 || j > 0) {
    if (j > 0 && cost[i][j] === cost[i][j - 1] + 1) {
      cells.push({ type: 'extra', typed: b[j - 1] })
      j -= 1
    } else if (i > 0 && cost[i][j] === cost[i - 1][j] + 1) {
      cells.push({ type: 'missing', letter: a[i - 1] })
      i -= 1
    } else {
      const same = lower(a[i - 1]) === lower(b[j - 1])
      cells.push({ type: same ? 'match' : 'wrong', letter: a[i - 1], typed: b[j - 1] })
      i -= 1
      j -= 1
    }
  }
  return cells.reverse()
}

// ---------- misspellings (for "Choose the spelling" and "Fix the mistake") ----------

const VOWELS = 'aeiou'

// Real-world confusions, each as [pattern, replacement]. Patterns are applied one match at a time.
const RULES = [
  [/ie/g, 'ei'],
  [/ei/g, 'ie'],
  [/ance\b/g, 'ence'],
  [/ence\b/g, 'ance'],
  [/ant\b/g, 'ent'],
  [/ent\b/g, 'ant'],
  [/able\b/g, 'ible'],
  [/ible\b/g, 'able'],
  [/ary\b/g, 'ery'],
  [/ery\b/g, 'ary'],
  [/ous\b/g, 'us'],
  [/tion/g, 'sion'],
  [/sion/g, 'tion'],
  [/ph/g, 'f'],
  [/c(?=[eiy])/g, 's'], // soft c: "neccesary"
  [/s(?=[eiy])/g, 'c'],
  [/ck/g, 'k'],
  [/i[sz]e\b/g, 'ise'],
  [/ise\b/g, 'ize'],
  [/our/g, 'or'],
  [/er\b/g, 'or'],
  [/or\b/g, 'er'],
  [/ar\b/g, 'er'],
  [/ful\b/g, 'full'],
  [/ally\b/g, 'aly'],
  [/sc(?=[eiy])/g, 's'],
  [/wh/g, 'w'],
  [/^kn/g, 'n'],
  [/^wr/g, 'r'],
  [/mn\b/g, 'm'],
  [/rh/g, 'r'],
  [/^ps/g, 's'],
  [/gh/g, ''],
  [/dge/g, 'ge'],
  [/tch/g, 'ch'],
  [/y/g, 'i'],
  [/eau/g, 'o'],
  [/que\b/g, 'k'],
]

function ruleCandidates(word) {
  const out = []
  for (const [pattern, replacement] of RULES) {
    for (const match of word.matchAll(pattern)) {
      out.push(word.slice(0, match.index) + replacement + word.slice(match.index + match[0].length))
    }
  }
  return out
}

/** Doubling and undoubling letters: the single most common spelling mistake. */
function doubleCandidates(word) {
  const out = []
  for (let i = 0; i < word.length; i += 1) {
    const char = word[i]
    if (!/[a-z]/.test(char)) continue
    if (word[i + 1] === char) out.push(word.slice(0, i) + word.slice(i + 1))
    else if (!VOWELS.includes(char) && !'hjqwxy'.includes(char) && i > 0 && i < word.length - 1 && word[i - 1] !== char && VOWELS.includes(word[i - 1])) {
      out.push(word.slice(0, i) + char + word.slice(i))
    }
  }
  return out
}

/** Wrong vowel in an unstressed-looking spot, a dropped silent letter, or two letters swapped. */
function vowelCandidates(word) {
  const out = []
  for (let i = 1; i < word.length; i += 1) {
    if (!VOWELS.includes(word[i])) continue
    for (const vowel of 'aeio') if (vowel !== word[i]) out.push(word.slice(0, i) + vowel + word.slice(i + 1))
  }
  return out
}

function dropCandidates(word) {
  const out = []
  for (let i = 1; i < word.length; i += 1) if ('ehkwbnlut'.includes(word[i]) && word[i] !== word[i - 1]) out.push(word.slice(0, i) + word.slice(i + 1))
  return out
}

/**
 * Plausible wrong spellings of a word: never the word itself, an accepted variant, a sound-alike,
 * or any word in `realWords` (so a "wrong" option is never actually a real word from the list).
 * Common confusions (ie/ei, ance/ence, double letters) come first.
 */
export function misspellings(word, count = 3, realWords = new Set()) {
  const target = normalizeSpelling(word.word)
  const banned = new Set([target, ...(word.variants || []).map(normalizeSpelling), ...(word.soundsLike || []).map(normalizeSpelling), ...realWords])
  const seen = new Set()
  const keep = (candidate) => {
    if (candidate.length < 2 || banned.has(candidate) || seen.has(candidate)) return false
    seen.add(candidate)
    return true
  }
  // Prefer the classic confusions and double letters, then a wrong vowel, then a dropped letter.
  const ordered = [
    ...shuffle([...ruleCandidates(target), ...doubleCandidates(target)]),
    ...shuffle(vowelCandidates(target)),
    ...shuffle(dropCandidates(target)),
  ].filter(keep)
  return ordered.slice(0, count).map((item) => matchCase(item, word.word))
}

/** Gives a generated spelling the same capitalisation as the real word ("Xerox" -> "Xerrox"). */
export const matchCase = (text, model) => (model[0] === model[0].toUpperCase() && /[a-z]/i.test(model[0]) ? text[0].toUpperCase() + text.slice(1) : text)

// ---------- missing letters ----------

const TRICKY = /([a-z])\1|ie|ei|ph|gh|ps|kn|wr|mn|rh|sc|que|ou|ea|ai|au|ce|ci|[aeiou]/g

/**
 * Hides the letters most people get wrong. Returns an array of { letter, hidden }.
 * Roughly a third of the letters (at least one, never all) are hidden, preferring vowels and known traps.
 */
export function maskWord(word, ratio = 0.35) {
  const letters = [...word]
  const positions = []
  const lower = word.toLowerCase()
  for (const match of lower.matchAll(TRICKY)) {
    for (let k = 0; k < match[0].length; k += 1) positions.push(match.index + k)
  }
  const letterIndexes = letters.map((char, index) => (/[a-z]/i.test(char) ? index : -1)).filter((index) => index >= 0)
  const target = Math.max(1, Math.min(letterIndexes.length - 1, Math.round(letterIndexes.length * ratio)))
  const chosen = new Set()
  for (const index of shuffle([...new Set(positions)])) {
    if (chosen.size >= target) break
    if (index > 0 || letterIndexes.length <= 3) chosen.add(index)
  }
  for (const index of shuffle(letterIndexes)) {
    if (chosen.size >= target) break
    chosen.add(index)
  }
  return letters.map((letter, index) => ({ letter, hidden: chosen.has(index) }))
}

/** "accommodation" -> "a, c, c, o, ..." for text-to-speech spelling-out. */
export const spelledOut = (word) =>
  [...word]
    .map((char) => (char === '-' ? 'hyphen' : char === "'" ? 'apostrophe' : char === ' ' ? 'space' : char.toUpperCase()))
    .join(', ')
