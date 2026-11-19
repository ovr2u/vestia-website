// Builds the blank Word version of the pre-mediation questionnaire (assets/docs/vestia-pre-mediation-questionnaire.docx)
// from the questions on the website form, so the two always match.
//
//   python3 _build/build.py && node _build/questionnaire-docx.mjs
//
// Needs Playwright and the docx package (npm install playwright docx).
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
let docx;
try { docx = require('docx'); } catch { docx = require('/opt/node22/lib/node_modules/docx'); }
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, HeightRule, Footer, PageNumber
} = docx;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INK = '3A3A3A', MUTED = '655E55', BEIGE = 'D9C7B3', TINT = 'F4EADD';
const FONT = 'Trebuchet MS';
const WIDTH = 9638; // A4 text width with 2 cm margins, in twentieths of a point

// 1. Read the questions from the built website page.
const browser = await chromium.launch();
const ctx = await browser.newContext({ javaScriptEnabled: false });
const page = await ctx.newPage();
await page.goto(pathToFileURL(join(ROOT, 'pre-mediation-questionnaire.html')).href);
const sections = await page.evaluate(() => {
  const text = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const withoutOpt = el => { const c = el.cloneNode(true); c.querySelectorAll('.opt').forEach(n => n.remove()); return text(c); };
  const form = document.querySelector('form[data-keep-email]');
  return [...form.querySelectorAll('[data-section]')].map(sec => {
    const items = [];
    sec.querySelectorAll('.field, fieldset, label.check').forEach(el => {
      if (el.matches('fieldset')) {
        const legend = el.querySelector('legend');
        items.push({ kind: 'choice', q: withoutOpt(legend), opt: text(legend.querySelector('.opt')),
          hint: text(el.querySelector(':scope > .hint')),
          options: [...el.querySelectorAll('input[type=radio], input[type=checkbox]')].map(i => i.value) });
      } else if (el.matches('label.check')) {
        items.push({ kind: 'check', q: text(el) });
      } else {
        const label = el.querySelector('label');
        const ctl = el.querySelector('input, select, textarea');
        const base = { q: withoutOpt(label), opt: text(label.querySelector('.opt')), hint: text(el.querySelector('.hint')) };
        if (ctl.tagName === 'SELECT') items.push(Object.assign(base, { kind: 'choice', options: [...ctl.options].map(o => text(o)) }));
        else if (ctl.tagName === 'TEXTAREA') items.push(Object.assign(base, { kind: 'long', rows: +ctl.getAttribute('rows') || 3 }));
        else items.push(Object.assign(base, { kind: 'short' }));
      }
    });
    const intro = [...sec.children].filter(c => c.tagName === 'P' && !c.className).map(text);
    return { title: text(sec.querySelector('h2')), intro, items };
  });
});
await browser.close();

// 2. Lay them out as a printable, fillable Word form.
const run = (t, o = {}) => new TextRun(Object.assign({ text: t, font: FONT }, o));
const line = { style: BorderStyle.SINGLE, size: 4, color: BEIGE };
const noLine = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function answerBox(heightTwips) {
  return new Table({
    width: { size: WIDTH, type: WidthType.DXA },
    columnWidths: [WIDTH],
    rows: [new TableRow({
      cantSplit: true,
      height: { value: heightTwips, rule: HeightRule.ATLEAST },
      children: [new TableCell({
        width: { size: WIDTH, type: WidthType.DXA },
        borders: { top: line, bottom: line, left: line, right: line },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [run('')] })]
      })]
    })]
  });
}

function question(item) {
  const out = [new Paragraph({ keepNext: true, spacing: { before: 200, after: item.hint ? 20 : 60 },
    children: [run(item.q, { bold: true, size: 19 }), ...(item.opt ? [run(' ' + item.opt, { size: 17, color: MUTED })] : [])] })];
  if (item.hint) out.push(new Paragraph({ keepNext: true, spacing: { after: 60 }, children: [run(item.hint, { italics: true, size: 17, color: MUTED })] }));
  return out;
}

const body = [];
const logo = readFileSync(join(ROOT, 'assets/img/brand/lockup-480.png'));
body.push(new Paragraph({ spacing: { after: 240 }, children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 180, height: 79 },
  altText: { title: 'Vestia Mediation', description: 'Vestia Mediation logo', name: 'Vestia Mediation' } })] }));
body.push(new Paragraph({ spacing: { after: 160 }, children: [run('Pre-mediation questionnaire', { size: 44 })] }));
body.push(new Paragraph({ spacing: { before: 60, after: 160 }, indent: { left: 170 },
  shading: { type: ShadingType.CLEAR, fill: TINT, color: 'auto' },
  border: { left: { style: BorderStyle.SINGLE, size: 24, space: 8, color: INK } },
  children: [run('CONFIDENTIAL TO THE MEDIATOR. WITHOUT PREJUDICE.', { bold: true, size: 20, characterSpacing: 20 })] }));
[
  'Please complete this questionnaire before the mediation day and email it to enquiries@vestiamediation.co.uk. All information you provide is confidential and will only be shared with the mediator. It is also without prejudice, so it can\'t be referred to in court if the dispute doesn\'t settle, unless it would have been admissible anyway.',
  'Short answers are fine, and questions marked as optional can be skipped. If you\'re a solicitor completing this for a client, please answer for your client. You can also complete the questionnaire online at www.vestiamediation.co.uk/pre-mediation-questionnaire.'
].forEach(t => body.push(new Paragraph({ spacing: { after: 100 }, children: [run(t, { size: 19, color: MUTED })] })));

for (const sec of sections) {
  body.push(new Paragraph({ keepNext: true, spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, space: 4, color: BEIGE } },
    children: [run(sec.title, { size: 28 })] }));
  sec.intro.forEach(t => body.push(new Paragraph({ keepNext: true, spacing: { after: 60 }, children: [run(t, { size: 19, color: MUTED })] })));
  for (const item of sec.items) {
    if (item.kind === 'check') {
      body.push(new Paragraph({ spacing: { before: 200 }, children: [run('☐  ', { size: 22 }), run(item.q, { size: 19 })] }));
      continue;
    }
    body.push(...question(item));
    if (item.kind === 'choice') {
      body.push(new Paragraph({ spacing: { after: 60 }, children: item.options.flatMap((o, i) =>
        [run((i ? '      ' : '') + '☐ ', { size: 22 }), run(o, { size: 19 })]) }));
    } else {
      body.push(answerBox(item.kind === 'long' ? Math.max(900, item.rows * 250) : 400));
    }
  }
}

const small = { size: 16, color: MUTED };
const doc = new Document({
  creator: 'Vestia Mediation',
  title: 'Pre-mediation questionnaire',
  description: 'Confidential to the mediator. Without prejudice.',
  styles: { default: { document: { run: { font: FONT, size: 21, color: INK } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 567, footer: 567 } } },
    footers: { default: new Footer({ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [
        run('Confidential to the mediator. Without prejudice.    Page ', small),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, ...small }), run(' of ', small),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, ...small })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Vestia Mediation is a trading name of Concibrium Limited, a company registered in England and Wales (Company No. 16043891). Registered office: Gw 522, 5th Floor, The Grange, 100 High Street, London, N14 6BN.', small)] })
    ] }) },
    children: body
  }]
});

mkdirSync(join(ROOT, 'assets/docs'), { recursive: true });
const out = join(ROOT, 'assets/docs/vestia-pre-mediation-questionnaire.docx');
writeFileSync(out, await Packer.toBuffer(doc));
console.log('Wrote', out, 'with', sections.length, 'sections and', sections.reduce((n, s) => n + s.items.length, 0), 'questions');
