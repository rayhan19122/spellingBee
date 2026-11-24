import { describe, expect, it } from 'vitest'
import { words } from '../src/data/words'
import { VALID_IDS } from '../src/utils/ids'
import { currentStreak, overallStats, recordResult, recordSession, todayProgress, trickyWordIds } from '../src/utils/progress'
import { defaultState, exportJson, parseImport, sanitizeState } from '../src/utils/storage'
import { parseSet, wordsForSet, prioritizedWords } from '../src/utils/sources'

const at = (iso) => new Date(iso)

describe('recording answers', () => {
  it('keeps the last misspellings and makes the word tricky', () => {
    let state = defaultState()
    state = recordResult(state, 'receive', 'wrong', 'recieve', at('2026-11-25T10:00:00'))
    state = recordResult(state, 'receive', 'wrong', 'receve', at('2026-11-25T10:01:00'))
    state = recordResult(state, 'receive', 'wrong', 'recieve', at('2026-11-25T10:02:00'))
    expect(state.words.receive.misses).toEqual(['recieve', 'receve'])
    expect(trickyWordIds(state, words)).toEqual(['receive'])
  })

  it('counts "with help" answers as neither right nor wrong', () => {
    const state = recordResult(defaultState(), 'yacht', 'hinted', 'yacht', at('2026-11-25T10:00:00'))
    expect(state.words.yacht).toMatchObject({ correct: 0, wrong: 0, streak: 0, state: 'learning' })
    expect(state.days['2026-11-25']).toMatchObject({ answered: 0, words: 1 })
  })

  it('tracks the daily goal and streak', () => {
    let state = defaultState()
    state = recordResult(state, 'zoo', 'correct', 'zoo', at('2026-11-24T09:00:00'))
    state = recordResult(state, 'yacht', 'correct', 'yacht', at('2026-11-25T09:00:00'))
    expect(currentStreak(state, at('2026-11-25T20:00:00'))).toBe(2)
    expect(todayProgress(state, at('2026-11-25T20:00:00')).done).toBe(1)
    expect(overallStats(state, words, at('2026-11-25T20:00:00'))).toMatchObject({ tried: 2, correct: 2, accuracy: 100 })
  })

  it('keeps the best challenge score', () => {
    let state = recordSession(defaultState(), { mode: 'challenge', scope: 'Bee Challenge', total: 5, correct: 4, score: 120, date: '2026-11-25T10:00:00.000Z' })
    state = recordSession(state, { mode: 'challenge', scope: 'Bee Challenge', total: 2, correct: 1, score: 30, date: '2026-11-25T11:00:00.000Z' })
    expect(state.best.challenge).toBe(120)
    expect(state.history).toHaveLength(2)
  })
})

describe('storage', () => {
  it('survives junk and drops unknown words', () => {
    expect(sanitizeState('nonsense', VALID_IDS)).toEqual(defaultState())
    const clean = sanitizeState({ words: { zoo: { state: 'review', correct: 2, misses: ['zo', 5] }, fake: { state: 'review' } }, settings: { rate: 9, accent: 'fr' } }, VALID_IDS)
    expect(Object.keys(clean.words)).toEqual(['zoo'])
    expect(clean.words.zoo.misses).toEqual(['zo'])
    expect(clean.settings).toMatchObject({ rate: 0.85, accent: 'en-US' })
  })

  it('round-trips a backup and rejects other files', () => {
    const state = recordResult(defaultState(), 'zoo', 'correct', 'zoo')
    expect(parseImport(exportJson(state), VALID_IDS).words.zoo.correct).toBe(1)
    expect(() => parseImport('{"app":"vocab11","words":{}}', VALID_IDS)).toThrow(/SpellingBee backup/)
  })
})

describe('word sets', () => {
  it('parses and filters sets', () => {
    const state = defaultState()
    expect(parseSet('lecture-13')).toBe('lecture-13')
    expect(parseSet('lecture-12')).toBe('all')
    expect(parseSet('letter-x')).toBe('letter-x')
    expect(wordsForSet('list', state)).toHaveLength(232)
    expect(wordsForSet('letter-x', state).map((word) => word.word)).toEqual(['Xenophobe', 'Xerox', 'Xylophone'])
    expect(wordsForSet('lecture-21', state).length).toBe(25)
  })

  it('puts tricky words first in a smart review', () => {
    const state = recordResult(defaultState(), 'rhythm', 'wrong', 'rythm')
    expect(prioritizedWords(state, 5)[0].id).toBe('rhythm')
    expect(wordsForSet('smart', state, new Date(), words, 10)).toHaveLength(10)
  })
})
