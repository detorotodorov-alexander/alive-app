# Alive v2: timeline + pipeline (archived)

Snapshot of the app before v3 started. It is an exact copy: open it by serving this folder (`python -m http.server`) and going to `index.html`.

## What it includes
- **Main screen:** title on top, big memory web in the centre, task bar at the bottom (Memories | record | Web/Timeline).
- **Timeline:** vertical line, key points coloured by type (Mood, People, Plan, Work) and three sizes by importance.
- **Memories:** the cards in a sheet opened from the task bar; the reader with audio and word-by-word transcript.
- **Text pipeline** (`pipeline.js`, see `PIPELINE.md`): 10 s / 12 word gate, extraction of only what is explicit with a verbatim quote,
  verification by code, search of the past and links with a quote from both entries. No invented summary.
- **Embeddings** (`api/embed.js`): search of the past by meaning (OpenAI text-embedding-3-small, 256 dimensions).
- **Server** (`api/`): Vercel functions that keep the keys and forward to OpenAI and GitHub.
- **Data:** GitHub as the database (`entries/`, `audio/`) through the server.

## State
- The last 2 pieces (pipeline and embeddings) were only local, **not published**, when this was archived.
- `config.js` has no keys; `apiURL` points at the Vercel server (`https://alive-app-6e.vercel.app/api`), which keeps them.

## How to go back to this version
`git checkout v2-archive -- .` from the root, or copy this folder over the root.
