#!/usr/bin/env python3
"""Vestia Mediation static site builder.

Every page's content lives in _build/pages/ as an HTML fragment with a short
"key: value" header between --- lines. This script wraps each fragment with the
shared <head> (titles, meta, Open Graph, schema.org), header, compact booking
block and footer, then writes finished .html files to the repository root.

    python3 _build/build.py

No third-party packages needed. Edit the fragment, run the script, commit.
"""
import hashlib
import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "_build" / "pages"

SITE_URL = "https://www.vestiamediation.co.uk"
# PRE-LAUNCH: True adds <meta name="robots" content="noindex"> to every page so the
# temporary preview can't compete with the live site in Google. Set to False at go-live.
NOINDEX = True
BUILD_DATE = "2026-10-07"

EMAIL = "enquiries@vestiamediation.co.uk"
PHONE = "0330 133 5199"
PHONE_TEL = "+443301335199"
LINKEDIN = "https://www.linkedin.com/company/vestiamediation"
TRUST_LINE = ("Our mediators are accredited by CEDR and the Society of Mediators, "
              "and the team includes CMC Registered Mediators 2026.")
LEGAL = ("Vestia Mediation is a trading name of Concibrium Limited, a company registered in England and "
         "Wales (Company No. 16043891). Registered office: Gw 522, 5th Floor, The Grange, 100 High Street, "
         "London, N14 6BN.")

BADGES = {
    "cmc": ("cmc-registered-mediator-2026", "CMC Registered Mediator 2026", 213),
    "cedr": ("cedr", "CEDR accredited mediator", 176),
    "som": ("som-certified-mediator-2026", "Society of Mediators Certified Mediator 2026", 210),
}

# Mediator data. Bios, specialisms and accreditations are word for word from the previous site.
MEDIATORS = {
    "lucie": {
        "author_bio": "Lucie-Anne Rhodes founded Vestia Mediation after more than fourteen years in property litigation and dispute resolution, latterly as Head of Legal for the UK's largest property management and real estate services provider.",
        "name": "Lucie-Anne Rhodes",
        "img": "lucie-anne-rhodes",
        "path": "lucie-annerhodes",
        "role": "Founder and Mediator",
        "profile_role": "Founder of Vestia Mediation and CMC-registered Mediator",
        "job_title": "Founder and Mediator",
        "tagline": "A calm, confident mediator, helping parties to move forward, not just move on.",
        "strip": "Property disputes, plus wider civil and commercial claims",
        "group": "property",
        "specialisms": ["Property Disputes", "Commercial Litigation", "Civil Litigation"],
        "spec_label": "Specialisms",
        "accred": "Accredited by CEDR and the Society of Mediators",
        "badges": ["cmc", "cedr", "som"],
        "credentials": ["CMC Registered Mediator 2026", "CEDR accredited mediator", "Society of Mediators accredited mediator"],
        "linkedin": "https://www.linkedin.com/in/lucie-anne-rhodes/",
        "languages": [],
        "summary": [
            "Lucie-Anne is a civil and commercial mediator with over fourteen years' experience in "
            "<a href=\"~/property-specialisms\">property disputes</a>. She brings both legal expertise and real-world commercial insight to mediation.",
            "Lucie-Anne is known for her calm, practical and forward-focused approach, helping parties move beyond entrenched "
            "positions to reach fair, workable agreements. Her style is warm, clear and direct, ensuring every participant feels "
            "heard while keeping the process efficient and outcome-driven.",
        ],
        "knows": ["Property disputes", "Landlord and tenant disputes", "Commercial litigation", "Civil litigation"],
    },
    "claudia": {
        "author_bio": 'Claudia Haisman-Green is a Consultant Mediator at Vestia. She spent more than two decades as a Commercial Real Estate solicitor, much of it in senior roles at leading international firms.',
        "name": "Claudia Haisman-Green",
        "img": "claudia-haisman-green",
        "path": "claudiahaisman-green",
        "role": "Consultant Mediator",
        "profile_role": "Consultant Mediator",
        "job_title": "Consultant Mediator",
        "tagline": "A pragmatic, empathetic mediator, helping parties to reach workable outcomes in complex disputes.",
        "strip": "Property disputes and transactions, partnership and corporate disputes",
        "group": "property",
        "specialisms": ["Facilitating Property Transactions", "Property Disputes", "Partnership and Corporate Disputes"],
        "spec_label": "Specialisms",
        "accred": "Accredited by CEDR",
        "badges": ["cmc", "cedr"],
        "credentials": ["CMC Registered Mediator 2026", "CEDR accredited mediator"],
        "linkedin": "https://www.linkedin.com/in/claudiahaismangreen/",
        "languages": ["English", "German"],
        "summary": [
            "Claudia has more than two decades of experience as a Commercial Real Estate solicitor. Having spent much of her "
            "career in senior roles at leading international firms, she brings deep legal expertise and commercial insight to her mediation practice.",
            "Her approach is calm, structured, and empathetic, enabling parties to navigate conflict with clarity and confidence. "
            "Claudia works across commercial, property, partnership, and corporate disputes, helping individuals and organisations "
            "uncover underlying interests and move towards sustainable, pragmatic outcomes. She is known for her ability to build "
            "rapport quickly, maintain neutrality under pressure, and facilitate constructive dialogue even in highly charged situations.",
        ],
        "knows": ["Property disputes", "Commercial real estate", "Partnership disputes", "Corporate disputes", "Negotiation training"],
    },
    "gurprit": {
        "author_bio": 'Gurprit Mattu is a Consultant Mediator at Vestia and a dual-qualified barrister in England and Wales and the British Virgin Islands, specialising in high-value commercial and private disputes.',
        "name": "Gurprit Mattu",
        "img": "gurprit-mattu",
        "path": "gurpritmattu",
        "role": "Consultant Mediator",
        "profile_role": "Consultant Mediator",
        "job_title": "Consultant Mediator",
        "tagline": "A clear-thinking, cross-cultural mediator, resolving complex commercial and cross-border disputes.",
        "strip": "Commercial, cross-border, probate and employment disputes",
        "group": "wider",
        "specialisms": ["Commercial Litigation", "Civil Litigation", "Probate", "Employment", "Restorative Justice Mediation"],
        "spec_label": "Specialisms",
        "accred": "Accredited by the Society of Mediators",
        "badges": ["cmc", "som"],
        "credentials": ["CMC Registered Mediator 2026", "Society of Mediators accredited mediator"],
        "linkedin": "https://www.linkedin.com/in/gurpritmattu/",
        "languages": ["English", "Punjabi", "Hindi"],
        "summary": [
            "Gurprit is a trained mediator and dual-qualified barrister. Her work spans shareholder and partnership conflicts, debt "
            "disputes, fraud and misrepresentation, and mis-selling claims, often involving international parties, offshore "
            "structures, and multi-jurisdictional issues. She also mediates private family, employment, and probate disputes, and "
            "is trained in restorative justice mediation.",
            "As a practising barrister, she brings a clear understanding of litigation risk, evidential pressure points, and the "
            "commercial realities that shape settlement, alongside the process discipline needed to keep negotiations on track when "
            "emotions, sunk costs, or strategic posturing threaten to derail them.",
        ],
        "knows": ["Commercial disputes", "Shareholder and partnership disputes", "Probate disputes", "Employment disputes", "Restorative justice"],
    },
    "amy": {
        "author_bio": 'Amy Kaur is an Associate Mediator at Vestia, focusing on employment, community and private family mediation.',
        "name": "Amy Kaur",
        "img": "amy-kaur",
        "path": "amykaur",
        "role": "Associate Mediator",
        "profile_role": "Associate Mediator",
        "job_title": "Associate Mediator",
        "tagline": "A grounded, empathetic mediator, drawing on real-world experience to resolve conflict.",
        "strip": "Employment, community and private family disputes",
        "group": "wider",
        "specialisms": ["Employment", "Community Mediation", "Family (training to be an accredited family mediator)"],
        "spec_label": "Key practice areas",
        "accred": "Accredited by the Society of Mediators",
        "badges": ["som"],
        "credentials": ["Society of Mediators accredited mediator"],
        "linkedin": None,
        "languages": [],
        "summary": [
            "Amy is a trained mediator with experience conducting mediations both as a sole mediator and as a co-mediator. Her "
            "main areas of focus are family mediation (except where funded by Legal Aid, part of Voucher Scheme or court-ordered), "
            "employment mediation and community disputes.",
            "Amy brings a calm, structured, and empathetic approach to helping parties navigate conflict. Her professional "
            "background includes decades of experience in the retail and hospitality sector, giving her a deep, practical "
            "understanding of the workplace dynamics and pressures that often underpin employment disputes. This insight allows "
            "her to work effectively with employees, managers, and organisations to resolve conflict in a constructive and "
            "future-focused way.",
        ],
        "knows": ["Employment mediation", "Community mediation", "Family mediation"],
    },
}
ORDER = ["lucie", "claudia", "gurprit", "amy"]

NAV = [
    ("services", "Services", "our-services", [
        ("our-services", "Our Services"),
        ("property-specialisms", "Property Specialisms"),
        ("other-specialisms", "Other Specialisms"),
    ]),
    ("mediators", "Our Mediators", "our-mediators", None),
    ("about", "About Us", "about-us", None),
    ("solicitors", "For Solicitors", "for-solicitors", None),
    ("fees", "Fees", "fees", None),
    ("insights", "Insights", "insights", None),
    ("faqs", "FAQs", "faqs", None),
    ("contact", "Contact", "contact-us", None),
]

REDIRECTS = {
    # Old Wix slug that now 404s on the live site; send visitors to the article's indexed URL.
    "post/understanding-mediation": "post/understanding-mediation-a-client-centered-approach",
}


def esc(s):
    return html.escape(s, quote=True)


def file_hash(p):
    return hashlib.md5((ROOT / p).read_bytes()).hexdigest()[:8]


def parse_fragment(path):
    text = path.read_text(encoding="utf-8")
    meta = {}
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line and not line.startswith("#"):
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        text = text[m.end():]
    return meta, text


def url_for(path):
    return SITE_URL + "/" + path if path else SITE_URL + "/"


def read_minutes(body):
    words = len(re.sub(r"<[^>]+>", " ", body).split())
    return max(2, round(words / 220))


def nice_date(iso):
    d = date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%B %Y')}"


# ---------- Reusable components ----------

def picture(r, base, alt, sizes, cls="", eager=False, w=400, h=500):
    loading = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (
        f'<picture{(" class=" + chr(34) + cls + chr(34)) if cls else ""}>'
        f'<source type="image/webp" srcset="{r}assets/img/mediators/{base}-400.webp 400w, {r}assets/img/mediators/{base}-640.webp 640w" sizes="{sizes}">'
        f'<img src="{r}assets/img/mediators/{base}-400.jpg" srcset="{r}assets/img/mediators/{base}-400.jpg 400w, {r}assets/img/mediators/{base}-640.jpg 640w" '
        f'sizes="{sizes}" width="{w}" height="{h}" alt="{esc(alt)}" {loading} decoding="async"></picture>'
    )


def badges_html(r, key):
    m = MEDIATORS[key]
    out = []
    for b in m["badges"]:
        f, alt, w = BADGES[b]
        out.append(
            f'<picture><source type="image/webp" srcset="{r}assets/img/badges/{f}.webp">'
            f'<img src="{r}assets/img/badges/{f}.png" alt="{esc(alt)}" width="{round(w / 2)}" height="48" loading="lazy" decoding="async"></picture>'
        )
    return f'<div class="badges">{"".join(out)}</div><p class="accred">{esc(m["accred"])}</p>'


def team_strip(r):
    cards = []
    for k in ORDER:
        m = MEDIATORS[k]
        cards.append(
            f'<li><a class="person" href="{r}{m["path"]}">'
            + picture(r, m["img"], f'{m["name"]}, {m["role"]} at Vestia Mediation', "(max-width: 900px) 46vw, 260px")
            + f'<span class="person-name">{esc(m["name"])}</span>'
            f'<span class="person-role">{esc(m["role"])}</span>'
            f'<span class="person-spec">{esc(m["strip"])}</span>'
            f'<span class="person-more" aria-hidden="true">View profile</span></a></li>'
        )
    return '<ul class="grid-4" style="list-style:none;padding:0;margin:0">' + "".join(cards) + "</ul>"


def mediator_list(r, group):
    out = []
    for k in ORDER:
        m = MEDIATORS[k]
        if m["group"] != group:
            continue
        tags = "".join(f"<li>{esc(t)}</li>" for t in m["specialisms"])
        summary = "".join(f"<p>{p.replace('~/', r)}</p>" for p in m["summary"])
        out.append(
            f'<article class="mediator" id="{k}">'
            f'<a href="{r}{m["path"]}" tabindex="-1" aria-hidden="true">'
            + picture(r, m["img"], f'{m["name"]}, {m["role"]}', "(max-width: 700px) 220px, 240px")
            + "</a><div>"
            f'<p class="eyebrow" style="margin-bottom:4px">{esc(m["role"])}</p>'
            f'<h3><a href="{r}{m["path"]}" style="text-decoration:none">{esc(m["name"])}</a></h3>'
            f'<p class="role">{esc(m["tagline"])}</p>'
            f'<h4 class="visually-hidden">{esc(m["spec_label"])}</h4><ul class="tags" aria-label="{esc(m["spec_label"])}">{tags}</ul>'
            f"{summary}"
            + badges_html(r, k)
            + f'<p style="margin-top:14px"><a class="text-link arrow" href="{r}{m["path"]}">Read {esc(m["name"].split("-")[0].split(" ")[0])}\'s full profile</a></p>'
            "</div></article>"
        )
    return "".join(out)


HDC_QUOTE = """<figure class="quote">
<svg class="mark-q" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M13 6C7 8.5 3 13.4 3 19.6 3 24 5.7 27 9.4 27c3.2 0 5.6-2.4 5.6-5.5 0-3-2.2-5.2-5-5.4.6-3.3 3.1-6.2 6.6-7.9L13 6Zm15 0c-6 2.5-10 7.4-10 13.6 0 4.4 2.7 7.4 6.4 7.4 3.2 0 5.6-2.4 5.6-5.5 0-3-2.2-5.2-5-5.4.6-3.3 3.1-6.2 6.6-7.9L28 6Z"/></svg>
<blockquote>
<p>Having worked with Lucie-Anne on a long-running and complex neighbour dispute case for Huntingdonshire District Council, I found her to be highly professional, organised and approachable throughout. She demonstrated excellent communication skills with all parties involved and worked tirelessly to create opportunities for constructive dialogue in what was an extremely challenging matter.</p>
{rest}
</blockquote>
<figcaption><footer><strong>Anthony Hayes</strong>, Huntingdonshire District Council{about}</footer></figcaption>
</figure>"""

HDC_REST = ("<p>Her preparation, neutrality and attention to detail were evident throughout the process, and despite the "
            "complexities involved, she remained pragmatic, impartial and committed to achieving a positive outcome wherever "
            "possible. Her work was greatly appreciated and I would not hesitate to recommend her mediation services to other "
            "organisations managing complex community disputes.</p>")

FEE_TABLE = """<table class="fee-table">
<caption>Mediation fees 2026: Specialist Mediator rates</caption>
<thead><tr><th scope="col">Dispute value</th><th scope="col">Half day (4 hours)</th><th scope="col">Full day (8 hours)</th><th scope="col">Additional hours</th></tr></thead>
<tbody>
<tr><th scope="row">Less than £20,000</th><td colspan="2" data-label="Half or full day">Negotiable (abridged mediation available, typically from £600 + VAT per party)</td><td data-label="Additional hours">Please contact us to discuss pricing</td></tr>
<tr><th scope="row">£20,000 to £100,000</th><td class="price" data-label="Half day">£800 + VAT<span class="per">per party</span></td><td class="price" data-label="Full day">£1,200 + VAT<span class="per">per party</span></td><td class="price" data-label="Additional hours">£150 + VAT<span class="per">per hour per party</span></td></tr>
<tr><th scope="row">£100,000 to £1 million</th><td class="price" data-label="Half day">£1,000 + VAT<span class="per">per party</span></td><td class="price" data-label="Full day">£1,500 + VAT<span class="per">per party</span></td><td class="price" data-label="Additional hours">£175 + VAT<span class="per">per hour per party</span></td></tr>
<tr><th scope="row">More than £1 million, or non-monetary disputes</th><td colspan="2" data-label="Half or full day">Price negotiable (multi-day mediation available; bespoke options can be tailored to your needs)</td><td data-label="Additional hours">Please contact us to discuss pricing</td></tr>
</tbody>
</table>"""

VALUES = [
    ("V", "Voice", "Ensuring every party is properly heard, so all perspectives are recognised and respected."),
    ("E", "Equity", "Maintaining a fair and balanced process, even where power or confidence is unequal."),
    ("S", "Safety", "Providing a calm, confidential environment where parties can speak openly without fear."),
    ("T", "Trust", "Building confidence in the process and the mediator, so parties feel secure reaching agreement."),
    ("I", "Integrity", "Upholding the highest professional and ethical standards, so parties can rely on the process and the mediator with complete confidence."),
    ("A", "Accountability", "Taking responsibility for delivering a mediation process that encourages collaboration."),
]


def values_html():
    return '<ul class="values">' + "".join(
        f'<li><b aria-hidden="true">{l}</b><span><h3>{w}</h3><p>{d}</p></span></li>' for l, w, d in VALUES) + "</ul>"


def cta_pair(r, secondary="Start your mediation"):
    return (f'<div class="actions"><a class="btn btn-primary" href="{r}book-a-call">Book a free 15-minute call</a>'
            f'<a class="btn btn-secondary" href="{r}start-your-mediation">{secondary}</a></div>')


def post_list(r, posts, limit=None, exclude=None):
    items = []
    for p in posts:
        if exclude and p["path"] == exclude:
            continue
        m = MEDIATORS[p["author"]]
        items.append(
            f'<li><a href="{r}{p["path"]}"><span class="post-title">{esc(p["h1"])}</span>'
            f'<span class="post-sum">{esc(p["summary"])}</span>'
            f'<span class="post-meta">{esc(m["name"])} · {p["minutes"]} min read</span>'
            f'<span class="post-for">{esc(p["audience"])}</span></a></li>'
        )
        if limit and len(items) >= limit:
            break
    return '<ul class="post-list">' + "".join(items) + "</ul>"


# ---------- Page chrome ----------

CHEVRON = '<svg viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
MENU_ICON = '<svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="1.5"/></svg>'


def header(r, active, path):
    items = []
    for key, label, href, sub in NAV:
        cur = ' aria-current="page"' if path == href else ""
        cls = "" if not sub else ' class="has-sub"'
        if sub:
            subitems = "".join(
                f'<li><a href="{r}{h}"{" aria-current=" + chr(34) + "page" + chr(34) if path == h else ""}>{esc(l)}</a></li>' for h, l in sub)
            items.append(
                f'<li{cls}><a href="{r}{href}"{cur if path == href else (" aria-current=" + chr(34) + "true" + chr(34) if active == key else "")}>{label}</a>'
                f'<button class="sub-toggle" type="button" aria-expanded="false" aria-controls="sub-{key}"><span class="visually-hidden">Show {label.lower()} menu</span>{CHEVRON}</button>'
                f'<ul class="subnav" id="sub-{key}">{subitems}</ul></li>')
        else:
            a = cur or (' aria-current="true"' if active == key else "")
            items.append(f'<li><a href="{r}{href}"{a}>{label}</a></li>')
    home = r or "./"
    return f"""<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
<div class="wrap wrap-wide header-inner">
<a class="brand" href="{home}" aria-label="Vestia Mediation home page">
<picture><source type="image/webp" srcset="{r}assets/img/brand/mark-96.webp"><img src="{r}assets/img/brand/mark-96.png" alt="" width="34" height="40"></picture>
<span class="brand-name" aria-hidden="true"><span>Vestia</span><span>MEDIATION</span></span>
</a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">{MENU_ICON}Menu</button>
<nav id="primary-nav" class="primary-nav" aria-label="Main">
<ul class="nav-list">{"".join(items)}</ul>
<div class="header-cta"><a class="btn btn-primary btn-small" href="{r}book-a-call">Book a free 15-minute call</a></div>
</nav>
</div>
</header>"""


def booking_block(r):
    return f"""<section class="book-block" aria-labelledby="book-block-title">
<div class="wrap">
<div>
<h2 id="book-block-title">Book a free 15-minute call</h2>
<p>A short, no-obligation chat with one of our mediators, who'll tell you honestly whether mediation suits your dispute.</p>
</div>
<!-- FORM SERVICE SWAP (after launch): this form opens the visitor's email app via mailto:.
     To use Formspree or Tally instead, change action to your endpoint (e.g. https://formspree.io/f/XXXXXXX),
     keep method="post", delete enctype="text/plain" and delete the data-mailto attribute.
     site.js only handles forms that still have data-mailto, so the form will then submit normally. -->
<form class="book-form" action="mailto:{EMAIL}?subject=Free%2015-minute%20call%20request" method="post" enctype="text/plain"
 data-mailto="{EMAIL}" data-subject="Free 15-minute call request: {{name}}" data-intro="Please contact me to arrange a free 15-minute call.">
<div class="field"><label for="bb-name">Name</label><input id="bb-name" name="name" type="text" autocomplete="name" required></div>
<div class="field"><label for="bb-email">Email</label><input id="bb-email" name="email" type="email" autocomplete="email" required></div>
<div class="field"><label for="bb-phone">Phone <span class="opt">(optional)</span></label><input id="bb-phone" name="phone" type="tel" autocomplete="tel"></div>
<button class="btn" type="submit">Send</button>
<p class="form-status" role="status" aria-live="polite"></p>
</form>
</div>
</section>"""


def footer(r):
    def ul(items):
        return "<ul>" + "".join(f'<li><a href="{r}{h}">{l}</a></li>' for h, l in items) + "</ul>"
    return f"""<footer class="site-footer">
<div class="wrap">
<div class="footer-top">
<div class="footer-brand">
<picture><source type="image/webp" srcset="{r}assets/img/brand/lockup-480.webp"><img src="{r}assets/img/brand/lockup-480.png" alt="Vestia Mediation" width="200" height="88" loading="lazy"></picture>
<p class="strap">From Conflict to Clarity.</p>
<p>Mediations offered in the UK, internationally, and online.</p>
<p><a href="tel:{PHONE_TEL}">{PHONE}</a><br><a href="mailto:{EMAIL}">{EMAIL}</a><br><a href="{LINKEDIN}" rel="noopener">Vestia Mediation on LinkedIn</a></p>
</div>
<div><h2>Mediation</h2>{ul([("our-services", "Our Services"), ("property-specialisms", "Property Specialisms"), ("other-specialisms", "Other Specialisms"), ("fees", "Fees"), ("for-solicitors", "For Solicitors")])}</div>
<div><h2>About</h2>{ul([("about-us", "About Us"), ("our-mediators", "Our Mediators"), ("insights", "Insights"), ("faqs", "FAQs"), ("contact-us", "Contact Us")])}</div>
<div><h2>Get started</h2>{ul([("book-a-call", "Book a free 15-minute call"), ("start-your-mediation", "Start your mediation"), ("contact-8", "Booking request form"), ("pre-mediation-form", "Pre-mediation information form")])}
<h2 style="margin-top:22px">Documents</h2>{ul([("mediation-agreement", "Mediation Agreement"), ("complaints-policy", "Complaints Policy"), ("accessibility", "Accessibility Statement"), ("privacy", "Privacy Policy")])}</div>
</div>
<p class="footer-trust">{TRUST_LINE}</p>
<div class="footer-legal"><p>{LEGAL}</p><p>© 2026 Concibrium Limited</p></div>
</div>
</footer>"""


def page_head(r, meta, crumbs):
    eyebrow = f'<span class="eyebrow">{esc(meta["eyebrow"])}</span>' if meta.get("eyebrow") else ""
    lead = f'<p class="lead">{meta["lead"]}</p>' if meta.get("lead") else ""
    actions = cta_pair(r) if meta.get("actions") == "yes" else ""
    return (f'<div class="page-head"><div class="split-bg" aria-hidden="true"></div><div class="wrap">'
            f'{crumbs_html(r, crumbs)}{eyebrow}<h1>{meta["h1"]}</h1>{lead}{actions}</div></div>')


def crumbs_html(r, crumbs):
    if not crumbs:
        return ""
    parts = [f'<li><a href="{r or "./"}">Home</a></li>']
    for label, href in crumbs[:-1]:
        parts.append(f'<li><a href="{r}{href}">{esc(label)}</a></li>')
    parts.append(f'<li><span aria-current="page">{esc(crumbs[-1][0])}</span></li>')
    return f'<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>{"".join(parts)}</ol></nav>'


# ---------- Structured data ----------

ORG_ID = SITE_URL + "/#organization"


def org_schema():
    return {
        "@type": "ProfessionalService",
        "@id": ORG_ID,
        "name": "Vestia Mediation",
        "legalName": "Concibrium Limited",
        "url": SITE_URL + "/",
        "logo": SITE_URL + "/assets/img/brand/lockup-1000.png",
        "image": SITE_URL + "/assets/img/og/vestia-mediation.jpg",
        "slogan": "From Conflict to Clarity.",
        "description": "Property, commercial and civil mediation across the UK, internationally and online, with specialist property dispute mediators.",
        "telephone": "+44 330 133 5199",
        "email": EMAIL,
        "priceRange": "££",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Gw 522, 5th Floor, The Grange, 100 High Street",
            "addressLocality": "London",
            "postalCode": "N14 6BN",
            "addressCountry": "GB",
        },
        "areaServed": [{"@type": "Country", "name": "United Kingdom"}],
        "sameAs": [LINKEDIN],
        "knowsAbout": ["Property dispute mediation", "Landlord and tenant disputes", "Boundary and neighbour disputes",
                       "Commercial mediation", "Civil mediation", "Workplace and employment mediation",
                       "Private family mediation", "Restorative justice"],
        "employee": [{"@id": url_for(MEDIATORS[k]["path"]) + "#person"} for k in ORDER],
    }


def person_schema(key):
    m = MEDIATORS[key]
    d = {
        "@type": "Person",
        "@id": url_for(m["path"]) + "#person",
        "name": m["name"],
        "jobTitle": m["job_title"],
        "url": url_for(m["path"]),
        "image": f'{SITE_URL}/assets/img/mediators/{m["img"]}-640.jpg',
        "worksFor": {"@id": ORG_ID},
        "knowsAbout": m["knows"],
        "hasCredential": [{"@type": "EducationalOccupationalCredential", "name": c} for c in m["credentials"]],
    }
    if m["linkedin"]:
        d["sameAs"] = [m["linkedin"]]
    if m["languages"]:
        d["knowsLanguage"] = m["languages"]
    return d


def breadcrumb_schema(crumbs):
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/"}]
    for i, (label, href) in enumerate(crumbs, start=2):
        items.append({"@type": "ListItem", "position": i, "name": label, "item": url_for(href)})
    return {"@type": "BreadcrumbList", "itemListElement": items}


def faq_schema(body):
    qs = []
    for m in re.finditer(r'<details[^>]*>\s*<summary><h3>(.*?)</h3></summary>\s*<div class="answer">(.*?)</div>\s*</details>', body, re.S):
        q = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        a = re.sub(r"\s+", " ", re.sub(r'href="~/', f'href="{SITE_URL}/', m.group(2))).strip()
        qs.append({"@type": "Question", "name": html.unescape(q), "acceptedAnswer": {"@type": "Answer", "text": a}})
    return {"@type": "FAQPage", "mainEntity": qs}


# ---------- Build ----------

def build():
    css_v = file_hash("assets/css/site.css")
    js_v = file_hash("assets/js/site.js")

    fragments = []
    for f in sorted(PAGES.rglob("*.html")):
        rel = f.relative_to(PAGES).with_suffix("")
        path = "" if str(rel) == "index" else str(rel)
        meta, body = parse_fragment(f)
        fragments.append((path, meta, body))

    posts = []
    for path, meta, body in fragments:
        if meta.get("type") == "article":
            posts.append({"path": path, "h1": meta["h1"], "summary": meta["summary"], "audience": meta["audience"],
                          "author": meta["author"], "published": meta["published"], "minutes": read_minutes(body),
                          "order": int(meta.get("order", 99))})
    posts.sort(key=lambda p: p["order"])

    sitemap = []
    for path, meta, body in fragments:
        depth = path.count("/")
        r = "../" * depth
        crumbs = []
        if meta.get("crumbs"):
            for part in meta["crumbs"].split(";"):
                label, href = part.split("|")
                crumbs.append((label.strip(), href.strip()))
        if path and meta.get("type") != "404":
            crumbs.append((meta.get("crumb", re.sub(r"<[^>]+>", "", meta.get("h1", meta.get("title", ""))).strip()), path))

        schema = []
        ptype = meta.get("type", "page")
        if path == "":
            schema.append(org_schema())
            schema.append({"@type": "WebSite", "@id": SITE_URL + "/#website", "url": SITE_URL + "/", "name": "Vestia Mediation", "publisher": {"@id": ORG_ID}, "inLanguage": "en-GB"})
        elif ptype != "404":
            schema.append(breadcrumb_schema(crumbs[:]))

        # Includes
        body = body.replace("{{TEAM_STRIP}}", team_strip(r))
        body = body.replace("{{MEDIATORS_PROPERTY}}", mediator_list(r, "property"))
        body = body.replace("{{MEDIATORS_WIDER}}", mediator_list(r, "wider"))
        body = body.replace("{{HDC_QUOTE}}", HDC_QUOTE.format(rest=HDC_REST, about=""))
        body = body.replace("{{HDC_QUOTE_SHORT}}", HDC_QUOTE.format(rest="", about=f', on <a href="{r}lucie-annerhodes">Lucie-Anne Rhodes</a>'))
        body = body.replace("{{FEE_TABLE}}", FEE_TABLE)
        body = body.replace("{{VALUES}}", values_html())
        body = body.replace("{{TRUST}}", TRUST_LINE)
        body = body.replace("{{CTA}}", cta_pair(r))
        body = body.replace("{{POSTS_LATEST}}", post_list(r, posts, limit=3))
        body = body.replace("{{POSTS_ALL}}", post_list(r, posts))
        body = body.replace("{{EMAIL}}", EMAIL)
        body = re.sub(r"\{\{BADGES:(\w+)\}\}", lambda m: badges_html(r, m.group(1)), body)

        og_type = "website"
        og_image = SITE_URL + "/assets/img/og/vestia-mediation.jpg"
        og_alt = "Vestia Mediation: From Conflict to Clarity"
        main = ""

        if ptype == "profile":
            key = meta["mediator"]
            m = MEDIATORS[key]
            og_type = "profile"
            og_image = f"{SITE_URL}/assets/img/og/{m['img']}.jpg"
            og_alt = f"{m['name']}, {m['role']}, Vestia Mediation"
            schema.append(person_schema(key))
            specs = "".join(f"<li>{esc(s)}</li>" for s in m["specialisms"])
            langs = f'<dt>Languages</dt><dd>{", ".join(m["languages"])}</dd>' if m["languages"] else ""
            li = (f'<dt>Connect</dt><dd><a href="{m["linkedin"]}" rel="noopener">{esc(m["name"])} on LinkedIn</a></dd>'
                  if m["linkedin"] else "")
            main = (
                f'<div class="page-head"><div class="split-bg" aria-hidden="true"></div><div class="wrap">'
                f'{crumbs_html(r, crumbs)}<span class="eyebrow">{esc(m["profile_role"])}</span>'
                f'<h1>{esc(m["name"])}</h1><p class="lead">{esc(m["tagline"])}</p></div></div>'
                f'<div class="section"><div class="wrap profile"><aside class="profile-aside" aria-label="About {esc(m["name"])}">'
                + picture(r, m["img"], f'Portrait of {m["name"]}', "(max-width: 800px) 340px, 320px", eager=True, w=640, h=800)
                + badges_html(r, key)
                + f'<dl class="facts"><dt>{esc(m["spec_label"])}</dt><dd><ul class="tags" style="margin-top:8px">{specs}</ul></dd>{langs}{li}</dl>'
                f'<div class="actions" style="margin-top:22px"><a class="btn btn-primary" href="{r}book-a-call">Book a free 15-minute call</a></div>'
                f'</aside><div class="prose">{body}</div></div></div>'
            )
        elif ptype == "article":
            og_type = "article"
            m = MEDIATORS[meta["author"]]
            mins = read_minutes(body)
            schema.append({
                "@type": "BlogPosting",
                "headline": re.sub(r"<[^>]+>", "", meta["h1"]),
                "description": meta["description"],
                "datePublished": meta["published"],
                "dateModified": meta.get("modified", meta["published"]),
                "author": {"@type": "Person", "@id": url_for(m["path"]) + "#person", "name": m["name"], "url": url_for(m["path"])},
                "publisher": {"@id": ORG_ID, "@type": "ProfessionalService", "name": "Vestia Mediation"},
                "mainEntityOfPage": url_for(path),
                "image": og_image,
                "inLanguage": "en-GB",
                "isAccessibleForFree": True,
            })
            updated = (f' · Updated {nice_date(meta["modified"])}' if meta.get("modified") and meta["modified"] != meta["published"] else "")
            byline = (
                f'<div class="byline"><img src="{r}assets/img/mediators/{m["img"]}-400.jpg" alt="" width="56" height="56" loading="lazy">'
                f'<span><span class="by-name">By <a href="{r}{m["path"]}">{esc(m["name"])}</a>, {esc(m["role"])}</span>'
                f'<span class="by-meta">Published {nice_date(meta["published"])}{updated} · {mins} min read</span></span></div>'
            )
            related = post_list(r, posts, limit=3, exclude=path)
            main = (
                f'<div class="page-head"><div class="split-bg" aria-hidden="true"></div><div class="wrap">'
                f'{crumbs_html(r, crumbs)}<span class="eyebrow">{esc(meta["audience"])}</span>'
                f'<h1>{meta["h1"]}</h1><p class="lead">{esc(meta["summary"])}</p>{byline}</div></div>'
                f'<div class="section"><div class="wrap article-layout"><article class="prose">{body}'
                f'<div class="article-foot"><p><strong>General information, not legal advice.</strong> This article explains the '
                f'position in England and Wales in general terms. Every dispute is different, so please take advice from a solicitor '
                f'on your own circumstances.</p></div></article>'
                f'<aside class="article-aside" aria-label="Next steps"><div class="card"><h2>Talk it through</h2>'
                f'<p>A free 15-minute call with a mediator is the quickest way to find out whether mediation suits your dispute.</p>'
                f'<a class="btn btn-primary" href="{r}book-a-call">Book a free 15-minute call</a>'
                f'<a class="btn btn-secondary" href="{r}start-your-mediation">Start your mediation</a></div>'
                f'<div class="card" style="margin-top:16px;height:auto"><h2>About the author</h2><p>{esc(m["author_bio"])}</p>'
                f'<a class="text-link arrow" href="{r}{m["path"]}">Read profile</a></div></aside></div></div>'
                f'<div class="section section--paper"><div class="wrap"><h2>More from Insights</h2>{related}</div></div>'
            )
        elif meta.get("h1"):
            main = page_head(r, meta, crumbs) + body
        else:
            main = body

        if meta.get("service"):
            svc = {"@type": "Service", "name": meta["service"], "serviceType": "Mediation",
                   "provider": {"@id": ORG_ID}, "areaServed": {"@type": "Country", "name": "United Kingdom"},
                   "description": meta["description"], "url": url_for(path)}
            if meta.get("offers"):
                svc["offers"] = []
                for part in meta["offers"].split(";"):
                    price, name = part.split("|")
                    svc["offers"].append({"@type": "Offer", "name": name.strip(), "priceCurrency": "GBP",
                                          "priceSpecification": {"@type": "UnitPriceSpecification", "price": int(price),
                                                                 "priceCurrency": "GBP", "valueAddedTaxIncluded": False,
                                                                 "unitText": "per party"}})
            schema.append(svc)
        if "faq" in meta.get("schema", ""):
            schema.append(faq_schema(body))
        if meta.get("schema_person"):
            for k in meta["schema_person"].split(","):
                schema.append(person_schema(k.strip()))

        title = meta["title"]
        desc = meta["description"]
        canonical = url_for(path)
        robots = ('<!-- PRE-LAUNCH: keeps the temporary preview out of Google. Remove at go-live (see DEPLOY.md). -->\n'
                  '<meta name="robots" content="noindex">\n') if NOINDEX or ptype == "404" else ""
        ld = ""
        if schema:
            ld = ('<script type="application/ld+json">' +
                  json.dumps({"@context": "https://schema.org", "@graph": schema}, ensure_ascii=False, separators=(",", ":")) +
                  "</script>\n")
        base_404 = ""
        if ptype == "404":
            # GitHub Pages serves this file for any missing path, so set a base for relative links.
            base_404 = ("<script>document.write('<base href=\"' + (/github\\.io$/.test(location.hostname) ? '/' + "
                        "location.pathname.split('/')[1] + '/' : '/') + '\">')</script>\n")
        block = "" if meta.get("booking") == "no" else booking_block(r)

        page = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{base_404}<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}<link rel="canonical" href="{canonical}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#F9F6F2">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Vestia Mediation">
<meta property="og:title" content="{esc(meta.get('og_title', title))}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(og_alt)}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{r}favicon.ico" sizes="48x48">
<link rel="icon" href="{r}favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="{r}apple-touch-icon.png">
<link rel="manifest" href="{r}site.webmanifest">
<link rel="preload" href="{r}assets/fonts/quattrocento-sans-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{r}assets/css/site.css?v={css_v}">
<script>document.documentElement.classList.add('js')</script>
<script src="{r}assets/js/site.js?v={js_v}" defer></script>
{ld}</head>
<body{(' class="' + meta['body'] + '"') if meta.get('body') else ''}>
{header(r, meta.get('nav', ''), path)}
<main id="main" tabindex="-1">
{main}
</main>
{block}
{footer(r)}
</body>
</html>
"""
        page = page.replace("~/", r)
        out = ROOT / ("index.html" if path == "" else (path + ".html"))
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page, encoding="utf-8")
        if ptype != "404" and meta.get("sitemap") != "no":
            sitemap.append((canonical, meta.get("modified", BUILD_DATE), meta.get("priority", "0.6")))

    for src, dest in REDIRECTS.items():
        depth = src.count("/")
        target = "../" * depth + dest
        (ROOT / (src + ".html")).parent.mkdir(parents=True, exist_ok=True)
        (ROOT / (src + ".html")).write_text(f"""<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><title>Moved: Vestia Mediation</title>
<meta name="robots" content="noindex"><link rel="canonical" href="{url_for(dest)}">
<meta http-equiv="refresh" content="0; url={target}"></head>
<body><p>This article has moved to <a href="{target}">{url_for(dest)}</a>.</p></body></html>
""", encoding="utf-8")

    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod, pri in sorted(sitemap, key=lambda x: (x[0] != SITE_URL + "/", x[0])):
        sm.append(f"<url><loc>{loc}</loc><lastmod>{mod}</lastmod><priority>{pri}</priority></url>")
    sm.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
    print(f"Built {len(fragments)} pages, {len(REDIRECTS)} redirect(s), sitemap with {len(sitemap)} URLs.")


if __name__ == "__main__":
    build()
