import { useState } from 'react'
import { X } from 'lucide-react'
import { wordsById } from '../../data/words'
import { useProgress } from '../../hooks/useProgress'
import { useSound } from '../../hooks/useSound'
import { resultOf } from '../../utils/session'
import { Card } from '../common/Card'
import { IconButton } from '../common/Button'
import { ProgressBar } from '../common/ProgressBar'
import { Feedback } from './Feedback'
import { QuestionCard } from './QuestionCard'
import { SessionResult } from './SessionResult'

/**
 * Runs a list of questions: question -> feedback -> next, then a summary.
 * Every answer is saved to progress straight away, so leaving early never loses work.
 */
export function SessionRunner({ questions, mode, scope, onExit, onRetry, onRestart }) {
  const { state, actions } = useProgress()
  const play = useSound()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('question')
  const [misses, setMisses] = useState([])
  const [startedAt] = useState(() => Date.now())
  const [seconds, setSeconds] = useState(0)
  const question = questions[index]
  const word = question && wordsById[question.wordId]

  const answer = (result) => {
    setMisses(state.words[word.id]?.misses || [])
    actions.recordResult(word.id, resultOf(result), result.typed)
    play(result.correct ? 'correct' : 'wrong')
    setAnswers((list) => [...list, { ...result, wordId: word.id, questionId: question.id }])
    setPhase('feedback')
  }

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setPhase('question')
      return
    }
    const correct = answers.filter((item) => item.correct && !item.hinted).length
    const elapsed = Math.round((Date.now() - startedAt) / 1000)
    setSeconds(elapsed)
    actions.recordSession({
      mode,
      scope,
      total: answers.length,
      correct,
      seconds: elapsed,
      date: new Date().toISOString(),
    })
    play('done')
    setPhase('done')
  }

  if (phase === 'done') {
    return (
      <SessionResult
        answers={answers}
        seconds={seconds}
        onRetry={onRetry}
        onRestart={onRestart}
        onExit={onExit}
      />
    )
  }

  const correctSoFar = answers.filter((item) => item.correct).length
  const last = answers[answers.length - 1]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <IconButton icon={X} label="End session" onClick={onExit} />
        <ProgressBar value={index + (phase === 'feedback' ? 1 : 0)} max={questions.length} label="Session progress" className="flex-1" />
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {index + 1}/{questions.length}
          <span className="ml-3 text-ok">✓ {correctSoFar}</span>
        </p>
      </div>
      <Card className="!px-4 !py-8 sm:!px-10 sm:!py-10">
        {phase === 'question' ? (
          <QuestionCard key={question.id} word={word} question={question} onAnswer={answer} />
        ) : (
          <Feedback key={`${question.id}-feedback`} word={word} answer={last} previousMisses={misses} onNext={next} nextLabel={index + 1 < questions.length ? 'Next word' : 'See results'} />
        )}
      </Card>
    </div>
  )
}
