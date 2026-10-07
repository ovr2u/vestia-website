// Renders the social sharing images (assets/img/og/*.jpg) and the fees price list PDF
// with headless Chromium, so they use the real brand font and logo.
//
//   node _build/render.mjs
//
// Needs Playwright (npm install playwright). Only re-run when fees, names or roles change.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const asset = p => pathToFileURL(join(ROOT, p)).href;

const FONT = `
@font-face{font-family:Q;font-weight:400;src:url(${asset('assets/fonts/quattrocento-sans-400.woff2')})}
@font-face{font-family:Q;font-weight:700;src:url(${asset('assets/fonts/quattrocento-sans-700.woff2')})}
*{box-sizing:border-box;margin:0}
body{font-family:Q,sans-serif;color:#3A3A3A}`;

const MEDIATORS = [
  ['lucie-anne-rhodes', 'Lucie-Anne Rhodes', 'Founder and Mediator', 'Property disputes, plus wider civil and commercial claims'],
  ['claudia-haisman-green', 'Claudia Haisman-Green', 'Consultant Mediator', 'Property disputes and transactions, partnership and corporate disputes'],
  ['gurprit-mattu', 'Gurprit Mattu', 'Consultant Mediator', 'Commercial, cross-border, probate and employment disputes'],
  ['amy-kaur', 'Amy Kaur', 'Associate Mediator', 'Employment, community and private family disputes'],
];

const ogDefault = `<!doctype html><html><head><style>${FONT}
body{width:1200px;height:630px;display:flex;background:#F9F6F2}
.l{flex:0 0 58%;background:#EEE9E2;display:flex;flex-direction:column;justify-content:center;padding:0 80px}
.r{flex:1;background:#F4EADD;display:flex;align-items:center;justify-content:center}
img.lock{width:420px}
h1{font-weight:400;font-size:48px;letter-spacing:.01em;margin-top:44px;line-height:1.1;white-space:nowrap}
p{font-size:24px;color:#655E55;margin-top:18px;letter-spacing:.04em;line-height:1.4}
img.mark{width:250px}
</style></head><body>
<div class="l"><img class="lock" src="${asset('assets/img/brand/lockup-1000.png')}"><h1>From conflict to clarity.</h1>
<p>Property, commercial and civil mediation<br>across the UK and online</p></div>
<div class="r"><img class="mark" src="${asset('assets/img/brand/mark-720.png')}"></div>
</body></html>`;

const ogPerson = ([slug, name, role, spec]) => `<!doctype html><html><head><style>${FONT}
body{width:1200px;height:630px;display:flex;background:#F9F6F2}
.photo{flex:0 0 504px;height:630px}
.photo img{width:504px;height:630px;object-fit:cover}
.t{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 70px;background:#F4EADD}
img.lock{width:250px;margin-bottom:56px}
.role{font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:#655E55}
h1{font-weight:400;font-size:56px;line-height:1.1;margin:14px 0 22px}
p{font-size:25px;color:#3A3A3A;line-height:1.4}
</style></head><body>
<div class="photo"><img src="${asset(`assets/img/mediators/${slug}-640.jpg`)}"></div>
<div class="t"><img class="lock" src="${asset('assets/img/brand/lockup-1000.png')}"><span class="role">${role}</span><h1>${name}</h1><p>${spec}</p></div>
</body></html>`;

const feesPdf = `<!doctype html><html><head><style>${FONT}
@page{size:A4;margin:14mm 16mm 12mm}
body{font-size:10pt;line-height:1.45}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5pt solid #D9C7B3;padding-bottom:10pt;margin-bottom:16pt}
header img{width:150pt}
header .t{text-align:right}
h1{font-weight:400;font-size:22pt;letter-spacing:.02em}
header .t p{color:#655E55;font-size:9.5pt;letter-spacing:.14em;text-transform:uppercase}
table{width:100%;border-collapse:collapse;margin:4pt 0 16pt;font-size:10pt}
th,td{text-align:left;vertical-align:top;padding:8pt 8pt;border:0.75pt solid #D9C7B3}
thead th{background:#3A3A3A;color:#F9F6F2;font-weight:700}
tbody th{font-weight:700;width:26%;background:#F9F6F2}
.per{display:block;color:#655E55;font-size:8.5pt}
h2{font-size:12pt;font-weight:700;margin:14pt 0 4pt;letter-spacing:.03em}
p{margin:0 0 6pt}
ul{margin:0 0 6pt;padding-left:14pt}
li{margin-bottom:3pt}
footer{margin-top:22pt;padding-top:8pt;border-top:0.75pt solid #D9C7B3;text-align:center;font-size:8pt;color:#655E55}
</style></head><body>
<header><img src="${asset('assets/img/brand/lockup-1000.png')}"><div class="t"><h1>Mediation fees 2026</h1><p>Specialist Mediator rates</p></div></header>
<table>
<thead><tr><th>Dispute value</th><th>Half day (4 hours)</th><th>Full day (8 hours)</th><th>Additional hours</th></tr></thead>
<tbody>
<tr><th>Less than £20,000</th><td colspan="2">Negotiable (abridged mediation available, typically from £600 + VAT per party)</td><td>Please contact us to discuss pricing</td></tr>
<tr><th>£20,000 to £100,000</th><td>£800 + VAT<span class="per">per party</span></td><td>£1,200 + VAT<span class="per">per party</span></td><td>£150 + VAT<span class="per">per hour per party</span></td></tr>
<tr><th>£100,000 to £1 million</th><td>£1,000 + VAT<span class="per">per party</span></td><td>£1,500 + VAT<span class="per">per party</span></td><td>£175 + VAT<span class="per">per hour per party</span></td></tr>
<tr><th>More than £1 million, or non-monetary disputes</th><td colspan="2">Price negotiable (multi-day mediation available; bespoke options can be tailored to your needs)</td><td>Please contact us to discuss pricing</td></tr>
</tbody></table>
<p>Fees include all preparation and administration time, including any preliminary meetings in advance of the mediation day.</p>
<p>A full day is 8 hours; a half day is 4 hours (the mediation is deemed to run continuously with no deduction made for lunch).</p>
<p>We are also able to offer Associate Mediator rates starting from £300 plus VAT per party for a half-day mediation.</p>
<h2>Payment</h2>
<p>Basic fees must be paid in full at least seven working days in advance of the mediation day unless otherwise agreed.</p>
<h2>In-person mediations</h2>
<p>For in-person mediations, unless otherwise agreed:</p>
<ul>
<li>The parties will be responsible for booking the venue and paying any associated costs. If you have questions about venue options, please feel free to get in touch as we may be able to assist.</li>
<li>In most cases, the above costs will cover all travel expenses. If the mediator is required to travel for more than 5 hours in total, you may be asked to cover reasonable travel and accommodation costs. Any such costs will be agreed with you in advance.</li>
</ul>
<p>All other terms and conditions are set out in our Mediation Agreement (www.vestiamediation.co.uk/mediation-agreement).</p>
<p>If you are unsure which category your dispute falls into, please get in touch for a no-obligation chat on 0330 133 5199 or at enquiries@vestiamediation.co.uk.</p>
<footer>© 2026 Vestia Mediation, a trading name of Concibrium Limited | Company No. 16043891 | www.vestiamediation.co.uk</footer>
</body></html>`;

const tmp = join(ROOT, '_build', '.render-tmp');
mkdirSync(tmp, { recursive: true });
mkdirSync(join(ROOT, 'assets/img/og'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

async function shot(htmlStr, out) {
  const f = join(tmp, 'page.html');
  writeFileSync(f, htmlStr);
  await page.goto(pathToFileURL(f).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
}

await shot(ogDefault, join(ROOT, 'assets/img/og/vestia-mediation.jpg'));
for (const m of MEDIATORS) await shot(ogPerson(m), join(ROOT, `assets/img/og/${m[0]}.jpg`));

const f = join(tmp, 'fees.html');
writeFileSync(f, feesPdf);
await page.goto(pathToFileURL(f).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: join(ROOT, '_files/ugd/5aae89_b74377df9edd4ffc9d03b2c718aee561.pdf'), format: 'A4', printBackground: true,
  displayHeaderFooter: false, preferCSSPageSize: true });
await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log('Rendered OG images and fees PDF');
