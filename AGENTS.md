# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Version-controlled: Built on Dolt with cell-level merge
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->

---

# OpenSpec Workflow Plugin - Core Commands

This plugin provides a structured workflow for building OpenCode plugins using OpenSpec + bd (beads).

## Command Reference

### /init-workflow

Initialize the workflow environment:
1. Run `bd init --quiet`
2. Run `openspec init --tools opencode`
3. In `openspec/config.yaml` (create if not exists), set language to Chinese (`lang: zh`)

---

### /workflow-explore

**Parameter:** User's requirement/idea

Enter explore mode where the Agent:
1. Analyzes and investigates the requirement
2. Reads project state and communicates with user to clarify the requirement
3. Maintains a markdown draft in `./workflow/drafts/` (English filename, words separated by hyphens, keep brief)

---

### /workflow-propose

**Parameter:** Draft name (optional - if omitted, shows all drafts via question tool)

Convert the draft to OpenSpec documents by calling the corresponding skill.

User can review the generated documents.

---

### /workflow-plan

**Parameter:** Spec change name (optional - if omitted, shows all spec changes via question tool)

Convert spec documents into more detailed plans:
- If requirement is small and spec is detailed enough, plan = spec
- **细化原则**: 步骤粒度达到可独立验证、可执行的程度（每个步骤产出明确、边界清晰）
- Plan steps must reference their Spec source
  - `Spec-task-ref`: Marks completion of a small Spec Task (record the ref)
  - `Spec-ref`: Marks completion of a larger task phase (record the ref)
- Save plan to `.workflow/plans/<spec-change-name>.md`

**Plan Review (自动触发):**
1. 生成完整 plan 后，通过 hook 调起审查方法（plan reviewer Agent）
2. 审查维度：
   - Plan 是否符合 Spec 设计
   - Plan 是否完整可落地
   - Plan 是否有设计错误/缺失会导致开发中断
3. 若有问题，通过 question tool 与用户沟通并修改
4. 审查方法会随使用情况持续调整优化

---

### /workflow-task

**Parameter:** Plan name (optional - if omitted, shows all plans via question tool)

Read the plan and create bd tasks via `bd create`.

**Dependency Management:**
- Use `bd dep add <blocked-task-id> <blocking-task-id>` to manage dependencies
- When plan step has `Spec-task-ref`: create a **Validate** task
  - Validate task is blocked by its corresponding产出任务
  - Validates that the phase output matches the Spec design
- When plan step has `Spec-ref`: also create a larger **Validate** task
  - Validates all output since the last Spec-ref/Validate task conforms to Spec Goal
  - These validate tasks should be handled by a dedicated review agent

**TDD Compliance:**
- All 产出/implementation tasks must be blocked by their corresponding test tasks
  - Write test first → then implement
  - Test task blocks implementation task

**Workflow Metadata:**
- Plugin maintains task and dependency relationships in `.workflow/bd.md`
- Load tasks into memory only when starting execution
- All task/dependency changes sync to bd tracking system

---

### /workflow-start

Read and execute `bd ready` tasks (future: support parallel execution).

**Task Claiming Restriction:**
If Agent tries to claim a different `bd ready` task while in the middle of a workflow, the plugin blocks this and returns an error.

**Validation Task Handling:**
When Agent claims a Validate task:
1. Plugin **pauses Agent execution** immediately
2. Plugin invokes **codeReviewerAgent** to perform verification
3. Verification checks:
   - Phase output matches Spec design (for Spec-task-ref Validate tasks)
   - All output since last Spec-ref conforms to Spec Goal (for larger Validate tasks)
4. After verification completes:
   - **Pass**: Agent proceeds to next task
   - **Fail**: Plugin automatically **reopens all tasks** between the last Spec-task-ref/Spec-ref and the failed validation, then informs Agent of the failure reason and returns to previous task to re-execute sequentially

**Failure Recovery:**
When a Validate task fails:
1. Plugin automatically **reopens all tasks** between the last Spec-task-ref/Spec-ref and the failed validation
2. Requires Agent to return to the previous task and execute sequentially
3. Informs Agent of the validation failure reason

---

## Workflow Diagram

```
/init-workflow
      ↓
/workflow-explore ←→ User (requirement discussion)
      ↓
/workflow-propose
      ↓
/workflow-plan (review by plan reviewer)
      ↓
/workflow-task (creates bd tasks with dependencies)
      ↓
/workflow-start (executes tasks, validates, recovers from failures)
```

## Key Principles

1. **TDD Enforcement**: All implementation tasks must be blocked by their test tasks
2. **Validation Gates**: Validate tasks ensure spec compliance before proceeding
3. **Failure Recovery**: Automatically reopen and re-execute when validations fail
4. **Single Task Focus**: Only one workflow task at a time, no parallel claiming during workflow

<!-- END WORKFLOW PLUGIN -->
