import { CalendarClock, Ear, ListChecks, PartyPopper, Target } from 'lucide-react'
import { wordsById } from '../data/words'
import { useProgress } from '../hooks/useProgress'
import { usePageTitle } from '../hooks/usePageTitle'
import { wordRecord } from '../utils/progress'
import { wordAccuracy, WEAK_RECOVERY } from '../utils/spacedRepetition'
import { Button } from '../components/common/Button'
import { Card, SectionHeader } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { LetterDiff } from '../components/bee/LetterDiff'
import { SpeakButton } from '../components/bee/SpeakButton'

export default function Tricky() {
  usePageTitle('Tricky Words')
  const { state, derived } = useProgress()
  const tricky = derived.trickyIds.map((id) => wordsById[id]).sort((a, b) => wordRecord(state, b.id).wrong - wordRecord(state, a.id).wrong)
  const due = derived.dueIds.length

  return (
    <>
      <PageHeader
        eyebrow="Focus"
        title="Tricky Words"
        description={`Words you have misspelled. Spell one right ${WEAK_RECOVERY} times in a row and it leaves this list.`}
        actions={
          tricky.length > 0 && (
            <>
              <Button icon={Ear} to={`/practice?set=tricky&mode=listen&count=${tricky.length > 10 ? 20 : 10}&start=1`}>
                Practise by ear
              </Button>
              <Button variant="secondary" icon={ListChecks} to="/practice?set=tricky&mode=choose&count=10&start=1">
                Choose the spelling
              </Button>
            </>
          )
        }
      />

      {due > 0 && (
        <Card className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <CalendarClock aria-hidden="true" className="size-6 shrink-0 text-info" />
          <p className="flex-1">
            <strong>{due} {due === 1 ? 'word is' : 'words are'} due for review.</strong> <span className="text-muted">Reviewing at the right time is what makes spellings stick.</span>
          </p>
          <Button variant="secondary" to={`/practice?set=due&mode=listen&count=${due > 10 ? 20 : 10}&start=1`}>
            Review now
          </Button>
        </Card>
      )}

      {tricky.length === 0 ? (
        <EmptyState icon={PartyPopper} title="No tricky words right now" action={<Button icon={Target} to="/practice">Start practising</Button>}>
          Any word you misspell will appear here with what you wrote, so you can fix it.
        </EmptyState>
      ) : (
        <Card>
          <SectionHeader title={`${tricky.length} tricky ${tricky.length === 1 ? 'word' : 'words'}`} className="mb-2" />
          <ul className="divide-y divide-line">
            {tricky.map((word) => {
              const record = wordRecord(state, word.id)
              const lastMiss = record.misses?.[0]
              return (
                <li key={word.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-display text-2xl font-bold">
                      {word.word}
                      <SpeakButton text={word.word} />
                    </p>
                    <p className="text-sm text-muted">{word.meaning}</p>
                    <p className="mt-1 text-sm">
                      Missed {record.wrong} {record.wrong === 1 ? 'time' : 'times'} · accuracy {wordAccuracy(record) ?? 0}% · {record.streak}/{WEAK_RECOVERY} right in a row
                    </p>
                  </div>
                  {lastMiss && (
                    <div className="sm:max-w-xs">
                      <p className="mb-1 text-xs font-semibold text-muted sm:text-right">
                        You wrote <span className="font-mono text-danger">{lastMiss}</span>
                      </p>
                      <LetterDiff expected={word.word} typed={lastMiss} className="[&_p]:hidden [&_li]:h-8 [&_li]:min-w-6 [&_li]:text-sm" />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
