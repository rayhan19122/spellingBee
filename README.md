# SpellingBee — Hear it. Spell it. Own it.

A spelling-bee practice app with **715 words**: every word from [Vocab11](https://github.com/rayhan19122/Vocab11)
(Lectures 1–11 and 13–23) plus the 232 commonly misspelled words of `Spelling .pdf` (21.8 Spelling Bee).
18 words are in both. The PDF's heading says 238 words, but 232 are printed.

React + Vite + Tailwind CSS + Lucide. No backend: progress is saved in your browser (localStorage).
Audio uses the browser's built-in text-to-speech, so nothing is downloaded and it works offline once loaded.

## Features

- **Listen & spell**: the classic bee. Hear the word, then type it. You can ask to hear it again or slowly, and for the definition, a sentence (read aloud, word blanked) or the number of letters, as in a real bee. "Reveal a letter" is allowed too, but the word then counts as *with help*.
- **Choose the spelling**: pick the right spelling from four. The wrong ones are realistic (ie/ei, double letters, -ance/-ence…) and are never real words.
- **Fix the mistake**: a misspelled word appears; type it correctly.
- **Missing letters**: the letters people usually get wrong are hidden.
- **Mixed** sessions, word sets (Smart review, Spelling Bee list, Vocab11, each lecture, each letter, tricky, due, not tried), difficulty filter and 10–50 words.
- **Letter-by-letter feedback**: every letter is marked right, wrong, missing or extra. Shows what you wrote last time, warns about sound-alikes (*piece/peace*, *their/there/they're*), and can make you retype the word once.
- **Bee Challenge**: survival mode with 3 lives. Words go easy → medium → hard, a 30-second timer (optional) and points for harder words and fast answers. Your best score is saved.
- **Study**: Look, Say, Cover, Write, Check.
- **Spaced review**: missed words come back sooner and known words later. **Tricky Words** lists everything you have misspelled.
- **Word List**: search, filter by source, lecture, letter, status and difficulty. Each word has its meaning, sentences, audio and your history.
- **Progress**: 14-day activity, status breakdown, most-missed words, recent sessions, streak and daily goal.
- **Settings**: American or British voice, voice choice and speed. Accept both British and American spellings (*realise/realize*, *neighbour/neighbor*). Auto-play, retype mistakes, sounds, theme. Backup, restore and reset.
- Light and dark themes, works on phones, keyboard friendly (Enter to check, Esc to hear again, 1–4 to choose).

## Run it

```bash
pnpm install     # once
pnpm dev         # http://localhost:5173
```

## Build and check

```bash
pnpm build           # production build into dist/
pnpm lint            # oxlint
pnpm test            # unit tests (spelling checks, diff, misspellings, sessions, progress, storage)
pnpm data:validate   # checks src/data/words.js against its sources
```

## Where the words come from

| File | What it is |
| --- | --- |
| `data-source/vocab11.js` | Vocab11's generated vocabulary, copied from the Vocab11 repo (`src/data/vocabulary.js`) |
| `data-source/spelling-list.txt` | The 232 words of `Spelling .pdf`, in PDF order, with the PDF's notes (noun, verb, plural…) |
| `data-source/spelling-content.txt` | Part of speech, meaning and an example sentence for each spelling-list word that is not in Vocab11 (written for this app) |
| `data-source/variants.txt` | Other accepted spellings (British / American) |
| `data-source/sounds-like.txt` | Words that sound like another word; their meaning is always shown in a listening question |
| `src/data/words.js` | **Generated** by `pnpm data:build`. Do not edit by hand |

When Vocab11 gets new lectures, copy its `src/data/vocabulary.js` to `data-source/vocab11.js`, then run `pnpm data:build` and `pnpm data:validate`.

## Deploy

Import the repository in Vercel (Framework: Vite, build `pnpm build`, output `dist`).
`vercel.json` already sends every path to `index.html`, so links like `/practice` work.
