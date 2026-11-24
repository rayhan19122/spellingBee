# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm**.

```bash
pnpm dev             # Vite dev server
pnpm build           # production build into dist/
pnpm lint            # oxlint (config: .oxlintrc.json) — keep it at zero warnings
pnpm test            # vitest run (tests/*.test.js)
pnpm data:build      # regenerate src/data/words.js from data-source/
pnpm data:validate   # check src/data/words.js against its sources (exits 1 on failure)
```

Single test file / single test:

```bash
pnpm vitest run tests/spelling.test.js
pnpm vitest run tests/spelling.test.js -t "never returns the real word"
```

Deployed on Vercel (project `spellingbeeeee`, https://spellingbeeeee.vercel.app) via the GitHub integration: every push to `main` deploys. `vercel.json` rewrites all paths to `index.html` for client-side routing. The build log's `npm warn Unknown env config "cache-dir"` comes from Vercel's build image and is harmless.

## Architecture

React 19 + Vite + Tailwind CSS v4 + react-router 7 + lucide-react. No backend: all progress lives in `localStorage`. Audio is the browser's `speechSynthesis` (no audio files or APIs).

### Word data pipeline (generated — never hand-edit `src/data/words.js`)

`scripts/build-words.mjs` merges these sources into `src/data/words.js`:

- `data-source/vocab11.js` — a **copy** of the sibling Vocab11 app's generated `src/data/vocabulary.js` (repo `rayhan19122/Vocab11`, local `/Users/rayhan/Self_Study/English/Vocab_WebApp`). It does not auto-update: when Vocab11 gains lectures, copy that file here, then run `data:build` and `data:validate`. Vocab11 lecture numbers have gaps (no 12 or 18), and a word can appear in several lectures — the build merges them into one entry with `lectures: [...]` and all PDF sentences.
- `data-source/spelling-list.txt` — the 232 words of "Spelling .pdf" (the PDF heading says 238, but 232 are printed), with the PDF's notes (`noun`, `plural`, …).
- `data-source/spelling-content.txt` — `Word | pos | meaning | sentence` for each spelling-list word **not** in Vocab11. The build errors if a word is in both, or if a list word has no row.
- `data-source/variants.txt` (accepted British/American spellings) and `data-source/sounds-like.txt` (homophones; their meaning is always shown in listening questions).

Each entry: `{ id, word, meaning, pos, note, sentences, lectures, inList, variants, soundsLike, difficulty }`. `id` comes from `src/utils/slug.js` (shared by the build script and the app). Difficulty is computed in the build from length, a "trap" regex (double letters, ie/ei, silent letters…) and list membership. Every sentence must contain the word in a form `blankSentence` (`src/utils/fillBlank.js`) can find — the validator enforces this, since sentence clues blank the word out.

### App layers

- **Pure logic in `src/utils/`** (no React; all unit-tested):
  - `spelling.js` — answer checking (`normalizeSpelling`, `checkSpelling` → `{correct, variant, soundsLike, distance}`), the `letterDiff` used for the letter-tile feedback, the `misspellings` generator for the Choose and Fix modes (rule-based confusions; never returns a real word — the caller passes `REAL_WORDS`), and `maskWord`.
  - `session.js` — `buildSession` and `makeQuestion` (question kinds: `listen`, `choose`, `fix`, `missing`), `resultOf`, plus Bee Challenge rules (tiers by round, scoring).
  - `sources.js` — word sets as URL-safe strings: `smart`, `all`, `list`, `vocab11`, `tricky`, `due`, `new`, `lecture-N`, `letter-x`. `smart` returns words already in priority order, so it is built with `ordered: true`.
  - `spacedRepetition.js` — per-word state machine (`new → learning → review → mastered`). Results: `correct`, `wrong`, `hinted` (right only after revealing letters: no accuracy change, the streak resets), and the manual `mastered` / `needs-review`.
  - `progress.js` — immutable state transitions (`recordResult`, which also keeps the last 3 misspellings per word in `misses`; `recordSession`, which tracks the best challenge score) and selectors.
  - `storage.js` — the only module that touches `localStorage` (key `spellingbee:state:v1`). `sanitizeState` validates everything on load and import. New settings fields must be added to both `defaultSettings` and `sanitizeSettings`.
- **State**: `context/ProgressProvider.jsx` is a `useReducer` over the state above, persisted on every change, exposing `{ state, actions, derived, now }` through `useProgress()`. `derived` holds overall stats, today's goal, streak, `trickyIds` and `dueIds`.
- **Bee UI** (`components/bee/`): `QuestionCard` renders all four question kinds and their clues, and calls `onAnswer` once. `Feedback` shows the result, including the retype-to-continue step. `SessionRunner` drives question → feedback → results and records each answer immediately. `pages/Challenge.jsx` reuses `QuestionCard` and `Feedback` with its own lives/timer loop (the timer uses an interval plus a ref to the latest answer handler).
- **Pages** are lazy-loaded in `App.jsx`. `Practice` can auto-start from links like `/practice?set=tricky&mode=listen&count=10&start=1` (`count` must be one of `QUESTION_COUNTS`).
- `useSpeech` applies the voice, accent and rate settings. Spelling inputs (`AnswerInput`) must keep `spellCheck`, autocorrect and autocomplete off, or the browser would fix the learner's spelling for them.

### Styling

Design tokens are CSS variables in `src/index.css` (light under `:root`, dark under `.dark`), mapped to Tailwind colours via `@theme inline` (`bg-surface`, `text-muted`, `text-brand`, `bg-ok-soft`, …). Use the semantic names, not raw colours. Dark mode is class-based: `.dark` on `<html>` is set by `ProgressProvider`, and also by an inline script in `index.html` before first paint. The layout and common components were copied from Vocab11 and share its structure.
