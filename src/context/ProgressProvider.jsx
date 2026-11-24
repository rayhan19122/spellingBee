import { useEffect, useMemo, useReducer, useState } from 'react'
import { words } from '../data/words'
import { clearState, loadState, saveState, defaultState } from '../utils/storage'
import { currentStreak, dueWords, overallStats, recordResult, recordSession, todayProgress, trickyWordIds } from '../utils/progress'
import { VALID_IDS } from '../utils/ids'
import { ProgressContext } from './progressContext'


function reducer(state, action) {
  switch (action.type) {
    case 'result':
      return recordResult(state, action.wordId, action.result, action.typed)
    case 'session':
      return recordSession(state, action.session)
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'replace':
      return action.state
    case 'reset':
      return { ...defaultState(), settings: state.settings }
    default:
      return state
  }
}

function useThemeSync(theme) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

// The current time, refreshed every minute so "due for review" and the daily goal stay accurate while the app is open.
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function ProgressProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => loadState(VALID_IDS))
  const now = useNow()

  useEffect(() => {
    saveState(state)
  }, [state])

  useThemeSync(state.settings.theme)

  const actions = useMemo(
    () => ({
      recordResult: (wordId, result, typed = '') => dispatch({ type: 'result', wordId, result, typed }),
      recordSession: (session) => dispatch({ type: 'session', session }),
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      replaceState: (next) => dispatch({ type: 'replace', state: next }),
      resetProgress: () => {
        clearState()
        dispatch({ type: 'reset' })
      },
    }),
    [],
  )

  const value = useMemo(
    () => ({
      state,
      actions,
      now,
      derived: {
        overall: overallStats(state, words, now),
        today: todayProgress(state, now),
        streak: currentStreak(state, now),
        trickyIds: trickyWordIds(state, words),
        dueIds: dueWords(state, words, now).map((word) => word.id),
      },
    }),
    [state, actions, now],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}
