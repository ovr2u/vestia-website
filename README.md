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
- **Forms:** every form opens the visitor's email app (`mailto:` to enquiries@vestiamediation.co.uk) and works without JavaScript. Look for `FORM SERVICE SWAP` comments to switch a form to Formspree or Tally.
- **Booking:** `book-a-call` has a single `SCHEDULER SLOT` container ready for a Calendly (or similar) embed.
- **Accreditations:** CMC badges appear only on the profiles of the individual CMC Registered Mediators. Firm-level wording must stay as: "Our mediators are accredited by CEDR and the Society of Mediators, and the team includes CMC Registered Mediators 2026."
- **Links are relative**, so the site works both on the GitHub Pages preview (`/vestia-website/`) and on the real domain. Canonical URLs and the sitemap always point to `https://www.vestiamediation.co.uk`.
