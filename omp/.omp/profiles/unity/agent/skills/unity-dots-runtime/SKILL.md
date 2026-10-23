---
name: unity-dots-runtime
description: Implement and review Unity 6.6 ECS/DOTS gameplay safely. Use for Entities components and systems, authoring and baking, worlds and scene streaming, Jobs/Burst dependencies, ECB structural changes, native-memory ownership, DOTS physics, C# compatibility, and EditMode/PlayMode verification.
---

# Unity 6.6 DOTS runtime engineering

Use this skill before `unity-ecs-patterns` for ECS implementation or review. The Unity profile's sticky rules and the project's actual package contracts govern applicability; upstream examples are references, not permission to migrate architecture or install dependencies.

## Establish the real target

1. The user's intended Editor is **Unity 6.6 (6000.6)**. Read `ProjectSettings/ProjectVersion.txt` for the exact project version. If it differs, report the mismatch; do not upgrade it automatically. Without a project, use 6.6 as the planning target, not as proof an Editor is installed.
2. Read `Packages/manifest.json` and `Packages/packages-lock.json` for the resolved Entities, Burst, Collections, Mathematics, Entities Graphics, Input System, Test Framework, and physics dependencies relevant to the task. Inspect relevant `.asmdef` files, scripting backend, API compatibility, rendering pipeline, and target platform.
3. Resolve API details from the installed package source and its matching documentation. The community gameplay skills target 6.3; do not copy their version-specific APIs into 6.6 unchecked. The installed desktop .NET SDK does not determine Unity's compiler or supported runtime APIs.
4. Inspect existing component/system patterns, system groups and ordering, world bootstrap, authoring/bakers, SubScenes, and managed presentation bridges. Reuse these boundaries. Preserve intentional `ISystem` or `SystemBase` conventions rather than converting them mechanically.

## Keep simulation data-oriented

- Put gameplay/simulation state in ECS components and processing in ECS systems. Keep components small, coherent, and appropriate to their access patterns; distinguish per-entity state, singleton data, shared components, buffers, and immutable blob data.
- MonoBehaviours remain appropriate for authoring, UI, and explicit managed/presentation bridges. Do not create per-entity `Update` behaviour to bypass ECS. ScriptableObjects can supply authoring/configuration data; explicitly bake the runtime representation rather than sharing mutable asset state as the simulation's source of truth.
- Prefer unmanaged, Burst-compatible paths where supported and useful. Do not force every system or operation into Burst, assume `ISystem` is always faster, or introduce Aspects or Jobs merely because an upstream skill recommends them. Check installed-package support and follow measured needs.
- Avoid unnecessary managed allocations, boxing, repeated queries/lookups, copies, and enumerable materialization in hot loops. Native allocation is also work: reuse capacity when safe, and document ownership and lifetime. Do not claim a performance gain without comparable profiler evidence.
- System order, update group, fixed-step timing, and multi-world ownership are part of correctness. Do not rely on accidental discovery order or a default world when the project explicitly uses another world.

## Authoring, baking, and assets

- Use the installed Entities package's baker and transform-usage APIs. Declare dependencies on authoring data/assets so rebaking reacts correctly. Keep runtime code out of Editor-only assemblies and isolate Editor APIs from player assemblies.
- Account for baking-world versus runtime-world state, SubScene loading/unloading, prefab instantiation, and entity destruction. Do not retain an entity reference across world destruction or assume it remains valid after unloading.
- Treat blob assets as immutable. Follow the package's baking/runtime ownership rules; do not dispose data owned by baking or another system. Dispose only allocations this code owns, after their last reader completes.
- Preserve asset `.meta` files and GUIDs. Use a connected Editor and asset APIs for scene/prefab/asset changes when available. Do not fabricate fileIDs, GUIDs, or a fake Editor connection. Supporting `unity-cli` and `unity-package-management` skills provide the tooling workflow, not automatic authorization to install it.

## Jobs, dependencies, and structural changes

- Identify every job's component/native-container read and write sets. Make the dependency chain explicit, including non-ECS containers; propagate returned handles into the owning system's dependency or its package-specific equivalent.
- Mark read-only access accurately. Refresh cached type handles/lookups as required by the installed API. A safety attribute is not a substitute for proving disjoint writes; do not disable safety checks to conceal a race.
- Use entity command buffers for structural changes from jobs. Select an appropriate playback phase, preserve its dependency contract, and use the installed package's parallel-writer API and ordering keys where needed. Record when consumers can observe the change.
- Structural changes can invalidate references, buffers, and query assumptions. Do not hold such references across playback or an immediate structural mutation. Use enableable components when appropriate to avoid unnecessary structural churn, not as a mandatory replacement for every add/remove.
- Avoid gratuitous `Complete()` calls and main-thread sync points. Complete when ownership transfer, teardown, or a genuine synchronous consumer requires it; correctness takes precedence over parallelism.
- Choose allocators for the real lifetime. Keep temporary allocations within their allowed scope; dispose persistent allocations and owned ECBs once, after all dependent jobs finish. Do not dispose package-owned resources.

## Physics, input, and managed boundaries

- Determine whether the project uses DOTS `Unity.Physics`, Havok, or classic PhysX. Preserve that choice and use its matching world, events, scheduling, and query APIs. MonoBehaviour `OnCollisionEnter` advice does not apply to DOTS collision-event jobs.
- Capture managed input through the existing Input System bridge, then transfer intent into ECS with an explicit update/tick boundary. Preserve project conventions for fixed-step simulation; do not multiply values by delta time when the receiving API already integrates time.
- Access UnityEngine object APIs on the main thread unless that exact API explicitly supports another thread. Keep managed references out of Burst jobs. Marshal results back through the project's existing bridge.
- Cancel or finish owned asynchronous work when its object, scene, system, or world ends. Unsubscribe event handlers and reset bridge state across disable/enable and pooling. Avoid fire-and-forget work with unobserved failures.
- Account for UnityEngine destroyed-object null semantics, supported field serialization, and domain-reload-disabled Play mode. Reset owned static/runtime state explicitly where needed; do not assume an `OnEnable` callback always means a fresh play session.

## Verification workflow

1. For a bug, reproduce the reported path before editing when possible; never rerun solely to dispute a user-reported failure.
2. Import/compile through the target Unity Editor, then exercise the actual changed simulation in its relevant world and scene. Observe component/state transitions, input or collision results, and the Console. Entering Play mode alone is not proof: confirm frames/ticks advance and the requested behavior occurs.
3. Use Unity Test Framework's installed NUnit/UnityTest APIs for Unity-dependent tests. Choose EditMode for isolated data/baking/editor behaviour and PlayMode for frame, world, physics, or streaming transitions as appropriate. Follow the project's actual runner and assembly conventions; do not substitute an SDK test project or `dotnet test` for Unity execution.
4. Keep tests deterministic and isolated. Fixtures must complete their jobs and dispose their owned worlds/native allocations without modifying a global project world. Cover observable state, ordering/lifetime boundaries, and relevant failure cases, not wiring or copied implementation text.
5. For performance work, compare the same scenario, entity count, build/configuration, and hardware. Inspect Unity Profiler data for allocation, job dependencies, sync points, structural-change cost, and frame time. Burst compilation and player-backend behaviour must be verified on the relevant target, not inferred from desktop .NET benchmarks.
6. If no usable Unity runtime/project is available, finish reachable work and report exactly what was exercised and what was not. Never claim PlayMode, Burst, physics, or player-build verification based on static inspection.

## Primary references

- Unity 6.6 Manual: https://docs.unity3d.com/6000.6/Documentation/Manual/
- Entities documentation entry point: https://docs.unity3d.com/Packages/com.unity.entities@latest/ (resolve the installed version before applying APIs).
- Burst documentation entry point: https://docs.unity3d.com/Packages/com.unity.burst@latest/ (resolve the installed version).
- Unity Test Framework entry point: https://docs.unity3d.com/Packages/com.unity.test-framework@latest/ (resolve the installed version).

## Related installed skills

- `unity-ecs-patterns`: worked DOTS examples; validate them against the installed package contracts.
- `unity-cli`: Editor discovery/control, build/test tooling, and runtime observation.
- `unity-package-management`: UPM discovery and approved package changes.
- `unity-input-system`, `unity-csharp-scripting`, `unity-scriptableobjects`: authoring and managed integration boundaries, not replacement simulation architecture.
- `test-anti-patterns`: read-only test-quality review; Unity frame yields are not automatically flaky wall-clock sleeps.

## Profile setup and activation

This skill is local to the `unity` omp profile. Seven upstream skills live in `~/.omp/profiles/unity/skills-sh/.agents/skills`; their sources and content hashes are recorded in that store's `skills-lock.json`. This local skill lives in `~/.omp/profiles/unity/agent/skills`.

The profile also provides native `unity-dots-gameplay` and read-only `unity-dots-reviewer` agents under `agent/agents`, and sticky architecture/version/safety rules in `agent/RULES.md`. Both agents use the existing default model role; no new model provider is required.

Start a new session with `omp --profile unity` to load the full skill catalog and rules. Invoke a skill explicitly with `/skill:unity-dots-runtime`, or request the named specialists for appropriately scoped work. Profile setup does not install Unity packages, Pipeline/MCP, Editors, or CLI updates.

Setup verification (2026-10-11): a fresh native RPC startup discovered all eight added skills plus the existing `find-skills`, registered their skill commands, exposed both agents with the reviewer classified read-only, and injected the Unity 6.6 sticky rules. This verifies assistant-profile loading, not game runtime, Editor connectivity, Burst compilation, or PlayMode behaviour.
