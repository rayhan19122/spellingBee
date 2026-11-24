/** "They're" -> "theyre", "Hand-feed" -> "hand-feed": the word's id. */
export const slugify = (word) =>
  String(word)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
