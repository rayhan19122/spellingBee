import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

/**
 * The spelling box. Browser spell-check, autocorrect and autocomplete are all switched off:
 * otherwise the browser would fix (or underline) the learner's spelling for them.
 */
export const AnswerInput = forwardRef(function AnswerInput({ label = 'Your spelling', className, invalid, ...props }, ref) {
  return (
    <div className={className}>
      <label htmlFor={props.id || 'answer'} className="sr-only">
        {label}
      </label>
      <input
        ref={ref}
        id="answer"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-invalid={invalid || undefined}
        className={cn(
          'h-16 w-full rounded-2xl border-2 bg-surface px-5 text-center font-mono text-2xl tracking-wider text-ink placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-muted/70 transition focus-visible:border-brand sm:text-3xl',
          invalid ? 'border-danger' : 'border-line-strong',
        )}
        {...props}
      />
    </div>
  )
})
