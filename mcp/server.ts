import readline from "readline";
import { simulationService } from "../lib/simulation/simulation-service";
import { StateStore } from "../lib/simulation/state-store";
import { SimulateRequest } from "../lib/simulation/types";

export { simulationService };


/**
 * BuildTwin Model Context Protocol (MCP) Server
 * Conforms to JSON-RPC 2.0 stdio MCP specification.
 */

const SERVER_NAME = "buildtwin-mcp";
const SERVER_VERSION = "1.0.0";

const TOOLS = [
  {
    name: "buildtwin_simulate",
    description:
      "Run the existing BuildTwin simulation pipeline in an ephemeral sandbox with a controlled mutation and return structured test execution results.",
    inputSchema: {
      type: "object",
      properties: {
        repoUrl: {
          type: "string",
          description: "Public GitHub repository URL (e.g., https://github.com/example/shoplite)",
        },
        branch: {
          type: "string",
          description: "Target branch or tag (default: main)",
        },
        filePath: {
          type: "string",
          description: "Target file path from repo root (e.g., src/user.js or prisma/schema.prisma)",
        },
        oldValue: {
          type: "string",
          description: "Exact pattern to find and mutate",
        },
        newValue: {
          type: "string",
          description: "Replacement pattern to apply inside sandbox",
        },
        testCommand: {
          type: "string",
          description: "Approved test command (e.g. npm test, pnpm test, yarn test, bun test, pytest, go test, cargo test - or leave empty to auto-detect from repository profile)",
        },
      },
      required: ["repoUrl", "filePath", "oldValue", "newValue"],
    },
  },
  {
    name: "buildtwin_get_result",
    description: "Return an existing simulation result, including execution status, logs, and mutation details.",
    inputSchema: {
      type: "object",
      properties: {
        simulationId: {
          type: "string",
          description: "Simulation ID (e.g. BT-1042)",
        },
      },
      required: ["simulationId"],
    },
  },
  {
    name: "buildtwin_verify",
    description: "Run verification against the remediated sandbox and return status, test counts, logs, duration, and affected workflows.",
    inputSchema: {
      type: "object",
      properties: {
        simulationId: {
          type: "string",
          description: "Simulation ID to verify (e.g. BT-1042)",
        },
      },
      required: ["simulationId"],
    },
  },
  {
    name: "buildtwin_apply_patch",
    description:
      "Apply a Bob-generated unified diff patch exclusively inside the BuildTwin sandbox for the given simulation. " +
      "Must be called after buildtwin_simulate detects a regression and before buildtwin_verify. " +
      "The patch must be a valid unified diff (--- / +++ / @@ headers). " +
      "The patch is applied ONLY inside the isolated sandbox — the original repository and any production file are never touched. " +
      "Returns applied status, changed files, a diff summary, and any error.",
    inputSchema: {
      type: "object",
      properties: {
        simulationId: {
          type: "string",
          description: "Simulation ID whose sandbox should receive the patch (e.g. BT-1043)",
        },
        patch: {
          type: "string",
          description:
            "Valid unified diff string (git diff format). Must use --- a/path and +++ b/path headers. " +
            "All target file paths must be relative to the repository root and must remain inside the sandbox.",
        },
      },
      required: ["simulationId", "patch"],
    },
  },
];

function sendResponse(id: string | number | null, result?: any, error?: any) {
  const payload: any = {
    jsonrpc: "2.0",
    id,
  };
  if (error) {
    payload.error = error;
  } else {
    payload.result = result;
  }
  process.stdout.write(JSON.stringify(payload) + "\n");
}

async function handleMethod(method: string, params: any, id: string | number | null) {
  switch (method) {
    case "initialize":
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
        },
      });
      break;

    case "notifications/initialized":
      // Acknowledged, no response needed for notifications
      break;

    case "ping":
      sendResponse(id, {});
      break;

    case "tools/list":
      sendResponse(id, {
        tools: TOOLS,
      });
      break;

    case "tools/call": {
      const toolName = params?.name;
      const args = params?.arguments || {};

      try {
        if (toolName === "buildtwin_simulate") {
          const req: SimulateRequest = {
            repoUrl: args.repoUrl,
            branch: args.branch || "main",
            filePath: args.filePath,
            oldValue: args.oldValue,
            newValue: args.newValue,
            testCommand: args.testCommand,
          };
          const result = await simulationService.runRealSimulation(req);
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: result.status === "error",
          });
        } else if (toolName === "buildtwin_get_result") {
          const simId = args.simulationId;
          const state = StateStore.getState(simId);
          if (!state) {
            sendResponse(id, {
              content: [
                {
                  type: "text",
                  text: `Simulation #${simId} not found in state store.`,
                },
              ],
              isError: true,
            });
          } else {
            sendResponse(id, {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(state, null, 2),
                },
              ],
              isError: false,
            });
          }
        } else if (toolName === "buildtwin_verify") {
          const simId = args.simulationId;
          const verification = await simulationService.verifySimulation(simId);
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(verification, null, 2),
              },
            ],
            isError: verification.status === "error",
          });
        } else if (toolName === "buildtwin_apply_patch") {
          const simId = args.simulationId as string;
          const patch = args.patch as string;

          if (!simId || typeof simId !== "string") {
            sendResponse(id, {
              content: [{ type: "text", text: "simulationId is required." }],
              isError: true,
            });
            break;
          }
          if (!patch || typeof patch !== "string") {
            sendResponse(id, {
              content: [{ type: "text", text: "patch is required and must be a string." }],
              isError: true,
            });
            break;
          }

          const applyResult = await simulationService.applyPatch(simId, patch);
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(applyResult, null, 2),
              },
            ],
            isError: !applyResult.applied,
          });
        } else {
          sendResponse(id, undefined, {
            code: -32601,
            message: `Tool not found: ${toolName}`,
          });
        }
      } catch (err: any) {
        sendResponse(id, {
          content: [
            {
              type: "text",
              text: `Error executing ${toolName}: ${err.message || String(err)}`,
            },
          ],
          isError: true,
        });
      }
      break;
    }

    default:
      if (id !== null) {
        sendResponse(id, undefined, {
          code: -32601,
          message: `Method not found: ${method}`,
        });
      }
      break;
  }
}

// Sequential async message queue
let queuePromise = Promise.resolve();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  queuePromise = queuePromise.then(async () => {
    try {
      const json = JSON.parse(trimmed);
      const { method, params, id = null } = json;
      await handleMethod(method, params, id);
    } catch (err: any) {
      sendResponse(null, undefined, {
        code: -32700,
        message: `Parse error: ${err.message}`,
      });
    }
  });
});

process.stderr.write(`${SERVER_NAME} v${SERVER_VERSION} listening on stdio\n`);
