// PUT /api/audio/<id>   body: raw audio bytes (Content-Type audio/webm or audio/mp4) -> saved as audio/<id>.webm|mp4 in the data repo
const { MAX_AUDIO, send, readBody, validId, putFile, route } = require('../_lib');

module.exports = route(async (req, res) => {
  const id = req.query.id;
  if(!validId(id)) return send(res, 400, { error:'bad id' });
  if(req.method !== 'PUT') return send(res, 405, { error:'PUT only' });
  const buf = await readBody(req, MAX_AUDIO);
  if(!buf.length) return send(res, 400, { error:'empty audio' });
  const type = req.headers['content-type'] || 'audio/webm';
  const ext = /mp4|m4a|aac/.test(type) ? 'mp4' : 'webm';
  await putFile(`audio/${id}.${ext}`, buf.toString('base64'), 'audio ' + id);
  send(res, 200, { ok:true, ext });
});

module.exports.config = { api:{ bodyParser:false } };
