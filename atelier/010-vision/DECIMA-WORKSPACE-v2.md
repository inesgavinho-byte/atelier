---
id: DECIMA-WORKSPACE-v2
title: DECIMA Workspace — Foundational Architecture v2
version: v2.0
status: Draft
owner: Inês Gavinho
created: 2026-06-29
updated: 2026-06-29
depends_on:
  - AT-0001
impacts:
  - Product
  - Development
  - Agent Architecture
---

# DECIMA Workspace — Foundational Architecture v2

## Vision

DECIMA Workspace is the daily operating environment for humans.

It is where people think, write, design, develop software, analyse documents, collaborate and make decisions.

It is not where knowledge lives.

Knowledge belongs to DECIMA.

Everything that happens inside DECIMA Workspace continuously feeds DECIMA.

## The Platform

```text
Human

↓

DECIMA Workspace

↓

Spaces

↓

Projects

↓

Sessions

↓

Documents
Readings
Images
Emails
Meetings
Captures
Decisions
Artifacts

↓

Processing Pipeline

↓

DECIMA

↓

DECIM001
```

The Workspace is the operating environment.

DECIMA is the cognitive platform.

DECIM001 is the Cognitive Engine.

## DECIMA

DECIMA is not an application.

DECIMA is the cognitive infrastructure.

Its responsibilities are:

- preserve memory;
- organise information;
- extract knowledge;
- discover relationships;
- accumulate judgement;
- recognise patterns;
- learn continuously.

DECIMA becomes progressively more valuable every day.

## DECIMA Workspace

Workspace is the environment where work happens.

Examples:

- software development
- architecture
- writing
- project management
- image generation
- meetings
- research
- document review

Humans work.

DECIMA learns.

## Spaces

A Space represents an operational context.

### Examples

- GAVINHO
- DECIMA
- PAPERS
- NUDO
- Personal

A Space is not a database.

A Space is not a silo.

A Space is simply the environment where a team collaborates.

### Ownership

Everything created inside a Space belongs to that Space.

Never to the individual user.

This includes:

- Sessions
- Documents
- Images
- Decisions
- Artifacts
- Code
- Knowledge generated

When someone leaves the company:

- nothing disappears;
- conversations remain;
- documents remain;
- decisions remain;
- knowledge remains.

The organisation owns the work.

### Members

Every Space contains members.

Example

```text
Owner

Admins

Members

Guests
```

Permissions define visibility.

Never ownership.

## Projects

Projects belong to Spaces.

Example

```text
Space

GAVINHO

↓

Projects

GA00462

GA00433

GA00491
```

```text
Space

DECIMA

↓

Projects

Workspace

DECIM001

Runtime

Website

Observer
```

Projects become the operational unit.

## Sessions

A Session replaces the traditional AI chat.

Every Session has:

- objective
- provider
- model
- Skill
- context
- outputs

Sessions always belong to the Project.

Projects belong to the Space.

### Visibility

A Session has two visibility modes.

#### Team Session

Visible to everyone in the Space.

Everyone can participate.

Humans.

LLMs.

Future autonomous workers.

#### Private Session

Visible only to the creator.

However:

Everything generated continues belonging to the Space.

Knowledge extraction happens immediately.

Only visibility changes.

Changing a session from Private to Team simply changes permissions.

Nothing is copied.

Nothing is promoted.

Nothing changes ownership.

## Timeline

Every Project owns one continuous Timeline.

Everything appears there.

Sessions.

Documents.

Readings.

Emails.

Meetings.

Commits.

Deployments.

Images.

Artifacts.

Decisions.

The Timeline becomes the project's permanent memory.

## Documents

Every Space owns a document library.

Every upload follows exactly the same ingestion pipeline.

```text
Original File

↓

Permanent Storage

↓

OCR

↓

MarkItDown

↓

Markdown

↓

Chunking

↓

Knowledge Extraction

↓

Relationship Extraction

↓

Indexing

↓

Space Knowledge

↓

DECIMA
```

Nothing is discarded.

Original files remain.

Markdown remains.

Extracted knowledge remains.

Relationships remain.

### Why MarkItDown?

LLMs should never process huge PDFs directly.

Instead:

```text
PDF
↓
Markdown
↓
Knowledge Extraction
↓
Relevant Sections
↓
LLM
```

Benefits:

- lower token usage
- deterministic processing
- reusable markdown
- permanent searchable archive
- consistent ingestion

The Markdown becomes the canonical processed document.

### OCR

Supported inputs:

- PDF
- scanned PDF
- Word
- PowerPoint
- Excel
- Images
- Screenshots
- Photos

Every file enters the same ingestion pipeline.

### Document Library

Every Space contains:

Original Documents

Processed Markdown

Extracted Knowledge

Relationships

Artifacts

Everything remains permanently linked.

Whenever an LLM needs additional context it can retrieve the Markdown instead of reprocessing the original PDF.

## Readings

Readings exist at two levels.

### Global Reading Inbox

Everything captured from:

- browser
- Instapaper-like clipping
- Telegram
- Email
- Mobile

appears here.

### Space Reading Library

Each Space contains its own curated library.

A Reading may belong to multiple Spaces simultaneously.

No duplication exists.

Only relationships.

## Images

Image generation becomes part of the AI Runtime.

Not another application.

### Workflow

```text
Session

↓

Visual Task

↓

Best Image Engine

↓

Artifact

↓

Timeline

↓

Knowledge
```

Images become first-class project assets.

## AI Runtime

The Runtime selects the best engine.

Users never choose providers.

Users choose objectives.

### Examples

```text
Engineering
↓
DeepSeek

Research
↓
Perplexity

Writing
↓
Claude

Visualisation
↓
Best image engine
```

Providers become implementation details.

## Maestro

Maestro orchestrates execution.

It does not perform work itself.

Responsibilities:

- select Decimins
- coordinate execution
- distribute tasks
- manage priorities
- monitor quality
- optimise workflows
- evaluate results

Maestro is the conductor.

## Decimins

Decimins are DECIMA's permanent workforce.

They are not user-created agents.

They are reusable specialised workers.

Every Decimin has:

Mission

Capabilities

Tools

Sources

Limits

Metrics

Configuration

### Examples

Research Decimin

Archivist Decimin

Sentinel Decimin

Editorial Decimin

Supplier Decimin

Contract Decimin

Runtime Decimin

Product Decimin

Pattern Decimin

### Decimin Registry

Decimins belong to DECIMA.

Not to Spaces.

Spaces activate and configure them.

Example

```text
DECIMA

↓

Decimin Registry

↓

Research Decimin
```

Inside GAVINHO

Sources

ArchDaily

Dezeen

Outlook

SharePoint

Inside DECIMA

Sources

GitHub

OpenAI

Anthropic

ArXiv

Same worker.

Different mission.

Continuous improvement benefits every Space automatically.

### Future Personal Decimins

A future evolution may introduce Personal Decimins.

Examples:

Personal Email

Personal Calendar

Travel

News

Personal Research

These belong to the user.

Not to a Space.

Operational Decimins continue belonging to DECIMA.

## DECIM001

DECIM001 is not a Large Language Model.

It is the first Cognitive Engine.

Responsibilities:

Memory

Knowledge

Relationships

Judgement

Patterns

Learning

Runtime optimisation

LLMs remain interchangeable.

DECIM001 becomes increasingly valuable.

## Continuous Learning

Every interaction strengthens DECIMA.

Example

```text
Question
↓
Session
↓
Decision
↓
Outcome
↓
Lesson
↓
Pattern
↓
Knowledge
↓
DECIM001
```

Nothing disappears.

Everything teaches the platform.

## Human Model

Humans do not think in silos.

Knowledge accumulated in one domain improves judgement everywhere else.

That is exactly how DECIMA works.

Spaces organise work.

DECIMA unifies intelligence.

The user experiences separation.

The platform experiences unity.

## Collaboration Model

DECIMA is organisation-centric.

Not user-centric.

The economic unit is the Space.

The collaborative unit is the Space.

The ownership unit is the Space.

Users participate.

Spaces own the work.

DECIMA learns from all Spaces.

## Foundational Principles

### Ownership Principle

Everything created inside a Space belongs to the Space.

### Visibility Principle

Visibility belongs to Sessions.

Ownership belongs to Spaces.

### Knowledge Principle

Knowledge belongs to DECIMA.

### Learning Principle

Every interaction strengthens DECIM001.

### Decimin Principle

Users never build agents.

They activate Decimins.

Maestro orchestrates them.

DECIM001 learns from them.

## Long-term Vision

A company will eventually say:

Create a new Space for this client.

Activate the Research Decimin, Contract Decimin and Sentinel Decimin.

Maestro, prepare a proposal.

DECIM001 found three similar projects from the past.

Notice what is missing.

Nobody talks about OpenAI.

Nobody talks about Claude.

Nobody talks about DeepSeek.

Those are execution engines.

The product is no longer an interface to LLMs.

The product is an organisational cognitive platform.

Every document.

Every image.

Every meeting.

Every email.

Every line of code.

Every decision.

Every project.

Strengthens the same organisational intelligence.

That intelligence is DECIMA.
