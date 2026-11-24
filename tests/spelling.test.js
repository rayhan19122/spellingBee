import { describe, expect, it } from 'vitest'
import { words, wordsById } from '../src/data/words'
import { checkSpelling, editDistance, letterDiff, maskWord, misspellings, normalizeSpelling, spelledOut } from '../src/utils/spelling'
import { buildSession, challengePoints, challengeTier, nextChallengeWord, REAL_WORDS, sentenceClue } from '../src/utils/session'

const word = (id) => wordsById[id]

describe('checking an answer', () => {
  it('ignores case, outer spaces and curly apostrophes', () => {
    expect(checkSpelling(word('accommodation'), '  ACCOMMODATION ').correct).toBe(true)
    expect(checkSpelling(word('theyre'), 'they’re').correct).toBe(true)
    expect(checkSpelling(word('theyre'), 'theyre').correct).toBe(false)
  })

  it('accepts British/American variants only when the setting is on', () => {
    expect(checkSpelling(word('realize'), 'realise')).toMatchObject({ correct: true, variant: 'realise' })
    expect(checkSpelling(word('neighbour'), 'neighbor', { acceptVariants: true }).correct).toBe(true)
    expect(checkSpelling(word('neighbour'), 'neighbor', { acceptVariants: false }).correct).toBe(false)
  })

  it('spots a sound-alike word', () => {
    expect(checkSpelling(word('piece'), 'peace')).toMatchObject({ correct: false, soundsLike: 'peace' })
    expect(checkSpelling(word('their'), "they're").soundsLike).toBe("they're")
  })

  it('measures how far off a spelling is', () => {
    expect(editDistance('recieve', 'receive')).toBe(2)
    expect(editDistance('acommodation', 'accommodation')).toBe(1)
    expect(checkSpelling(word('accommodation'), 'acommodation').distance).toBe(1)
  })
})

describe('letter-by-letter feedback', () => {
  const types = (expected, typed) => letterDiff(expected, typed).map((cell) => cell.type)

  it('marks a missing letter', () => {
    const cells = letterDiff('Accommodation', 'acomodation')
    expect(cells.filter((cell) => cell.type === 'missing').map((cell) => cell.letter)).toEqual(['c', 'm'])
    expect(cells.filter((cell) => cell.type !== 'extra').map((cell) => cell.letter).join('')).toBe('Accommodation')
  })

  it('marks wrong and extra letters', () => {
    expect(types('cat', 'cut')).toEqual(['match', 'wrong', 'match'])
    expect(types('cat', 'catt')).toEqual(['match', 'match', 'match', 'extra'])
    expect(types('zoo', '')).toEqual(['missing', 'missing', 'missing'])
  })
})

describe('misspellings', () => {
  it('never returns the real word, a variant, a sound-alike or another real word', () => {
    for (const item of words) {
      for (const wrong of misspellings(item, 3, REAL_WORDS)) {
        expect(normalizeSpelling(wrong), item.word).not.toBe(normalizeSpelling(item.word))
        expect(REAL_WORDS.has(normalizeSpelling(wrong)), `${item.word} -> ${wrong}`).toBe(false)
      }
    }
  })

  it('finds three distinct wrong spellings for almost every word', () => {
    const short = words.filter((item) => new Set(misspellings(item, 3, REAL_WORDS)).size < 3)
    expect(short.length).toBeLessThan(5)
  })

  it('tries the classic confusions', () => {
    const options = new Set(Array.from({ length: 20 }, () => misspellings(word('receive'), 3, REAL_WORDS)).flat().map(normalizeSpelling))
    expect(options.has('recieve')).toBe(true)
  })
})

describe('missing letters', () => {
  it('hides at least one letter and never all of them', () => {
    for (const item of words) {
      const mask = maskWord(item.word)
      expect(mask.map((cell) => cell.letter).join('')).toBe(item.word)
      const hidden = mask.filter((cell) => cell.hidden).length
      expect(hidden).toBeGreaterThan(0)
      expect(hidden).toBeLessThan(item.word.replace(/[^a-z]/gi, '').length)
    }
  })
})

describe('sessions', () => {
  it('builds the requested number of questions without repeating a word', () => {
    const questions = buildSession({ pool: words, count: 30, mode: 'mixed' })
    expect(questions).toHaveLength(30)
    expect(new Set(questions.map((question) => question.wordId)).size).toBe(30)
    for (const question of questions) {
      if (question.kind === 'choose') {
        expect(question.options).toHaveLength(4)
        expect(question.options).toContain(wordsById[question.wordId].word)
        expect(new Set(question.options.map(normalizeSpelling)).size).toBe(4)
      }
      if (question.kind === 'fix') expect(normalizeSpelling(question.misspelled)).not.toBe(normalizeSpelling(wordsById[question.wordId].word))
    }
  })

  it('filters by difficulty and can keep the pool order', () => {
    expect(buildSession({ pool: words, count: 10, mode: 'listen', difficulty: 'hard' }).every((question) => wordsById[question.wordId].difficulty === 'hard')).toBe(true)
    const pool = words.slice(0, 5)
    expect(buildSession({ pool, count: 5, mode: 'listen', ordered: true }).map((question) => question.wordId)).toEqual(pool.map((item) => item.id))
  })

  it('gives every word a sentence clue with the word blanked out', () => {
    for (const item of words) {
      const clue = sentenceClue(item)
      expect(clue, item.word).not.toBeNull()
      expect(clue.before + clue.after).not.toContain(` ${item.word.toLowerCase()} `)
    }
  })
})

describe('Bee Challenge', () => {
  it('gets harder as rounds go on', () => {
    expect(challengeTier(1)).toBe('easy')
    expect(challengeTier(8)).toBe('medium')
    expect(challengeTier(13)).toBe('hard')
    expect(nextChallengeWord(20, new Set()).difficulty).toBe('hard')
  })

  it('scores harder, longer and faster answers higher', () => {
    expect(challengePoints(word('accommodation'), 0)).toBeGreaterThan(challengePoints(word('zoo'), 0))
    expect(challengePoints(word('zoo'), 30)).toBeGreaterThan(challengePoints(word('zoo'), 0))
  })
})

it('spells a word out letter by letter for speech', () => {
  expect(spelledOut("They're")).toBe('T, H, E, Y, apostrophe, R, E')
})
