// jurisdiction.test.mjs — PROOF-OF-PLAY for a tool that tells somebody the wrong country's rules.
import { TERMS, visibleText, scan, verdict } from './jurisdiction.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); };

console.log('\n=== §1 · ⚑ THE REAL SENTENCE, FROM THE REAL FORK ===');
{
  // fallhr-us, verbatim. The localiser swapped ACAS for the DOL and left the British statutes.
  const real = 'Working Time Regulations 1998, Equality Act 2010, DOL Code of Practice, and HMRC PAYE/RTI rules. All employment decisions remain the employer\'s.';
  const r = scan(real, { claims: 'US' });
  ok(r.ok === false, '⚑ a US tool citing UK statutes is a FAULT, not a note — it is telling an American employer the wrong country\'s obligations');
  ok(r.foreign.some(f => f.term === 'HMRC'), 'HMRC is named');
  ok(r.foreign.some(f => /Working Time/.test(f.term)), 'and the Working Time Regulations');
  ok(r.foreign.some(f => /Equality Act/.test(f.term)), 'and the Equality Act 2010');
  ok(r.foreign.every(f => f.belongsTo === 'GB'), 'each one saying which country it belongs to');
  ok(r.foreign[0].sample.length > 10, 'with the surrounding words, so it can be found and read');
  ok(/cites 4 rule|cites \d+ rule/.test(verdict(r)), 'and the verdict is a sentence, not a count');

  // ⚑ The DOL reference is CORRECT for a US tool and must not be flagged.
  ok(!r.foreign.some(f => f.term === 'DOL'), '⚑ the DOL is right where it is — a checker that flags the correct half of a fix is one nobody runs twice');
}

console.log('\n=== §2 · ⚑ IT WILL NOT CRY WOLF ===');
{
  const legit = 'We charge VAT on sales into the EU and our GDPR duties apply to European customers.';
  const r = scan(legit, { claims: 'US' });
  ok(r.ok === true,
     '⚑ a US firm really can owe GDPR duties and really can charge VAT — flagging those as faults would bury the ones that matter');
  ok(r.mentions.length === 2, 'they are surfaced separately, for a person to judge');
  ok(r.mentions.every(m => m.kind === 'soft'), 'marked as the softer kind');
  ok(/worth a read/.test(verdict(r)), 'and the verdict says so without calling it wrong');

  const clean = scan('Payroll is filed with the IRS on Form 941 under FLSA rules.', { claims: 'US' });
  ok(clean.ok === true && clean.foreign.length === 0 && clean.mentions.length === 0,
     'a properly American document raises nothing at all');
  ok(/nothing in this belongs to another country/.test(verdict(clean)), 'and says so plainly');
}

console.log('\n=== §3 · it works in both directions ===');
{
  const usInUk = scan('File your W-2 with the IRS and check FLSA overtime.', { claims: 'GB' });
  ok(usInUk.ok === false && usInUk.foreign.some(f => f.term === 'IRS'),
     '⚑ a UK tool citing the IRS is the same fault the other way round — the check is not about America');
  ok(usInUk.foreign.every(f => f.belongsTo === 'US'), 'and it says so');
  ok(scan('File with HMRC under PAYE.', { claims: 'GB' }).ok === true, 'while UK terms in a UK tool are simply correct');
  ok(scan('File with HMRC under PAYE.', { claims: 'UK' }).ok === true, '"UK" and "GB" mean the same thing');
  ok(scan('File with the IRS.', { claims: 'usa' }).ok === true, 'and so do "US" and "USA", in any case');
}

console.log('\n=== §4 · ⚑ WHOLE WORDS, OR IT IS NOISE ===');
{
  ok(scan('The DOLPHIN programme and the ICONIC award.', { claims: 'GB' }).foreign.length === 0,
     '⚑ DOLPHIN is not the DOL and ICONIC is not the ICO — a checker matching inside words flags every page it is pointed at');
  ok(scan('Contact the ICO about this.', { claims: 'US' }).foreign.some(f => f.term === 'ICO'), 'but the real acronym is caught');
  ok(scan('Real  Time   Information filings', { claims: 'US' }).foreign.some(f => /Real Time/.test(f.term)),
     'and a term is still found when the spacing in the document differs from the table');
  ok(scan('hmrc', { claims: 'US' }).foreign.length === 1, 'the match ignores case');
  ok(scan('Form 941 is due', { claims: 'GB' }).foreign.some(f => f.term === 'Form 941'), 'a term with a digit in it still matches');
}

console.log('\n=== §5 · what a reader actually sees ===');
{
  const page = `<p>File with HMRC.</p><script>const note = "internal";</script><style>.x{color:red}</style><!-- ACAS -->`;
  const vis = visibleText(page);
  ok(/HMRC/.test(vis), 'body text survives');
  ok(!/internal/.test(vis) && !/color:red/.test(vis) && !/ACAS/.test(vis),
     '⚑ script, style and comments are stripped — a term nobody can see is not something the tool is telling anybody');
  ok(scan(vis, { claims: 'US' }).foreign.length === 1, 'so only the visible one is reported');
  ok(scan(page, { claims: 'US' }).foreign.length === 2,
     'and scanning the raw page finds both, because in a single-file app the strings inside the script ARE the screen');
  ok(visibleText(null) === '' && visibleText(42) === '', 'nothing visible in nothing');
}

console.log('\n=== §6 · it refuses to check what it was not told ===');
{
  const none = scan('File with HMRC.', {});
  ok(none.ok === false && none.claims === null,
     '⚑ with no jurisdiction claimed, nothing can be foreign to it — and that is reported as unchecked, never as clean');
  ok(/no jurisdiction was claimed/.test(none.reason), 'with the reason');
  ok(/nothing was checked/.test(verdict(none)), 'and the verdict does not imply a pass');
  ok(scan('anything', { claims: 'FR' }).claims === null, 'a country with no term table cannot be checked either');
  ok(scan('', { claims: 'US' }).ok === true && /nothing to check/.test(scan('', { claims: 'US' }).reason),
     'while an empty document is honestly nothing to check');
}

console.log('\n=== §7 · the tables are the caller\'s ===');
{
  const own = { GB: { hard: ['Widget Act'], soft: [] }, US: { hard: [], soft: [] } };
  const r = scan('Under the Widget Act you must file.', { claims: 'US', terms: own });
  ok(r.foreign.length === 1 && r.foreign[0].term === 'Widget Act',
     'a caller can supply its own terms — this file does not get to decide what the law of a country is');
  ok(scan('Under the Widget Act.', { claims: 'US' }).ok === true, 'and the built-in table knows nothing about widgets');
  ok(Array.isArray(TERMS.GB.hard) && TERMS.GB.hard.includes('HMRC'), 'the built-in table is readable and inspectable');
}

console.log('\n=== §8 · pure under garbage ===');
{
  const junk = [null, undefined, '', 0, [], {}, NaN, 'x', { claims: {} }, { terms: 'no' }];
  let threw = null;
  for (const j of junk) {
    try { visibleText(j); scan(j, j); verdict(j); scan('HMRC', j); } catch (e) { threw = `${JSON.stringify(j)} → ${e.message}`; }
  }
  ok(threw === null, 'no input throws' + (threw ? ' — ' + threw : ''));
  ok(scan('HMRC', { claims: 'US', terms: 'no' }).foreign.length === 1, 'an unusable term table falls back to the built-in one');
  ok(verdict(null) === 'nothing was checked, because no jurisdiction was claimed' || typeof verdict(null) === 'string',
     'and a verdict on nothing is still a sentence');
  ok(scan('HMRC HMRC HMRC', { claims: 'US' }).foreign[0].count === 3, 'a term is counted every time it appears');
}

console.log('\n=== §9 · the verdict says exactly what it found ===');
{
  const three = scan('HMRC and PAYE and ICO.', { claims: 'US' });
  ok(three.foreign.length === 3, 'three foreign terms');
  ok(!/and more/.test(verdict(three)),
     '⚑ three terms are all named, with no "and more" — a summary that hides one of three is hiding a third of the problem');
  const four = scan('HMRC and PAYE and ICO and IR35.', { claims: 'US' });
  ok(four.foreign.length === 4 && /and more/.test(verdict(four)), 'four names three and says there are more');

  ok(/nothing that governs only another country/.test(scan('IRS filings', { claims: 'US' }).reason),
     'a clean scan gives the clean reason');
  ok(/1 term\(s\)|term\(s\) that govern only another country/.test(scan('HMRC', { claims: 'US' }).reason),
     'and a dirty one gives the dirty reason — the two must not be able to swap');

  ok(verdict({ ok: false }) === 'nothing was checked',
     '⚑ a result carrying no findings at all is "nothing was checked" — never a pass, and never a failure it cannot describe');
  ok(/nothing in this belongs/.test(verdict({ claims: 'US', ok: true, foreign: [], mentions: [] })), 'and a genuinely clean one reads as clean');
}

console.log('\n=== §10 · every spelling of a country ===');
{
  ok(scan('HMRC', { claims: 'GB' }).ok === true, 'GB');
  ok(scan('HMRC', { claims: 'UK' }).ok === true, 'UK');
  ok(scan('HMRC', { claims: 'GBR' }).ok === true, 'GBR');
  ok(scan('IRS', { claims: 'US' }).ok === true && scan('IRS', { claims: 'USA' }).ok === true, 'US and USA');
  ok(scan('HMRC', { claims: '  gb  ' }).ok === true, 'and it is trimmed and case-folded');
  ok(scan('HMRC', { claims: 'GBX' }).claims === null,
     '⚑ but a code nobody recognises is refused rather than guessed at — quietly treating GBX as Britain would check against the wrong table');
}

console.log(`\n${fail === 0 ? '✓ ALL PASS' : '✗ FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
