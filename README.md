# dotfiles-stow
GNU Stow version of dotfiles.

## hep UX architect

The `hep` oh-my-pi profile provides the `ux-architect` sub-agent in
`omp/.omp/profiles/hep/agent/agents/ux-architect.md`. GNU Stow exposes it at
`~/.omp/profiles/hep/agent/agents/ux-architect.md`; it is not a default-profile agent.
It inherits the calling session's model and preloads `information-architecture`
and `ux-heuristics`.

Launch `omp --profile hep` and ask, for example:

> Use ux-architect to review the console's sidebar, settings taxonomy, page
> content priorities, and cross-page filter and metric consistency. Recommend
> changes without editing application files.

The agent is advisory by default. Explicitly assign implementation or recording
accepted decisions when needed. It uses the project's existing canonical UX
document (`design.md` for HEPG), rather than creating parallel design documents.
Use a new session to refresh the advertised agent and skill inventory; existing
sessions can discover the agent at task dispatch.

Install or restore its skills only in the isolated profile store:

```sh
cd ~/.omp/profiles/hep/skills-sh
npx skills add julianoczkowski/designer-skills --skill information-architecture -a pi -y
npx skills add wondelai/skills --skill ux-heuristics -a pi -y
```

Verification: both skills were registered by `skills ls -a pi`; a real
`ux-architect` task confirmed skill preloading and exercised a fictional
navigation/filter/metric/draft consistency scenario. This checks setup and role
behavior, not the usability of the live console.

## hep visual design companions

The same profile adds `visual-designer` and `design-system-steward`. Both inherit
the calling model; neither spawns nested agents or approves on the user's behalf.

| Agent | Responsibility |
| --- | --- |
| `ux-architect` | Task flows, navigation/settings, content priorities and interaction semantics. |
| `visual-designer` | Isolated browser-rendered mockups, matched before/after screenshots, and visual acceptance against the approved revision. |
| `design-system-steward` | Shared HEP tokens, fonts, components, package compatibility/releases and cross-product consistency. |

Shared source and local review tooling live in the private
[hep-design-system](https://github.com/hepdevorg/hep-design-system) repository,
normally checked out at `~/src/heporg/hep-design-system`. Its README and
`docs/review-workflow.md` own the actual build/capture/check commands. Start the
loopback-only review studio there and use the web page to approve or request
changes to an immutable proposal revision. A new source/evidence revision
invalidates old approval; a model must never click Approve or fabricate a record.

Example assignment:

> Use ux-architect to define the task and page contract, visual-designer to
> publish an isolated mockup with before/after evidence, and
> design-system-steward to review shared-component impact. Send me the local
> review URL and wait for approval before implementing product UI changes.

All products share one HEP visual identity; the generic visual skills' novelty
advice does not authorize a per-product font, palette or theme. Product UX rules
remain in that product's canonical document; shared visual/component rules
belong in the shared repo. Visual approval does not grant publication, merge or
deployment authority.

Runtime role smokes discovered both agents with their preloaded skills and
confirmed the cross-product consistency and human-approval boundaries. Those
fictional exercises are not live UI or package verification.
