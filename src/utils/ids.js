import { words } from '../data/words'

/** Every real word id: progress for anything else is dropped when loading or importing. */
export const VALID_IDS = new Set(words.map((word) => word.id))
