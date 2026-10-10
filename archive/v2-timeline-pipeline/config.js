/* =====================================================================================
   ALIVE: shared project configuration
   Everyone who opens the app uses these values. Nobody enters their own keys, and there are no profiles.
   Paste each value between the quotes. Edit this file right on GitHub (pencil icon) and commit; the site updates in ~30 s.

   WARNING: this repo is public, so anything pasted here is public. Use keys made only for this project, restricted to
   what they need, with a hard monthly spend limit. OpenAI may also auto-disable keys it finds in public repos.
   ===================================================================================== */
window.ALIVE_CONFIG = {

  // 0) THE ALIVE SERVER (recommended). The Vercel functions in api/, e.g. 'https://alive-app.vercel.app/api'  (ends in /api, no slash).
  //    It holds the OpenAI keys and the GitHub token as Vercel environment variables, so EVERY device can transcribe, use the AI
  //    and save, with nothing to configure. This URL is not a secret. When it is set, EMPTY 1) and 2) below (they'd be public).
  //    Setup: README.md -> "The Alive server".
  apiURL: 'https://alive-app-6e.vercel.app/api',

  // 1) SPEECH TO TEXT (Whisper). OpenAI key used only to transcribe recordings.
  //    Paste it here  ↓  e.g. 'sk-proj-...'
  openaiTranscribeKey: '',

  // 2) TEXT PROCESSING. A second OpenAI key used for key points, tags, summaries, insights and reminder messages.
  //    Paste it here  ↓
  openaiTextKey: '',

  //    Chat model used for text processing.
  textModel: 'gpt-4o-mini',

  // 3) THE DATABASE: this GitHub repo. Every entry (entries/<id>.json) and recording (audio/<id>.webm) lives here.
  //    Anyone can READ it (the repo is public), so the past entries load on any device with no setup.
  //    To SAVE new recordings, enter a GitHub token in Settings on the device you record with (press and hold the title).
  //    Never paste that token here: GitHub revokes tokens it finds in public repos.
  githubRepo: 'detorotodorov-alexander/alive-app',

  // 4) OPTIONAL: a Firebase Realtime Database instead of GitHub. If set, it replaces the repo as the database.
  //    Firebase Realtime Database URL, e.g. 'https://alive-demo-default-rtdb.firebaseio.com'  (no trailing slash).
  //    Entries AND their audio are stored here. Leave empty to keep everything on each device. Setup steps are in README.md.
  databaseURL: ''
};
