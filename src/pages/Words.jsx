import { useDeferredValue, useMemo, useState } from 'react'
import { ChevronDown, SearchX } from 'lucide-react'
import { lectureIds, letters, listCount, words } from '../data/words'
import { useProgress } from '../hooks/useProgress'
import { usePageTitle } from '../hooks/usePageTitle'
import { wordRecord } from '../utils/progress'
import { isWeak, STATE_LABELS, wordAccuracy } from '../utils/spacedRepetition'
import { lectureLabel } from '../utils/sources'
import { cn } from '../utils/cn'
import { Badge } from '../components/common/Badge'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { SelectField, TextInput } from '../components/common/Field'
import { PageHeader } from '../components/common/PageHeader'
import { SpeakButton } from '../components/bee/SpeakButton'
import { HighlightedSentence } from '../components/words/HighlightedSentence'

const PAGE = 60
const DIFFICULTY_TONE = { easy: 'brand', medium: 'info', hard: 'danger' }
const STATE_TONE = { new: 'neutral', learning: 'warn', review: 'info', mastered: 'brand' }

const SOURCE_OPTIONS = [
  { value: 'all', label: `All sources (${words.length})` },
  { value: 'list', label: `Spelling Bee list (${listCount})` },
  { value: 'vocab11', label: `Vocab11 lectures (${words.filter((word) => word.lectures.length).length})` },
  ...lectureIds.map((id) => ({ value: String(id), label: `Vocab11 · ${lectureLabel(id)}` })),
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Any status' },
  { value: 'new', label: 'Not tried' },
  { value: 'learning', label: 'Learning' },
  { value: 'review', label: 'Reviewing' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'tricky', label: 'Tricky' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'Any difficulty' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

function matches(word, query) {
  if (!query) return true
  const text = query.toLowerCase()
  return word.word.toLowerCase().includes(text) || word.meaning.toLowerCase().includes(text) || word.variants.some((item) => item.includes(text))
}

export default function Words() {
  usePageTitle('Word List')
  const { state, actions } = useProgress()
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [letter, setLetter] = useState('')
  const [open, setOpen] = useState(null)
  const [shown, setShown] = useState(PAGE)
  const deferredQuery = useDeferredValue(query.trim())

  const filtered = useMemo(
    () =>
      words.filter((word) => {
        if (source === 'list' && !word.inList) return false
        if (source === 'vocab11' && !word.lectures.length) return false
        if (/^\d+$/.test(source) && !word.lectures.includes(Number(source))) return false
        if (letter && word.word[0].toUpperCase() !== letter) return false
        if (difficulty !== 'all' && word.difficulty !== difficulty) return false
        const record = wordRecord(state, word.id)
        if (status === 'tricky' && !isWeak(record)) return false
        if (!['all', 'tricky'].includes(status) && record.state !== status) return false
        return matches(word, deferredQuery)
      }),
    [source, letter, difficulty, status, deferredQuery, state],
  )

  const resetPaging = (fn) => (value) => {
    fn(value)
    setShown(PAGE)
  }

  return (
    <>
      <PageHeader eyebrow="Library" title="Word List" description={`All ${words.length} words: every Vocab11 word plus the ${listCount} commonly misspelled words from the Spelling Bee list.`} />

      <Card className="mb-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TextInput className="col-span-2 lg:col-span-1" label="Search" type="search" placeholder="Word or meaning…" value={query} onChange={(event) => resetPaging(setQuery)(event.target.value)} />
          <SelectField label="Source" value={source} onChange={(event) => resetPaging(setSource)(event.target.value)} options={SOURCE_OPTIONS} />
          <SelectField label="Status" value={status} onChange={(event) => resetPaging(setStatus)(event.target.value)} options={STATUS_OPTIONS} />
          <SelectField className="col-span-2 sm:col-span-1" label="Difficulty" value={difficulty} onChange={(event) => resetPaging(setDifficulty)(event.target.value)} options={DIFFICULTY_OPTIONS} />
        </div>
        <div role="group" aria-label="First letter" className="flex flex-wrap gap-1">
          {['', ...letters].map((item) => (
            <button
              key={item || 'all'}
              type="button"
              aria-pressed={letter === item}
              onClick={() => resetPaging(setLetter)(item)}
              className={cn('h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition', letter === item ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted hover:text-ink')}
            >
              {item || 'All'}
            </button>
          ))}
        </div>
      </Card>

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        Showing {Math.min(shown, filtered.length)} of {filtered.length} words
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="No words match">
          Try a different search or clear a filter.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.slice(0, shown).map((word) => {
            const record = wordRecord(state, word.id)
            const expanded = open === word.id
            const accuracy = wordAccuracy(record)
            return (
              <li key={word.id}>
                <Card padded={false} className="overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`word-${word.id}`}
                      onClick={() => setOpen(expanded ? null : word.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-xl font-bold tracking-tight">{word.word}</span>
                        <span className="block truncate text-sm text-muted">{word.meaning}</span>
                      </span>
                    </button>
                    <span className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
                      {word.inList && <Badge tone="brand">Spelling list</Badge>}
                      {word.lectures.length > 0 && <Badge tone="info">{word.lectures.length === 1 ? lectureLabel(word.lectures[0]) : `${word.lectures.length} lectures`}</Badge>}
                      <Badge tone={STATE_TONE[record.state]}>{STATE_LABELS[record.state]}</Badge>
                    </span>
                    <SpeakButton text={word.word} />
                    <button type="button" aria-label={expanded ? `Hide ${word.word}` : `Show ${word.word}`} onClick={() => setOpen(expanded ? null : word.id)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
                      <ChevronDown aria-hidden="true" className={cn('size-4 transition', expanded && 'rotate-180')} />
                    </button>
                  </div>
                  {expanded && (
                    <div id={`word-${word.id}`} className="animate-reveal border-t border-line bg-surface-2/50 px-4 py-4 sm:px-5">
                      <div className="flex flex-wrap gap-1.5">
                        {word.pos && <Badge>{word.pos}</Badge>}
                        {word.note && <Badge tone="info">{word.note}</Badge>}
                        <Badge tone={DIFFICULTY_TONE[word.difficulty]}>{word.difficulty}</Badge>
                        {word.inList && <Badge tone="brand">Spelling list</Badge>}
                        {word.lectures.map((id) => (
                          <Badge key={id} tone="info">
                            {lectureLabel(id)}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-3">{word.meaning}</p>
                      <ul className="mt-3 flex flex-col gap-2">
                        {word.sentences.map((sentence) => (
                          <li key={sentence} className="t-quote flex items-start gap-2">
                            <span className="flex-1">
                              <HighlightedSentence word={word.word} sentence={sentence} />
                            </span>
                            <SpeakButton text={sentence} label="Listen to the sentence" />
                          </li>
                        ))}
                      </ul>
                      {(word.variants.length > 0 || word.soundsLike.length > 0) && (
                        <p className="mt-3 text-sm text-muted">
                          {word.variants.length > 0 && <>Also accepted: <span className="font-mono text-ink">{word.variants.join(', ')}</span>. </>}
                          {word.soundsLike.length > 0 && <>Don’t confuse with: <span className="font-mono text-ink">{word.soundsLike.join(', ')}</span>.</>}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <span>
                          Accuracy: <strong>{accuracy === null ? 'not tried' : `${accuracy}%`}</strong>
                          {record.correct + record.wrong > 0 && <span className="text-muted"> ({record.correct} right, {record.wrong} wrong)</span>}
                        </span>
                        {record.misses?.length > 0 && (
                          <span>
                            You wrote: <span className="font-mono text-danger line-through">{record.misses.join(', ')}</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {record.state !== 'mastered' && (
                          <Button size="sm" variant="secondary" onClick={() => actions.recordResult(word.id, 'mastered')}>
                            I know this spelling
                          </Button>
                        )}
                        {record.state !== 'new' && record.state !== 'learning' && (
                          <Button size="sm" variant="ghost" onClick={() => actions.recordResult(word.id, 'needs-review')}>
                            Practise again
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {shown < filtered.length && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => setShown((value) => value + PAGE)}>
            Show {Math.min(PAGE, filtered.length - shown)} more
          </Button>
        </div>
      )}
    </>
  )
}
