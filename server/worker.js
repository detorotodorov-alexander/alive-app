/* Alive API: a Cloudflare Worker that sits between the web app and OpenAI / GitHub.
   The OpenAI keys and the GitHub token live here as Cloudflare SECRETS, never in the repo or the page.

   Secrets (Settings → Variables and Secrets → type "Secret"):
     OPENAI_TRANSCRIBE_KEY   OpenAI key for Whisper
     OPENAI_TEXT_KEY         OpenAI key for text (key points, insights, echoes, reminders)
     GITHUB_TOKEN            fine-grained token: only the data repo, Contents: Read and write
   Plain variables (type "Text"):
     GITHUB_REPO             e.g. detorotodorov-alexander/alive-app   (where entries/ and audio/ live)
     ALLOWED_ORIGIN          e.g. https://detorotodorov-alexander.github.io   (only this site may use the API)
     TEXT_MODEL              optional, default gpt-4o-mini

   Routes (all JSON unless noted):
     POST   /transcribe        multipart form, forwarded to OpenAI /v1/audio/transcriptions
     POST   /chat              chat-completions body, forwarded to OpenAI (model and size are capped here)
     GET    /entries           { "<id>": "<sha>", … }
     GET    /entries/<id>      the entry JSON
     PUT    /entries/<id>      { "text": "<entry JSON string>", "sha": "<optional>" }  ->  { "sha": … }
     DELETE /entries/<id>      deletes the entry and its audio
     PUT    /audio/<id>        raw audio bytes (Content-Type audio/webm or audio/mp4)
     GET    /audio/<id>        raw audio bytes */

const MAX_AUDIO = 25 * 1024 * 1024;          // Whisper's own upload limit
const MAX_ENTRY = 512 * 1024;
const MAX_CHAT_TOKENS = 1500;

export default {
  async fetch(req, env){
    const origin = req.headers.get('Origin') || '';
    const allowed = allowedOrigin(origin, env);
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : (env.ALLOWED_ORIGIN || ''),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if(req.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    if(!allowed) return json({ error: 'origin not allowed' }, 403, cors);

    try{
      const url = new URL(req.url), parts = url.pathname.split('/').filter(Boolean);
      const [route, id] = parts;
      if(id !== undefined && !/^\d{1,16}$/.test(id)) return json({ error: 'bad id' }, 400, cors);

      if(route === 'transcribe' && req.method === 'POST') return await transcribe(req, env, cors);
      if(route === 'chat' && req.method === 'POST') return await chat(req, env, cors);
      if(route === 'entries'){
        if(!id && req.method === 'GET') return await listEntries(env, cors);
        if(id && req.method === 'GET') return await getEntry(env, id, cors);
        if(id && req.method === 'PUT') return await putEntry(req, env, id, cors);
        if(id && req.method === 'DELETE') return await deleteEntry(env, id, cors);
      }
      if(route === 'audio' && id){
        if(req.method === 'PUT') return await putAudio(req, env, id, cors);
        if(req.method === 'GET') return await getAudio(env, id, cors);
      }
      return json({ error: 'not found' }, 404, cors);
    }catch(err){
      return json({ error: String(err && err.message || err) }, 502, cors);
    }
  }
};

function allowedOrigin(origin, env){
  if(!origin) return false;
  const list = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);   // local testing
}
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
const passthrough = async (r, cors) => new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': r.headers.get('Content-Type') || 'application/json' } });

/* ---------- OpenAI ---------- */
async function transcribe(req, env, cors){
  const len = +req.headers.get('Content-Length') || 0;
  if(len > MAX_AUDIO + 64 * 1024) return json({ error: 'audio too large' }, 413, cors);
  const form = await req.formData();
  const out = new FormData();                                  // rebuild: only the fields we allow, model fixed to Whisper
  const file = form.get('file'); if(!file) return json({ error: 'missing file' }, 400, cors);
  out.append('file', file, file.name || 'audio.webm');
  out.append('model', 'whisper-1');
  out.append('response_format', 'verbose_json');
  out.append('timestamp_granularities[]', 'word');
  const lang = form.get('language'); if(lang) out.append('language', String(lang).slice(0, 5));
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.OPENAI_TRANSCRIBE_KEY }, body: out });
  return passthrough(r, cors);
}
async function chat(req, env, cors){
  const b = await req.json();
  const body = {                                               // only what the app needs; no other models, no huge outputs
    model: env.TEXT_MODEL || 'gpt-4o-mini',
    messages: Array.isArray(b.messages) ? b.messages.slice(0, 4).map(m => ({ role: m.role === 'system' ? 'system' : 'user', content: String(m.content || '').slice(0, 60000) })) : [],
    max_tokens: Math.min(+b.max_tokens || 600, MAX_CHAT_TOKENS),
    temperature: typeof b.temperature === 'number' ? b.temperature : .4
  };
  if(b.response_format && b.response_format.type === 'json_object') body.response_format = { type: 'json_object' };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.OPENAI_TEXT_KEY }, body: JSON.stringify(body) });
  return passthrough(r, cors);
}

/* ---------- GitHub (the database) ---------- */
function gh(env, path, init = {}){
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, {
    ...init,
    headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
               'User-Agent': 'alive-api', ...(init.headers || {}) }
  });
}
async function shaOf(env, path){ const r = await gh(env, path); return r.ok ? (await r.json()).sha : null; }
function toB64(buf){
  const bytes = new Uint8Array(buf); let s = '';
  for(let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const utf8B64 = str => toB64(new TextEncoder().encode(str));

async function listEntries(env, cors){
  const r = await gh(env, 'entries');
  if(r.status === 404) return json({}, 200, cors);
  if(!r.ok) return json({ error: 'github ' + r.status }, 502, cors);
  const arr = await r.json(), out = {};
  for(const f of arr) if(f.name.endsWith('.json')) out[f.name.slice(0, -5)] = f.sha;
  return json(out, 200, cors);
}
async function getEntry(env, id, cors){
  const r = await gh(env, `entries/${id}.json`, { headers: { Accept: 'application/vnd.github.raw+json' } });
  if(!r.ok) return json({ error: 'github ' + r.status }, r.status === 404 ? 404 : 502, cors);
  return new Response(await r.text(), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
}
async function putEntry(req, env, id, cors){
  const b = await req.json();
  const text = String(b.text || '');
  if(!text || text.length > MAX_ENTRY) return json({ error: 'bad entry' }, 400, cors);
  JSON.parse(text);                                            // must be valid JSON
  const body = { message: 'entry ' + id, content: utf8B64(text) };
  const sha = b.sha && b.sha !== 'x' ? b.sha : await shaOf(env, `entries/${id}.json`); if(sha) body.sha = sha;
  const r = await gh(env, `entries/${id}.json`, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  if(!r.ok) return json({ error: 'github ' + r.status }, 502, cors);
  return json({ sha: (await r.json()).content.sha }, 200, cors);
}
async function deleteEntry(env, id, cors){
  for(const path of [`entries/${id}.json`, `audio/${id}.webm`, `audio/${id}.mp4`]){
    const sha = await shaOf(env, path);
    if(sha) await gh(env, path, { method: 'DELETE', body: JSON.stringify({ message: 'delete ' + path, sha }), headers: { 'Content-Type': 'application/json' } });
  }
  return json({ ok: true }, 200, cors);
}
async function putAudio(req, env, id, cors){
  const type = req.headers.get('Content-Type') || 'audio/webm';
  const ext = /mp4|m4a|aac/.test(type) ? 'mp4' : 'webm';
  const buf = await req.arrayBuffer();
  if(!buf.byteLength || buf.byteLength > MAX_AUDIO) return json({ error: 'bad audio' }, 400, cors);
  const path = `audio/${id}.${ext}`, body = { message: 'audio ' + id, content: toB64(buf) };
  const sha = await shaOf(env, path); if(sha) body.sha = sha;
  const r = await gh(env, path, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  if(!r.ok) return json({ error: 'github ' + r.status }, 502, cors);
  return json({ ok: true, ext }, 200, cors);
}
async function getAudio(env, id, cors){
  for(const ext of ['webm', 'mp4']){
    const r = await gh(env, `audio/${id}.${ext}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
    if(r.ok) return new Response(r.body, { status: 200, headers: { ...cors, 'Content-Type': ext === 'mp4' ? 'audio/mp4' : 'audio/webm' } });
  }
  return json({ error: 'not found' }, 404, cors);
}
