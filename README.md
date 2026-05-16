# SkillMarket

> A marketplace where experts upload SKILL.md files, buyers chat with AI agents powered by those skills, and creators earn on-chain royalties via 0G every time their skill runs.

**Hackathon:** 0G APAC Hackathon · Track 1 (Agentic Infrastructure) + Track 3 (Agentic Economy)
**Deadline:** May 16, 2026

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SkillMarket                              │
│                                                                 │
│  Creator writes SKILL.md  ──►  Uploads via Studio              │
│                                        │                        │
│                              0G Storage (SKILL.md)             │
│                              0G Chain (SkillRegistry.sol)       │
│                                        │                        │
│  Buyer browses Marketplace ──► Selects Skill ──► Chat Session   │
│                                        │                        │
│                              Claude reads SKILL.md as context   │
│                              Responds with expert logic         │
│                                        │                        │
│                              0G Chain: executeSkill()           │
│                              80% creator / 20% platform         │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS + wagmi + RainbowKit |
| AI Engine | Anthropic Claude API (`claude-sonnet-4-6`), SKILL.md injected as system context with prompt caching |
| Smart Contract | Solidity on 0G Chain — SkillRegistry.sol (skill registration + 80/20 royalty split) |
| Storage | 0G Storage — SKILL.md files (local SQLite fallback for demo reliability) |
| Backend | Node.js + Express + better-sqlite3 |
| Auth | Web3 wallet connect (RainbowKit) |

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
cp .env.example apps/backend/.env
# Fill in: ANTHROPIC_API_KEY, PLATFORM_PRIVATE_KEY, SKILL_REGISTRY_ADDRESS
```

### 3. Deploy the contract (0G Galileo Testnet)
```bash
# Get testnet tokens from https://faucet.0g.ai
pnpm contracts:deploy:testnet
# Copy the deployed address to apps/backend/.env → SKILL_REGISTRY_ADDRESS
```

### 4. Start development
```bash
pnpm dev          # starts both frontend (5173) and backend (3001)
```

### 5. Seed demo skills
```bash
# With backend running:
pnpm seed
```

## Project Structure

```
skillmarket/
├── apps/
│   ├── frontend/           # React + Vite
│   │   └── src/
│   │       ├── pages/      # Marketplace, SkillDetail, Chat, Studio, Dashboard
│   │       ├── components/ # Navbar, SkillCard, ChatWindow, StarRating, etc.
│   │       ├── lib/api.ts  # Backend API client
│   │       └── config/     # wagmi + 0G chain config
│   └── backend/            # Node.js + Express
│       └── src/
│           ├── routes/     # skills, chat, payments, ratings, dashboard
│           ├── services/   # claudeService, storageService, contractService
│           └── db/         # SQLite schema
├── contracts/
│   └── src/
│       └── SkillRegistry.sol  # On-chain skill registry + royalty split
└── scripts/
    └── seed-skills.ts      # Pre-seed 5 demo skills
```

## SKILL.md Format

```markdown
---
name: vietnam-freelancer-tax
description: Advises Vietnamese freelancers on personal income tax.
author: Sarah Nguyen CPA
price_per_use: 0.50
version: 1.0
---

# Skill Title

## When to use this skill
...

## Approach
1. Step one
2. Step two

## Rules
- Important constraint
```

**Required fields:** `name`, `description`
**Minimum price:** $0.10/run

## 0G Integration

| 0G Component | SkillMarket Use |
|---|---|
| **0G Storage** | SKILL.md files stored as content-addressed blobs |
| **0G Chain** | SkillRegistry.sol — every run triggers `executeSkill()` |
| **On-chain royalty** | 80% creator / 20% platform, auto-split per message |

### Smart Contract (SkillRegistry.sol)
- `registerSkill()` — creator registers skill with storage hash + price
- `executeSkill()` — platform calls this per Claude response, pays creator 80%
- `withdraw()` — creator pulls accumulated earnings
- `rateSkill()` — buyer rates 1–5 stars on-chain

## API Endpoints

```
POST /api/v1/skills/upload       Upload + validate + store SKILL.md
GET  /api/v1/skills              List marketplace skills
GET  /api/v1/skills/:id          Skill detail + ratings
POST /api/v1/chat/session        Start chat session
POST /api/v1/chat/message        Stream Claude response (SSE)
POST /api/v1/payments/topup      Add credits (mock Stripe)
GET  /api/v1/payments/balance    Credit balance + pending earnings
POST /api/v1/ratings             Rate a skill
GET  /api/v1/dashboard           Creator earnings dashboard
```

## Demo Flow

1. **Creator:** Connect wallet → Skill Studio → paste SKILL.md → Publish (stores on 0G, registers on-chain)
2. **Buyer:** Browse Marketplace → Select skill → Start Chat → Ask question → See streaming response + 0G tx
3. **Creator Dashboard:** View total runs, earnings, and on-chain withdrawal balance

## Deployed Contracts

| Contract | Address | Network |
|---|---|---|
| **SkillRegistry** | [`0xA02127D1c30541C38abe5Def7b5474D91bAc176c`](https://chainscan-galileo.0g.ai/address/0xA02127D1c30541C38abe5Def7b5474D91bAc176c) | 0G Galileo Testnet (Chain ID 16602) |

**Platform wallet:** `0x559593F3D5A26a506A5d6c88a8519ECEf947674C`

Every skill execution triggers an `executeSkill()` transaction — visible on the [0G Explorer](https://chainscan-galileo.0g.ai/address/0xA02127D1c30541C38abe5Def7b5474D91bAc176c).

## Hackathon Submission

- [x] 0G testnet contract deployed — `0xA02127D1c30541C38abe5Def7b5474D91bAc176c`
- [x] Every skill execution triggers an on-chain royalty transaction
- [x] SKILL.md stored on 0G Storage with content hash registered on-chain
- [x] Demo video: Upload → Marketplace → Chat → On-chain payment
- [x] 30-word description: *"A marketplace where experts upload SKILL.md files, buyers chat with AI agents powered by those skills, and creators earn on-chain royalties via 0G every time their skill runs."*
