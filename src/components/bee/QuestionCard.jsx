import { useEffect, useRef, useState } from 'react'
import { BookOpenText, Ear, Hash, Lightbulb, MessageSquareQuote, Snail, Volume2 } from 'lucide-react'
import { useProgress } from '../../hooks/useProgress'
import { useSpeech } from '../../hooks/useSpeech'
import { checkSpelling } from '../../utils/spelling'
import { sentenceClue } from '../../utils/session'
import { cn } from '../../utils/cn'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { AnswerInput } from './AnswerInput'

const PROMPTS = {
  listen: 'Listen and spell the word',
  choose: 'Choose the correct spelling',
  fix: 'This word is misspelled. Type it correctly',
  missing: 'Fill in the missing letters and type the whole word',
}

function ClueButton({ icon, active, children, ...props }) {
  return (
    <Button variant={active ? 'soft' : 'secondary'} size="sm" icon={icon} aria-pressed={active} {...props}>
      {children}
    </Button>
  )
}

/** First `count` letters shown, the rest as underscores: "acc__________". */
const revealPattern = (word, count) => [...word].map((char, index) => (index < count || !/[a-z]/i.test(char) ? char : '_')).join(' ')

/**
 * One spelling question. Calls onAnswer({ typed, correct, variant, soundsLike, hinted }) once.
 * kind: 'listen' | 'choose' | 'fix' | 'missing'
 * Clues the real bee allows (hear again, definition, sentence) are free; revealing letters marks the answer as "with help".
 */
export function QuestionCard({ word, question, onAnswer, autoFocus = true, extraClues = true, allowReveal = true }) {
  const { state } = useProgress()
  const { supported, speak, speaking } = useSpeech()
  const { acceptVariants, autoPlay } = state.settings
  const [typed, setTyped] = useState('')
  const [revealed, setRevealed] = useState(0)
  const [showMeaning, setShowMeaning] = useState(word.soundsLike.length > 0)
  const [showSentence, setShowSentence] = useState(false)
  const [showLength, setShowLength] = useState(false)
  const inputRef = useRef(null)
  const kind = question.kind
  const clue = sentenceClue(word, question.sentenceIndex)
  const letters = word.word.replace(/[^a-z]/gi, '').length

  // Say the word as soon as a listening question appears (choose/fix/missing show the word instead).
  useEffect(() => {
    if (kind === 'listen' && autoPlay) speak(word.word)
    if (autoFocus) inputRef.current?.focus()
    // Only when the question changes.
  }, [question.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (event) => {
    event?.preventDefault()
    if (!typed.trim()) {
      inputRef.current?.focus()
      return
    }
    onAnswer({ typed, ...checkSpelling(word, typed, { acceptVariants }), hinted: revealed > 0 })
  }

  const choose = (option) => onAnswer({ typed: option, correct: option === word.word, variant: null, soundsLike: null, hinted: false })

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      speak(word.word)
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="t-eyebrow">{PROMPTS[kind]}</p>

      {/* The word itself (or its stand-in) */}
      <div className="mt-5 flex min-h-24 flex-col items-center justify-center gap-3">
        {kind === 'listen' && (
          <button
            type="button"
            onClick={() => speak(word.word)}
            disabled={!supported}
            aria-label="Hear the word again"
            className={cn(
              'grid size-24 place-items-center rounded-full bg-brand text-on-brand shadow-pop transition hover:bg-brand-strong active:scale-95 disabled:opacity-50',
              speaking && 'ring-8 ring-brand/20',
            )}
          >
            <Volume2 aria-hidden="true" className="size-10" />
          </button>
        )}
        {kind === 'fix' && <p className="font-mono text-3xl tracking-wider text-danger line-through decoration-2 sm:text-4xl">{question.misspelled}</p>}
        {kind === 'missing' && (
          <p aria-label={`Pattern: ${question.mask.map((cell) => (cell.hidden ? 'blank' : cell.letter)).join(' ')}`} className="flex flex-wrap justify-center gap-1">
            {question.mask.map((cell, index) => (
              <span
                key={index}
                className={cn(
                  'grid h-12 min-w-9 place-items-center rounded-lg border-2 px-1 font-mono text-2xl uppercase',
                  cell.hidden ? 'border-dashed border-brand bg-brand-soft text-transparent' : 'border-line bg-surface-2',
                )}
              >
                {cell.hidden ? '_' : cell.letter}
              </span>
            ))}
          </p>
        )}
        {kind === 'choose' && (
          <div className="flex items-center gap-2">
            <p className="max-w-md text-lg font-semibold">{word.meaning}</p>
            {supported && (
              <button type="button" onClick={() => speak(word.word)} aria-label="Hear the word" className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <Volume2 aria-hidden="true" className="size-5" />
              </button>
            )}
          </div>
        )}
        {(word.note || word.soundsLike.length > 0) && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {word.note && <Badge tone="info">{word.note}</Badge>}
            {word.soundsLike.length > 0 && kind === 'listen' && <Badge tone="warn">Sounds like another word: read the meaning</Badge>}
          </div>
        )}
      </div>

      {/* Clues */}
      {kind !== 'choose' && extraClues && (
        <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Clues">
          {supported && kind === 'listen' && (
            <>
              <ClueButton icon={Ear} onClick={() => speak(word.word)}>
                Again
              </ClueButton>
              <ClueButton icon={Snail} onClick={() => speak(word.word, { slow: true })}>
                Slowly
              </ClueButton>
            </>
          )}
          <ClueButton icon={BookOpenText} active={showMeaning} onClick={() => setShowMeaning((value) => !value)}>
            Definition
          </ClueButton>
          {clue && (
            <ClueButton
              icon={MessageSquareQuote}
              active={showSentence}
              onClick={() => {
                setShowSentence(true)
                if (kind === 'listen') speak(clue.sentence)
              }}
            >
              Sentence
            </ClueButton>
          )}
          {kind === 'listen' && (
            <>
              <ClueButton icon={Hash} active={showLength} onClick={() => setShowLength(true)}>
                Letters
              </ClueButton>
              {allowReveal && (
                <ClueButton icon={Lightbulb} onClick={() => setRevealed((count) => Math.min(count + 1, letters - 1))} disabled={revealed >= letters - 1}>
                  Reveal a letter
                </ClueButton>
              )}
            </>
          )}
        </div>
      )}

      <div aria-live="polite" className="mt-4 flex w-full max-w-xl flex-col gap-2">
        {showMeaning && kind !== 'choose' && (
          <p className="animate-reveal rounded-xl bg-surface-2 px-4 py-2.5 text-left text-sm">
            <span className="font-semibold">{word.pos ? `(${word.pos}) ` : ''}</span>
            {word.meaning}
          </p>
        )}
        {showSentence && clue && (
          <p className="animate-reveal rounded-xl bg-surface-2 px-4 py-2.5 text-left text-sm italic">
            {clue.before}
            <span className="mx-0.5 inline-block min-w-14 border-b-2 border-brand align-baseline not-italic">&nbsp;</span>
            {clue.after}
          </p>
        )}
        {(showLength || revealed > 0) && kind === 'listen' && (
          <p className="animate-reveal text-sm text-muted">
            {letters} letters{revealed > 0 && <span className="ml-2 font-mono text-base tracking-wide text-ink">{revealPattern(word.word, revealed)}</span>}
            {revealed > 0 && <span className="ml-2 text-warn">(with help)</span>}
          </p>
        )}
      </div>

      {/* Answer */}
      {kind === 'choose' ? (
        <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
          {question.options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              className="flex h-14 items-center gap-3 rounded-xl border-2 border-line-strong bg-surface px-4 text-left font-mono text-xl transition hover:border-brand hover:bg-brand-soft"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-2 font-sans text-xs font-bold text-muted">{index + 1}</span>
              {option}
            </button>
          ))}
          <ChooseKeys options={question.options} onChoose={choose} />
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex w-full max-w-xl flex-col gap-3">
          <AnswerInput ref={inputRef} value={typed} onChange={(event) => setTyped(event.target.value)} onKeyDown={onKeyDown} placeholder="Type the spelling…" />
          <Button type="submit" size="lg" disabled={!typed.trim()}>
            Check spelling
          </Button>
          {kind === 'listen' && supported && <p className="text-xs text-muted">Press Enter to check · Esc to hear the word again</p>}
        </form>
      )}
    </div>
  )
}

/** Number keys 1-4 pick an option in "Choose the spelling". */
function ChooseKeys({ options, onChoose }) {
  const ref = useRef(onChoose)
  useEffect(() => {
    ref.current = onChoose
  })
  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return
      const index = Number(event.key) - 1
      if (index >= 0 && index < options.length) {
        event.preventDefault()
        ref.current(options[index])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options])
  return null
}
