# 02 · Pipeline, approval gates and service levels

The orchestrator runs these 12 stages for every video job. Gates (G) stop the job until a
person decides in the approval inbox. The machine-readable versions are `workflow/video.job.json`, `workflow/video.variant_refresh.json` and
`workflow/video.weekly_learn.json`, in the engine workflow format. Gate kinds and roles are in `07-engine-interfaces.md` §3.

| # | Stage | Who | Output | Service level |
|---|---|---|---|---|
| 1 | Intake | Agent: `brief-intake` | Validated brief (T1) | 1 hour |
| 2 | Hooks and scripts | Agent: `hook-writer`, `scriptwriter` | 5 hooks per ad, 1–2 scripts (T2) | 4 hours |
| 3 | Pre-check | Agent: `compliance-precheck` + engine compliance gate | Claim, market and rights flags | 15 minutes |
| G1 | **Approve script** (`script`) | Creative lead and client (2 approvals) | Approved script, chosen hooks | 48 hours |
| 4 | Plan | Agent: `production-planner` | Track choice, shot list (T3), asset list, cost estimate | 4 hours |
| G2 | **Approve spend** (`budget`; only if cost is over the per-job limit, Track C, or a new fee) | Strategist and client (2 approvals) | Approved budget | 24 hours |
| 5 | Rights setup | Agent drafts; person sends | Consent and release forms (T4), creator contract, permits | Track B/C only |
| G3 | **Contract** (`contract`) and **rights confirmed** (compliance check, engine guardrail G8) | Creative lead and client legal or approver; then automatic | Signed contract; active rights grants in the engine | Before any filming or AI likeness |
| 6 | Produce | Track A: agents + tools. Track B: creators. Track C: crew | Raw footage or AI scenes | A: 2 days · B: 7 days · C: per call sheet |
| 7 | Edit | Agent: `edit-assembler` + editor | Rough cut, captions, music, brand overlays | A: 1 day · B/C: 2 days |
| 8 | Localize | Agent: `localizer` + native reviewer for dub | Captions per language, dubbed audio | 1 day per language |
| 9 | Versions | Agent: `versioner` | 9:16, 1:1, 4:5, 16:9 exports, cutdowns | 4 hours |
| 10 | Automated QC | Agent: `qc-checker` + engine compliance gate | QC report (T7) | 30 minutes |
| G4 | **Final review** (`creative`) | Editor always; creative lead and client for hero, testimonial and new template | Approved master and versions | 24 hours (editor), 48 hours (client) |
| 11 | Deliver | Orchestrator | Files to DAM, social and ads pipelines; licence log updated (T5) | 1 hour |
| 12 | Learn | Agent: `performance-analyst` | Hook, hold and CPA results to the client brain; refresh requests | Weekly |

## Gate rules

### G1 · Approve script (always)
- Shows: script, hooks, claims used (each linked to the approved claims list), markets, brand check score.
- Creative lead and client both approve (engine rule for the `script` kind; it cannot be skipped).
  New hooks on an already approved body run in the `video.variant_refresh` workflow instead, where the
  `creative` gate skips when there are no new claims and the hook types were approved before.
- Reject reasons go back to the agent as structured feedback and to the client brain.

### G2 · Approve spend (conditional)
- Opens when the cost estimate is above the per-job limit set for the client, or the track is C,
  or a creator, talent or music fee is new.
- The agent can never raise the job budget (engine guardrail G1). The strategist and the client approve new spend.

### G3 · Rights confirmed (conditional)
- Opens when any identifiable real person appears, or any AI likeness or voice clone is used.
- Passes only when every person in the cast list has an active rights grant in the engine with the right
  scope (`likeness`, `avatar`, `voice_clone`, `paid_usage`), markets, channels and term, and no `revoked_at`.
- No filming and no avatar or voice generation starts before G3 passes.

### G4 · Final review (always)
- Editor checks: picture and sound quality, captions, brand overlays, the QC report, AI labels,
  music and stock licences, ad disclosure where a creator or paid partner appears.
- Creative lead also reviews hero films. Client reviews hero films, testimonials and the first
  video of any new template.
- A failed QC item blocks approval. The editor cannot override a "fail" from the compliance gate;
  a `block` must be fixed; a `warn` needs a person to accept it with a written reason.

## Escalation
- A gate past its service level sends a reminder at 100% and escalates to the account lead at 150%.
- A take-down request (consent revoked, licence ended, complaint) creates an urgent job: the
  orchestrator lists every live placement of the asset, the ads pipeline pauses paid placements,
  and a person confirms removal within 24 hours.

## Track-specific steps

- **Track A:** stage 6 runs `ai-scene-generator` tasks per shot. Stock and music come only from
  licensed libraries listed in the client brain. Each AI scene is tagged `ai_generated: true` for labels.
- **Track B:** stage 5 sends the creator brief and contract (from Service 6 templates). Stage 6
  waits for the creator upload. The editor checks the raw upload against the brief before stage 7.
- **Track C:** stage 5 makes the call sheet, releases and permit checklist. A producer runs the
  shoot. Footage is uploaded to the review tool, and the editor logs selects before the AI rough cut.

## Inputs that start a job (events)
- `campaign.asset_requested` (Service 2), `social.video_requested` (Service 4),
  `paid.creative_refresh_requested` (Service 11), `content.repurpose_requested` (Service 7),
  `events.recording_ready` (Service 16), or a manual brief in the client portal.
