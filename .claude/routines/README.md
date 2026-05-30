# Routine Prompt Library

This folder contains reusable building blocks for Claude Code routines.
Instead of embedding logic inline in the claude.ai/code UI, routines load these files at runtime — keeping prompts short, diffable, and composable.

## Structure

```
.claude/routines/
├── README.md              ← you are here
├── shared/
│   ├── app-context.md     ← what KinkSync is, tech stack, localStorage key
│   ├── boot.md            ← how to start the dev server reliably
│   └── assertions.md      ← reusable UX assertion checklist
└── personas/
    ├── nova.md            ← brand-new user, empty localStorage
    ├── jordan.md          ← experienced user, pre-seeded state
    ├── sam.md             ← submissive persona for UX audit
    └── dana.md            ← dominant persona, imports Sam, triggers contract flow
```

## Usage in a routine prompt

```
Read the following files before starting:
- .claude/routines/shared/app-context.md
- .claude/routines/shared/boot.md
- .claude/routines/personas/nova.md

Then follow the nova.md instructions exactly.
```

Compose freely — a single routine can load multiple personas for multi-user flows.
