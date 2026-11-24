import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ear, ListChecks, PencilLine, Play, Puzzle, Shuffle, VolumeX } from 'lucide-react'
import { wordsById } from '../data/words'
import { useProgress } from '../hooks/useProgress'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSpeech } from '../hooks/useSpeech'
import { parseSet, setLabel, setOptions, wordsForSet } from '../utils/sources'
import { buildSession, DIFFICULTIES, makeQuestion, MODE_INFO, PRACTICE_MODES, QUESTION_COUNTS } from '../utils/session'
import { shuffle } from '../utils/random'
import { cn } from '../utils/cn'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { Segmented, SelectField } from '../components/common/Field'
import { PageHeader } from '../components/common/PageHeader'
import { SessionRunner } from '../components/bee/SessionRunner'

const MODE_ICONS = { listen: Ear, choose: ListChecks, fix: PencilLine, missing: Puzzle, mixed: Shuffle }
const DIFFICULTY_LABELS = { any: 'Any', easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export default function Practice() {
  usePageTitle('Practice')
  const [params] = useSearchParams()
  const { state, now } = useProgress()
  const { supported } = useSpeech()

  const [set, setSet] = useState(() => parseSet(params.get('set'), 'smart'))
  const [mode, setMode] = useState(() => (PRACTICE_MODES.includes(params.get('mode')) ? params.get('mode') : 'listen'))
  const [count, setCount] = useState(() => (QUESTION_COUNTS.includes(Number(params.get('count'))) ? Number(params.get('count')) : 10))
  const [difficulty, setDifficulty] = useState('any')
  // Links like /practice?set=tricky&mode=listen&start=1 jump straight into a session.
  const [session, setSession] = useState(() => {
    if (!params.get('start')) return null
    const questions = buildSession({ pool: wordsForSet(set, state, now, undefined, count), count, mode, ordered: set === 'smart' })
    return questions.length ? { questions, mode, scope: setLabel(set), key: Date.now() } : null
  })

  const options = useMemo(() => setOptions(state, now), [state, now])
  const pool = useMemo(() => wordsForSet(set, state, now), [set, state, now])
  const available = difficulty === 'any' ? pool.length : pool.filter((word) => word.difficulty === difficulty).length

  const start = (overrides = {}) => {
    const settings = { set, mode, count, difficulty, ...overrides }
    const smart = settings.set === 'smart'
    const pool = wordsForSet(settings.set, state, now, undefined, smart && settings.difficulty === 'any' ? settings.count : 300)
    const questions = buildSession({ pool, count: settings.count, mode: settings.mode, difficulty: settings.difficulty, ordered: smart })
    if (questions.length) setSession({ questions, mode: settings.mode, scope: setLabel(settings.set), key: Date.now() })
  }

  const retry = (ids) => {
    const questions = shuffle(ids).map((id, index) => makeQuestion(wordsById[id], 'listen', `r${index + 1}`))
    setSession({ questions, mode: 'listen', scope: 'Missed words', key: Date.now() })
  }

  if (session) {
    return (
      <SessionRunner
        key={session.key}
        questions={session.questions}
        mode={session.mode}
        scope={session.scope}
        onExit={() => setSession(null)}
        onRetry={retry}
        onRestart={() => start()}
      />
    )
  }

  return (
    <>
      <PageHeader eyebrow="Practice" title="Spelling practice" description="Pick your words and a way to practise. Every answer updates your progress and review schedule." />

      {!supported && (
        <p className="mb-6 flex items-center gap-2 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <VolumeX aria-hidden="true" className="size-4 shrink-0" />
          This browser cannot speak, so “Listen & spell” shows the meaning and sentence instead. Try Chrome, Edge or Safari for audio.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">How do you want to practise?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRACTICE_MODES.map((value) => {
                const Icon = MODE_ICONS[value]
                const selected = mode === value
                return (
                  <label
                    key={value}
                    className={cn(
                      'flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
                      selected ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong',
                    )}
                  >
                    <input type="radio" name="mode" value={value} checked={selected} onChange={() => setMode(value)} className="sr-only" />
                    <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', selected ? 'bg-brand text-on-brand' : 'bg-surface-2 text-brand')}>
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span>
                      <span className="block font-semibold">{MODE_INFO[value].label}</span>
                      <span className="block text-sm text-muted">{MODE_INFO[value].description}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </Card>

        <Card className="flex flex-col gap-5">
          <SelectField label="Words" value={set} onChange={(event) => setSet(event.target.value)} options={options} />
          <Segmented legend="Difficulty" options={DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] }))} value={difficulty} onChange={setDifficulty} columns="grid-cols-2" />
          <Segmented legend="Number of words" options={QUESTION_COUNTS.map((value) => ({ value, label: String(value) }))} value={count} onChange={setCount} columns="grid-cols-4" />
          <Button size="lg" icon={Play} onClick={() => start()} disabled={!available}>
            Start {Math.min(count, available) || ''} words
          </Button>
          {available > 0 && available < count && <p className="-mt-2 text-sm text-muted">Only {available} words match, so the session is shorter.</p>}
        </Card>
      </div>

      {!available && (
        <EmptyState
          className="mt-6"
          icon={ListChecks}
          title="No words here yet"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSet('all')
                setDifficulty('any')
              }}
            >
              Practise all words
            </Button>
          }
        >
          {set === 'tricky' ? 'Words you misspell will collect here.' : set === 'due' ? 'Nothing is due for review right now.' : 'Try another word set or difficulty.'}
        </EmptyState>
      )}
    </>
  )
}
