// POST /api/embed   body { inputs: ["text", ...] }  ->  { vectors: [[...256 numbers], ...] }
// OpenAI embeddings (text-embedding-3-small, multilingual, shortened to 256 dimensions). A number per meaning-direction, not text:
// the app uses them to find past entries that MEAN the same thing, which keyword overlap misses. Model and size are fixed here.
// Key: OPENAI_EMBED_KEY if set, otherwise OPENAI_TEXT_KEY (so no new variable is needed).
const { send, readBody, route } = require('./_lib');

module.exports = route(async (req, res) => {
  if(req.method !== 'POST') return send(res, 405, { error:'POST only' });
  const b = JSON.parse((await readBody(req, 512 * 1024)).toString('utf8') || '{}');
  const inputs = (Array.isArray(b.inputs) ? b.inputs : []).slice(0, 100).map(s => String(s || '').slice(0, 6000)).filter(Boolean);
  if(!inputs.length) return send(res, 400, { error:'no inputs' });
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + (process.env.OPENAI_EMBED_KEY || process.env.OPENAI_TEXT_KEY) },
    body:JSON.stringify({ model:'text-embedding-3-small', input:inputs, dimensions:256 })
  });
  if(!r.ok) return send(res, r.status === 401 || r.status === 403 ? 502 : r.status, { error:'embeddings ' + r.status });
  const j = await r.json();
  send(res, 200, { vectors:j.data.map(d => d.embedding.map(x => +x.toFixed(4))) });
});

module.exports.config = { api:{ bodyParser:false } };
