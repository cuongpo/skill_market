#!/usr/bin/env tsx
/**
 * Seeds 5 demo skills into SkillMarket for hackathon demonstration.
 * Run: pnpm seed
 * Requires: backend running at http://localhost:3001
 */

const API = "http://localhost:3001";
const DEMO_ADDRESS = "0x559593F3D5A26a506A5d6c88a8519ECEf947674C";

const DEMO_SKILLS = [
  {
    category: "accounting",
    price_usd: 0.01,
    content: `---
name: vietnam-freelancer-tax
description: Advises Vietnamese freelancers on personal income tax, deductions, and filing requirements under 2024 law.
author: Sarah Nguyen CPA
price_per_use: 0.50
version: 1.0
---

# Vietnam Freelancer Tax Advisor

## When to use this skill
Use this skill when a freelancer in Vietnam asks about:
- Personal income tax (PIT) calculation
- Applicable deductions (personal, family, SHUI)
- Withholding tax rates for different contract types
- Filing deadlines and procedures
- Penalties for non-compliance

## Approach
1. **Identify income type**: Employment vs freelance/business income (different treatment)
2. **Determine applicable rate**: Apply 2024 progressive PIT schedule (5%–35%) or flat 10% withholding
3. **Calculate deductions**: Personal reduction (11M VND/month), dependents (4.4M each), SHUI contributions
4. **Compute net taxable income**: Gross minus all eligible deductions
5. **Recommend filing method**: Monthly withholding vs annual declaration

## 2024 PIT Schedule Reference
- Up to 60M VND/year: 5%
- 60M–120M: 10%
- 120M–216M: 15%
- 216M–384M: 20%
- 384M–624M: 25%
- 624M–960M: 30%
- Over 960M: 35%

## Rules
- Never give a final tax number without asking for total annual income AND residency status
- Always ask if they have registered a tax code (MST)
- Recommend 10% flat withholding for one-off freelance contracts under 2M VND
- Flag amounts > 500M VND/year for professional CPA consultation
- Always cite the relevant circular (Circular 111/2013/TT-BTC as amended)
`,
  },
  {
    category: "legal",
    price_usd: 0.02,
    content: `---
name: saas-contract-reviewer
description: Reviews SaaS and software service agreements, identifying risky clauses and flagging items for negotiation.
author: James Chen, Contract Specialist
price_per_use: 1.00
version: 1.0
---

# SaaS Contract Reviewer

## When to use this skill
Use when a buyer or vendor wants to review:
- SaaS subscription agreements
- Software license agreements
- API terms of service
- MSA (Master Service Agreements) with software components

## Approach
1. **Scan for liability caps**: Identify if liability is capped at 12 months of fees (standard) or lower
2. **Review IP ownership**: Who owns custom features, integrations, and data outputs?
3. **Check data clauses**: Data portability, deletion timelines, subprocessor lists (GDPR relevance)
4. **Identify auto-renewal traps**: Notice periods for cancellation, price increase clauses
5. **Evaluate SLA terms**: Uptime guarantees, credit mechanisms, exclusions
6. **Flag indemnification scope**: Is the indemnification mutual or one-sided?
7. **Assess governing law**: Jurisdiction risks for cross-border agreements

## Risk Flags (always call out)
- Unlimited liability on either party
- Unilateral right to change pricing without notice
- No data deletion timeline on contract termination
- Mandatory arbitration with inconvenient jurisdiction
- Broad IP assignment clauses covering pre-existing IP

## Rules
- Always clarify which party the user represents (buyer vs vendor)
- For contracts > $100K ARR, always recommend attorney review
- Do not provide jurisdiction-specific legal advice — flag for local counsel
- Structure output as: Summary → Risk Items (High/Medium/Low) → Recommended Negotiation Points
`,
  },
  {
    category: "finance",
    price_usd: 0.015,
    content: `---
name: startup-unit-economics
description: "Calculates and interprets key startup unit economics: CAC, LTV, payback period, and cohort metrics."
author: Michael Torres, VC Analyst
price_per_use: 0.75
version: 1.0
---

# Startup Unit Economics Analyzer

## When to use this skill
Use when a founder or analyst needs to:
- Calculate CAC (Customer Acquisition Cost) and LTV (Lifetime Value)
- Determine LTV:CAC ratio and what it means for the business
- Estimate payback period for customer acquisition spend
- Understand cohort retention's impact on revenue
- Benchmark against industry standards

## Approach
1. **Gather inputs**: Monthly new customers, S&M spend, ARPU, churn rate, gross margin
2. **Calculate CAC**: Total S&M spend ÷ new customers acquired in period
3. **Calculate LTV**: (ARPU × Gross Margin %) ÷ Monthly Churn Rate
4. **Compute LTV:CAC ratio** and payback period (CAC ÷ monthly gross profit per customer)
5. **Contextualize**: Compare against SaaS benchmarks (3:1 LTV:CAC = minimum healthy)
6. **Identify improvement levers**: Reduce CAC (channels), improve LTV (reduce churn, upsell)

## Benchmarks
- LTV:CAC > 3:1 = healthy SaaS
- Payback period < 12 months = strong unit economics
- Net Revenue Retention > 110% = expansion revenue covers churn
- Gross Margin > 70% = typical for SaaS

## Rules
- Always ask for the time period of the data (trailing 3 months preferred)
- Distinguish between blended CAC and channel-specific CAC
- If churn > 5%/month, flag immediately — the LTV math doesn't work
- Ask for logo churn vs revenue churn separately
- Recommend investor-grade cohort analysis for Series A+ companies
`,
  },
  {
    category: "marketing",
    price_usd: 0.01,
    content: `---
name: landing-page-copywriter
description: "Writes high-converting landing page copy following proven frameworks: AIDA, PAS, and Jobs-to-be-Done."
author: Emma Walsh, Conversion Copywriter
price_per_use: 0.50
version: 1.0
---

# Landing Page Copywriter

## When to use this skill
Use when building or improving:
- SaaS product landing pages
- Lead generation pages
- Product launch pages
- Pricing page copy
- Hero section rewrites

## Approach
1. **Identify the core job-to-be-done**: What outcome does the customer want to achieve?
2. **Extract the primary pain point**: What's the #1 frustration before using this product?
3. **Write headline options** using: Outcome-focused, Curiosity, Social proof, or Number formats
4. **Craft the subheadline**: Clarify who it's for and what they get
5. **Build the value proposition section**: 3 benefits framed as customer outcomes, not features
6. **Write the CTA**: Action-oriented, specific, low-friction ("Start free trial" > "Submit")
7. **Add objection handling**: Address top 2–3 objections near the CTA

## Frameworks
- **AIDA**: Attention → Interest → Desire → Action
- **PAS**: Problem → Agitation → Solution
- **JTBD**: Focus on the outcome, not the product feature

## Rules
- Always ask: Who is the target customer? What is the product? What action should they take?
- Write at a 7th-grade reading level — clarity over cleverness
- Lead with outcomes, not features ("Spend 2 hours less on invoicing" > "Automated invoicing")
- Every CTA button should tell them what happens when they click it
- Generate at least 3 headline variants for A/B testing
`,
  },
  {
    category: "engineering",
    price_usd: 0.015,
    content: `---
name: database-schema-reviewer
description: Reviews PostgreSQL/MySQL database schemas for performance issues, normalization problems, and indexing gaps.
author: Alex Kim, Senior Database Engineer
price_per_use: 0.75
version: 1.0
---

# Database Schema Reviewer

## When to use this skill
Use when you need to review or design:
- PostgreSQL or MySQL table schemas
- Index strategies for query optimization
- Normalization level decisions (1NF through 3NF)
- Data type selection for columns
- Relationship constraints and foreign keys

## Approach
1. **Review normalization**: Check for repeating groups (1NF), partial dependencies (2NF), transitive dependencies (3NF)
2. **Audit data types**: Are types as tight as possible? (VARCHAR(255) vs TEXT, INT vs BIGINT)
3. **Index analysis**: Primary key type, foreign key indexes, composite index column order, covering indexes
4. **Constraint review**: NOT NULL, UNIQUE, CHECK constraints — what's missing?
5. **Query pattern analysis**: Ask about the top 3 queries and verify indexes support them
6. **Estimate scale**: How many rows? Partitioning needed at 100M+?
7. **Flag anti-patterns**: EAV models, storing JSON in TEXT, missing updated_at columns

## Common Issues to Flag
- BIGINT vs INT for IDs (always BIGINT for user-facing tables that will grow)
- Missing foreign key indexes (every FK should have an index on the referencing column)
- Using TEXT for everything instead of VARCHAR with appropriate limits
- created_at without an index on a high-write table
- Storing comma-separated values in a single column

## Rules
- Always ask what database engine (PostgreSQL version matters for features)
- Ask about the expected row count and growth rate before recommending partitioning
- Flag JSONB usage — valid in PostgreSQL 9.4+ but ask why not a normalized table
- Generate CREATE INDEX statements as output, not just descriptions
`,
  },
];

async function seedSkills() {
  console.log("🌱 Seeding demo skills into SkillMarket...\n");

  for (const skill of DEMO_SKILLS) {
    try {
      const form = new FormData();
      form.append("content", skill.content);
      form.append("price_usd", String(skill.price_usd));
      form.append("category", skill.category);

      const res = await fetch(`${API}/api/v1/skills/upload`, {
        method: "POST",
        headers: { Authorization: `Wallet ${DEMO_ADDRESS}` },
        body: form,
      });

      if (res.ok) {
        const data = await res.json() as { id: string; txHash: string };
        const nameMatch = skill.content.match(/^name:\s*(.+)$/m);
        const name = nameMatch?.[1] ?? "unknown";
        console.log(`✅ ${name} → ${data.id} (tx: ${data.txHash.slice(0, 18)}…)`);
      } else {
        const err = await res.json() as { error: string; details?: string[]; detail?: string };
        const nameMatch = skill.content.match(/^name:\s*(.+)$/m);
        console.log(`❌ ${nameMatch?.[1] ?? "unknown"}: ${err.error} ${err.detail ?? err.details?.join(", ") ?? ""}`);
      }
    } catch (err) {
      console.error("Request failed:", err);
    }
  }

  console.log("\n✨ Seeding complete. Visit http://localhost:5173/marketplace");
}

seedSkills();
