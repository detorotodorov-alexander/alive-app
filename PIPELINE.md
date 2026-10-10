# Alive's text pipeline

## The problem

The model used to see the new entry **and the whole history**, with the instruction to "find patterns". With nothing holding it back, it sees patterns
that aren't there and invents a warm summary. Measured with the previous method on the same entry:

| Entry | What the previous method wrote |
|---|---|
| "The weather was nice today, I went for a walk, bought fruit… A normal day." | "…a good contrast with the **moments of anxiety and pressure** you've felt in recent weeks, **especially before the thesis submission**." (none of that was said today) |
| "I felt weird today. Nothing in particular happened." | "…like **three days ago when you talked to Lucía** and felt that you only existed between deadlines." (there is no explicit relation) |

## The rule

**The model may only point at things the person said, and code checks it.** No free prose about the person.

```
transcript ─► 1 gate ─► 2 extract (explicit things only) ─► 3 verify ─► anything? ─► 4 find the past ─► 5 connect ─► verify
                │                                                         │ no
                └ short note: saved as is                                 └ nothing is shown, nothing is invented
```

1. **Gate** (code). Fewer than 8 words = *note*: it is transcribed and saved, **not summarised** or analysed.
2. **Extract** (1 model call). It may only return things the person *says explicitly*: a commitment, a feeling about something specific,
   an event, a problem, an achievement, a decision. Each with a **verbatim quote**. Small talk and neutral description don't count.
   Points are written in the first person, as the speaker.
3. **Verify** (code, not the model). Every quote must appear in the transcript as a run of consecutive words; the restated point
   may not bring in words the transcript doesn't support (and must be in the same language); every tag must appear in the text.
   Whatever fails is dropped. "Missions" come only from verified commitments.
   If nothing is left → **nothing is shown** ("Nothing explicit to highlight in this one").
4. **Find the past** (code). Only entries that share a person, a project or an event, or several significant words (and, optionally, meaning
   via embeddings). With no candidates there are no echoes. The model **never** sees the whole history, only up to 6 candidates.
5. **Connect** (1 call). A link needs a **verbatim quote from both entries** (checked by code) and a relation:
   *repeats / follows_up / progress / contradicts*. There is no prose in between: the screen shows what you said then and what you say today.
   It may add **one question**, which must quote your words between « » and end in "?" (checked). The app's philosophy
   (living for real versus merely existing) is used **only as a criterion to choose which of your words to ask about**, never as a claim.

The abstract summary is gone: what you see are the extracted points, each backed by a quote.

## Results (real model, `gpt-4o-mini`, demo history of 18 entries)

| Case | Result |
|---|---|
| 6 s note | The model isn't called. Saved as is. |
| Small talk with nothing relevant | 1 call, **0 points, 0 echoes**. Nothing is added. |
| Explicit (Jordi, draft, fear, promise) | 2 points with quotes, 2 links with quotes from both entries (Sep 8 and Sep 2), 1 question quoting «doesn't like it». |
| New topic (bread with Carmen) | 3 points, **0 echoes** (no past to connect). |
| Ambiguous ("I felt weird") | Only what is explicit; **no invented echo**. |

Repeated runs: same results in 4 of 4 runs after fixing the temperature at 0.1. Every link and every quote is re-checked outside the
pipeline: 0 unsupported quotes. Cost: 1 call for a short entry, 2 for an entry with content; 0 for notes.

Code: `pipeline.js` (no dependencies; works in the browser and in Node).

## Old data, the demo and new people

For you, in the demo, there will already be a real history and the echoes will be real. **For anyone else** there are three options:

- ❌ *Let the model "autocomplete" an invented past.* It is exactly the problem above, disguised as real data. Rejected.
- ✅ **A labelled example world.** A fictional, clearly marked history ("Example: Mara, 3 months"), read-only, that can be
  explored (timeline, real echoes between those entries). A new person's entries are never mixed with it.
- ✅ **Onboarding that gives value from the first recording**, inventing nothing:
  1. *A guided first entry* (30-60 s): "Tell me something about your day".
  2. *Immediate value from just that entry*: the points with their quotes, the tags. If nothing explicit was said, the app
     says so honestly and asks for a little more.
  3. *"This is how it will look in a month"*: a switch to see the example world next to it. They see the usefulness without anything being invented about them.
  4. *The first echo appears on the second recording*, with the explanation: "your web grows when you speak".

Recommendation: **example world + guided onboarding**. It solves the problem instead of dodging it, and it is honest.

## Open decisions

1. **Strangers' data.** Today every recording goes to a shared public database: a stranger who records shows up mixed in with your demo and
   anyone can see it. Proposal: *guest mode* (everything local, no sync) for visitors and *owner mode* (synced) only for you.
2. **Thresholds.** 8 words for the gate. Fine?
3. **Language.** The pipeline answers in the language of the entry (tested in Spanish). Is anything else needed (Catalan)?

## v3: five steps, card first
The card is created and saved the moment you stop recording; each step then writes its result into the entry as soon as it has it
(`proc.stage` says which one is running, and it is removed at the end). If the app is closed mid-way, it resumes on the next start.

1. **Transcribe** (Whisper). 2. **Key points** (`extract`: verbatim quote + code check; fewer than 8 words it is kept as a note).
3. **Find patterns** (`candidates` + `propose`: the model only proposes links). 4. **Review** (`review`: code keeps a link only if both quotes exist).
5. **Summary** (`summarize`: two sentences at most, in the first person; if it adds anything the transcript doesn't support, the verified key points are used).

The timeline shows every open memory immediately (a pill with the first words, or the running step, until key points exist); it has no filters and no sizes.
