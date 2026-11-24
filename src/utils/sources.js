// Word sets: "what do you want to practise?" -> a list of words.
// A set is a string so it fits in a URL: "smart", "all", "list", "vocab11", "tricky", "due", "new", "lecture-7", "letter-q".
// "smart" is the daily review: tricky words first, then words due, then words not yet mastered.
import { lectureIds, letters, words as allWords } from '../data/words'
import { isDue, isWeak } from './spacedRepetition'
import { wordRecord } from './progress'
import { shuffle } from './random'

export const lectureLabel = (id) => `Lecture ${String(id).padStart(2, '0')}`

export const FIXED_SETS = [
  { value: 'smart', label: 'Smart review' },
  { value: 'all', label: 'All words' },
  { value: 'list', label: 'Spelling Bee list' },
  { value: 'vocab11', label: 'Vocab11 lectures' },
  { value: 'tricky', label: 'Tricky words' },
  { value: 'due', label: 'Due for review' },
  { value: 'new', label: 'Words not tried yet' },
]

export function isValidSet(value) {
  if (FIXED_SETS.some((set) => set.value === value)) return true
  const lecture = /^lecture-(\d+)$/.exec(value || '')
  if (lecture) return lectureIds.includes(Number(lecture[1]))
  const letter = /^letter-([a-z])$/.exec(value || '')
  return Boolean(letter) && letters.includes(letter[1].toUpperCase())
}

export const parseSet = (value, fallback = 'all') => (isValidSet(value) ? value : fallback)

export function setLabel(value) {
  const fixed = FIXED_SETS.find((set) => set.value === value)
  if (fixed) return fixed.label
  const lecture = /^lecture-(\d+)$/.exec(value)
  if (lecture) return lectureLabel(Number(lecture[1]))
  const letter = /^letter-([a-z])$/.exec(value)
  if (letter) return `Letter ${letter[1].toUpperCase()}`
  return 'All words'
}

/** The words in a set. For "smart", `limit` words in priority order (see prioritizedWords). */
export function wordsForSet(value, state, now = new Date(), words = allWords, limit = 50) {
  if (value === 'smart') return prioritizedWords(state, limit, words, now)
  if (value === 'list') return words.filter((word) => word.inList)
  if (value === 'vocab11') return words.filter((word) => word.lectures.length)
  if (value === 'tricky') return words.filter((word) => isWeak(state.words[word.id]))
  if (value === 'due') return words.filter((word) => isDue(state.words[word.id], now))
  if (value === 'new') return words.filter((word) => wordRecord(state, word.id).state === 'new')
  const lecture = /^lecture-(\d+)$/.exec(value)
  if (lecture) return words.filter((word) => word.lectures.includes(Number(lecture[1])))
  const letter = /^letter-([a-z])$/.exec(value)
  if (letter) return words.filter((word) => word.word[0].toLowerCase() === letter[1])
  return words
}

/** Options for a <select>, grouped by kind, with word counts. */
export function setOptions(state, now = new Date()) {
  const count = (value) => wordsForSet(value, state, now).length
  return [
    ...FIXED_SETS.map((set) => ({ value: set.value, label: set.value === 'smart' ? `${set.label} (tricky + due first)` : `${set.label} (${count(set.value)})` })),
    ...lectureIds.map((id) => ({ value: `lecture-${id}`, label: `Vocab11 · ${lectureLabel(id)} (${count(`lecture-${id}`)})` })),
    ...letters.map((letter) => ({ value: `letter-${letter.toLowerCase()}`, label: `Starts with ${letter} (${count(`letter-${letter.toLowerCase()}`)})` })),
  ]
}

/**
 * Words for a review session, most useful first:
 * 1. tricky words  2. words due for review  3. words not yet mastered  4. anything else.
 */
export function prioritizedWords(state, count, words = allWords, now = new Date()) {
  const chosen = []
  const seen = new Set()
  const take = (candidates) => {
    for (const word of shuffle(candidates)) {
      if (chosen.length >= count) return
      if (!seen.has(word.id)) {
        seen.add(word.id)
        chosen.push(word)
      }
    }
  }
  take(words.filter((word) => isWeak(state.words[word.id])))
  take(words.filter((word) => isDue(state.words[word.id], now)))
  take(words.filter((word) => wordRecord(state, word.id).state !== 'mastered'))
  take(words)
  return chosen
}
