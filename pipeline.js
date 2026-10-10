/* Alive text pipeline.  Goal: never invent. The model may only point at things the person actually said, and the code checks it.

   transcript ──► gate ──► extract (explicit things only) ──► verify ──► [relevant?] ──► retrieve past ──► connect ──► verify
                   │                                                         │ no
                   └ short note: keep the text, no analysis                  └ nothing is shown, nothing is made up

   1. gate      Under 10 s or under 12 words it is a note: transcribed and kept, never summarised.
   2. extract   One LLM call that may only return items the speaker EXPLICITLY states (commitment, feeling about something specific,
                event, problem, win, decision), each with a verbatim quote. Small talk and neutral description are not items.
   3. verify    Code, not the model: every quote must appear in the transcript as a run of consecutive words; every restated point may
                not introduce words the transcript doesn't support; every tag must appear in the transcript. Failures are dropped.
   4. retrieve  Code, not the model: past entries that share a person, project or event with this one, or several significant words.
                No candidates, no echoes. The model never sees the whole history, only a few candidates.
   5. connect   One LLM call over the new entry and those few candidates. A link needs a verbatim quote from BOTH entries (checked by
                code) and one relation: repeats | follows_up | progress | contradicts. No prose summary: the UI shows the two quotes.
                It may also add ONE question, which must quote the person's own words between « » (checked) and end with "?".
   The app's philosophy (alive vs merely existing) is only a lens for choosing which of their own words to ask about; it is never
   a claim about the person.

   Works in the browser (window.Pipeline) and in Node (require). The LLM is injected: llm(system, user, { json, max }) -> string. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory();
  else root.Pipeline = factory();
})(typeof self !== 'undefined' ? self : this, function(){

  const MIN_SECONDS = 10, MIN_WORDS = 12;
  const KINDS = ['commitment', 'feeling', 'event', 'problem', 'win', 'decision'];
  const RELATIONS = ['repeats', 'follows_up', 'progress', 'contradicts'];
  const EMPTY_TAGS = () => ({ people:[], projects:[], work:[], events:[], missions:[] });

  /* ---------- text helpers ---------- */
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = s => (String(s || '').match(/\S+/g) || []).length;
  const STOP = new Set(('de la que el en y a los se del las un por con no una su para es al lo como mas pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto antes algunos que unos yo otro otras otra el tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mi mis tu te ti tus ellas hoy ayer manana estoy estaba esta han ha he hace hacer cada vez siempre nunca tengo tiene tienen voy va vamos quiero queria ser sido era fue son soy eres digo dice dicho decir cosas cosa dia dias semana veces siento sentido creo parece ahora luego despues aunque mientras todavia solo tan menos bien mal hemos mismo misma mismos muchisimo mucha vuelto haber habido estado estamos habia hecho tener tenia podria puedo cuanto ver tarde noche semanas ' +
    'the a an and or but if so to of in on at for with from by is are was were be been am i me my we you it its this that these those not no yes do did does have has had just really very can could would should will about as up out than then there here what when who how why also like get got going go into over some more much too still even one all they them their he she his her our us your because feel felt think thought today day').split(' '));
  const sigWords = s => norm(s).split(' ').filter(w => w.length >= 5 && !STOP.has(w));
  const sigSet = s => new Set(sigWords(s));

  // The quote's words appear in the text as one consecutive run (case, accents and punctuation ignored).
  const grounded = (quote, text, minWords = 3) => {
    const q = norm(quote);
    return !!q && q.split(' ').length >= minWords && (' ' + norm(text) + ' ').includes(' ' + q + ' ');
  };
  // A restated point may not bring in content words the transcript doesn't support (5-letter prefixes absorb verb endings). One slip allowed.
  const supported = (point, text) => {
    const have = new Set(norm(text).split(' ').map(w => w.slice(0, 4)));
    let total = 0, missing = 0;
    for(const w of norm(point).split(' ')){
      if(w.length < 4 || STOP.has(w)) continue;
      total++; if(!have.has(w.slice(0, 4))) missing++;
    }
    return missing <= 1 && (total < 3 || missing / total <= .34);     // a point in another language fails here
  };
  // Spanish or English, by counting function words; the model is told to answer in that language.
  const ES = new Set('de la que el en y los se un por con para es no mi me lo he una su al como pero hoy ya muy'.split(' '));
  const EN = new Set('the and to of is in that it my i you was for on with have he she we they not but'.split(' '));
  const detectLang = text => { let es = 0, en = 0; for(const w of norm(text).split(' ')){ if(ES.has(w)) es++; if(EN.has(w)) en++; } return en > es ? 'English' : 'Spanish'; };
  const parse = raw => {
    const s = String(raw || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
    try{ return JSON.parse(s.slice(a, b + 1)); }catch{ return {}; }
  };
  const day = ts => new Date(ts).toISOString().slice(0, 10);

  /* ---------- 1. gate ---------- */
  function gate(entry){
    const text = entry.text || '';
    if(entry.dur && entry.dur < MIN_SECONDS) return { mode:'note', reason:'shorter than ' + MIN_SECONDS + ' seconds' };
    if(wordCount(text) < MIN_WORDS) return { mode:'note', reason:'fewer than ' + MIN_WORDS + ' words' };
    return { mode:'full' };
  }

  /* ---------- 2 + 3. extract and verify ---------- */
  const EXTRACT_SYSTEM = 'You read ONE voice-journal transcript. Extract ONLY what the speaker explicitly says. Do not interpret, do not infer causes, do not generalise, do not connect it to anything else, do not give advice. ' +
    'Reply with ONLY JSON: {"items":[{"kind":"commitment|feeling|event|problem|win|decision","quote":"<EXACT consecutive words copied from the transcript, 4 to 25 words>","point":"<what they said, restated in at most 12 words, same language, adding no new information>"}],"tags":{"people":[],"projects":[],"work":[],"events":[]}}. ' +
    'An item exists only if the speaker explicitly states: an intention or promise (commitment), an emotion about something specific (feeling), something that happened (event), a problem, an achievement (win), or a decision. Small talk, filler and neutral description are NOT items. ' +
    'If nothing is explicitly relevant return {"items":[],"tags":{"people":[],"projects":[],"work":[],"events":[]}}. At most 5 items. ' +
    'Tags are names or terms that appear verbatim in the transcript: people = named people; projects = things they are building; work = job or study context; events = specific happenings. ';

  async function extract(text, llm){
    const lang = detectLang(text);
    const j = parse(await llm(EXTRACT_SYSTEM + 'Write every "point" in ' + lang + ', the language of the transcript.', text, { json:true, max:700, temp:.1 }));
    const items = []; let dropped = 0;
    for(const it of (Array.isArray(j.items) ? j.items : [])){
      const quote = String(it.quote || '').trim(), point = String(it.point || '').trim();
      if(!KINDS.includes(it.kind) || !grounded(quote, text, 3) || !point || !supported(point, text)){ dropped++; continue; }
      items.push({ kind:it.kind, quote, point });
      if(items.length >= 5) break;
    }
    const tags = EMPTY_TAGS();
    for(const k of ['people', 'projects', 'work', 'events']){
      for(const t of (j.tags && Array.isArray(j.tags[k]) ? j.tags[k] : [])){
        const s = String(t).trim();
        if(s && s.length <= 24 && grounded(s, text, 1) && !tags[k].includes(s) && tags[k].length < 3) tags[k].push(s); else if(s) dropped++;
      }
    }
    tags.missions = items.filter(i => i.kind === 'commitment').map(i => i.point).slice(0, 3);   // taken from verified commitments, never invented
    return { items, tags, dropped };
  }

  async function analyze(entry, llm){
    const g = gate(entry);
    if(g.mode === 'note') return { analysis:{ v:2, mode:'note', reason:g.reason }, points:[], evidence:[], tags:EMPTY_TAGS() };
    const { items, tags, dropped } = await extract(entry.text, llm);
    return { analysis:{ v:2, mode:'full', relevant:items.length > 0, dropped }, points:items.map(i => i.point), evidence:items.map(({ kind, quote }) => ({ kind, quote })), tags };
  }

  /* ---------- 4. retrieve ---------- */
  // Optional vecs: { [entryId]: [numbers] } from an embedding model. Meaning counts as one more signal next to shared people/projects/words,
  // so a past entry that says the same thing in other words can still be found. It only decides WHICH entries the model gets to look at;
  // a link still needs a verbatim quote from both sides, so semantic search can't introduce anything that wasn't said.
  const cosine = (a, b) => { let d = 0, x = 0, y = 0; for(let i = 0; i < a.length; i++){ d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };
  function candidates(entry, past, limit = 6, vecs = null){
    const tags = entry.tags || {}, mine = new Set(['people', 'projects', 'events'].flatMap(k => (tags[k] || []).map(norm)));
    const words = sigSet((entry.evidence || []).map(e => e.quote).join(' ') || entry.text);
    const scored = [];
    for(const p of past){
      if(!p.text) continue;
      let score = 0; const pt = p.tags || {};
      for(const k of ['people', 'projects', 'events']) for(const t of (pt[k] || [])) if(mine.has(norm(t))) score += 3;
      const theirs = sigSet(p.text); let shared = 0;
      for(const w of words) if(theirs.has(w)) shared++;
      score += Math.min(shared, 5);
      if(vecs && vecs[entry.id] && vecs[p.id]){ const s = cosine(vecs[entry.id], vecs[p.id]); if(s >= .3) score += Math.round(s * 10); }
      if(score >= 3) scored.push({ p, score });
    }
    return scored.sort((a, b) => b.score - a.score || b.p.ts - a.p.ts).slice(0, limit).map(s => s.p);
  }

  /* ---------- 5. connect and verify ---------- */
  const CONNECT_SYSTEM = 'You compare a NEW voice-journal entry with PAST entries of the same person. Report a link ONLY when the same concrete thing appears in both: the same person, the same project, the same promise or intention, or the same situation or feeling about the same subject. Never infer patterns, never speculate, never interpret, never diagnose. ' +
    'For each link give an EXACT quote from the NEW entry and an EXACT quote from that PAST entry (verbatim, consecutive words, 4 to 25 words each, no ellipses) that show the same thing, and one relation: ' +
    'repeats = the same situation or feeling about the same subject happens again; follows_up = the new entry continues the same event or topic; progress = the person now does or feels something clearly better or different about what they previously struggled with or wanted; contradicts = they now say the opposite of before. Pick the most literal one. If there is no explicit link, return an empty list. ' +
    'Write the question in the SAME LANGUAGE as the NEW entry. ' +
    'Reply with ONLY JSON: {"links":[{"id":<past entry number>,"relation":"repeats|follows_up|progress|contradicts","newQuote":"...","oldQuote":"..."}],"question":"..."}. ' +
    'question: optional, ONE question to the person that includes a verbatim fragment (at least 3 words) of the NEW entry between « and », and ends with "?". It must ask, not state anything about them. The app is about being alive rather than merely existing; you may use that only to choose which of their own words to ask about. Otherwise use an empty string.';

  async function connect(entry, cands, llm){
    if(!cands.length) return { links:[], question:'', checked:true };
    const user = 'NEW ENTRY [' + day(entry.ts) + ']:\n' + entry.text + '\n\nPAST ENTRIES:\n' +
      cands.map(p => '#' + p.id + ' [' + day(p.ts) + ']: ' + p.text.slice(0, 800)).join('\n\n');
    const j = parse(await llm(CONNECT_SYSTEM + ' Answer in ' + detectLang(entry.text) + '.', user, { json:true, max:600, temp:.1 }));
    const byId = new Map(cands.map(p => [p.id, p])), links = [], seen = new Set();
    for(const l of (Array.isArray(j.links) ? j.links : [])){
      const p = byId.get(+l.id);
      if(!p || seen.has(p.id) || !RELATIONS.includes(l.relation)) continue;
      if(!grounded(l.newQuote, entry.text, 3) || !grounded(l.oldQuote, p.text, 3)) continue;     // both quotes must really exist
      const clean = q => String(q).replace(/^[\s.…]+|[\s.…]+$/g, '').trim();                       // models like to wrap quotes in "..."
      links.push({ id:p.id, relation:l.relation, newQuote:clean(l.newQuote), oldQuote:clean(l.oldQuote) });
      seen.add(p.id); if(links.length >= 3) break;
    }
    let question = String(j.question || '').trim();
    const m = question.match(/«([^»]+)»/);
    if(!(m && grounded(m[1], entry.text, 3) && /\?\s*$/.test(question))) question = '';
    return { links, question, checked:true };
  }

  /* ---------- whole pipeline ---------- */
  async function run(entry, past, llm, vecs){
    const patch = await analyze(entry, llm);
    if(patch.analysis.mode !== 'full' || !patch.analysis.relevant) return patch;     // nothing explicit: say nothing
    const merged = { ...entry, tags:patch.tags, evidence:patch.evidence };
    patch.echo = await connect(entry, candidates(merged, past, 6, vecs), llm);
    return patch;
  }

  return { run, analyze, extract, candidates, connect, gate, grounded, supported, norm, cosine, detectLang, MIN_SECONDS, MIN_WORDS, RELATIONS };
});
