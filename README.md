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
- Optional private sync to a GitHub repo, with AES-GCM encryption in the browser (set a passphrase).

## Important: keep journal data out of this repo

The sync feature writes one JSON file per entry into `entries/` of whatever repo you point it at. **Use a separate,
private repo for that**, and set an encryption passphrase. This repo is for the app's code.
Audio recordings stay on your device and are not synced.

## Project notes

- `REMOVED.md` lists what has been hidden or removed from the UI and how to bring it back.
- `archive/v1-voice-journal/` is a snapshot of the app before the latest redesign.
- API keys (OpenAI, Anthropic) are entered in the app and stored in the browser only. A real release should move them behind a server.
