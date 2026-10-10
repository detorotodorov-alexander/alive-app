// GET /api/entries   ->  { "<id>": "<sha>", ... }   (the ids of every entry in the data repo)
const { send, gh, route } = require('./_lib');

module.exports = route(async (req, res) => {
  if(req.method !== 'GET') return send(res, 405, { error:'GET only' });
  const r = await gh('entries');
  if(r.status === 404) return send(res, 200, {});
  if(!r.ok) return send(res, 502, { error:'github ' + r.status });
  const out = {};
  for(const f of await r.json()) if(f.name.endsWith('.json')) out[f.name.slice(0, -5)] = f.sha;
  send(res, 200, out);
});
