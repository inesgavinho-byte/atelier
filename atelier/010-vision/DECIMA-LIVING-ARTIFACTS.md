---
id: DECIMA-LIVING-ARTIFACTS
title: DECIMA Workspace — Living Artifacts Architecture
version: v1.0
status: Draft
owner: Inês Gavinho
created: 2026-06-29
updated: 2026-06-29
depends_on:
  - AT-0001
  - DECIMA-WORKSPACE-v2
impacts:
  - Product
  - Development
---

# DECIMA Workspace — Living Artifacts Architecture

## Vision

Traditional AI systems generate files.

DECIMA maintains knowledge.

That principle must also apply to documents.

The objective of DECIMA Workspace is **not** to generate more files.

The objective is to create **Living Artifacts**.

An artifact is a permanent object that evolves over time.

---

# The Problem

Current LLMs create fragmentation.

Every request creates another file.

Example: Proposal.docx → Proposal_v2.docx → Proposal_Final.docx → Proposal_Final_v8.docx

After a few weeks nobody knows which one is correct, which one was sent, which one contains the latest changes.

The problem is not generation. The problem is the lack of continuity.

---

# The DECIMA Principle

> **DECIMA never generates disposable files.**

DECIMA maintains persistent artifacts.

The artifact always remains the same. Only its content evolves.

---

# Living Artifacts

Every important deliverable becomes a Living Artifact.

Examples: Proposal, Contract, Budget, Presentation, Meeting Minutes, Project Brief, Executive Summary, Report, Spreadsheet, Specification, Requirements, Business Plan, Investor Deck, Book, Paper, Article.

The user never creates "Proposal_v7". There is only one Proposal.

---

# Artifact Lifecycle

Create → Edit → Review → Approve → Publish → Continue Editing → New Version

The identity never changes. Only the revision changes.

---

# Artifact Library

Every Project contains an Artifact Library.

When asking "Update the proposal", DECIMA immediately knows which artifact is being referenced. No upload required. No searching required.

---

# Google Workspace Integration

Rather than generating isolated files, DECIMA works directly on collaborative documents.

Primary formats: Google Docs, Google Sheets, Google Slides.

The document already exists. DECIMA edits it.

PDF becomes an output format. Not a working format.

---

# Templates

Templates define structure. Never content.

Every organisation owns its own template library: DECIMA, GAVINHO, NUDO, PAPERS.

Templates contain: Typography, Colours, Headers, Footers, Tables, Margins, Page structure, Styles, Brand identity.

LLMs never recreate layout. They only populate structured content.

---

# Artifact Identity

Every artifact has a permanent identity:

ID, Owner Space, Project, Created, Status, Current Revision, Linked Decisions, Linked Documents, Linked Knowledge, Linked Sessions.

The artifact becomes an object inside DECIMA. Not a file.

---

# AI Behaviour

Current LLM behaviour: Prompt → Generate document

DECIMA behaviour: Prompt → Locate Artifact → Understand Context → Modify Artifact → Save Revision → Update Timeline → Update Knowledge

---

# Document Ingestion Pipeline

Original File → Permanent Storage → OCR → MarkItDown → Canonical Markdown → Chunking → Knowledge Extraction → Relationship Extraction → Indexing → Artifact Library → DECIMA

Original files remain. Markdown remains. Knowledge remains. Relationships remain. Nothing is lost.

---

# Canonical Markdown

Every processed document produces a canonical Markdown version.

This becomes the reference representation.

Future LLM calls consult the Markdown. Not the original PDF.

Advantages: fewer tokens, deterministic processing, searchable archive, reusable knowledge, stable references.

---

# Living Spreadsheets

The same philosophy applies to Google Sheets.

There is only one Budget. Only one Procurement Sheet. Only one Cost Control.

DECIMA updates existing spreadsheets. It never creates Budget_v27.xlsx.

---

# Living Presentations

Google Slides become Living Presentations.

Examples: Investor Deck, Client Presentation, Workshop, Board Meeting.

The presentation evolves continuously. No duplicated slide decks.

---

# Foundational Principle

> **DECIMA does not generate files.**

> **DECIMA maintains Living Artifacts.**

Artifacts become persistent organisational objects.

Knowledge becomes cumulative.

Version history becomes continuous.

Templates guarantee consistency.

The Workspace remains clean.

DECIMA becomes progressively more intelligent with every revision.
