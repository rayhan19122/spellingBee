import { CheckCircle2, Clock, Home, Lightbulb, RotateCcw, Target, XCircle } from 'lucide-react'
import { wordsById } from '../../data/words'
import { Button } from '../common/Button'
import { Card, SectionHeader } from '../common/Card'
import { StatCard } from '../common/StatCard'
import { SpeakButton } from './SpeakButton'

const formatTime = (seconds) => (seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`)

function verdict(percent) {
  if (percent === 100) return 'Perfect spelling. Bee champion!'
  if (percent >= 80) return 'Excellent work.'
  if (percent >= 60) return 'Good effort. Keep practising the ones you missed.'
  return 'Tricky set! Practise the missed words and try again.'
}

/** End-of-session summary with every missed word and what was typed. */
export function SessionResult({ answers, seconds, onRetry, onRestart, onExit }) {
  const correct = answers.filter((item) => item.correct && !item.hinted).length
  const hinted = answers.filter((item) => item.correct && item.hinted).length
  const missed = answers.filter((item) => !item.correct)
  const percent = answers.length ? Math.round((correct / answers.length) * 100) : 0
  const needWork = [...new Set(answers.filter((item) => !item.correct || item.hinted).map((item) => item.wordId))]

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <Card className="text-center">
        <p className="t-eyebrow">Session complete</p>
        <p className="mt-3 font-display text-6xl font-bold tracking-tight text-brand">{percent}%</p>
        <p className="mt-2 text-lg font-semibold">{verdict(percent)}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {needWork.length > 0 && onRetry && (
            <Button icon={Target} onClick={() => onRetry(needWork)}>
              Practise the {needWork.length} I missed
            </Button>
          )}
          <Button variant="secondary" icon={RotateCcw} onClick={onRestart}>
            New session
          </Button>
          <Button variant="ghost" icon={Home} onClick={onExit}>
            Done
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Correct" value={correct} />
        <StatCard icon={Lightbulb} label="With help" value={hinted} />
        <StatCard icon={XCircle} label="Missed" value={missed.length} />
        <StatCard icon={Clock} label="Time" value={formatTime(seconds)} />
      </div>

      {missed.length > 0 && (
        <Card className="mt-4">
          <SectionHeader title="Words to practise" className="mb-4" />
          <ul className="divide-y divide-line">
            {missed.map((item) => {
              const word = wordsById[item.wordId]
              return (
                <li key={item.questionId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="flex items-center gap-1 font-display text-xl font-bold">
                    {word.word}
                    <SpeakButton text={word.word} />
                  </span>
                  <span className="font-mono text-danger line-through">{item.typed.trim()}</span>
                  <span className="w-full text-sm text-muted sm:w-auto sm:flex-1 sm:text-right">{word.meaning}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
