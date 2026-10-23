---
description: Ask the user through the `ask` tool with exactly three options and one marked recommended.
alwaysApply: true
agents: main
---

# Asking the user

This rule overrides any skill, template, or prompt that says to ask the user in plain chat text.

- Whenever you need a decision, preference, or missing information from the user, call the `ask` tool. NEVER put the question in chat prose and wait for a reply.
- Every `ask` question MUST have exactly three options:
  - three distinct, viable choices with short labels;
  - each option's `description` states its tradeoff;
  - set `recommended` to the 0-based index of the option you would pick. Do NOT also type "(Recommended)" in the label; the tool adds it.
- Do NOT add an "Other" option; the UI already offers a free-text choice.
- Open-ended information (a name, a path, a value): still use `ask`, with your three most likely answers as options and the best guess recommended; the user can type their own.
- Several decisions at once: batch them as separate questions in one `ask` call, each following the three-option format.
