# Output Format Catalogue

Pick the format that fits the use case, then optimise the roadmap for it. The
format is a delivery target, not a wrapper — a dashboard must be genuinely
interactive, a handout must be genuinely printable, a Markdown guide must have a
real information architecture.

| Format | Best use case | Primary benefit | Typical implementation |
| --- | --- | --- | --- |
| Interactive dashboard | Ongoing self-study or team learning | Tracks progress and recommends next actions | Web app, Notion, Airtable, Obsidian canvas |
| Single-slide infographic | Presentation or overview | Fast visual understanding | 16:9 slide, Figma, Canva, PowerPoint |
| One-page handout | Workshops and print study plans | Easy to print, annotate, and share | A4/Letter PDF |
| Web app / learning portal | Portfolio project or internal training | Rich interactions, tracking, resources, reflection | React, Next.js, Vue, Streamlit |
| Notion workspace | Personal knowledge management | Combines roadmap, notes, projects, and journal | Databases, templates, relations, views |
| Markdown / GitHub guide | Technical learning and reproducible work | Version-controlled evidence and documentation | Git repository, README, issues, milestones |
| Spreadsheet tracker | Simple structured progress tracking | Low setup cost, measurable progress | Excel, Google Sheets, LibreOffice Calc |
| Course curriculum | Teaching or cohort learning | Lessons, activities, assessments, pacing | LMS, workshop deck, instructor guide |
| Kanban board | Task-oriented execution | Clear "next action" focus | Trello, GitHub Projects, Jira, Notion board |
| Printable workbook | Guided reflection and exercises | Encourages deliberate practice | PDF with worksheets, checklists, prompts |
| Mobile-first checklist | Learning in short sessions | Fast, frictionless daily progress | Notion mobile, Todoist, web app |
| Knowledge graph | Complex, interconnected subject areas | Shows relationships and prerequisites | Obsidian Canvas, Miro, Whimsical |

---

## A. Interactive Learning Dashboard

**Best for:** digital learning systems, personal knowledge bases, internal training
portals, web applications, progress trackers.

Include:
- A top-level roadmap overview with the four phases.
- Clickable or expandable phase sections.
- Learning-step cards with title, action, status, and resources.
- Progress tracking for each step; completion percentage by phase and overall.
- Filters for phase, difficulty, skill type, tool, project, or completion status.
- A "Start Here" section for the first recommended actions.
- A highlighted "Most Important Early Habit" callout.
- Optional prerequisites/dependencies between steps.
- Optional estimated time or effort per step.
- Optional links to resources, notes, exercises, repositories, or projects.
- A personal learning journal / reflection field per step.
- A portfolio/project evidence section for completed work.

Suggested sections: 1) Welcome / Start Here, 2) Roadmap Overview, 3) Current
Phase, 4) Learning Steps, 5) Important Habit or Common Mistake Callout,
6) Projects and Practice, 7) Progress Tracking, 8) Notes / Reflections /
Debugging Diary, 9) Portfolio Evidence, 10) Next Recommended Action.

## B. Single-Slide Roadmap Infographic

**Best for:** presentations, workshops, course overviews, visual summaries,
one-page posters, shareable learning guides.

Requirements:
- Aspect ratio 16:9.
- Top-to-bottom progression or a gentle winding S-curve.
- All four phases visible.
- Large step numbers; short action-oriented labels.
- Rounded cards and smooth connectors.
- Visually emphasise the highest-value early habit.
- Minimal, glanceable text — no dense paragraphs or excessive detail.

## C. Printable One-Page Handout

**Best for:** study plans, workshops, onboarding packs, self-paced learning,
printable reference sheets.

Requirements:
- Optimised for A4 or US Letter, portrait or landscape.
- Clear headings and phase boundaries; high contrast for print.
- Icons used sparingly; readable in grayscale.
- A checkbox beside each action step.
- A "This Week's Focus" section.
- A "Most Important Habit" highlighted callout.
- Space to write notes, a date, and next actions.
- A compact final checklist showing the desired end-state.

## D. Web App or Interactive Learning Portal

**Best for:** a deployable learning tool, portfolio project, internal enablement
platform, or self-study application.

Provide:
- Page and component structure; navigation hierarchy.
- Wireframe-level layout description.
- User flows for a first-time learner and a returning learner.
- Dashboard views and detailed step views.
- State definitions: not started, in progress, blocked, completed, reviewed.
- A data model/schema for phases, modules, steps, resources, projects, progress,
  notes, and reflections.
- Interactions: expand/collapse, filtering, search, bookmarking, progress updates,
  reminders.
- Accessibility requirements; responsive behaviour (desktop/tablet/mobile).
- Suggested tech stack **only if requested**.

Optional features: auth; multiple roadmaps; personal goals/target dates; streaks;
resource bookmarking; evidence uploads/repo links; export to PDF/Markdown/CSV/
Notion; AI-generated study plans or quizzes; an AI assistant for blocked steps;
pre/post phase skills assessment.

## E. Notion Workspace or Knowledge Base

**Best for:** personal learning systems, second-brain workflows, documentation,
team learning hubs, structured self-study.

Provide:
- A homepage layout.
- Databases: roadmap, learning steps, project portfolio, learning journal /
  debugging diary.
- Recommended database properties.
- Views: Kanban, table, calendar, gallery, timeline, filtered current-week.
- Relations between steps, resources, projects, skills, and reflections.
- Template pages for a learning step, project, weekly review, and problem-solving
  record.
- Formula suggestions for progress, remaining steps, and phase completion.
- A "Start Here" page and a "Next Action" view.

## F. Markdown Documentation or GitHub Repository Guide

**Best for:** developer documentation, open-source learning repos, technical notes,
reproducible learning plans, version-controlled study systems.

Provide:
- Recommended repository structure.
- README structure.
- One Markdown file per phase or module group.
- Learning checklist syntax.
- Links between foundational concepts, exercises, projects, and evidence.
- A troubleshooting / common-mistakes section.
- A progress-tracking method.
- A learning journal / debugging diary template.
- Project templates and completion criteria.
- Suggested issue labels, milestones, and GitHub Project board columns.

Suggested repository structure:

```
/
├── README.md
├── roadmap/
│   ├── phase-1-foundations.md
│   ├── phase-2-problem-solving.md
│   ├── phase-3-practical-capability.md
│   └── phase-4-professional-growth.md
├── projects/
├── exercises/
├── notes/
├── journal/
├── resources/
├── templates/
└── evidence/
```

## G. Spreadsheet or Progress Tracker

**Best for:** structured self-study, weekly planning, measurable progress, course
tracking, lightweight personal project management.

Provide:
- Recommended worksheets/tabs.
- Column definitions.
- Data validation suggestions.
- Progress formulas.
- Conditional-formatting rules.
- A dashboard summary layout and suggested charts.
- A weekly review workflow.
- A project and portfolio evidence tracker.
- A learning journal / issue log.

Suggested tabs: 1) Dashboard, 2) Learning Roadmap, 3) Weekly Plan, 4) Learning Log,
5) Projects, 6) Resources, 7) Skills Matrix, 8) Problem-Solving Diary,
9) Portfolio Evidence, 10) Archive.

## H. Course Curriculum or Workshop Plan

**Best for:** teaching, onboarding, cohort-based learning, self-paced courses,
workshops, bootcamps.

Provide:
- Course overview and target audience.
- Learning objectives per phase.
- Session/lesson sequence.
- Exercises and practical activities.
- Knowledge checks or quizzes.
- Mini-projects and a capstone project.
- Assessment criteria.
- Suggested pacing and duration.
- Instructor guidance.
- Learner deliverables.
- Completion criteria and portfolio outcomes.

---

## Format-specific insert (when keeping the prompt short)

```text
Output Format:
Create the final roadmap as a [SELECTED FORMAT].

The output must be optimized for that format, not merely displayed inside it.

If the selected format is interactive:
- Include navigation, filtering, progress tracking, status states, expandable
  details, and a clear "next action."
- Include data fields for phase, step, difficulty, effort, prerequisites,
  resources, notes, evidence, and completion status.
- Provide responsive and accessible interaction guidance.

If the selected format is static:
- Optimize for immediate visual comprehension.
- Keep text concise.
- Make the learning sequence, phase boundaries, and highest-value early habit
  obvious at a glance.
- Use space, grouping, numbering, and visual hierarchy rather than lengthy
  explanations.

If the selected format is documentation-based:
- Include a clear information architecture, file/database structure, templates,
  metadata, checklists, cross-links, and a method for tracking evidence of
  completed work.

If the selected format is a course or workshop:
- Include learning objectives, sessions, practice activities, assessments,
  learner deliverables, pacing, and completion criteria.
```

## Example format prompts

### Interactive dashboard
Create a responsive dashboard for desktop and mobile. Include a roadmap overview,
phase navigation, expandable learning-step cards, overall and phase-level progress
indicators, filters, a "Start Here" section, a "Next Recommended Action" card, a
learning journal, project evidence links, and a prominently highlighted "Check
This First" habit. For each step include status, difficulty, estimated effort,
prerequisites, practice task, resources, notes, evidence of completion, and review
date. Provide a wireframe-level layout, user flows, component hierarchy,
interaction states, and a suggested data schema.

### Notion workspace
Design the roadmap as a Notion-based personal learning system. Include a homepage,
roadmap database, learning-step database, resource database, project portfolio
database, and debugging/reflection diary. Specify database properties, relations
and rollups, useful views, templates for learning steps/projects/weekly
review/problem-solving logs, formula ideas for progress tracking, a filtered
"Current Focus" view, a "Next Action" view, and a portfolio evidence gallery.

### GitHub / Markdown roadmap
Create a repository-based learning roadmap. Provide a recommended folder
structure, README outline, phase-level Markdown files, progress checklists,
exercise templates, project templates, learning-journal templates, troubleshooting
records, and portfolio evidence pages. Use GitHub Issues, labels, milestones, and
a GitHub Project board. Recommended labels: foundation, practice, debugging,
project, documentation, blocked, review, portfolio.

### Printable A4 workbook
Create a printable beginner workbook with a one-page visual roadmap, phase summary
pages, checklists per step, practice exercises, reflection prompts, a
problem-solving diary, weekly planning pages, project planning templates,
portfolio evidence pages, and a final self-assessment checklist. Keep the layout
understandable in grayscale and leave space for handwritten notes.

### Web application specification
Convert the roadmap into a web application concept for beginners. Provide product
goal, target user, key user journeys, sitemap, page-level requirements, component
hierarchy, data model, user states, responsive design requirements, accessibility
requirements, progress calculation logic, search/filter/bookmark/note features,
project and evidence tracking, optional AI learning-assistant features, and MVP
scope versus future enhancements.
