# Agent roles in the build

This file records who did what while building ComeCollectZA. It covers people and AI agents in the development process. The product itself does not contain any agent that acts on users' behalf. Its AI features are listed in [MODELS.md](MODELS.md).

## Roles

| Role | Held by | Responsibilities | Limits |
|---|---|---|---|
| Product owner | Sibusiso Khumalo | Chooses features and scope, approves pushes and submissions, owns the Sonke entry | Final say on every decision that affects the submission |
| Lead engineer | Claude Code sessions (Opus 5.5 for design-heavy work) | Plans architecture, writes and changes code on feature branches, runs checks | Commits and pushes only when asked. Works on feature branches |
| Research analyst | Claude Code sessions (Sonnet 5.5) | Finds and checks facts: prices, policy, competitors, model licences and free-tier limits. Cites sources | Reports what the sources say, including gaps. Does not invent figures |
| Idea critic | Claude Code sessions | Scores ideas against the judging criteria and tests feasibility | Scores are judgement, labelled as such |
| QA tester | Claude Code sessions (Haiku 5.5 for routine runs) | Runs typecheck and build, starts a local server, checks routes and layouts at phone width, drives forms and flows in the browser | Reports failures with the output. Does not hide them |
| Documentation keeper | Claude Code sessions | Keeps the plan, architecture, models, handover and build log current | Updates the build log with each decision |
| Release operator | Claude Code sessions, at the product owner's request | Creates branches, commits, pushes and opens pull requests | Pushes only on instruction. Never pushes to `main` directly after the first scaffold |

## Who did what, by phase

| Phase | Dates (2026) | Work | Roles |
|---|---|---|---|
| Hackathon research | 18 Oct | Challenge, criteria, judges, FNB direction, Sonke rules | Research analyst, product owner |
| Idea generation and scoring | 18 to 19 Oct | Eight rounds of ideas, scoring against seven criteria, feasibility checks | Idea critic, product owner |
| Team profile | 20 Oct | Positioning check against industry programmes, fresh data, Sonke form | Research analyst, lead engineer, product owner |
| Build plan | 20 Oct | Architecture, data model, API contracts, models, UI system, feasibility | Lead engineer, research analyst |
| Scaffold | 20 Oct | Next.js app, design tokens, screen shells, schema, seed, sales route | Lead engineer, QA tester |
| Verification | 20 Oct | Install, typecheck, build, route checks, sell-flow test, money screen fix | QA tester |
| Repository | 21 Oct | Repo setup, documentation, first push | Documentation keeper, release operator |

## Model use in the build

| Model | Used for | Notes |
|---|---|---|
| Claude Opus 5.5 | Architecture, planning, critique, design-heavy code | Chosen for judgement-heavy work |
| Claude Sonnet 5.5 | Research, feature code, scoring | Used for most day-to-day work |
| Claude Haiku 5.5 | Routine checks and file edits | Chosen for speed on simple tasks |

These models are development tools. They are not in the product, and the product calls none of them.

## Branches and reviews

- Every feature gets a branch named `feature/<area>-<short-name>`.
- The product owner reviews each pull request before it merges to `main`.
- Agents record each merged change in [BUILD_LOG.md](BUILD_LOG.md).

## Rules for any agent working in this repo

1. Read [HANDOVER.md](HANDOVER.md) before starting.
2. Work on a branch. Ask before pushing.
3. Never put secrets in git. Use `.env.local` for local values.
4. Use only free, open-source models in the product.
5. Store money in integer cents and weight in integer grams.
6. Label demo data as demo data.
7. Run `npm run typecheck` and `npm run build` before asking for review.
8. Write what changed and what was not verified.
