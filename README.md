# falljurisdiction

Does this document cite the law of a country it does not claim to be from?

## Why

Twenty-three tools in this estate are US forks of UK originals. Every one of them parses. Four were
broken loudly by a find-and-replace that ran over identifiers, and were repaired. The quiet damage is
worse, and no parser can see it:

> `fallhr-us` tells an American employer their obligations come from *"Working Time Regulations 1998,
> Equality Act 2010, DOL Code of Practice, and HMRC PAYE/RTI rules"*.

The localiser swapped ACAS for the DOL and left the British statutes standing. Elsewhere it wrote
`"CCPA/Data Protection Act 2018 compliance"` — prepending the Californian act to the UK one rather
than replacing it.

**A compliance tool giving the wrong country's rules is not a cosmetic problem.** Run over all 23
forks, this finds **11** still citing UK-only law.

## It will not cry wolf

Terms are graded. A **hard** marker is a body or statute that governs only one country — HMRC, IR35,
the Equality Act 2010. A **soft** one can legitimately appear anywhere: a US firm really does owe GDPR
duties to European customers and really can charge VAT on EU sales. Soft terms are surfaced for a
person to read and never counted as failures.

It also refuses to check what it was not told: with no jurisdiction claimed, the result is reported as
**unchecked**, never as clean.

## Use

```
node check.mjs US page.html
```

## Proof

54 tests, mutation gate **27/27 killed, no baselines**, CI pinned `witness@v0.2`.

## What this does NOT do

It finds the citations. It does not rewrite them. Turning UK employment law into US employment law
needs somebody who knows US employment law — inventing it would be worse than leaving it visible.

MIT · AI-Native Solutions
