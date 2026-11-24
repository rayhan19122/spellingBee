// Pure state transitions and selectors for the learner's progress. No React, no storage.
import { dayKey, yesterdayKey } from './date'
import { applyResult, emptyWord, isDue, isLearned, isWeak, wordAccuracy } from './spacedRepetition'
import { normalizeSpelling } from './spelling'

export const MAX_HISTORY = 100
export const MAX_DAYS = 90
export const MAX_MISSES = 3

export const wordRecord = (state, id) => state.words[id] || emptyWord()

// ---------- transitions ----------

function touchStudyDay(state, wordId, { answered = 0, correct = 0 }, now) {
  const today = dayKey(now)
  const sameDay = state.today.date === today
  const ids = sameDay ? state.today.ids : []
  const nextIds = ids.includes(wordId) ? ids : [...ids, wordId]

  const day = state.days[today] || { answered: 0, correct: 0, words: 0 }
  const days = {
    ...state.days,
    [today]: { answered: day.answered + answered, correct: day.correct + correct, words: nextIds.length },
  }
  const keys = Object.keys(days).sort()
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_DAYS))) delete days[key]

  let { current, longest, lastDay } = state.streak
  if (lastDay !== today) {
    current = lastDay === yesterdayKey(now) ? current + 1 : 1
    longest = Math.max(longest, current)
    lastDay = today
  }
  return { ...state, days, today: { date: today, ids: nextIds }, streak: { current, longest, lastDay } }
}

/**
 * Records one answer for a word.
 * result: 'correct' | 'wrong' | 'hinted' | 'mastered' | 'needs-review'
 * typed:  what the learner typed (kept for wrong answers, so the app can show "you usually write ...").
 */
export function recordResult(state, wordId, result, typed = '', now = new Date()) {
  const record = applyResult(state.words[wordId], result, now)
  const miss = result === 'wrong' ? normalizeSpelling(typed) : ''
  const previous = state.words[wordId]?.misses || []
  record.misses = miss ? [miss, ...previous.filter((item) => item !== miss)].slice(0, MAX_MISSES) : previous
  const next = { ...state, words: { ...state.words, [wordId]: record } }
  const graded = result === 'correct' || result === 'wrong'
  return touchStudyDay(next, wordId, { answered: graded ? 1 : 0, correct: result === 'correct' ? 1 : 0 }, now)
}

export function recordSession(state, session) {
  const entry = { ...session, id: `${session.date}-${state.history.length}` }
  const best = session.mode === 'challenge' ? Math.max(state.best.challenge, session.score || 0) : state.best.challenge
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY), best: { ...state.best, challenge: best } }
}

// ---------- selectors ----------

export function overallStats(state, words, now = new Date()) {
  const records = words.map((word) => wordRecord(state, word.id))
  const correct = records.reduce((sum, record) => sum + record.correct, 0)
  const wrong = records.reduce((sum, record) => sum + record.wrong, 0)
  const learned = records.filter(isLearned).length
  return {
    total: words.length,
    tried: records.filter((record) => record.state !== 'new').length,
    learned,
    mastered: records.filter((record) => record.state === 'mastered').length,
    correct,
    wrong,
    answered: correct + wrong,
    accuracy: correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : null,
    due: records.filter((record) => isDue(record, now)).length,
    tricky: records.filter(isWeak).length,
  }
}

export const trickyWordIds = (state, words) => words.filter((word) => isWeak(state.words[word.id])).map((word) => word.id)

export const dueWords = (state, words, now = new Date()) => words.filter((word) => isDue(state.words[word.id], now))

export function todayProgress(state, now = new Date()) {
  const today = dayKey(now)
  const done = state.today.date === today ? state.today.ids.length : 0
  const goal = state.settings.dailyGoal
  return { done, goal, percent: Math.min(100, Math.round((done / goal) * 100)) }
}

/** Streak as shown to the learner: it only counts if the learner practised today or yesterday. */
export function currentStreak(state, now = new Date()) {
  const { current, lastDay } = state.streak
  return lastDay === dayKey(now) || lastDay === yesterdayKey(now) ? current : 0
}

export function mostMissed(state, words, limit = 5) {
  return words
    .map((word) => ({ word, record: wordRecord(state, word.id) }))
    .filter(({ record }) => record.wrong > 0)
    .sort((a, b) => b.record.wrong - a.record.wrong || (wordAccuracy(a.record) ?? 0) - (wordAccuracy(b.record) ?? 0))
    .slice(0, limit)
}

/** The last `count` days (oldest first) with answered/correct totals, for the activity chart. */
export function recentDays(state, count = 14, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - 1 - index))
    const key = dayKey(date)
    const day = state.days[key] || { answered: 0, correct: 0, words: 0 }
    return { key, date, ...day }
  })
}
