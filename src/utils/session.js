// Builds practice sessions and the Bee Challenge. Every question is derived from the word data.
import { words as allWords } from '../data/words'
import { blankSentence } from './fillBlank'
import { maskWord, misspellings, normalizeSpelling } from './spelling'
import { pickOne, shuffle } from './random'

export const MODE_INFO = {
  listen: { label: 'Listen & spell', short: 'Listen', description: 'Hear the word, then type it. The classic spelling bee.' },
  choose: { label: 'Choose the spelling', short: 'Choose', description: 'Pick the one correct spelling out of four.' },
  fix: { label: 'Fix the mistake', short: 'Fix', description: 'A misspelled word appears. Type it correctly.' },
  missing: { label: 'Missing letters', short: 'Missing', description: 'Fill in the letters people usually get wrong.' },
  mixed: { label: 'Mixed', short: 'Mixed', description: 'A bit of everything.' },
}

export const PRACTICE_MODES = ['listen', 'choose', 'fix', 'missing', 'mixed']
export const QUESTION_COUNTS = [10, 20, 30, 50]
export const DIFFICULTIES = ['any', 'easy', 'medium', 'hard']

/** Every real word, normalised: a generated "wrong" spelling must never be one of these. */
export const REAL_WORDS = new Set(allWords.flatMap((word) => [word.word, ...word.variants, ...word.soundsLike].map(normalizeSpelling)))

/** The original sentence with the word blanked out, or null if it cannot be blanked. */
export function sentenceClue(word, index = 0) {
  const sentence = word.sentences[index % word.sentences.length]
  const blank = blankSentence(word.word, sentence)
  return blank ? { sentence, before: blank.before, after: blank.after } : null
}

export function makeQuestion(word, kind, id) {
  const base = { id, wordId: word.id, kind, sentenceIndex: Math.floor(Math.random() * word.sentences.length) }
  if (kind === 'choose') {
    const wrong = misspellings(word, 3, REAL_WORDS)
    return { ...base, options: shuffle([word.word, ...wrong]) }
  }
  if (kind === 'fix') {
    const [misspelled] = misspellings(word, 1, REAL_WORDS)
    // A word too short to misspell safely falls back to listening.
    return misspelled ? { ...base, misspelled } : { ...base, kind: 'listen' }
  }
  if (kind === 'missing') return { ...base, mask: maskWord(word.word) }
  return base
}

/** ordered: keep the pool's order (used by Smart review, whose pool is already sorted by priority). */
export function buildSession({ pool, count, mode, difficulty = 'any', ordered = false }) {
  const eligible = difficulty === 'any' ? pool : pool.filter((word) => word.difficulty === difficulty)
  const chosen = (ordered ? eligible : shuffle(eligible)).slice(0, count)
  return chosen.map((word, index) => makeQuestion(word, mode === 'mixed' ? pickOne(['listen', 'listen', 'choose', 'fix', 'missing']) : mode, `q${index + 1}`))
}

/** How an answer counts for progress: right, right only after revealing letters, or wrong. */
export const resultOf = (answer) => (answer.correct ? (answer.hinted ? 'hinted' : 'correct') : 'wrong')

// ---------- Bee Challenge ----------

export const CHALLENGE_LIVES = 3
export const CHALLENGE_SECONDS = 30

/** Rounds 1-5 are easy, 6-12 medium, then hard: like a real bee, it gets harder as you survive. */
export const challengeTier = (round) => (round <= 5 ? 'easy' : round <= 12 ? 'medium' : 'hard')

export function nextChallengeWord(round, usedIds, words = allWords) {
  const unused = words.filter((word) => !usedIds.has(word.id))
  const tier = unused.filter((word) => word.difficulty === challengeTier(round))
  const pool = tier.length ? tier : unused.length ? unused : words
  return pickOne(pool)
}

const TIER_POINTS = { easy: 10, medium: 20, hard: 30 }

/** Points for a correct challenge answer: a base by difficulty, plus letters, plus a bonus for speed. */
export function challengePoints(word, secondsLeft = 0) {
  const letters = word.word.replace(/[^a-z]/gi, '').length
  return TIER_POINTS[word.difficulty] + letters + Math.max(0, Math.round(secondsLeft / 3))
}
