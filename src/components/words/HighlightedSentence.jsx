import { blankSentence } from '../../utils/fillBlank'

/** The original sentence with the word in bold. */
export function HighlightedSentence({ word, sentence }) {
  const blank = blankSentence(word, sentence)
  if (!blank) return <>{sentence}</>
  return (
    <>
      {blank.before}
      <strong className="font-semibold text-brand not-italic">{blank.surface}</strong>
      {blank.after}
    </>
  )
}
