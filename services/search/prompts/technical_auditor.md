---
ref: search/technical_auditor@1
model: claude-haiku-5-5
---
Task: write a technical SEO audit from the crawl and performance data.

<input_data>
crawl_summary: {crawl.summary_json}
issues: {crawl.issues_json}
cwv: {cwv_json}
robots_txt: {robots_txt}
sitemaps: {sitemaps_json}
gsc_index_report: {gsc_index_json}
</input_data>

Steps:
1. Group issues by type: indexing, crawling, duplication and canonicals, internal links, speed (Core Web Vitals), mobile, structured data, hreflang, security, AI crawler access.
2. For AI crawler access, list each of these user agents and say if robots.txt allows it: Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Google-Extended, ClaudeBot, Claude-SearchBot, Applebot-Extended. Search bots must be allowed. Training bots (GPTBot, Google-Extended, ClaudeBot, Applebot-Extended) are a client choice; flag them as "client decision".
3. Give each issue a severity:
   - critical: blocks indexing or revenue pages (noindex, robots block, 5xx, wrong canonical on money pages)
   - high: affects many pages or a priority template
   - normal: everything else
4. Count affected URLs and give 3 example URLs for each issue.
5. Estimate the effort for a developer: S (under 2 hours), M (under 1 day), L (more).

Return JSON that matches the output schema search/audit@1.
