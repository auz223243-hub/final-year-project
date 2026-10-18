const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, LevelFormat, PageBreak, Footer, PageNumber, TabStopType,
  PositionalTab, PositionalTabAlignment, PositionalTabLeader, PositionalTabRelativeTo, VerticalAlign,
} = require('docx');
const { C, REFS } = require('./content.js');

const FONT = 'Times New Roman';
const TEXT_W = 9026; // A4 width 11906 - 2*1440

// ---------- citation numbering by first appearance ----------
const order = [];
const scan = (s) => s.replace(/\[@([a-z0-9_]+)\]/g, (m, k) => { if (!order.includes(k)) order.push(k); });
const blockTexts = (b) => {
  if (b.text) return [b.text];
  if (b.items) return b.items;
  if (b.rows) return [...b.rows.flat()];
  return [];
};
C.forEach((b) => blockTexts(b).forEach(scan));
const num = Object.fromEntries(order.map((k, i) => [k, i + 1]));
const resolve = (s) => s.replace(/\[@([a-z0-9_]+)\]/g, (m, k) => {
  if (!num[k]) throw new Error('unknown cite ' + k);
  return `[${num[k]}]`;
});

// ---------- inline markup -> runs ----------
function runs(text, base = {}) {
  const t = resolve(text);
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_\{[^}]+\}|\^\{[^}]+\})/g;
  let last = 0, m;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push(new TextRun({ text: t.slice(last, m.index), font: FONT, ...base }));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(new TextRun({ text: tok.slice(2, -2), bold: true, font: FONT, ...base }));
    else if (tok.startsWith('*')) out.push(new TextRun({ text: tok.slice(1, -1), italics: true, font: FONT, ...base }));
    else if (tok.startsWith('_{')) out.push(new TextRun({ text: tok.slice(2, -1), subScript: true, font: FONT, ...base }));
    else out.push(new TextRun({ text: tok.slice(2, -1), superScript: true, font: FONT, ...base }));
    last = m.index + tok.length;
  }
  if (last < t.length) out.push(new TextRun({ text: t.slice(last), font: FONT, ...base }));
  return out;
}

const body = (children, opts = {}) => new Paragraph({
  children, alignment: AlignmentType.JUSTIFIED, spacing: { after: 140, line: 300 }, ...opts,
});

const border = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
const borders = { top: border, bottom: border, left: border, right: border };

function makeTable(b) {
  const total = b.widths.reduce((a, c) => a + c, 0);
  const cell = (txt, i, header) => new TableCell({
    borders,
    width: { size: b.widths[i], type: WidthType.DXA },
    shading: header ? { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.TOP,
    children: [new Paragraph({ spacing: { after: 0, line: 260 }, children: runs(header ? `**${txt}**` : txt, { size: 21 }) })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: b.widths,
    rows: [
      new TableRow({ tableHeader: true, children: b.header.map((h, i) => cell(h, i, true)) }),
      ...b.rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) })),
    ],
  });
}

function render(blocks) {
  const out = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'h1':
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: b.text })] }));
        break;
      case 'h2':
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: b.text })] }));
        break;
      case 'p':
        out.push(body(runs(b.text)));
        break;
      case 'label':
        out.push(body([new TextRun({ text: b.label + ' ', bold: true, font: FONT }), ...runs(b.text)]));
        break;
      case 'bullets':
        b.items.forEach((it) => out.push(new Paragraph({
          numbering: { reference: 'bullets', level: 0 }, alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 80, line: 300 }, children: runs(it),
        })));
        out.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case 'numbered':
        b.items.forEach((it) => out.push(new Paragraph({
          numbering: { reference: 'objectives', level: 0 }, alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100, line: 300 }, children: runs(it),
        })));
        break;
      case 'eq':
        out.push(new Paragraph({
          tabStops: [{ type: TabStopType.CENTER, position: TEXT_W / 2 }, { type: TabStopType.RIGHT, position: TEXT_W }],
          spacing: { before: 80, after: 140 },
          children: [new TextRun({ text: '\t', font: FONT }), ...runs(b.text, { italics: true }), new TextRun({ text: `\t(${b.num})`, font: FONT })],
        }));
        break;
      case 'table':
        out.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 80 }, children: runs(b.caption) }));
        out.push(makeTable(b));
        out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
        break;
      case 'pagebreak':
        out.push(new Paragraph({ children: [new PageBreak()] }));
        break;
      default:
        throw new Error('unknown block ' + b.type);
    }
  }
  return out;
}

// ---------- cover ----------
const center = (text, opts = {}, pOpts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 160 }, ...pOpts,
  children: [new TextRun({ text, font: FONT, ...opts })],
});
const cover = [
  center('BSE3716  Research Methods in Building Sciences and Engineering', { bold: true, size: 28 }, { spacing: { before: 1200, after: 160 } }),
  center('Academic Year 2025/26', { size: 24 }),
  center('PROJECT PROPOSAL REPORT (REVISED)', { bold: true, size: 28 }, { spacing: { before: 600, after: 600 } }),
  center('Improving Classroom HVAC Energy Efficiency through Personalized Thermal Comfort Data Analytics: A Field Study and Simulation Assessment', { bold: true, size: 32 }, { spacing: { after: 900 } }),
  center('Project ID: FX02', { size: 24 }),
  center('LUO ZI YAN   (23073375D)', { size: 24 }),
  center('Supervisor: Fu, XIAO', { size: 24 }),
  center('Original submission: 17/4/2026', { size: 24 }, { spacing: { before: 400, after: 120 } }),
  center('Revised version: 15/10/2026', { size: 24 }),
];

// ---------- TOC (manual; page numbers filled from first render) ----------
let tocPages = {};
try { tocPages = JSON.parse(fs.readFileSync(path.join(__dirname, 'toc_pages.json'), 'utf8')); } catch (e) {}
const tocEntries = [
  ...C.filter((b) => b.type === 'h1').map((b) => b.text),
  '7. References', 'Appendix A – Disclaimer and Originality Statement', 'Appendix B – Summary of Revisions',
];
const toc = [
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Table of Contents', bold: true, size: 32, font: FONT })] }),
  ...tocEntries.map((e) => new Paragraph({
    spacing: { after: 140 },
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W, leader: 'dot' }],
    children: [new TextRun({ text: `${e}\t${tocPages[e] ?? ''}`, font: FONT, size: 24 })],
  })),
];

// ---------- references ----------
const refs = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: false, children: [new TextRun('7. References')] }),
  ...order.map((k, i) => new Paragraph({
    tabStops: [{ type: TabStopType.LEFT, position: 560 }],
    indent: { left: 560, hanging: 560 }, spacing: { after: 100, line: 260 },
    children: [new TextRun({ text: `[${i + 1}]\t`, font: FONT, size: 22 }), ...runs(REFS[k], { size: 22 })],
  })),
];

// ---------- appendices ----------
const appA = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun('Appendix A – Disclaimer and Originality Statement')] }),
  body(runs('I, LUO ZI YAN, 23073375D, hereby certify that this project proposal is entirely my own work and is original. All referenced works are properly cited and acknowledged. Where AI-assisted tools are used in the preparation of this proposal or in the execution of the project, their use is disclosed in the methodology section and a usage log is maintained, in accordance with the supervisor\'s and the department\'s guidance.')),
  new Paragraph({ spacing: { before: 600, after: 200 }, children: [new TextRun({ text: '(Author\'s Signature) ______________LUO ZI YAN__________________', font: FONT })] }),
  new Paragraph({ children: [new TextRun({ text: 'Date: ______________15/10/2026__________________', font: FONT })] }),
];

const revRows = [
  ['Whole document', 'Language rewritten throughout; garbled or duplicated sentences removed.', 'Several passages in the original were not readable.'],
  ['§1, §2', 'Corrected attributions: the four error types are credited to Liddell and Kruschke; the scope of Favero et al.\'s analysis (a single 6,048-vote dataset) is described accurately; added Schweiker et al., Wang et al., Lai and Chen and the standards cited in the text.', 'Accuracy of citations; the original cited "Wang et al." without a reference.'],
  ['§2.5', 'Gap 1 narrowed to occupant-specific thresholds estimated with partially pooled models.', 'Group-level differences in scale use had already been reported.'],
  ['§3, §4.1', 'Ethics: formal HSEARS application with information sheet and consent form replaces the single checkbox.', 'University requirement for research involving human subjects.'],
  ['§4.1', 'Votes collected at every session (twice per session); break-even uses time-ordered hold-out and a grid of 2–14 votes.', 'Original design yielded at most ~16 votes per person, too few for a 20-vote grid plus test data.'],
  ['§4.1', 'Model C reformulated as partially pooled threshold shift, scale and slope.', 'Six free thresholds per person are not identifiable with ~20 votes.'],
  ['§4.1', 'LOOIC restricted to Models B vs C; Model A compared via QWK, ordinal MAE and log score.', 'LOOIC of a continuous and a discrete likelihood are not comparable.'],
  ['§4.2', 'Common setpoint rule for all controllers; Controller 3 aggregation over occupants defined; three-way cross-evaluation of comfort.', 'Original did not define how 20 personal models give one setpoint; PMV-only evaluation favoured Controller 1.'],
  ['§4.2', 'Verification by parameter-recovery study replaces "closed-form comparison"; replication target specified.', 'More informative and feasible check.'],
  ['§5', 'Timeline rebased to Oct 2026 – May 2027; pipeline and EnergyPlus base model moved before the field campaign; campaign moved to Semester 2; risk table expanded.', 'Actual project dates; schedule risk.'],
  ['§5.2', 'ASHRAE Database II retained only as a population-level fallback.', 'It cannot support the personalisation analysis.'],
];
const appB = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun('Appendix B – Summary of Revisions')] }),
  body(runs('This appendix lists the main changes made to the proposal submitted on 17/4/2026.')),
  makeTable({ widths: [1300, 4600, 3126], header: ['Section', 'Change', 'Reason'], rows: revRows }),
];

// ---------- document ----------
const doc = new Document({
  creator: 'LUO ZI YAN',
  title: 'BSE3716 Project Proposal (Revised) – FX02',
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: FONT }, paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: FONT }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'objectives', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: 'O%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 540 } } } }] },
    ],
  },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: [...cover, ...toc] },
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, pageNumbers: { start: 1 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] })] }) },
      children: [...render(C), ...refs, ...appA, ...appB] },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2] || 'out.docx', buf);
  console.log('written; refs:', order.length);
});
