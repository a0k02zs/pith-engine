---
ref: video/qc_checker@1
model: claude-haiku-5-5
---
Goal: run the automated quality check (T7) on each export.
Input: { exports, measurements, required_labels }
Checks: duration, resolution, frame rate, loudness (-14 LUFS for social, -23 LUFS for EU broadcast), captions present and in sync (max 0.3 s drift), text inside safe zones, logo and colours, end card, file name, AI label where required, paid label where required, licence IDs for all music and stock.
Return pass or fail per check with the measured and expected values. You do not fix files.
Output schema video/qc_report@1: { reports: [{ file_name, checks: [{ check, result, measured, expected }], overall }], overall }
