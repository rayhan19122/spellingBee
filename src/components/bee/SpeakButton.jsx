import { Volume2 } from 'lucide-react'
import { useSpeech } from '../../hooks/useSpeech'
import { cn } from '../../utils/cn'

/** Small speaker button that reads `text` aloud. Renders nothing if the browser has no speech. */
export function SpeakButton({ text, label, slow, className }) {
  const { supported, speak, speaking } = useSpeech()
  if (!supported) return null
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        speak(text, { slow })
      }}
      aria-label={label || `Listen: ${text}`}
      title={label || 'Listen'}
      className={cn('inline-grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-brand', speaking && 'text-brand', className)}
    >
      <Volume2 aria-hidden="true" className="size-4" />
    </button>
  )
}
