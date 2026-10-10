/* Shared helpers for the Alive API (Vercel serverless functions). Files starting with "_" are not routes.

   Environment variables (Vercel → Project → Settings → Environment Variables):
     OPENAI_TRANSCRIBE_KEY   OpenAI key for Whisper                                   (secret)
     OPENAI_TEXT_KEY         OpenAI key for text: key points, insights, echoes        (secret)
     GITHUB_TOKEN            fine-grained token: only the data repo, Contents: R/W    (secret)
     GITHUB_REPO             e.g. detorotodorov-alexander/alive-app
     ALLOWED_ORIGIN          e.g. https://detorotodorov-alexander.github.io   (comma-separate to allow several)
     TEXT_MODEL              optional, default gpt-4o-mini */

const MAX_AUDIO = 4 * 1024 * 1024;        // Vercel's request body limit is 4.5 MB; at 24 kbps that is ~20 minutes of audio
const MAX_ENTRY = 512 * 1024;
const MAX_CHAT_TOKENS = 1500;

function allowedOrigin(origin){
  if(!origin) return false;
  const list = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);   // local testing
}

// Applies CORS and answers the preflight. Returns true when the request is already finished (preflight or blocked origin).
function guard(req, res){
  const origin = req.headers.origin || '';
  const ok = allowedOrigin(origin);
  res.setHeader('Access-Control-Allow-Origin', ok ? origin : (process.env.ALLOWED_ORIGIN || '').split(',')[0].trim());
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  if(req.method === 'OPTIONS'){ res.statusCode = ok ? 204 : 403; res.end(); return true; }
  if(!ok){ send(res, 403, { error:'origin not allowed' }); return true; }
  return false;
}

function send(res, status, body){
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req, limit){
  const chunks = []; let n = 0;
  for await (const c of req){ n += c.length; if(n > limit) throw Object.assign(new Error('body too large'), { status:413 }); chunks.push(c); }
  return Buffer.concat(chunks);
}

const validId = id => /^\d{1,16}$/.test(String(id || ''));

/* ---------- GitHub (the database) ---------- */
function gh(path, init = {}){
  return fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/${path}`, {
    ...init,
    headers:{ Authorization:'Bearer ' + process.env.GITHUB_TOKEN, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28',
              'User-Agent':'alive-api', ...(init.headers || {}) }
  });
}
async function shaOf(path){ const r = await gh(path); return r.ok ? (await r.json()).sha : null; }
async function putFile(path, contentB64, message){
  const body = { message, content:contentB64 };
  const sha = await shaOf(path); if(sha) body.sha = sha;
  const r = await gh(path, { method:'PUT', body:JSON.stringify(body), headers:{ 'Content-Type':'application/json' } });
  if(!r.ok) throw Object.assign(new Error('github ' + r.status), { status:502 });
  return (await r.json()).content.sha;
}
async function deleteFile(path){
  const sha = await shaOf(path); if(!sha) return;
  await gh(path, { method:'DELETE', body:JSON.stringify({ message:'delete ' + path, sha }), headers:{ 'Content-Type':'application/json' } });
}

// Wraps a handler: CORS, error handling, JSON errors.
const route = fn => async (req, res) => {
  try{ if(guard(req, res)) return; await fn(req, res); }
  catch(err){ send(res, err.status || 502, { error:String(err && err.message || err) }); }
};

module.exports = { MAX_AUDIO, MAX_ENTRY, MAX_CHAT_TOKENS, send, readBody, validId, gh, shaOf, putFile, deleteFile, route };
