import { BadgeCheck, Crown, Flame, Percent, Sparkles, Target } from 'lucide-react'
import { words } from '../data/words'
import { useProgress } from '../hooks/useProgress'
import { usePageTitle } from '../hooks/usePageTitle'
import { mostMissed, overallStats, recentDays, wordRecord } from '../utils/progress'
import { MODE_INFO } from '../utils/session'
import { STATE_LABELS, STATES } from '../utils/spacedRepetition'
import { formatRelativeDay } from '../utils/date'
import { cn } from '../utils/cn'
import { Card, SectionHeader } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { ProgressBar } from '../components/common/ProgressBar'
import { StatCard } from '../components/common/StatCard'
import { Button } from '../components/common/Button'
import { SpeakButton } from '../components/bee/SpeakButton'

const STATE_COLORS = { new: 'bg-line-strong', learning: 'bg-warn', review: 'bg-info', mastered: 'bg-ok' }
const MODE_LABELS = { ...Object.fromEntries(Object.entries(MODE_INFO).map(([key, info]) => [key, info.label])), challenge: 'Bee Challenge', study: 'Study' }

function ActivityChart({ days }) {
  const max = Math.max(1, ...days.map((day) => day.answered))
  return (
    <figure>
      <div className="flex h-40 items-end gap-1.5" aria-hidden="true">
        {days.map((day) => (
          <div key={day.key} className="flex h-full flex-1 flex-col justify-end" title={`${day.date.toLocaleDateString()}: ${day.correct}/${day.answered} correct`}>
            <div className="relative w-full overflow-hidden rounded-t-md bg-danger-soft" style={{ height: `${(day.answered / max) * 100}%`, minHeight: day.answered ? 4 : 0 }}>
              <div className="absolute inset-x-0 bottom-0 bg-brand" style={{ height: `${day.answered ? (day.correct / day.answered) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-center text-[11px] text-muted" aria-hidden="true">
        {days.map((day, index) => (
          <span key={day.key} className="flex-1">
            {index % 2 === days.length % 2 ? '' : day.date.toLocaleDateString(undefined, { weekday: 'narrow' })}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex gap-4 text-xs text-muted">
        <span><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm bg-brand" />correct</span>
        <span><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm bg-danger-soft" />missed</span>
      </figcaption>
      <table className="sr-only">
        <caption>Answers per day, last 14 days</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Answered</th>
            <th>Correct</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.key}>
              <td>{day.date.toLocaleDateString()}</td>
              <td>{day.answered}</td>
              <td>{day.correct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function SetProgress({ title, list, state, now }) {
  const stats = overallStats(state, list, now)
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-2 text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-muted tabular-nums">
          {stats.learned}/{stats.total} learned
        </span>
      </div>
      <ProgressBar value={stats.learned} max={stats.total} label={`${title}: words learned`} />
    </div>
  )
}

export default function Progress() {
  usePageTitle('Progress')
  const { state, derived, now } = useProgress()
  const { overall, streak } = derived
  const counts = STATES.map((key) => ({ key, count: words.filter((word) => wordRecord(state, word.id).state === key).length }))
  const missed = mostMissed(state, words, 8)
  const days = recentDays(state, 14, now)

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Progress" description={`Everything you have spelled across all ${words.length} words.`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Sparkles} label="Words tried" value={overall.tried} hint={`of ${overall.total}`} />
        <StatCard icon={BadgeCheck} label="Mastered" value={overall.mastered} hint={`${overall.learned} learned`} />
        <StatCard icon={Percent} label="Accuracy" value={overall.accuracy === null ? '–' : `${overall.accuracy}%`} hint={`${overall.answered} answers`} />
        <StatCard icon={Flame} label="Streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} hint={`Longest: ${state.streak.longest}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <SectionHeader eyebrow="Last 14 days" title="Activity" className="mb-5" />
          <ActivityChart days={days} />
        </Card>
        <Card className="flex flex-col gap-5">
          <SectionHeader title="Word status" />
          <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
            {counts.map(({ key, count }) => (
              <div key={key} className={STATE_COLORS[key]} style={{ width: `${(count / words.length) * 100}%` }} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {counts.map(({ key, count }) => (
              <li key={key} className="flex items-center gap-2">
                <span aria-hidden="true" className={cn('size-2.5 rounded-sm', STATE_COLORS[key])} />
                {STATE_LABELS[key]}
                <span className="ml-auto font-semibold tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
          <SetProgress title="Spelling Bee list" list={words.filter((word) => word.inList)} state={state} now={now} />
          <SetProgress title="Vocab11 words" list={words.filter((word) => word.lectures.length)} state={state} now={now} />
          <p className="flex items-center gap-2 text-sm">
            <Crown aria-hidden="true" className="size-4 text-brand" />
            Best Bee Challenge score: <strong>{state.best.challenge}</strong>
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Most missed" className="mb-3" action={missed.length > 0 && <Button size="sm" variant="secondary" icon={Target} to="/tricky">Tricky words</Button>} />
          {missed.length === 0 ? (
            <p className="text-muted">No mistakes yet. Words you misspell will show here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {missed.map(({ word, record }) => (
                <li key={word.id} className="flex items-center gap-2 py-2.5">
                  <span className="font-semibold">{word.word}</span>
                  <SpeakButton text={word.word} />
                  {record.misses?.[0] && <span className="truncate font-mono text-sm text-danger line-through">{record.misses[0]}</span>}
                  <span className="ml-auto shrink-0 text-sm text-muted">{record.wrong}× missed</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <SectionHeader title="Recent sessions" className="mb-3" />
          {state.history.length === 0 ? (
            <EmptyState title="No sessions yet" className="!border-0 !py-6" action={<Button to="/practice">Start practising</Button>} />
          ) : (
            <ul className="divide-y divide-line">
              {state.history.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{MODE_LABELS[item.mode] || 'Practice'}</span>
                    <span className="block text-muted">
                      {item.scope} · {formatRelativeDay(item.date, now)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-semibold tabular-nums">
                    {item.mode === 'challenge' ? `${item.score} pts` : `${item.correct}/${item.total}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
