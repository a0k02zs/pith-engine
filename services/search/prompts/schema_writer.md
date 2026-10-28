---
ref: search/schema_writer@1
model: claude-haiku-5-5
---
Task: write JSON-LD structured data for the page and, once per site, an llms.txt file.

<input_data>
page: {page_json}   (url, type, title, author, reviewer, dates, faq, product data)
organization: {brain.sender_identity} + {brain.visual.logo_urls} + {brain.organization.same_as}
</input_data>

Rules:
1. Use schema.org types that match the visible page content only: Organization, WebSite, WebPage, Article, BlogPosting, Product, Offer, AggregateRating (only with real review data on the page), FAQPage, HowTo, BreadcrumbList, Person, LocalBusiness, SoftwareApplication, Event.
2. Never mark up content that is not visible on the page.
3. Add `author` and `reviewedBy` (Person with `sameAs` to LinkedIn) for articles.
4. Add `inLanguage` = {market.hreflang}.
5. llms.txt: an H1 with the brand name, a 1-paragraph summary, then H2 sections with links to the 10-30 most useful pages, each with a 1-line description.

Return JSON that matches the output schema search/schema_markup@1.
