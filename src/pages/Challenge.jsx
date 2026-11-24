import { useEffect, useRef, useState } from 'react'
import { Crown, Heart, HeartCrack, Play, Timer, Trophy, X } from 'lucide-react'
import { wordsById } from '../data/words'
import { useProgress } from '../hooks/useProgress'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSound } from '../hooks/useSound'
import { CHALLENGE_LIVES, CHALLENGE_SECONDS, challengePoints, challengeTier, makeQuestion, nextChallengeWord, resultOf } from '../utils/session'
import { cn } from '../utils/cn'
import { Badge } from '../components/common/Badge'
import { Button, IconButton } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Segmented } from '../components/common/Field'
import { PageHeader } from '../components/common/PageHeader'
import { ProgressBar } from '../components/common/ProgressBar'
import { Feedback } from '../components/bee/Feedback'
import { QuestionCard } from '../components/bee/QuestionCard'
import { SpeakButton } from '../components/bee/SpeakButton'

const TIER_LABEL = { easy: 'Easy round', medium: 'Medium round', hard: 'Hard round' }

function newRound(round, usedIds) {
  const word = nextChallengeWord(round, usedIds)
  return { word, question: makeQuestion(word, 'listen', `c${round}`), startedAt: Date.now() }
}

export default function Challenge() {
  usePageTitle('Bee Challenge')
  const { state, actions } = useProgress()
  const play = useSound()
  const best = state.best.challenge
  const [timed, setTimed] = useState(true)
  const [game, setGame] = useState(null)

  const start = () => {
    const used = new Set()
    const first = newRound(1, used)
    used.add(first.word.id)
    setGame({ round: 1, lives: CHALLENGE_LIVES, score: 0, used, current: first, phase: 'question', answer: null, log: [], startedAt: Date.now(), previousBest: best })
  }

  if (!game) {
    return (
      <>
        <PageHeader eyebrow="Game" title="Bee Challenge" description="How long can you last? Words start easy and get harder. Three mistakes and you are out." />
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Card>
            <ul className="flex flex-col gap-4">
              <li className="flex gap-3">
                <Heart aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
                <span>You have <strong>{CHALLENGE_LIVES} lives</strong>. A wrong spelling costs one.</span>
              </li>
              <li className="flex gap-3">
                <Crown aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
                <span>Rounds 1–5 are easy, 6–12 medium, then every word is hard.</span>
              </li>
              <li className="flex gap-3">
                <Trophy aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
                <span>Harder and longer words score more. In timed mode, answering fast earns a bonus.</span>
              </li>
              <li className="flex gap-3">
                <Timer aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-info" />
                <span>Hear it again, slowly, the definition and a sentence are always allowed. Revealing letters is not.</span>
              </li>
            </ul>
          </Card>
          <Card className="flex flex-col gap-5">
            <div>
              <p className="t-label">Your best score</p>
              <p className="mt-1 font-display text-5xl font-bold text-brand">{best}</p>
            </div>
            <Segmented
              legend="Timer"
              options={[
                { value: true, label: `${CHALLENGE_SECONDS}s per word` },
                { value: false, label: 'No timer' },
              ]}
              value={timed}
              onChange={setTimed}
              columns="grid-cols-2"
            />
            <Button size="lg" icon={Play} onClick={start}>
              Start the challenge
            </Button>
          </Card>
        </div>
      </>
    )
  }

  return <ChallengeGame game={game} setGame={setGame} timed={timed} onRestart={start} onRecord={actions} play={play} />
}

function ChallengeGame({ game, setGame, timed, onRestart, onRecord, play }) {
  const { word, question, startedAt } = game.current
  const [tick, setTick] = useState(() => Date.now())
  const answeredRef = useRef(false)
  const secondsLeft = Math.min(CHALLENGE_SECONDS, Math.max(0, CHALLENGE_SECONDS - Math.floor((tick - startedAt) / 1000)))

  const handleAnswer = (answer) => {
    if (answeredRef.current) return
    answeredRef.current = true
    onRecord.recordResult(word.id, resultOf(answer), answer.typed)
    play(answer.correct ? 'correct' : 'wrong')
    const points = answer.correct ? challengePoints(word, timed ? secondsLeft : 0) : 0
    setGame((current) => ({
      ...current,
      phase: 'feedback',
      answer: { ...answer, points },
      score: current.score + points,
      lives: answer.correct ? current.lives : current.lives - 1,
      log: [...current.log, { wordId: word.id, correct: answer.correct, typed: answer.typed, points }],
    }))
  }

  // The interval reads the latest handler through a ref, so it never acts on a stale word.
  const answerRef = useRef(handleAnswer)
  useEffect(() => {
    answerRef.current = handleAnswer
  })

  // A new word can be answered once; in timed mode a clock runs until it is answered or time is up.
  useEffect(() => {
    if (game.phase !== 'question') return undefined
    answeredRef.current = false
    if (!timed) return undefined
    const id = window.setInterval(() => {
      const now = Date.now()
      setTick(now)
      if (now - startedAt >= CHALLENGE_SECONDS * 1000) answerRef.current({ typed: '', correct: false, variant: null, soundsLike: null, hinted: false })
    }, 250)
    return () => window.clearInterval(id)
  }, [timed, game.phase, startedAt])

  const next = () => {
    if (game.lives <= 0) {
      onRecord.recordSession({
        mode: 'challenge',
        scope: 'Bee Challenge',
        total: game.log.length,
        correct: game.log.filter((item) => item.correct).length,
        score: game.score,
        seconds: Math.round((Date.now() - game.startedAt) / 1000),
        date: new Date().toISOString(),
      })
      play('done')
      setGame((current) => ({ ...current, phase: 'over' }))
      return
    }
    const round = game.round + 1
    const upcoming = newRound(round, game.used)
    const used = new Set(game.used).add(upcoming.word.id)
    setGame((current) => ({ ...current, round, used, current: upcoming, phase: 'question', answer: null }))
  }

  if (game.phase === 'over') {
    const newBest = game.score > game.previousBest
    const spelled = game.log.filter((item) => item.correct).length
    return (
      <div className="mx-auto max-w-2xl animate-fade-up">
        <Card className="text-center">
          <p className="t-eyebrow">Game over</p>
          {newBest && <Badge tone="brand" icon={Trophy} className="mt-3 !text-sm">New best score!</Badge>}
          <p className="mt-3 font-display text-6xl font-bold text-brand">{game.score}</p>
          <p className="mt-2 text-muted">
            You spelled {spelled} {spelled === 1 ? 'word' : 'words'} and reached round {game.round}.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button icon={Play} onClick={onRestart}>
              Play again
            </Button>
            <Button variant="secondary" onClick={() => setGame(null)}>
              Back
            </Button>
          </div>
        </Card>
        <Card className="mt-4">
          <h2 className="t-h3 mb-3">Words in this game</h2>
          <ul className="divide-y divide-line">
            {game.log.map((item, index) => {
              const logged = wordsById[item.wordId]
              return (
                <li key={index} className="flex items-center gap-3 py-2.5">
                  {item.correct ? <Heart aria-label="Correct" className="size-4 text-ok" /> : <HeartCrack aria-label="Missed" className="size-4 text-danger" />}
                  <span className="font-semibold">{logged.word}</span>
                  <SpeakButton text={logged.word} />
                  {!item.correct && <span className="font-mono text-sm text-danger line-through">{item.typed.trim() || 'time up'}</span>}
                  <span className="ml-auto text-sm font-semibold tabular-nums text-muted">{item.points ? `+${item.points}` : ''}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    )
  }

  const tier = challengeTier(game.round)
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <IconButton icon={X} label="Quit the challenge" onClick={() => setGame(null)} />
        <p className="font-semibold">Round {game.round}</p>
        <Badge tone={tier === 'hard' ? 'danger' : tier === 'medium' ? 'warn' : 'brand'}>{TIER_LABEL[tier]}</Badge>
        <p className="ml-auto flex items-center gap-1" aria-label={`${game.lives} of ${CHALLENGE_LIVES} lives left`}>
          {Array.from({ length: CHALLENGE_LIVES }, (_, index) => (
            <Heart key={index} aria-hidden="true" className={cn('size-5', index < game.lives ? 'fill-danger text-danger' : 'text-line-strong')} />
          ))}
        </p>
        <p className="font-display text-2xl font-bold tabular-nums text-brand" aria-label={`Score ${game.score}`}>
          {game.score}
        </p>
      </div>
      {timed && game.phase === 'question' && (
        <div className="mb-4 flex items-center gap-3">
          <Timer aria-hidden="true" className={cn('size-4', secondsLeft <= 5 ? 'text-danger' : 'text-muted')} />
          <ProgressBar value={secondsLeft} max={CHALLENGE_SECONDS} label="Time left" tone={secondsLeft <= 5 ? 'danger' : secondsLeft <= 10 ? 'warn' : 'brand'} className="flex-1" />
          <span className={cn('w-8 text-right text-sm font-semibold tabular-nums', secondsLeft <= 5 && 'text-danger')}>{secondsLeft}s</span>
        </div>
      )}
      <Card className="!px-4 !py-8 sm:!px-10 sm:!py-10">
        {game.phase === 'question' ? (
          <QuestionCard key={question.id} word={word} question={question} onAnswer={handleAnswer} allowReveal={false} />
        ) : (
          <>
            {game.answer.points > 0 && <p className="mb-2 text-center text-sm font-bold text-brand">+{game.answer.points} points</p>}
            {!game.answer.correct && (
              <p className="mb-2 text-center text-sm font-bold text-danger">{game.lives > 0 ? `${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left` : 'No lives left'}</p>
            )}
            <Feedback key={`${question.id}-feedback`} word={word} answer={game.answer} onNext={next} nextLabel={game.lives > 0 ? 'Next word' : 'See final score'} />
          </>
        )}
      </Card>
    </div>
  )
}
