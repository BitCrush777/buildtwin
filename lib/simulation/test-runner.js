"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunner = void 0;
const child_process_1 = require("child_process");
class TestRunner {
    // Approved command set for multi-stack repository testing
    static ALLOWED_COMMAND_PATTERNS = [
        /^npm\s+(?:run\s+)?test(?:\s+.*)?$/,
        /^pnpm\s+(?:run\s+)?test(?:\s+.*)?$/,
        /^yarn\s+(?:run\s+)?test(?:\s+.*)?$/,
        /^bun\s+test(?:\s+.*)?$/,
        /^npx\s+(?:vitest|jest|mocha|playwright)(?:\s+.*)?$/,
        /^node\s+--test(?:\s+.*)?$/,
        /^(?:python\s+-m\s+)?pytest(?:\s+.*)?$/,
        /^go\s+test(?:\s+.*)?$/,
        /^cargo\s+test(?:\s+.*)?$/,
        /^(?:\.\/)?(?:mvn|mvnw)\s+test(?:\s+.*)?$/,
        /^(?:\.\/)?(?:gradle|gradlew)\s+test(?:\s+.*)?$/,
        /^dotnet\s+test(?:\s+.*)?$/,
    ];
    /**
     * Validates whether the provided test command is in the strict security allowlist.
     */
    static validateCommand(command) {
        if (!command || typeof command !== "string") {
            return { allowed: false, reason: "Test command is required." };
        }
        const trimmed = command.trim();
        // Prevent command chaining, redirection, or subshells
        if (/[;&|`<>$]/.test(trimmed)) {
            return {
                allowed: false,
                reason: "Command chaining or redirection characters are prohibited.",
            };
        }
        const isMatch = this.ALLOWED_COMMAND_PATTERNS.some((pattern) => pattern.test(trimmed));
        if (!isMatch) {
            return {
                allowed: false,
                reason: "Command not permitted. Approved test commands: npm test, pnpm test, yarn test, bun test, pytest, go test, cargo test, mvn test, dotnet test.",
            };
        }
        return { allowed: true };
    }
    /**
     * Executes the approved test command inside the isolated sandbox directory with timeout.
     */
    static async runTest(sandboxPath, command, timeoutMs = 45000) {
        const validation = this.validateCommand(command);
        if (!validation.allowed) {
            throw new Error(validation.reason);
        }
        const startTime = Date.now();
        const isWindows = process.platform === "win32";
        // Split command into executable and args
        const parts = command.trim().split(/\s+/);
        let bin = parts[0];
        const args = parts.slice(1);
        if (isWindows && !bin.endsWith(".cmd") && !bin.endsWith(".exe")) {
            bin = `${bin}.cmd`;
        }
        return new Promise((resolve) => {
            let stdout = "";
            let stderr = "";
            let timedOut = false;
            const child = isWindows
                ? (0, child_process_1.spawn)(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command], {
                    cwd: sandboxPath,
                    windowsHide: true,
                    env: {
                        ...process.env,
                        CI: "true",
                        FORCE_COLOR: "0",
                    },
                })
                : (0, child_process_1.spawn)(bin, args, {
                    cwd: sandboxPath,
                    windowsHide: true,
                    env: {
                        ...process.env,
                        CI: "true",
                        FORCE_COLOR: "0",
                    },
                });
            const timer = setTimeout(() => {
                timedOut = true;
                try {
                    child.kill("SIGKILL");
                }
                catch {
                    // ignore
                }
            }, timeoutMs);
            child.stdout?.on("data", (data) => {
                stdout += data.toString();
            });
            child.stderr?.on("data", (data) => {
                stderr += data.toString();
            });
            child.on("error", (err) => {
                clearTimeout(timer);
                stderr += `\nFailed to start test runner: ${err.message}`;
                const durationMs = Date.now() - startTime;
                resolve({
                    stdout,
                    stderr,
                    combinedLogs: `${stdout}\n${stderr}`.trim(),
                    exitCode: 1,
                    durationMs,
                    timedOut,
                });
            });
            child.on("close", (code) => {
                clearTimeout(timer);
                const durationMs = Date.now() - startTime;
                const exitCode = timedOut ? 124 : (code ?? 0);
                const combinedLogs = `${stdout}\n${stderr}`.trim();
                resolve({
                    stdout,
                    stderr,
                    combinedLogs,
                    exitCode,
                    durationMs,
                    timedOut,
                });
            });
        });
    }
}
exports.TestRunner = TestRunner;
