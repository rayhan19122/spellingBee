import { letterDiff } from '../../utils/spelling'
import { cn } from '../../utils/cn'

const CELL = {
  match: 'border-ok/40 bg-ok-soft text-ok',
  wrong: 'border-danger bg-danger-soft text-danger',
  missing: 'border-dashed border-danger bg-surface text-danger',
  extra: 'border-warn bg-warn-soft text-warn line-through',
}

const describe = (cell) => {
  if (cell.type === 'match') return cell.letter
  if (cell.type === 'wrong') return `${cell.letter}, you typed ${cell.typed}`
  if (cell.type === 'missing') return `${cell.letter}, missing`
  return `extra ${cell.typed}`
}

/**
 * Shows the correct spelling as letter tiles, coloured by what the learner typed:
 * green = right, red = wrong letter (the typed letter is shown small), dashed = missing, crossed-out orange = extra.
 */
export function LetterDiff({ expected, typed, className }) {
  const cells = letterDiff(expected, typed)
  return (
    <div className={className}>
      <ol aria-label="Letter by letter" className="flex flex-wrap justify-center gap-1">
        {cells.map((cell, index) => (
          <li
            key={index}
            aria-label={describe(cell)}
            className={cn('relative grid h-11 min-w-9 place-items-center rounded-lg border-2 px-1.5 font-mono text-xl font-medium uppercase', CELL[cell.type])}
          >
            {cell.type === 'extra' ? cell.typed : cell.letter === ' ' ? '␣' : cell.letter}
            {cell.type === 'wrong' && <span className="absolute -top-2 -right-1.5 rounded bg-danger px-1 text-[10px] leading-4 text-on-brand normal-case">{cell.typed}</span>}
          </li>
        ))}
      </ol>
      <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <span><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm bg-ok" />right</span>
        <span><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm bg-danger" />wrong letter</span>
        <span><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm border border-dashed border-danger" />missing</span>
        <span><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm bg-warn" />extra</span>
      </p>
    </div>
  )
}
