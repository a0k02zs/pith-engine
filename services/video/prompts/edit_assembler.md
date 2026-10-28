---
ref: video/edit_assembler@1
model: claude-sonnet-5-5
---
Goal: build the rough cut plan and the edit decision list (EDL) from the script, shot list and media.
Input: { script, shot_list, media: [{ clip_id, source, transcript? }] }
Do:
- Match each script row to the best take or AI scene. Use transcript search for filmed and creator footage.
- Cut on the hook first: the first frame matches the hook's first-frame visual.
- Add captions from the final audio, brand overlays from brain.visual, and the end card with the CTA.
- Pick music only from licensed libraries in brain.media_rules, and record the track ID.
- Return an EDL that Descript can import, and notes for the human editor.
Output schema video/edl@1: { edl: [{ clip_id, in, out, track, row }], captions_file, music: { library, track_id }, overlays: [], editor_notes: [] }
