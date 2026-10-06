---
name: learning-roadmap
description: Use when transforming a source guide, outline, module list, or topic into a beginner-friendly phased learning roadmap. Trigger on "learning roadmap", "beginner roadmap", "learning journey", "study plan", "turn this guide into a roadmap", or when the user asks for one of the output formats (interactive dashboard, single-slide infographic, printable handout, web app spec, Notion workspace, Markdown/GitHub guide, spreadsheet tracker, course curriculum).
---

# Learning Roadmap Builder

Turn a source guide (often a long list of modules) into a simplified, actionable,
step-by-step **beginner learning roadmap** that carries a learner from "complete
beginner" to "confident independent practitioner".

The source guide is the content foundation, but **do not represent every module
equally**. Prioritise clarity, practical action, sequencing, confidence-building,
and real-world application over completeness.

## Inputs

Establish these before writing.

| Input | Meaning | Default if unstated |
| --- | --- | --- |
| Source guide | The file/guide/outline to transform | The document the user referenced |
| Topic / Role | e.g. "Problem Solving in Digital Industry", "Algo Trading Developer" | Derived from the source title |
| Target learner | Who the roadmap is for | "A complete beginner" |
| Output format | See `reference/output-formats.md` | Ask (it drives the whole artifact) |
| Target level | Depth/end state | Beginner → independent practitioner |
| Save location / filename | Where the artifact is written | Beside the source guide, suffixed `_roadmap` |

### Interactive intake

Gather missing inputs with the **`question` tool** rather than assuming. This is
the preferred behaviour whenever the skill triggers from a bare request such as
"make me a roadmap".

1. **Pre-scan first.** Use `glob`/`grep` to find likely source guides (e.g.
   `**/*guide*.md`, `**/outline.md`, `**/*.md` near the topic) and use the
   discovered paths as options for the source-guide question.
2. **Ask in one batched call.** Put all the questions in a single `question` tool
   invocation (it accepts multiple questions). Only include what is genuinely
   unknown — skip anything the user already stated.
3. **Offer concrete options, not blanks.** Provide recommended defaults and let
   the user pick or type their own:
   - *Source guide* — the discovered candidate files.
   - *Topic / Role* — derived title (recommended) plus a few alternatives.
   - *Target learner* — "Complete beginner" (recommended), career changer,
     student, working professional, team cohort.
   - *Output format* — Interactive dashboard, Single-slide infographic, Printable
     handout, Web app spec, Notion workspace, Markdown/GitHub guide, Spreadsheet
     tracker, Course curriculum (mark the one best suited to the stated use case
     as recommended).
   - *Target level* — "Beginner → independent practitioner" (recommended) or a
     specific end goal.
   - *Save location / filename* — the proposed default path.
4. **Confirm, then build.** After the answers, state a one-line summary
   ("Building a *Printable handout* roadmap for *Algo Trading Developers* from
   `<path>`") and proceed without asking again unless something conflicts.
5. **Degrade gracefully.** If the `question` tool is unavailable (e.g. running as
   a subagent without it), fall back to the defaults above, state the assumptions
   you made, and continue.

## Core outcome

The roadmap must communicate this progression:

> "Complete beginner" → "Understands the foundations" → "Can diagnose and solve
> common problems" → "Can build and validate practical work" → "Has a repeatable
> workflow, documented learning, and portfolio evidence."

A learner should immediately understand: where to start; what to learn next;
which skill/habit matters most early; how each phase builds practical capability;
and what they will be able to do at the end.

## Workflow

0. **Gather inputs** (see *Interactive intake* above). Pre-scan for source guides,
   ask for anything missing in one batched `question` call, and confirm a one-line
   summary before generating.
1. **Read the source guide fully.** Identify its natural modules, themes, and the
   logical order of skill acquisition. Note anything that is prerequisite to
   something else.
2. **Determine the output format.** Confirm or select the format from
   `reference/output-formats.md`. The output must be *optimised for that format*,
   not merely displayed inside it.
3. **Map modules into four phases** (see below). Compress, merge, and reorder —
   do not preserve one-to-one module mapping if it hurts the journey.
4. **Identify the single highest-value early habit / safety check / misconception
   to avoid.** Make it a visually dominant callout. This is a hard requirement.
5. **Write each learning step** using the step format below. Prefer action-oriented
   titles over formal module/unit/chapter labels.
6. **Apply the visual, tone, and accessibility guidance** appropriate to the format.
7. **Run the final quality check** at the end of this file.
8. **Write the artifact.** When saving to disk, place it beside the source guide
   and suffix the filename with `_roadmap` (e.g.
   `problem-solving-in-digital-industry_roadmap.md`). For multi-file outputs
   (repository, workbook, web app), create the agreed structure and a top-level
   entry point (README or index).

## Phased structure

Adapt phase titles and step counts to the topic, but keep four phases.

### Phase 1 — Foundations
Why the field matters; essential concepts and terminology; the overall system,
workflow, or lifecycle; fundamental tools and working environment; core
reasoning, planning, and structured-thinking habits.

### Phase 2 — Core Problem-Solving Skills
Diagnosing issues; reproducing problems; forming and testing hypotheses;
root-cause analysis; common beginner mistakes; validating assumptions; a basic
troubleshooting workflow.

> **Critical requirement.** Surface the single most valuable early habit, safety
> check, quality check, or misconception to avoid. Present it as a visually
> dominant callout labelled one of: **"Check This First"**,
> **"Highest-Value Early Habit"**, or **"Common Mistake to Avoid First"**.
> Explain it in one short, practical action statement.

### Phase 3 — Building Practical Capability
Building real work; applying tools and techniques; quality assurance, testing,
validation, or review; performance, maintainability, safety, security, and
reliability where relevant; version control, documentation, and collaboration
where relevant; improving or maintaining existing work.

### Phase 4 — Professional Practice and Growth
Critical use of AI and automation tools; communication and collaboration;
documentation and reflection; prioritisation and triage; realistic project work;
portfolio development; a repeatable personal workflow; continuing education and
professional growth.

## Learning step format

For every step provide:

- **Step Number** — clear and sequential.
- **Phase** — which of the four phases it belongs to.
- **Title** — bold, action-oriented, plain language. Prefer "Map the Whole
  Workflow", "Reproduce the Problem", "Test Before Adding Complexity",
  "Turn Your Work into Portfolio Evidence". Avoid "Module IV: Applied Analysis",
  "Unit 7: Technical Implementation", "Chapter 12: Operational Considerations".
- **Action** — one encouraging, concrete instruction of ~6–15 words.
- **Why It Matters** — one concise sentence of practical value.
- **Practice Activity** — one beginner-appropriate exercise, mini-task, or deliverable.
- **Evidence of Completion** — a tangible artifact: diagram, checklist, small
  project, repository, written reflection, test result, screenshot, case study,
  portfolio entry, presentation, or documented solution to a real problem.
- **Suggested Icon** — one simple, consistent icon.
- **Suggested Metadata** — difficulty (Beginner/Intermediate/Advanced); estimated
  effort (Short/Medium/Deep); prerequisites; tools/skills used; status (Not
  started/In progress/Blocked/Completed/Reviewed); related project; related
  resource; review date.

## Visual and interaction design system

Use this unless the chosen format requires otherwise.

- **Background:** warm, light, inviting, low visual noise — soft off-white, cream,
  or a similar approachable neutral.
- **Phase colours:** one muted accent each — Phase 1 soft blue, Phase 2 sage green,
  Phase 3 warm amber, Phase 4 dusty purple.
- **Cards:** rounded, subtle shadow, clear hierarchy, generous padding, readable type.
- **Connectors:** smooth arrows or clear directional indicators showing the path.
- **Decision points:** where a real diagnostic/workflow branch exists, show a small
  diamond node with labelled paths, e.g. "Can you reproduce the issue?" →
  Yes/No; "Does the result meet the requirement?" → Yes/Improve; "Is the work
  validated?" → Publish/Test Again.

**Accessibility** (mandatory for interactive/visual outputs): strong text
contrast; never rely on colour alone to convey phase or status; readable font
sizes; labels alongside icons; keyboard navigation for interactive outputs;
responsive layouts; text-plus-icon status indicators.

## Beginner-friendly tone

Assume the learner is new, may feel overwhelmed, needs sequencing and visible
progress, learns through small tasks, benefits from knowing *why*, and wants
tangible evidence of improvement.

**Avoid:** dense jargon; academic explanations; long theory; rigid intimidating
flowcharts; treating every module as equally important; assuming professional
experience.

**Prefer:** short action verbs; small achievable milestones; concrete practice;
visible progress; encouragement to document mistakes and lessons; projects that
become portfolio evidence.

## Output formats

The detailed specification for each format (interactive dashboard; single-slide
infographic; printable handout; web app / learning portal; Notion workspace;
Markdown / GitHub guide; spreadsheet tracker; course curriculum; plus the
recommended-formats table and ready-made format prompts) lives in
`reference/output-formats.md`.

Read that file, pick the relevant format, and follow its requirements. If the
requested format is not listed, adapt the closest one or design a suitable format
that preserves the phased journey, the step format, and the early-habit callout.

## Final quality check

Before finalising, verify the output:

- [ ] Has a clear starting point.
- [ ] Follows a logical beginner-to-practitioner sequence.
- [ ] Groups content into four understandable phases.
- [ ] Highlights one highest-value early habit, safety check, or mistake to avoid.
- [ ] Converts concepts into concrete actions.
- [ ] Includes practical exercises and completion evidence.
- [ ] Avoids overwhelming the learner.
- [ ] Matches the requested output format (optimised for it, not just inside it).
- [ ] Is visually scannable and easy to navigate.
- [ ] Ends with a repeatable workflow, documented learning, and portfolio-ready work.
