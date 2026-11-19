# vestia-website

Static rebuild of [www.vestiamediation.co.uk](https://www.vestiamediation.co.uk), replacing Wix. Plain HTML and CSS with one small script: no frameworks, no build step needed to host it, no cookies or tracking.

To put it live, see **[DEPLOY.md](DEPLOY.md)**.

## How it's organised

| Path | What it is |
|---|---|
| `*.html`, `post/`, `service-page/` | The finished pages. URLs match the old Wix site (`/fees` is served from `fees.html`). |
| `_build/pages/` | **Edit content here.** One HTML fragment per page, with its title and description at the top. |
| `_build/build.py` | Wraps each fragment in the shared head (SEO tags, schema.org data), header, booking block and footer, and writes the finished pages plus `sitemap.xml`. |
| `_build/assets.py` | Regenerates optimised headshots, badges, logos and favicons from the brand pack. |
| `_build/render.mjs` | Regenerates the social sharing images and the fees price list PDF (needs Playwright). |
| `_build/questionnaire-docx.mjs` | Regenerates the blank Word questionnaire from the website form's questions (needs Playwright and docx). |
| `assets/` | CSS, JavaScript, self-hosted Quattrocento Sans (SIL Open Font Licence) and images. |
| `_files/ugd/` | PDFs kept at their old Wix addresses: the fees price list and the Mediation Agreement. |
| `Vestia website rebuild/` | Brand pack, design reference, and an archive of every image downloaded from the old site. |

## Editing

1. Change the fragment in `_build/pages/` (or mediator details, fee table and shared blocks in `_build/build.py`).
2. Run `python3 _build/build.py`.
3. Commit and push. GitHub Pages republishes in a minute or two.

Writing style for all copy: UK English, no em or en dashes, plain and specific.

## Things to know

- **Pre-launch noindex:** `NOINDEX = True` in `_build/build.py` adds a robots `noindex` tag to every page. Set it to `False` and rebuild at go-live.
- **Forms:** `FORMSPARK_FORM_ID` in `_build/build.py` sends the everyday forms through Formspark (EU-based); the build adds the endpoint, a `_gotcha` spam trap and a default subject, and `site.js` sends them in the background as JSON with readable field names. Leave it empty and they open the visitor's email app. All forms still work without JavaScript.
- **Pre-mediation questionnaire:** always stays on email (`data-keep-email`). "Send my answers" lets the visitor choose: open a new email in their own email app with the answers filled in, or save a branded Word document (built in their browser by `assets/js/docx.js`, nothing uploaded) to attach to an email. Nothing downloads unless they choose to save.
- **Booking:** `book-a-call` has a single `SCHEDULER SLOT` container ready for a Calendly (or similar) embed.
- **Accreditations:** CMC badges appear only on the profiles of the individual CMC Registered Mediators. Firm-level wording: "All our mediators are fully trained and accredited, and our lead mediators are also CMC registered." Never imply the firm itself is CMC registered.
- **Links are relative**, so the site works both on the GitHub Pages preview (`/vestia-website/`) and on the real domain. Canonical URLs and the sitemap always point to `https://www.vestiamediation.co.uk`.
