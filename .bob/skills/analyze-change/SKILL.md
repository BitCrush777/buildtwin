---
name: analyze-change
title: BuildTwin Change Analysis
description: Analyze a proposed repository mutation to trace references, identify affected files, APIs, test suites, and workflows, and construct a concise remediation plan without modifying code.
---

# BuildTwin Change Analysis

## Purpose
Analyze a proposed code or schema mutation to determine its blast radius, identify affected consumer services, and formulate a backward-compatible remediation strategy before any code is modified.

## Operational Directives
1. **Never modify code during analysis.** This phase is strictly observational and analytical.
2. **Inspect the repository:**
   - Scan target file(s) and examine the proposed find/replace or patch diff.
   - Trace all symbol, property, type, and field references across consumers, DTOs, controllers, and services.
3. **Identify affected code:**
   - Map each call site referencing the deprecated, removed, or modified identifier.
   - Detect direct dependencies and indirect downstream consumers.
4. **Identify likely failures:**
   - Review relevant test suites (`*.test.ts`, `*.spec.ts`, `*.test.js`, etc.) that assert on the changed symbol.
   - Determine which tests and runtime operations are prone to regression.
5. **Produce a concise remediation plan:**
   - List each affected file and line reference.
   - Propose backward-compatible solutions (such as getters, aliases, migration shims, or DTO mapping adjustments).
   - Formulate step-by-step patch items for the remediation engineer.
