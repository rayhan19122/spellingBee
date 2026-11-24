import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, PencilLine, Play, RotateCcw, Volume2, X, XCircle } from 'lucide-react'
import { useProgress } from '../hooks/useProgress'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSound } from '../hooks/useSound'
import { useSpeech } from '../hooks/useSpeech'
import { parseSet, setLabel, setOptions, wordsForSet } from '../utils/sources'
import { checkSpelling, spelledOut } from '../utils/spelling'
import { shuffle } from '../utils/random'
import { cn } from '../utils/cn'
import { Badge } from '../components/common/Badge'
import { Button, IconButton } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Segmented, SelectField } from '../components/common/Field'
import { PageHeader } from '../components/common/PageHeader'
import { ProgressBar } from '../components/common/ProgressBar'
import { AnswerInput } from '../components/bee/AnswerInput'
import { LetterDiff } from '../components/bee/LetterDiff'
import { HighlightedSentence } from '../components/words/HighlightedSentence'

const STEPS = [
  { key: 'look', label: 'Look & say', icon: Eye },
  { key: 'write', label: 'Cover & write', icon: EyeOff },
  { key: 'check', label: 'Check', icon: CheckCircle2 },
]

export default function Study() {
  usePageTitle('Study')
  const { state, now } = useProgress()
  const [set, setSet] = useState(() => parseSet(new URLSearchParams(window.location.search).get('set'), 'smart'))
  const [count, setCount] = useState(10)
  const [deck, setDeck] = useState(null)
  const options = useMemo(() => setOptions(state, now), [state, now])

  const start = () => {
    const pool = wordsForSet(set, state, now, undefined, count)
    const words = set === 'smart' ? pool.slice(0, count) : shuffle(pool).slice(0, count)
    if (words.length) setDeck({ words, scope: setLabel(set), key: Date.now() })
  }

  if (deck) return <StudyDeck key={deck.key} words={deck.words} onExit={() => setDeck(null)} onRestart={start} />

  return (
    <>
      <PageHeader eyebrow="Learn" title="Look, Say, Cover, Write, Check" description="The classic way to learn a spelling: study the word, hide it, write it from memory, then compare." />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.key} className="rounded-xl bg-surface-2 p-4">
                <step.icon aria-hidden="true" className="size-5 text-brand" />
                <p className="mt-2 font-semibold">
                  {index + 1}. {step.label}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {index === 0 && 'Look at the letters, hear the word and say it. Notice the tricky part.'}
                  {index === 1 && 'The word is hidden. Type it from memory.'}
                  {index === 2 && 'See every letter you got right or wrong. Missed words come back sooner.'}
                </p>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="flex flex-col gap-5">
          <SelectField label="Words" value={set} onChange={(event) => setSet(event.target.value)} options={options} />
          <Segmented legend="How many" options={[5, 10, 20].map((value) => ({ value, label: String(value) }))} value={count} onChange={setCount} columns="grid-cols-3" />
          <Button size="lg" icon={Play} onClick={start} disabled={!wordsForSet(set, state, now, undefined, count).length}>
            Start studying
          </Button>
        </Card>
      </div>
    </>
  )
}

function StudyDeck({ words, onExit, onRestart }) {
  const { state, actions } = useProgress()
  const { supported, speak } = useSpeech()
  const play = useSound()
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState('look')
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const inputRef = useRef(null)
  const nextRef = useRef(null)
  const word = words[index]
  const done = index >= words.length

  useEffect(() => {
    if (done) return
    if (step === 'look') speak(word.word)
    if (step === 'write') inputRef.current?.focus()
    if (step === 'check') nextRef.current?.focus()
    // Runs when the word or step changes.
  }, [index, step, done]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return (
      <Card className="mx-auto max-w-xl animate-fade-up text-center">
        <p className="t-eyebrow">Study session complete</p>
        <p className="mt-3 font-display text-6xl font-bold text-brand">
          {score}/{words.length}
        </p>
        <p className="mt-2 text-muted">spelled right on the first try</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button icon={RotateCcw} onClick={onRestart}>
            Study more
          </Button>
          <Button variant="secondary" onClick={onExit}>
            Done
          </Button>
        </div>
      </Card>
    )
  }

  const check = (event) => {
    event.preventDefault()
    if (!typed.trim()) return
    const outcome = checkSpelling(word, typed, { acceptVariants: state.settings.acceptVariants })
    // Only the first try at a word counts towards progress; "try again" is extra practice.
    if (attempt === 0) {
      actions.recordResult(word.id, outcome.correct ? 'correct' : 'wrong', typed)
      if (outcome.correct) setScore((value) => value + 1)
    }
    play(outcome.correct ? 'correct' : 'wrong')
    setResult({ ...outcome, typed })
    setStep('check')
  }

  const next = () => {
    setIndex(index + 1)
    setStep('look')
    setTyped('')
    setResult(null)
    setAttempt(0)
  }

  const again = () => {
    setStep('look')
    setTyped('')
    setResult(null)
    setAttempt((value) => value + 1)
  }

  const stepIndex = STEPS.findIndex((item) => item.key === step)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <IconButton icon={X} label="End study session" onClick={onExit} />
        <ProgressBar value={index} max={words.length} label="Study progress" className="flex-1" />
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {index + 1}/{words.length}
        </p>
      </div>

      <ol className="mb-4 grid grid-cols-3 gap-2" aria-label="Steps">
        {STEPS.map((item, position) => (
          <li
            key={item.key}
            aria-current={item.key === step ? 'step' : undefined}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold sm:text-sm',
              item.key === step ? 'bg-brand text-on-brand' : position < stepIndex ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted',
            )}
          >
            <item.icon aria-hidden="true" className="size-4" />
            {item.label}
          </li>
        ))}
      </ol>

      <Card className="!px-4 !py-8 text-center sm:!px-10 sm:!py-10">
        {step === 'look' && (
          <div className="flex animate-pop flex-col items-center">
            <p className="font-display text-5xl font-bold tracking-tight sm:text-6xl">{word.word}</p>
            <p className="mt-4 flex flex-wrap justify-center gap-1" aria-hidden="true">
              {[...word.word].map((letter, position) => (
                <span key={position} className="grid h-10 min-w-8 place-items-center rounded-lg bg-surface-2 px-1 font-mono text-lg uppercase">
                  {letter}
                </span>
              ))}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {word.note && <Badge tone="info">{word.note}</Badge>}
              {word.variants.length > 0 && <Badge>Also: {word.variants.join(', ')}</Badge>}
            </div>
            <p className="mt-4 max-w-lg text-muted">
              {word.pos && <span className="font-semibold text-ink">({word.pos}) </span>}
              {word.meaning}
            </p>
            <p className="t-quote mt-4 max-w-lg text-left">
              <HighlightedSentence word={word.word} sentence={word.sentences[0]} />
            </p>
            {supported && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="secondary" size="sm" icon={Volume2} onClick={() => speak(word.word)}>
                  Say it
                </Button>
                <Button variant="secondary" size="sm" icon={Volume2} onClick={() => speak(spelledOut(word.word), { slow: true })}>
                  Spell it out loud
                </Button>
              </div>
            )}
            <Button size="lg" icon={EyeOff} onClick={() => setStep('write')} className="mt-6 min-w-56">
              Cover & write
            </Button>
          </div>
        )}

        {step === 'write' && (
          <form onSubmit={check} className="mx-auto flex max-w-xl animate-pop flex-col gap-3">
            <p className="t-eyebrow">Write it from memory</p>
            <p className="text-muted">{word.meaning}</p>
            <AnswerInput ref={inputRef} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Type the word…" />
            <Button type="submit" size="lg" icon={PencilLine} disabled={!typed.trim()}>
              Check
            </Button>
          </form>
        )}

        {step === 'check' && result && (
          <div className="flex animate-pop flex-col items-center">
            <p className={cn('flex items-center gap-2 text-lg font-bold', result.correct ? 'text-ok' : 'text-danger')} role="status">
              {result.correct ? <CheckCircle2 aria-hidden="true" className="size-6" /> : <XCircle aria-hidden="true" className="size-6" />}
              {result.correct ? 'Correct!' : 'Not quite'}
            </p>
            <p className="mt-3 font-display text-4xl font-bold">{word.word}</p>
            {!result.correct && <LetterDiff expected={word.word} typed={result.typed.trim()} className="mt-4" />}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {!result.correct && (
                <Button variant="secondary" icon={RotateCcw} onClick={again}>
                  Look again & retry
                </Button>
              )}
              <Button ref={nextRef} iconRight={ArrowRight} onClick={next}>
                {index + 1 < words.length ? 'Next word' : 'Finish'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
