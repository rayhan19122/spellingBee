import { useCallback, useEffect, useRef, useState } from 'react'
import { useProgress } from './useProgress'

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

/** English voices the browser offers, refreshed when the list finishes loading. */
export function useVoices() {
  const [voices, setVoices] = useState(() => (supported ? window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en')) : []))
  useEffect(() => {
    if (!supported) return undefined
    const update = () => setVoices(window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en')))
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}

/** Picks the saved voice, else the best voice for the chosen accent. */
export function pickVoice(voices, { voice, accent }) {
  if (voice) {
    const saved = voices.find((item) => item.voiceURI === voice)
    if (saved) return saved
  }
  const local = voices.filter((item) => item.lang.replace('_', '-') === accent)
  return local.find((item) => item.localService) || local[0] || voices.find((item) => item.lang.startsWith('en')) || null
}

/**
 * Browser text-to-speech using the learner's voice, accent and speed settings.
 * speak(text, { slow }) reads text; slow = 60% of the normal speed.
 */
export function useSpeech() {
  const { state } = useProgress()
  const { voice, accent, rate } = state.settings
  const voices = useVoices()
  const [speaking, setSpeaking] = useState(false)
  const active = useRef(false)

  // Stop only speech this component started, so leaving a page never cuts off another page's audio.
  useEffect(
    () => () => {
      if (supported && active.current) window.speechSynthesis.cancel()
    },
    [],
  )

  const speak = useCallback(
    (text, { slow = false } = {}) => {
      if (!supported || !text) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const chosen = pickVoice(voices, { voice, accent })
      if (chosen) utterance.voice = chosen
      utterance.lang = chosen?.lang || accent
      utterance.rate = slow ? Math.max(0.4, rate * 0.6) : rate
      const done = () => {
        active.current = false
        setSpeaking(false)
      }
      utterance.onstart = () => {
        active.current = true
        setSpeaking(true)
      }
      utterance.onend = done
      utterance.onerror = done
      window.speechSynthesis.speak(utterance)
    },
    [voices, voice, accent, rate],
  )

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
  }, [])

  return { supported, speaking, speak, stop }
}
