// PUT /api/entries/<id>     body { text: "<entry JSON string>" }  -> { sha }
// DELETE /api/entries/<id>  removes the entry and its audio
// (Reading entries and audio doesn't need the server: the repo is public, the app reads raw.githubusercontent.com directly.)
const { MAX_ENTRY, send, readBody, validId, putFile, deleteFile, route } = require('../_lib');

module.exports = route(async (req, res) => {
  const id = req.query.id;
  if(!validId(id)) return send(res, 400, { error:'bad id' });
  if(req.method === 'PUT'){
    const b = JSON.parse((await readBody(req, MAX_ENTRY + 4096)).toString('utf8') || '{}');
    const text = String(b.text || '');
    if(!text || text.length > MAX_ENTRY) return send(res, 400, { error:'bad entry' });
    JSON.parse(text);                                            // must be valid JSON
    const sha = await putFile(`entries/${id}.json`, Buffer.from(text, 'utf8').toString('base64'), 'entry ' + id);
    return send(res, 200, { sha });
  }
  if(req.method === 'DELETE'){
    for(const p of [`entries/${id}.json`, `audio/${id}.webm`, `audio/${id}.mp4`]) await deleteFile(p);
    return send(res, 200, { ok:true });
  }
  send(res, 405, { error:'PUT or DELETE only' });
});

module.exports.config = { api:{ bodyParser:false } };
