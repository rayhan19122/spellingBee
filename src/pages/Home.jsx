import { BookA, CalendarClock, Crown, Ear, Flame, PencilLine, Sparkles, Target } from 'lucide-react'
import { listCount, words } from '../data/words'
import { useProgress } from '../hooks/useProgress'
import { usePageTitle } from '../hooks/usePageTitle'
import { dayKey, greeting } from '../utils/date'
import { overallStats } from '../utils/progress'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { Card, SectionHeader } from '../components/common/Card'
import { ProgressBar } from '../components/common/ProgressBar'
import { SpeakButton } from '../components/bee/SpeakButton'
import { HighlightedSentence } from '../components/words/HighlightedSentence'

/** The same word all day, a different one each day. */
function wordOfTheDay(now) {
  const key = dayKey(now)
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 100_003
  const pool = words.filter((word) => word.difficulty !== 'easy')
  return pool[hash % pool.length]
}

function ActionCard({ icon: Icon, title, text, to, cta, tone = 'secondary' }) {
  return (
    <Card className="flex flex-col">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h3 className="t-h3 mt-4">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{text}</p>
      <Button to={to} variant={tone} className="mt-4 self-start">
        {cta}
      </Button>
    </Card>
  )
}

export default function Home() {
  usePageTitle()
  const { state, derived, now } = useProgress()
  const { today, streak, overall } = derived
  const name = state.settings.name
  const daily = wordOfTheDay(now)
  const listStats = overallStats(state, words.filter((word) => word.inList), now)
  const vocabStats = overallStats(state, words.filter((word) => word.lectures.length), now)
  const tricky = derived.trickyIds.length
  const due = derived.dueIds.length

  return (
    <>
      <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div>
          <p className="t-eyebrow mb-2">{greeting(now)}{name ? `, ${name}` : ''}</p>
          <h1 className="t-display">Ready to spell?</h1>
          <p className="mt-3 max-w-xl text-muted">
            {words.length} words to master: every Vocab11 word plus the {listCount} most commonly misspelled English words.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="lg" icon={Ear} to="/practice?set=smart&mode=listen&count=10&start=1">
              Daily spelling bee
            </Button>
            <Button size="lg" variant="secondary" icon={Crown} to="/challenge">
              Bee Challenge
            </Button>
          </div>
        </div>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="t-label">Today’s goal</p>
            <span className="flex items-center gap-1 text-sm font-semibold">
              <Flame aria-hidden="true" className="size-4 text-warn" />
              {streak}-day streak
            </span>
          </div>
          <p className="font-display text-4xl font-bold">
            {today.done}
            <span className="text-xl text-muted">/{today.goal} words</span>
          </p>
          <ProgressBar value={today.done} max={today.goal} label="Daily goal" />
          <p className="text-sm text-muted">{today.done >= today.goal ? 'Goal reached. Brilliant!' : `${today.goal - today.done} more to reach today’s goal.`}</p>
        </Card>
      </section>

      <section aria-label="Word of the day" className="mb-8">
        <Card className="relative overflow-hidden">
          <div aria-hidden="true" className="absolute -top-10 -right-10 size-40 rounded-full bg-honey/15" />
          <p className="t-eyebrow flex items-center gap-1.5">
            <Sparkles aria-hidden="true" className="size-3.5 text-brand" /> Word of the day
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-4xl font-bold tracking-tight">{daily.word}</h2>
            <SpeakButton text={daily.word} />
            {daily.inList && <Badge tone="brand">Commonly misspelled</Badge>}
          </div>
          <p className="mt-2 max-w-2xl">{daily.meaning}</p>
          <p className="t-quote mt-3 max-w-2xl">
            <HighlightedSentence word={daily.word} sentence={daily.sentences[0]} />
          </p>
        </Card>
      </section>

      <section aria-label="Ways to practise" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ActionCard icon={Target} title="Tricky words" text={tricky ? `${tricky} ${tricky === 1 ? 'word needs' : 'words need'} another go.` : 'Words you misspell will collect here.'} to="/tricky" cta={tricky ? 'Fix them' : 'Open'} />
        <ActionCard icon={CalendarClock} title="Due for review" text={due ? `${due} ${due === 1 ? 'word is' : 'words are'} ready for review.` : 'Nothing due. Spaced review brings words back at the right time.'} to={due ? `/practice?set=due&mode=listen&count=${due > 10 ? 20 : 10}&start=1` : '/practice'} cta={due ? 'Review now' : 'Practise'} />
        <ActionCard icon={PencilLine} title="Study new words" text="Look, say, cover, write, check: the classic way to learn a spelling." to="/study" cta="Study" />
        <ActionCard icon={BookA} title="Word list" text="Browse, search and listen to every word with its meaning and sentence." to="/words" cta="Browse" />
      </section>

      <section aria-label="Your progress" className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader eyebrow="Progress" title="Word sets" className="mb-5" action={<Button variant="ghost" size="sm" to="/progress">Details</Button>} />
          <div className="flex flex-col gap-5">
            {[
              { title: 'Spelling Bee list', stats: listStats, set: 'list' },
              { title: 'Vocab11 words', stats: vocabStats, set: 'vocab11' },
            ].map(({ title, stats, set }) => (
              <div key={set}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{title}</span>
                  <span className="text-sm text-muted tabular-nums">
                    {stats.learned}/{stats.total} learned · {stats.mastered} mastered
                  </span>
                </div>
                <ProgressBar value={stats.learned} max={stats.total} label={`${title}: words learned`} />
                <Button variant="ghost" size="sm" to={`/practice?set=${set}&mode=listen&count=10&start=1`} className="mt-1 -ml-3">
                  Practise 10 words
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="flex flex-col gap-4">
          <SectionHeader eyebrow="All words" title="At a glance" />
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="t-label">Accuracy</dt>
              <dd className="font-display text-3xl font-bold">{overall.accuracy === null ? '–' : `${overall.accuracy}%`}</dd>
            </div>
            <div>
              <dt className="t-label">Mastered</dt>
              <dd className="font-display text-3xl font-bold">{overall.mastered}</dd>
            </div>
            <div>
              <dt className="t-label">Words tried</dt>
              <dd className="font-display text-3xl font-bold">{overall.tried}</dd>
            </div>
            <div>
              <dt className="t-label">Best challenge</dt>
              <dd className="font-display text-3xl font-bold">{state.best.challenge}</dd>
            </div>
          </dl>
        </Card>
      </section>
    </>
  )
}
