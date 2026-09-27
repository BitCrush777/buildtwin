# BuildTwin + IBM Bob Remediation Sessions Evidence

This directory contains empirical execution logs, tool transcripts, diffs, and verification proof documenting **IBM Bob's** autonomous role as the remediation engineer within the BuildTwin simulation platform.

---

## Architecture & Operational Invariants

```
                                  +------------------------------------+
                                  |         Proposed Mutation          |
                                  +-----------------+------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |    Isolated Ephemeral Sandbox      |
                                  |  (Original Repository Untouched)   |
                                  +-----------------+------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |      BuildTwin Test Runner         |
                                  | (Vitest / Playwright / Jest / etc) |
                                  +-----------------+------------------+
                                                    |
                               +--------------------+--------------------+
                               |                                         |
                               v                                         v
                     [Exit Code 0: Clean]                   [Exit Code 1: Regressions]
                     "SAFE TO DEPLOY"                                    |
                                                                         v
                                                            +------------------------+
                                                            |  IBM Bob Remediation   |
                                                            | (buildtwin-engineer)   |
                                                            +-----------+------------+
                                                                        |
                                          +-----------------------------+-----------------------------+
                                          |                             |                             |
                                          v                             v                             v
                              buildtwin_get_result            buildtwin_apply_patch            buildtwin_verify
                             (inspects failure state)       (applies backward-compat)      (re-runs test in sandbox)
                                                                                                      |
                                                                                                      v
                                                                                            [Exit Code 0: Clean]
                                                                                              "SAFE TO DEPLOY"
```

### Core Invariants Enforced During All Sessions
1. **Repository Immutability:** Original repository clones are pristine references. All mutations, experimental patches, and test runs execute exclusively inside isolated sandboxes (`%TEMP%\buildtwin\sandboxes\<id>`).
2. **Backward Compatibility:** Remediation patches never break existing consumer interfaces. Accessor bridges, virtual aliases, and schema mappings preserve all legacy contracts.
3. **Strict Verification Gate:** Reasoning alone does NOT declare success. "SAFE TO DEPLOY" is exclusively unlocked when `buildtwin_verify` executes with **exit code 0** and **zero failed tests**.

---

## Session Catalog

| Session | Target Repository | Tech Stack | Mutation | Regression | Bob Remediation | Final Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| [**Session 01**](./session-01-shoplite-remediation.md) | `ShopLite` (Fullstack) | Next.js, Express, Prisma, SQLite, Playwright | `User.email` -> `User.email_address` | 18 tests failing | 6 files patched with backward-compatible aliases | **22/22 Clean (SAFE TO DEPLOY)** |
| [**Session 02**](./session-02-cookie-parser-remediation.md) | `expressjs/cookie-parser` (GitHub) | Node.js, Mocha, CommonJS | `signedCookie` -> `signed_cookie` | Mocha tests failing | Backward-compatible export bridge | **32/32 Clean (SAFE TO DEPLOY)** |
| [**Session 03**](./session-03-generic-node-microservice.md) | `node-npm-service` (Microservice) | Node.js 22, `node:test` native | `calculateDiscount` -> `applyDiscount` | Unit test regression | Export alias preservation | **4/4 Clean (SAFE TO DEPLOY)** |

---

## MCP Server Integration

All Bob interactions communicate via standard Model Context Protocol (MCP) JSON-RPC over `stdio`:
* **Server Command:** `node mcp/server.js`
* **Configuration:** `.bob/mcp.json`
* **Custom Mode:** `.bob/modes/buildtwin-engineer.json`
* **State Store:** `.buildtwin/runs/<simulationId>/state.json`
