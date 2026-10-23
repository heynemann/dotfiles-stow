# Interview map

The design tree the `grilling` session must cover for one case. Each branch names what an interviewer probes and where the settled answer is written. A branch is **settled** when it holds specifics (names, numbers, the reason behind them), is marked `TBD(<question>)`, or the user confirms it doesn't apply to this system. Ask for numbers wherever a branch has them: "fast", "a lot", or "scalable" is not settled.

Branches unlock in roughly this order: framing and requirements first, because every later answer is judged against them.

| Branch | Probe until you have | Recorded in |
|---|---|---|
| **Framing** | What it does, for whom; why it had to exist (the business driver); my role versus the team's and other teams'; dates; status | README lede, role line |
| **Functional requirements** | Core capabilities; what was explicitly out of scope and why | README › Problem |
| **Non-functional requirements** | Peak and average QPS (reads vs writes); p50/p99 latency targets; data volume and growth; availability/SLO; durability; consistency needs | README › Problem |
| **Constraints** | Team size and seniority; deadline; budget; legacy systems; compliance; platform mandates | README › Problem |
| **Capacity** | Back-of-envelope: storage per day/year, throughput per component, fan-out, peak-to-average ratio, which number sized the system | README › Scale & capacity |
| **Architecture** | Every component and who owns it; stores; sync vs async edges and their protocols; trust boundaries; the main path | `diagrams/architecture.json`, README › Architecture |
| **Data model** | Core entities and relationships; partition/shard key and why; indexes; consistency model per store; retention and deletion | README › Data model |
| **Interfaces** | Key APIs and events; idempotency; pagination; versioning and backward compatibility; contracts with other teams | README › Interfaces |
| **Key flows** | The happy path and the hardest failure path, message by message, with what is sync and what is async | `diagrams/<flow>.sequence.json`, README › Key flows |
| **Decisions** | Every choice an interviewer would ask "why?" about. For each: options, including the one an interviewer would suggest; the deciding force as a constraint or number; cost accepted and how contained; revisit-when; what it replaced | `decisions/D-NN-*.md`, README › Decision log |
| **Scale & performance** | Bottlenecks hit or expected; caching and invalidation; hot keys/partitions; backpressure and load shedding; what breaks first at 10× | README › Scale & capacity, decisions |
| **Reliability** | Each failure: detection, blast radius, mitigation; retries, timeouts, idempotency; degradation modes; disaster recovery (RPO/RTO) | README › Failure modes |
| **Correctness** | Ordering guarantees; exactly-once vs at-least-once; races and how they're prevented; reconciliation | README › Failure modes, decisions |
| **Security & privacy** | AuthN/AuthZ; PII and where it lives; encryption; audit; compliance obligations | README › Operations |
| **Operations** | SLIs/SLOs and alerts; dashboards; deploy and rollout strategy; schema/data migrations; on-call and the worst incident | README › Operations |
| **Cost** | Main cost drivers; cost per unit (order, request, user); optimizations made | README › Operations |
| **Evolution** | How the design changed over time and what forced each change | superseding decisions, README › Hindsight |
| **Collaboration** | Disagreements with other teams or leads, how they were resolved, what I conceded | decisions (Context, Why), README › Interview prep |
| **Results** | Measured outcomes and how they were measured; business impact | README › Results |
| **Hindsight** | What I'd change now and which decision it challenges | README › Hindsight |
| **Presentation** | 2-minute pitch; deep-dive areas to steer toward; the hardest questions and their short answers | README › Interview prep |

Each settled answer opens new branches: a decision can raise its own reliability and cost questions, a store raises data-model questions, an incident raises a decision. Follow them until no branch is left open.
