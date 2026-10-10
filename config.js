/* =====================================================================================
   ALIVE: shared project configuration
   Everyone who opens the app uses these values. Nobody enters their own keys, and there are no profiles.
   Paste each value between the quotes. Edit this file right on GitHub (pencil icon) and commit; the site updates in ~30 s.

   WARNING: this repo is public, so anything pasted here is public. Use keys made only for this project, restricted to
   what they need, with a hard monthly spend limit. OpenAI may also auto-disable keys it finds in public repos.
   ===================================================================================== */
window.ALIVE_CONFIG = {

  // 1) SPEECH TO TEXT (Whisper). OpenAI key used only to transcribe recordings.
  //    Paste it here  ↓  e.g. 'sk-proj-...'
  openaiTranscribeKey: '',

  // 2) TEXT PROCESSING. A second OpenAI key used for key points, tags, summaries, insights and reminder messages.
  //    Paste it here  ↓
  openaiTextKey: '',

  //    Chat model used for text processing.
  textModel: 'gpt-4o-mini',

  // 3) SHARED DATABASE. One database for everyone (all entries together).
  //    Firebase Realtime Database URL, e.g. 'https://alive-demo-default-rtdb.firebaseio.com'  (no trailing slash).
  //    Entries AND their audio are stored here. Leave empty to keep everything on each device. Setup steps are in README.md.
  databaseURL: ''
};
