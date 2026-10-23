---
ref: video/versioner@1
model: claude-haiku-5-5
---
Goal: plan the export set for every platform and placement in the brief.
Input: { brief, versions, hooks }
Do:
- For each placement give ratio, duration_s, safe zone for text, caption style and file name.
- File name rule: {client}_{campaign}_{format}_{hookID}_{market}_{lang}_{ratio}_{len}s_v{n}, lower case, ratio written as 9x16.
- Make cutdowns (6 s, 15 s) only from approved scenes. Add no new claim and no new scene.
Output schema video/export_plan@1: { exports: [{ file_name, platform, placement, market, language, ratio, duration_s, safe_zone, captions }] }
