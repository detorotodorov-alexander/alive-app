// POST /api/chat   body: { messages, max_tokens, temperature, response_format } -> OpenAI chat completions (model fixed, size capped)
const { MAX_CHAT_TOKENS, send, readBody, route } = require('./_lib');

module.exports = route(async (req, res) => {
  if(req.method !== 'POST') return send(res, 405, { error:'POST only' });
  const b = JSON.parse((await readBody(req, 512 * 1024)).toString('utf8') || '{}');
  const body = {
    model: process.env.TEXT_MODEL || 'gpt-4o-mini',               // the client can't pick a pricier model
    messages: Array.isArray(b.messages) ? b.messages.slice(0, 4).map(m => ({ role: m.role === 'system' ? 'system' : 'user', content: String(m.content || '').slice(0, 60000) })) : [],
    max_tokens: Math.min(+b.max_tokens || 600, MAX_CHAT_TOKENS),
    temperature: typeof b.temperature === 'number' ? b.temperature : .4
  };
  if(b.response_format && b.response_format.type === 'json_object') body.response_format = { type:'json_object' };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + process.env.OPENAI_TEXT_KEY }, body:JSON.stringify(body) });
  res.statusCode = r.status;
  res.setHeader('Content-Type', 'application/json');
  res.end(Buffer.from(await r.arrayBuffer()));
});

module.exports.config = { api:{ bodyParser:false } };
