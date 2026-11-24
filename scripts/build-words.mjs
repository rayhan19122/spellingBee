// Builds src/data/words.js from:
//   data-source/vocab11.js            Vocab11's generated vocabulary (525 entries, 21 lectures; copied from the Vocab11 repo)
//   data-source/spelling-list.txt     the 232 words printed in "Spelling .pdf" (21.8 Spelling Bee), with the PDF's notes
//   data-source/spelling-content.txt  meaning + sentence for every spelling-list word that is not in Vocab11
//   data-source/variants.txt          other accepted spellings (British / American)
//   data-source/sounds-like.txt       words that sound like another word (the bee always shows their meaning)
// Usage: node scripts/build-words.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => readFileSync(join(root, file), 'utf8')
const rows = (file) =>
  read(file)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('|').map((part) => part.trim()))

const { vocabulary } = await import(pathToFileURL(join(root, 'data-source/vocab11.js')).href)

const { slugify: slug } = await import(pathToFileURL(join(root, 'src/utils/slug.js')).href)

const entries = new Map()
const get = (word) => entries.get(word.toLowerCase())

// 1. Vocab11: one entry per distinct word; a word taught in several lectures keeps every lecture and sentence.
for (const item of vocabulary) {
  const existing = get(item.word)
  if (existing) {
    if (!existing.lectures.includes(item.lecture)) existing.lectures.push(item.lecture)
    if (!existing.sentences.includes(item.example)) existing.sentences.push(item.example)
    continue
  }
  entries.set(item.word.toLowerCase(), {
    word: item.word,
    meaning: item.meaning,
    pos: item.meaning.startsWith('to ') ? 'verb' : '',
    note: '',
    sentences: [item.example],
    lectures: [item.lecture],
    listIndex: null,
  })
}

// 2. The spelling list, in PDF order.
const content = new Map()
for (const [word, pos, meaning, sentence] of rows('data-source/spelling-content.txt')) {
  if (content.has(word)) throw new Error(`Duplicate spelling-content row for "${word}"`)
  if (!pos || !meaning || !sentence) throw new Error(`Incomplete spelling-content row for "${word}"`)
  content.set(word, { pos, meaning, sentence })
}
const listRows = rows('data-source/spelling-list.txt')
listRows.forEach(([word, note = ''], index) => {
  const existing = get(word)
  if (existing) {
    if (content.has(word)) throw new Error(`"${word}" is in Vocab11; remove its spelling-content row`)
    existing.listIndex = index
    existing.note = note
    return
  }
  const extra = content.get(word)
  if (!extra) throw new Error(`No spelling-content row for "${word}"`)
  content.delete(word)
  entries.set(word.toLowerCase(), { word, meaning: extra.meaning, pos: extra.pos, note, sentences: [extra.sentence], lectures: [], listIndex: index })
})
if (content.size) throw new Error(`spelling-content rows not in the list: ${[...content.keys()].join(', ')}`)

// 3. Accepted variant spellings and sound-alikes.
for (const [word, variants] of rows('data-source/variants.txt')) {
  const entry = get(word)
  if (!entry) throw new Error(`variants.txt: unknown word "${word}"`)
  entry.variants = variants.split(';').map((item) => item.trim()).filter(Boolean)
}
for (const [word, others] of rows('data-source/sounds-like.txt')) {
  const entry = get(word)
  if (!entry) throw new Error(`sounds-like.txt: unknown word "${word}"`)
  entry.soundsLike = others.split(';').map((item) => item.trim()).filter(Boolean)
}

// 4. Difficulty: longer words and words with classic traps (double letters, silent letters, ie/ei, ...) are harder.
// Words from the "most commonly misspelled" list count one step harder.
const TRAPS = /([a-z])\1|ie|ei|ph|gh|ps|kn|wr|mn|rh|sc|que|ous|ance|ence|able|ible|eau|ae|y[^aeiou]/
function difficulty(entry) {
  const letters = entry.word.replace(/[^a-z]/gi, '').length
  let score = letters <= 5 ? 0 : letters <= 8 ? 1 : 2
  if (TRAPS.test(entry.word.toLowerCase())) score += 1
  if (entry.listIndex !== null && letters >= 6) score += 1
  return score <= 1 ? 'easy' : score === 2 ? 'medium' : 'hard'
}

const words = [...entries.values()]
  .map((entry) => ({
    id: slug(entry.word),
    word: entry.word,
    meaning: entry.meaning,
    pos: entry.pos,
    note: entry.note,
    sentences: entry.sentences,
    lectures: entry.lectures.sort((a, b) => a - b),
    inList: entry.listIndex !== null,
    variants: entry.variants || [],
    soundsLike: entry.soundsLike || [],
    difficulty: difficulty(entry),
  }))
  .sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }))

const ids = new Set()
for (const word of words) {
  if (ids.has(word.id)) throw new Error(`Duplicate id "${word.id}"`)
  ids.add(word.id)
}

const body = words.map((word) => `  ${JSON.stringify(word)},`).join('\n')
writeFileSync(
  join(root, 'src/data/words.js'),
  `// GENERATED by scripts/build-words.mjs from data-source/. Edit the sources, then re-run: pnpm data:build
// Every Vocab11 word (Lectures 1-11, 13-17, 19-23) plus the 232 words of "Spelling .pdf" (21.8 Spelling Bee).
// sentences: Vocab11's original PDF sentences, or one written for this app for spelling-list words.
// lectures: the Vocab11 lectures that teach the word. inList: printed in the Spelling Bee PDF.
// variants: other spellings that are also accepted (British / American). soundsLike: words that sound the same.

export const words = [
${body}
]

export const wordsById = Object.fromEntries(words.map((word) => [word.id, word]))

export const lectureIds = [...new Set(words.flatMap((word) => word.lectures))].sort((a, b) => a - b)

export const letters = [...new Set(words.map((word) => word.word[0].toUpperCase()))].sort()

export const listCount = words.filter((word) => word.inList).length
`,
)
const count = (fn) => words.filter(fn).length
console.log(
  `Wrote ${words.length} words (${count((w) => w.lectures.length)} from Vocab11, ${count((w) => w.inList)} from the spelling list, ${count((w) => w.inList && w.lectures.length)} in both).`,
  `Difficulty: easy ${count((w) => w.difficulty === 'easy')}, medium ${count((w) => w.difficulty === 'medium')}, hard ${count((w) => w.difficulty === 'hard')}.`,
)
