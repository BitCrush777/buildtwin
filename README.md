# BuildTwin

> **Software-Change Simulation & Autonomous Remediation Platform**  
> *Test risky repository changes in isolated, ephemeral digital twins before touching production branches or opening pull requests.*

---

## Overview

Modern software teams frequently deploy risky migrations, schema mutations, and API alterations that pass local review but break downstream consumers. 

**BuildTwin** creates an isolated, air-gapped clone ("twin") of any Git repository in a temporary environment, executes a baseline test suite, applies the proposed mutation, and executes downstream test suites to detect regressions. When a regression is caught, **IBM Bob** acts as the remediation engineer to analyze the failure, prepare a backward-compatible patch, and verify the fix inside the sandbox before declaring **SAFE TO DEPLOY**.

```
Repository (PR / Branch)
         ↓
Pristine Sandbox Clone
         ↓
Baseline Verification (e.g. 4/4 passed)
         ↓
Controlled Mutation (e.g. schema.prisma, pricing.js)
         ↓
Test Execution → REGRESSION DETECTED
         ↓
IBM Bob Remediation (Backward-Compatible Shim)
         ↓
Isolated Twin Verification (Exit Code 0)
         ↓
SAFE TO DEPLOY GATE UNLOCKED
```

---

## Core Invariants & Rules (`AGENTS.md`)

1. **Repository Immutability**: The original repository, production databases, and target branches are never modified during simulation.
2. **Strict Sandbox Isolation**: All mutations, experimental patches, and test runs take place exclusively inside isolated, ephemeral directories.
3. **Backward-Compatible Remediation**: Mutations to models or public interfaces must maintain compatible accessors or shims to prevent breaking downstream callers.
4. **Verified Deployment Gate**: A fix is never claimed successful based on generative code alone. The sandbox test runner must pass cleanly with exit code 0 before certifying safe to deploy.

---

## IBM Bob Integration

BuildTwin integrates natively with **IBM Bob** through the Model Context Protocol (MCP) and custom Bob modes:

- **Custom Bob Mode**: `.bob/modes/buildtwin-engineer.json` — Guides Bob to act as an automated remediation engineer adhering to BuildTwin platform invariants.
- **Bob Skills**:
  - `.bob/skills/analyze-change/` — Traces affected call sites and downstream regressions.
  - `.bob/skills/verify-change/` — Executes the approved verification test command in the sandbox.
- **MCP Server** (`mcp/server.js`): Exposes standard MCP tools over stdio:
  - `buildtwin_get_result`: Fetches real simulation failure details and sandbox metadata.
  - `buildtwin_apply_patch`: Safely applies unified patches to files within the sandbox.
  - `buildtwin_verify`: Triggers test execution inside the sandbox and returns structured pass/fail telemetry.

---

## Architecture & Tech Stack

- **Frontend & App Engine**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Design System**: Linear/Vercel-inspired dark developer console (Stitch visual language)
- **State Store**: Shared persistent run registry (`.buildtwin/runs/<id>/state.json`) accessible cross-process by Next.js and the IBM Bob MCP server
- **Supported Runtimes**: Node.js (`node:test`, Vitest, Jest, Mocha), Python (`pytest`), Go (`go test`), Rust (`cargo test`)

---

## Getting Started

### Prerequisites
- Node.js 20+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/BitCrush777/buildtwin.git
cd buildtwin

# Install dependencies
npm install
```

### Running the Web Platform

```bash
# Start Next.js development server
npm run dev

# Open in browser
http://localhost:3000
```

### Running the IBM Bob MCP Server

```bash
# Launch MCP server over stdio
node mcp/server.js
```

### Running Automated Test Verification

```bash
# Verify concurrency isolation & error classification
node scripts/test-simulation-isolation.js

# Verify cross-process state between Next.js and MCP server
node scripts/test-cross-process.js

# Verify repository-agnostic Node.js microservice workflow
node scripts/verify-generic-node.js

# Verify full ShopLite E2E simulation & remediation
node scripts/verify-shoplite-e2e.js
```

---

## Verification Evidence

Real execution logs and transcripts of IBM Bob analyzing regressions, generating patches, and verifying fixes are documented in [`bob_sessions/`](./bob_sessions/):
- `session-01-shoplite-remediation.md`: ShopLite Prisma ORM schema mutation remediation
- `session-02-cookie-parser-remediation.md`: External GitHub repository cookie-parser mutation
- `session-03-generic-node-microservice.md`: Generic Node.js discount calculation microservice

---

## License

MIT License. Built for the IBM Bob Hackathon.
