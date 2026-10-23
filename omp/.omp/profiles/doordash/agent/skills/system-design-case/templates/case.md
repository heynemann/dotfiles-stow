# <System name>

> One sentence: what it does, for whom, at what scale.

**My role:** what I owned versus what the team owned. **When:** <dates>. **Status:** in production | retired | proposal.

## Problem

- **Functional:** the core capabilities.
- **Non-functional:** peak QPS, p99 latency, data volume and growth, availability target.
- **Constraints:** team size, deadline, legacy systems, compliance, budget.

## Scale & capacity

Back-of-envelope numbers (storage, throughput, fan-out, peak-to-average), which one sized the system, and what breaks first at 10×.

## Architecture

[Interactive diagram](diagrams/architecture.html). Walk the main path in 3–5 sentences.

## Key flows

| Flow | Diagram | Why it matters |
|---|---|---|
| <flow> | [sequence](diagrams/<flow>.sequence.html) | <what it proves> |

## Data model

Core entities, partition/shard keys and why, indexes, consistency per store, retention.

## Interfaces

Key APIs and events: idempotency, versioning, contracts with other teams.

## Decision log

| ID | Decision | Deciding force | Cost accepted |
|---|---|---|---|
| [D-01](decisions/D-01-<slug>.md) | <choice> | <constraint or number> | <what got worse> |

## Failure modes

| Failure | Detection | Blast radius | Mitigation |
|---|---|---|---|
| <what breaks> | <signal> | <who is affected> | <response> |

## Operations

- **Observability:** SLIs/SLOs, alerts, dashboards.
- **Delivery:** deploy and rollout strategy, migrations.
- **Security:** authN/authZ, PII, compliance.
- **Cost:** main drivers, cost per unit.

## Results

Measured outcomes, with numbers and how they were measured.

## Hindsight

What I'd change knowing what I know now, and which decision it challenges.

## Interview prep

- **2-minute pitch:** problem, shape, the one hard part, result.
- **Deep-dive menu:** the areas I steer toward, each linked as `[D-NN](diagrams/architecture.html#focus=<anchor-id>)`.
- **Hard questions:** question → short answer → record link.
