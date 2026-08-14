// jurisdiction.mjs — a localisation that changed the currency and left the law.
//
// ⚑ WHAT THIS IS FOR. Twenty-three tools in the estate are US forks of UK originals. Every one of them
// parses; four were broken loudly by a find-and-replace that ran over identifiers and were repaired.
// The quiet damage is worse and no parser can see it:
//
//   fallhr-us tells an American employer their obligations come from
//   "Working Time Regulations 1998, Equality Act 2010, DOL Code of Practice, and HMRC PAYE/RTI rules"
//
// The localiser swapped ACAS for the DOL, and left the British statutes standing. Elsewhere it wrote
// "CCPA/Data Protection Act 2018 compliance" — prepending the Californian act to the UK one rather
// than replacing it. A US tool citing UK law is not a cosmetic problem: it is a compliance tool giving
// the wrong country's rules, confidently, on the screen where somebody makes a decision.
//
// ⚑ AND IT WILL NOT CRY WOLF. Some of these terms are legitimate in a US document — a US firm with
// European customers really does have GDPR duties, and VAT really is charged on sales into the EU. So
// terms are graded. A HARD marker is a body or statute that only ever governs one country; a SOFT one
// can appear anywhere and is reported separately, for a human to read, never as a failure.
//
// Pure: no filesystem, no network. The term tables are data and can be replaced by the caller.

/**
 * Terms that belong to one jurisdiction.
 *
 * `hard` — a body or statute that governs only there. Its presence in a document claiming another
 *          jurisdiction is a fault: it is telling somebody the wrong country's rules.
 * `soft` — real elsewhere too. A US firm can owe GDPR duties and can charge VAT on EU sales, so these
 *          are surfaced for a person to judge and never counted as failures.
 */
export const TERMS = {
  GB: {
    hard: [
      'HMRC', 'PAYE', 'National Insurance', 'Companies House', 'Ofcom', 'Ofgem', 'Ofsted',
      'Equality Act 2010', 'Working Time Regulations', 'Data Protection Act 2018',
      'Consumer Rights Act', 'Employment Rights Act', 'Agency Workers Regulations',
      'IR35', 'CEST', 'Statutory Sick Pay', 'SSP', 'Real Time Information', 'RTI',
      'County Court', 'Crown Court', 'ACAS', 'CQC', 'SRA', 'Law Society', 'FCA', 'ICO',
      'Making Tax Digital', 'Self Assessment', 'Corporation Tax',
    ],
    soft: ['VAT', 'GDPR', 'NHS'],
  },
  US: {
    hard: [
      'IRS', 'W-2', 'W-4', '1099', 'FLSA', 'FMLA', 'OSHA', 'EEOC', 'ERISA', 'COBRA',
      'Social Security Administration', 'Department of Labor', 'DOL', 'SEC', 'FINRA',
      'Fair Labor Standards Act', 'Family and Medical Leave Act', 'Affordable Care Act',
      'Form 941', 'Form 940', 'FICA', 'Medicare', 'Medicaid', 'HIPAA', 'State Bar',
    ],
    soft: ['CCPA', 'sales tax'],
  },
};

const KNOWN = Object.keys(TERMS);

function normalizeCode(value) {
  const s = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (s === 'UK' || s === 'GB' || s === 'GBR') return 'GB';
  if (s === 'US' || s === 'USA') return 'US';
  return KNOWN.includes(s) ? s : null;
}

/** A term matched as a whole word, with any run of spaces in it allowed to vary. */
function matcher(term) {
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const boundary = /^[\w]/.test(term) ? '\\b' : '';
  const trailing = /[\w]$/.test(term) ? '\\b' : '';
  return new RegExp(boundary + escaped + trailing, 'gi');
}

/**
 * ⚑ Strip the parts of a page a reader never sees. A term inside a comment, a script or a style block
 * is not something the tool is telling anybody, and counting it would make every honest fix look
 * incomplete. This is deliberately blunt: it removes more than it needs to, because a false alarm here
 * costs somebody a search through a file for text that was never on screen.
 */
export function visibleText(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/**
 * Find the terms that belong somewhere else.
 *
 * `text` is searched as given. Pass `visibleText(html)` first if only what a reader sees should count;
 * for a single-file app the strings inside the script ARE what the reader sees, so the default is to
 * search everything.
 */
export function scan(text, opts) {
  const o = (opts && typeof opts === 'object') ? opts : {};
  const claims = normalizeCode(o.claims);
  const src = typeof text === 'string' ? text : '';
  const tables = (o.terms && typeof o.terms === 'object') ? o.terms : TERMS;

  if (!claims) {
    return { ok: false, claims: null, foreign: [], mentions: [],
             reason: 'no jurisdiction was claimed, so nothing can be foreign to it' };
  }
  if (!src) {
    return { ok: true, claims, foreign: [], mentions: [], reason: 'there is nothing to check' };
  }

  const foreign = [], mentions = [];
  for (const code of Object.keys(tables)) {
    if (code === claims) continue;
    const table = tables[code] || {};
    for (const kind of ['hard', 'soft']) {
      for (const term of (Array.isArray(table[kind]) ? table[kind] : [])) {
        const hits = src.match(matcher(term));
        if (!hits || !hits.length) continue;
        const at = src.search(matcher(term));
        const row = {
          term, belongsTo: code, kind, count: hits.length,
          sample: src.slice(Math.max(0, at - 45), at + 75).replace(/\s+/g, ' ').trim(),
        };
        (kind === 'hard' ? foreign : mentions).push(row);
      }
    }
  }
  foreign.sort((a, b) => b.count - a.count);
  mentions.sort((a, b) => b.count - a.count);

  return {
    ok: foreign.length === 0,
    claims, foreign, mentions,
    reason: foreign.length === 0
      ? 'nothing that governs only another country'
      : `${foreign.length} term(s) that govern only another country`,
  };
}

/**
 * ⚑ THE SENTENCE A PERSON READS. Kept separate from the scan because a list of matches is evidence,
 * not a verdict, and the verdict is what somebody acts on.
 */
export function verdict(result) {
  const r = (result && typeof result === 'object') ? result : {};
  if (r.ok === false && !Array.isArray(r.foreign)) return 'nothing was checked';
  const foreign = Array.isArray(r.foreign) ? r.foreign : [];
  const mentions = Array.isArray(r.mentions) ? r.mentions : [];
  if (!r.claims) return 'nothing was checked, because no jurisdiction was claimed';
  if (!foreign.length && !mentions.length) return `nothing in this belongs to another country`;
  if (!foreign.length) return `nothing governs another country, though ${mentions.length} term(s) are worth a read`;
  const worst = foreign.slice(0, 3).map(f => f.term).join(', ');
  return `this claims to be ${r.claims} and cites ${foreign.length} rule(s) that govern somewhere else — ${worst}${foreign.length > 3 ? ', and more' : ''}`;
}

export default { TERMS, visibleText, scan, verdict };
