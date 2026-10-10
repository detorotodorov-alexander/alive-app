# Alive

A web app that records your voice, transcribes it, and turns your days into a web of the words and labels you keep
returning to, so you can see the patterns in your life and live with more purpose.

Built for the Galaxy S24 Ultra viewport (412×915, 19.5:9). One file: `index.html`, plus `sw.js` for quiet reminders.

## Run it

Serve the folder over HTTP (browsers block storage and the microphone on `file://` pages):

```bash
python -m http.server 5173
```

then open http://localhost:5173. On a phone you need HTTPS for the microphone (a tunnel such as ngrok works).

## What it does

- Records audio and transcribes it (OpenAI Whisper with word timings, or the browser's speech recognition).
- Each recording becomes a card tied to its audio and transcript: tap to read the transcript, which lights up word by word as it plays.
- A web of keywords and labels, with a ring of your last 60 days.
- Time capsules, quiet-moment reminders, key points and tags per entry.
- Shared sync: one Firebase database for everyone (see below), or an optional encrypted sync to your own GitHub repo.

## Shared keys and database (`config.js`)

The app has no accounts and no per-user setup. Everyone uses the same configuration, which lives in [`config.js`](config.js):

| Setting | What it is |
|---------|-----------|
| `openaiTranscribeKey` | OpenAI key used **only** for speech-to-text (Whisper). |
| `openaiTextKey` | A second OpenAI key for everything text: key points, tags, summaries, insights, reminder messages (model: `textModel`, default `gpt-4o-mini`). |
| `databaseURL` | One shared Firebase Realtime Database for all entries. Empty = entries stay on each device. |

Edit `config.js` on GitHub (pencil icon), commit, and the live site updates in about 30 seconds.

**Create the shared database (2 minutes):** in the Firebase console, create a project, then *Build → Realtime Database →
Create database*. Open the *Rules* tab and set `{ "rules": { ".read": true, ".write": true } }` (explicit rules don't expire like
"test mode" does). Copy the database URL into `databaseURL`.

> **This repo is public, so anything in `config.js` is public.** Use keys made only for this project, restricted to the
> endpoints they need (Audio for the Whisper key, Chat for the text key), with a hard monthly spend limit. OpenAI may auto-disable
> keys it finds in public repos. The open database rules also let anyone read and write every entry, which is fine for a demo and
> not for real journals. A real release should put the keys and the database behind a small server.

Audio recordings stay on the device that made them; only the text, word timings and waveform go to the shared database.

## Project notes

- `REMOVED.md` lists what has been hidden or removed from the UI and how to bring it back.
- `archive/v1-voice-journal/` is a snapshot of the app before the latest redesign.
- Without `config.js` keys, the app falls back to the browser's speech recognition and local text analysis; keys typed in Settings still work for local testing.
