import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, CircleAlert, Lightbulb, Volume2, XCircle } from 'lucide-react'
import { wordsById } from '../../data/words'
import { useProgress } from '../../hooks/useProgress'
import { useSpeech } from '../../hooks/useSpeech'
import { checkSpelling, normalizeSpelling, spelledOut } from '../../utils/spelling'
import { slugify } from '../../utils/slug'
import { cn } from '../../utils/cn'
import { Button } from '../common/Button'
import { AnswerInput } from './AnswerInput'
import { LetterDiff } from './LetterDiff'

/**
 * Shown after an answer. For a wrong answer: the correct spelling letter by letter against what was typed,
 * the meaning, and (if "Retype mistakes" is on) a box where the learner types the word correctly once.
 * Enter moves on.
 */
export function Feedback({ word, answer, onNext, nextLabel = 'Next word', previousMisses = [] }) {
  const { state } = useProgress()
  const { supported, speak } = useSpeech()
  const needsRetype = !answer.correct && state.settings.retype
  const [retyped, setRetyped] = useState('')
  const [retypeWrong, setRetypeWrong] = useState(false)
  const [retypeDone, setRetypeDone] = useState(!needsRetype)
  const nextRef = useRef(null)
  const retypeRef = useRef(null)

  useEffect(() => {
    if (needsRetype) retypeRef.current?.focus()
    else nextRef.current?.focus()
  }, [needsRetype])

  useEffect(() => {
    if (retypeDone && needsRetype) nextRef.current?.focus()
  }, [retypeDone, needsRetype])

  const onRetype = (event) => {
    event.preventDefault()
    if (checkSpelling(word, retyped, { acceptVariants: state.settings.acceptVariants }).correct) setRetypeDone(true)
    else setRetypeWrong(true)
  }

  const soundAlike = answer.soundsLike ? wordsById[slugify(answer.soundsLike)] : null
  const usual = previousMisses.find((miss) => miss !== normalizeSpelling(answer.typed))

  const tone = answer.correct ? (answer.hinted ? 'warn' : 'ok') : 'danger'
  const Icon = answer.correct ? (answer.hinted ? Lightbulb : CheckCircle2) : XCircle
  const title = answer.correct ? (answer.hinted ? 'Correct, with help' : 'Correct!') : 'Not quite'

  return (
    <div className="flex animate-pop flex-col items-center text-center">
      <p className={cn('flex items-center gap-2 text-lg font-bold', { ok: 'text-ok', warn: 'text-warn', danger: 'text-danger' }[tone])} role="status">
        <Icon aria-hidden="true" className="size-6" />
        {title}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <p className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{word.word}</p>
        {supported && (
          <button type="button" onClick={() => speak(word.word)} aria-label={`Hear ${word.word}`} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-brand">
            <Volume2 aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      {answer.variant && <p className="mt-1 text-sm text-muted">You wrote “{answer.variant}”, which is also accepted.</p>}

      {!answer.correct && (
        <>
          <p className="mt-3 text-sm text-muted">
            {answer.typed.trim() ? (
              <>
                Your answer: <span className="font-mono text-base text-ink">“{answer.typed.trim()}”</span>
              </>
            ) : (
              'Time’s up!'
            )}
          </p>
          <LetterDiff expected={word.word} typed={answer.typed.trim()} className="mt-4" />
          {answer.soundsLike && (
            <p className="mt-4 flex max-w-lg items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 text-left text-sm text-warn">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                “{answer.soundsLike}” sounds the same but is a different word{soundAlike ? `: ${soundAlike.meaning}` : ''}. The word asked was “{word.word}”: {word.meaning}.
              </span>
            </p>
          )}
          {usual && (
            <p className="mt-3 text-sm text-muted">
              Last time you wrote <span className="font-mono text-ink">“{usual}”</span>.
            </p>
          )}
        </>
      )}

      <p className="mt-4 max-w-lg text-muted">
        {word.pos && <span className="font-semibold text-ink">({word.pos}) </span>}
        {word.meaning}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {supported && (
          <Button variant="secondary" size="sm" icon={Volume2} onClick={() => speak(spelledOut(word.word), { slow: true })}>
            Spell it out loud
          </Button>
        )}
      </div>

      {needsRetype && !retypeDone ? (
        <form onSubmit={onRetype} className="mt-6 flex w-full max-w-xl flex-col gap-3">
          <p className="text-sm font-semibold">Type it correctly once to lock it in</p>
          <AnswerInput
            ref={retypeRef}
            id="retype"
            label="Type the correct spelling"
            value={retyped}
            invalid={retypeWrong}
            className={retypeWrong ? 'animate-shake' : undefined}
            onChange={(event) => {
              setRetyped(event.target.value)
              setRetypeWrong(false)
            }}
            placeholder="Type it here…"
          />
          {retypeWrong && <p className="text-sm text-danger">Not yet. Look at the tiles above and try again.</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="submit" disabled={!retyped.trim()}>
              Check
            </Button>
            <Button variant="ghost" onClick={() => setRetypeDone(true)}>
              Skip
            </Button>
          </div>
        </form>
      ) : (
        <Button ref={nextRef} size="lg" iconRight={ArrowRight} onClick={onNext} className="mt-6 min-w-48" autoFocus>
          {nextLabel}
        </Button>
      )}
    </div>
  )
}
