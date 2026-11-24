import { useEffect } from 'react'

/** Sets the browser tab title, e.g. "Practice · SpellingBee". */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · SpellingBee` : 'SpellingBee — Hear it. Spell it. Own it.'
  }, [title])
}
