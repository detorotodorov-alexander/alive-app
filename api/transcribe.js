// POST /api/transcribe   body: the raw audio bytes (Content-Type audio/webm or audio/mp4) -> OpenAI Whisper with word timings
const { MAX_AUDIO, send, readBody, route } = require('./_lib');

module.exports = route(async (req, res) => {
  if(req.method !== 'POST') return send(res, 405, { error:'POST only' });
  const buf = await readBody(req, MAX_AUDIO);
  if(!buf.length) return send(res, 400, { error:'empty audio' });
  const type = (req.headers['content-type'] || 'audio/webm').split(';')[0];
  const ext = /mp4|m4a|aac/.test(type) ? 'mp4' : 'webm';
  const form = new FormData();                                  // model and format fixed here, nothing from the client
  form.append('file', new Blob([buf], { type }), 'audio.' + ext);
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:'POST', headers:{ Authorization:'Bearer ' + process.env.OPENAI_TRANSCRIBE_KEY }, body:form });
  res.statusCode = r.status;
  res.setHeader('Content-Type', 'application/json');
  res.end(Buffer.from(await r.arrayBuffer()));
});

module.exports.config = { api:{ bodyParser:false } };
