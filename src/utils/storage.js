// The only module that touches localStorage. Everything else works with plain state objects.
// Reads never throw: missing, corrupted or out-of-date data falls back to defaults.
import { emptyWord, STATES } from './spacedRepetition'
import { MAX_DAYS, MAX_HISTORY, MAX_MISSES } from './progress'

export const STORAGE_KEY = 'spellingbee:state:v1'
const STATE_VERSION = 1

export const THEMES = ['system', 'light', 'dark']
export const DAILY_GOALS = [10, 20, 30, 50]
export const ACCENTS = ['en-US', 'en-GB']
export const MODES = ['listen', 'choose', 'fix', 'missing', 'mixed', 'challenge', 'study']

export function defaultSettings() {
  return {
    name: '',
    theme: 'system',
    dailyGoal: 20,
    sound: true,
    accent: 'en-US',
    voice: '',
    rate: 0.85,
    acceptVariants: true,
    retype: true,
    autoPlay: true,
  }
}

export function defaultState() {
  return {
    version: STATE_VERSION,
    words: {},
    history: [],
    days: {},
    today: { date: null, ids: [] },
    streak: { current: 0, longest: 0, lastDay: null },
    best: { challenge: 0 },
    settings: defaultSettings(),
  }
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const toCount = (value) => (Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0)
const toDate = (value) => (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()) ? value : null)
const toDay = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null)
const toText = (value, max = 60) => (typeof value === 'string' ? value.slice(0, max) : '')

function sanitizeWords(raw, validIds) {
  const words = {}
  if (!isObject(raw)) return words
  for (const [id, record] of Object.entries(raw)) {
    if (!validIds.has(id) || !isObject(record)) continue
    words[id] = {
      ...emptyWord(),
      state: STATES.includes(record.state) ? record.state : 'new',
      correct: toCount(record.correct),
      wrong: toCount(record.wrong),
      streak: toCount(record.streak),
      lastReviewed: toDate(record.lastReviewed),
      due: toDate(record.due),
      misses: Array.isArray(record.misses) ? record.misses.filter((item) => typeof item === 'string' && item).map((item) => item.slice(0, 40)).slice(0, MAX_MISSES) : [],
    }
  }
  return words
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => isObject(item) && toDate(item.date) && toCount(item.total) > 0)
    .slice(0, MAX_HISTORY)
    .map((item) => ({
      id: String(item.id ?? item.date),
      mode: MODES.includes(item.mode) ? item.mode : 'listen',
      scope: toText(item.scope) || 'All words',
      total: toCount(item.total),
      correct: Math.min(toCount(item.correct), toCount(item.total)),
      score: toCount(item.score),
      seconds: toCount(item.seconds),
      date: item.date,
    }))
}

function sanitizeDays(raw) {
  const days = {}
  if (!isObject(raw)) return days
  const keys = Object.keys(raw).filter((key) => toDay(key)).sort().slice(-MAX_DAYS)
  for (const key of keys) {
    const day = raw[key]
    if (!isObject(day)) continue
    days[key] = { answered: toCount(day.answered), correct: toCount(day.correct), words: toCount(day.words) }
  }
  return days
}

function sanitizeSettings(raw) {
  const base = defaultSettings()
  const settings = isObject(raw) ? raw : {}
  const bool = (key) => (typeof settings[key] === 'boolean' ? settings[key] : base[key])
  return {
    name: typeof settings.name === 'string' ? settings.name.trim().slice(0, 30) : base.name,
    theme: THEMES.includes(settings.theme) ? settings.theme : base.theme,
    dailyGoal: Number.isFinite(settings.dailyGoal) && settings.dailyGoal >= 1 && settings.dailyGoal <= 200 ? Math.floor(settings.dailyGoal) : base.dailyGoal,
    sound: bool('sound'),
    accent: ACCENTS.includes(settings.accent) ? settings.accent : base.accent,
    voice: toText(settings.voice, 200),
    rate: Number.isFinite(settings.rate) && settings.rate >= 0.5 && settings.rate <= 1.3 ? Math.round(settings.rate * 100) / 100 : base.rate,
    acceptVariants: bool('acceptVariants'),
    retype: bool('retype'),
    autoPlay: bool('autoPlay'),
  }
}

/** Turns anything (parsed JSON of unknown shape) into a valid state. `validIds` is the set of real word IDs. */
export function sanitizeState(raw, validIds) {
  const base = defaultState()
  if (!isObject(raw)) return base
  const streak = isObject(raw.streak) ? raw.streak : {}
  const today = isObject(raw.today) ? raw.today : {}
  const best = isObject(raw.best) ? raw.best : {}
  return {
    version: STATE_VERSION,
    words: sanitizeWords(raw.words, validIds),
    history: sanitizeHistory(raw.history),
    days: sanitizeDays(raw.days),
    today: {
      date: toDay(today.date),
      ids: Array.isArray(today.ids) ? today.ids.filter((id) => validIds.has(id)) : [],
    },
    streak: { current: toCount(streak.current), longest: toCount(streak.longest), lastDay: toDay(streak.lastDay) },
    best: { challenge: toCount(best.challenge) },
    settings: sanitizeSettings(raw.settings),
  }
}

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function loadState(validIds) {
  const text = readRaw()
  if (!text) return defaultState()
  try {
    return sanitizeState(JSON.parse(text), validIds)
  } catch {
    return defaultState()
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode, blocked cookies): nothing to clear.
  }
}

export function exportJson(state) {
  return JSON.stringify({ app: 'spellingbee', exportedAt: new Date().toISOString(), ...state }, null, 2)
}

/** Parses an exported file. Throws an Error with a user-readable message if it is not a SpellingBee backup. */
export function parseImport(text, validIds) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!isObject(parsed) || parsed.app !== 'spellingbee' || !isObject(parsed.words)) {
    throw new Error('That file does not look like a SpellingBee backup.')
  }
  return sanitizeState(parsed, validIds)
}
