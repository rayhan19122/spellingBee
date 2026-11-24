// Validates src/data/words.js against its sources. Usage: node scripts/validate-data.mjs  (exits 1 on any failure)
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const load = (file) => import(pathToFileURL(join(root, file)).href)
const { words } = await load('src/data/words.js')
const { vocabulary } = await load('data-source/vocab11.js')
const { blankSentence } = await load('src/utils/fillBlank.js')
const list = readFileSync(join(root, 'data-source/spelling-list.txt'), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => line.split('|')[0].trim())

const errors = []
const check = (ok, message) => { if (!ok) errors.push(message) }
const byWord = new Map(words.map((word) => [word.word.toLowerCase(), word]))

check(list.length === 232, `Spelling list has ${list.length} words (expected the 232 printed in the PDF)`)
for (const item of list) check(byWord.get(item.toLowerCase())?.inList, `Spelling-list word missing: ${item}`)
for (const item of vocabulary) {
  const word = byWord.get(item.word.toLowerCase())
  check(word, `Vocab11 word missing: ${item.word}`)
  if (word) {
    check(word.lectures.includes(item.lecture), `${item.word}: Lecture ${item.lecture} not recorded`)
    check(word.sentences.includes(item.example), `${item.word}: Vocab11 sentence missing`)
  }
}
const expected = new Set([...vocabulary.map((item) => item.word.toLowerCase()), ...list.map((item) => item.toLowerCase())])
check(words.length === expected.size, `Expected ${expected.size} words, got ${words.length}`)
check(new Set(words.map((word) => word.id)).size === words.length, 'Duplicate ids')

for (const word of words) {
  const where = `${word.id} (${word.word})`
  check(/^[a-z0-9-]+$/.test(word.id), `${where}: bad id`)
  check(word.meaning.length > 3, `${where}: missing meaning`)
  check(word.sentences.length > 0, `${where}: no sentence`)
  for (const sentence of word.sentences) check(blankSentence(word.word, sentence), `${where}: sentence does not contain the word: ${sentence}`)
  check(['easy', 'medium', 'hard'].includes(word.difficulty), `${where}: bad difficulty`)
  check(word.variants.every((item) => item.toLowerCase() !== word.word.toLowerCase()), `${where}: variant equals the word`)
}

const count = (fn) => words.filter(fn).length
console.log(`Words: ${words.length} | Vocab11: ${count((w) => w.lectures.length)} | spelling list: ${count((w) => w.inList)} | both: ${count((w) => w.inList && w.lectures.length)}`)
console.log(`Variants: ${count((w) => w.variants.length)} words | sound-alikes: ${count((w) => w.soundsLike.length)} words`)
if (errors.length) {
  console.error(`\nFAILED (${errors.length}):\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log('All word checks passed.')
