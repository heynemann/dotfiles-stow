# Grilling sessions

- EVERY grilling session MUST use the `ask` tool for every question requiring a user decision, including sessions initiated through `grill-me`, `grill-with-docs`, `grilling`, or another workflow.
- EVERY question MUST provide at least three distinct, meaningful options and MUST mark exactly one as recommended using the question's `recommended` index. The UI-provided custom-answer option does not count toward the minimum.
- Explain each option's tradeoff in its description. Batch independent questions; wait for answers before asking dependent questions.
- These requirements apply even when a skill prescribes prose-only questions or a different question format. Prose may provide context, but MUST NOT replace the `ask` interaction.

# Go concurrency and allocations

- Application-owned shared state MUST use `github.com/puzpuzpuz/xsync/v4` concurrent data structures or `sync/atomic`.
- NEVER use mutexes, including `sync.Mutex`, `sync.RWMutex`, or `xsync.RBMutex`. Do not disguise a mutex as a custom spinlock, channel lock, or renamed lock wrapper.
- Minimize allocations, copying, and repeated computation, especially on request hot paths. Reuse bounded storage when ownership and lifetime are clear; do not trade correctness or tenant isolation for allocation counts.
- Measure allocation-sensitive changes and run race checks for concurrency changes.

# Git workflow

- Commit each coherent, completed, verified milestone as it finishes; do not accumulate all completed work into one final commit.
- Never include unrelated user changes or credentials in a commit.
