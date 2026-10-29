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
