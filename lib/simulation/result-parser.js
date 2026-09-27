"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultParser = void 0;
class ResultParser {
    /**
     * Parses test execution outputs across Vitest, Playwright, Jest, Mocha,
     * Node:test, Pytest, Go test, and Cargo test.
     * Extracts real test counts, failing test cases, and impacted files.
     */
    static parse(execution) {
        const combinedLogs = execution.combinedLogs;
        let status = execution.exitCode === 0 ? "passed" : "failed";
        if (execution.timedOut) {
            status = "error";
        }
        let total = null;
        let passed = null;
        let failed = null;
        const failureDetails = [];
        const affectedFilesSet = new Set();
        // 1. Vitest parsing (e.g., "Tests  17 passed (17)" or "Tests  18 failed (18)")
        const vitestPassedMatch = combinedLogs.match(/Tests\s+(?:.*?)(\d+)\s+passed/i);
        const vitestFailedMatch = combinedLogs.match(/Tests\s+(?:.*?)(\d+)\s+failed/i);
        const vitestTotalMatch = combinedLogs.match(/Tests\s+.*\((\d+)\)/i);
        // 2. Playwright parsing (e.g., "5 passed (42.8s)", "1 failed")
        const playwrightPassedMatch = combinedLogs.match(/(\d+)\s+passed\s+\([\d.]+m?s\)/i);
        const playwrightFailedMatch = combinedLogs.match(/(\d+)\s+failed(?:\s+\([\d.]+m?s\))?/i);
        if (vitestTotalMatch || playwrightPassedMatch) {
            let vitestTotal = 0;
            let vitestPassed = 0;
            let vitestFailed = 0;
            if (vitestTotalMatch) {
                vitestTotal = parseInt(vitestTotalMatch[1], 10);
                vitestPassed = vitestPassedMatch ? parseInt(vitestPassedMatch[1], 10) : 0;
                vitestFailed = vitestFailedMatch
                    ? parseInt(vitestFailedMatch[1], 10)
                    : combinedLogs.includes("Failed Suites") || combinedLogs.includes("FAIL")
                        ? vitestTotal - vitestPassed
                        : 0;
            }
            let playwrightTotal = 0;
            let playwrightPassed = 0;
            let playwrightFailed = 0;
            if (playwrightPassedMatch || playwrightFailedMatch) {
                playwrightPassed = playwrightPassedMatch ? parseInt(playwrightPassedMatch[1], 10) : 0;
                playwrightFailed = playwrightFailedMatch ? parseInt(playwrightFailedMatch[1], 10) : 0;
                playwrightTotal = playwrightPassed + playwrightFailed;
            }
            total = vitestTotal + playwrightTotal;
            passed = vitestPassed + playwrightPassed;
            failed = vitestFailed + playwrightFailed;
            if (status === "failed" && failed === 0) {
                failed = Math.max(1, total - passed);
            }
        }
        // 3. Pytest format: "12 passed, 2 failed in 0.42s" or "=== 3 passed in 0.05s ==="
        if (total === null) {
            const pytestPassMatch = combinedLogs.match(/(\d+)\s+passed/i);
            const pytestFailMatch = combinedLogs.match(/(\d+)\s+failed/i);
            if (pytestPassMatch || pytestFailMatch) {
                passed = pytestPassMatch ? parseInt(pytestPassMatch[1], 10) : 0;
                failed = pytestFailMatch ? parseInt(pytestFailMatch[1], 10) : 0;
                total = passed + failed;
            }
        }
        // 4. Go test format: "PASS", "FAIL", "--- PASS: TestA", "--- FAIL: TestB"
        if (total === null && (combinedLogs.includes("--- PASS:") || combinedLogs.includes("--- FAIL:") || combinedLogs.includes("PASS\nok") || combinedLogs.includes("FAIL\t"))) {
            const passMatches = combinedLogs.match(/---\s+PASS:\s+(\w+)/g);
            const failMatches = combinedLogs.match(/---\s+FAIL:\s+(\w+)/g);
            passed = passMatches ? passMatches.length : (execution.exitCode === 0 ? 1 : 0);
            failed = failMatches ? failMatches.length : (execution.exitCode === 0 ? 0 : 1);
            total = passed + failed;
        }
        // 5. Cargo test format: "test result: ok. 4 passed; 0 failed; 0 ignored"
        if (total === null) {
            const cargoMatch = combinedLogs.match(/test result:\s+\w+\.\s+(\d+)\s+passed;\s+(\d+)\s+failed;/i);
            if (cargoMatch) {
                passed = parseInt(cargoMatch[1], 10);
                failed = parseInt(cargoMatch[2], 10);
                total = passed + failed;
            }
        }
        // 6. Jest format: "Tests: 1 failed, 2 passed, 3 total"
        if (total === null) {
            const jestFailedMatch = combinedLogs.match(/Tests:\s+.*?(?:(\d+)\s+failed)/i);
            const jestPassedMatch = combinedLogs.match(/Tests:\s+.*?(?:(\d+)\s+passed)/i);
            const jestTotalMatch = combinedLogs.match(/Tests:\s+.*?(\d+)\s+total/i);
            if (jestTotalMatch) {
                total = parseInt(jestTotalMatch[1], 10);
                failed = jestFailedMatch ? parseInt(jestFailedMatch[1], 10) : 0;
                passed = jestPassedMatch ? parseInt(jestPassedMatch[1], 10) : total - (failed || 0);
            }
        }
        // 7. Mocha format: "3 passing", "1 failing"
        if (total === null) {
            const mochaPassMatch = combinedLogs.match(/(\d+)\s+passing/i);
            const mochaFailMatch = combinedLogs.match(/(\d+)\s+failing/i);
            if (mochaPassMatch || mochaFailMatch) {
                passed = mochaPassMatch ? parseInt(mochaPassMatch[1], 10) : 0;
                failed = mochaFailMatch ? parseInt(mochaFailMatch[1], 10) : 0;
                total = passed + failed;
            }
        }
        // 8. Node.js native test runner format (node --test)
        if (total === null) {
            const nodeTestsMatch = combinedLogs.match(/tests\s+(\d+)/i);
            const nodePassMatch = combinedLogs.match(/pass\s+(\d+)/i);
            const nodeFailMatch = combinedLogs.match(/fail\s+(\d+)/i);
            if (nodeTestsMatch && nodePassMatch) {
                total = parseInt(nodeTestsMatch[1], 10);
                passed = parseInt(nodePassMatch[1], 10);
                failed = nodeFailMatch ? parseInt(nodeFailMatch[1], 10) : total - passed;
            }
        }
        // Fallback: real exit code count without fabricating arbitrary numbers
        if (total === null) {
            if (execution.exitCode === 0) {
                total = 1;
                passed = 1;
                failed = 0;
            }
            else {
                total = 1;
                passed = 0;
                failed = 1;
            }
        }
        // Generic failure details and affected file extraction from logs
        const lines = combinedLogs.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Vitest / Jest failure headers: "FAIL tests/xyz.test.ts > suite > test name"
            const failHeaderMatch = line.match(/^\s*FAIL\s+(.*?)(?:\s*>\s*(.*))?$/);
            if (failHeaderMatch) {
                const filePath = failHeaderMatch[1].trim().replace(/\\/g, "/");
                const testName = failHeaderMatch[2]?.trim() || filePath;
                affectedFilesSet.add(filePath);
                // Look ahead for the error message in the next few lines
                let msg = "Assertion or runtime error";
                for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
                    const l = lines[j].trim();
                    if (l.startsWith("AssertionError:") || l.startsWith("Error:") || l.startsWith("TypeError:") || l.includes("PrismaClient")) {
                        msg = l;
                        break;
                    }
                }
                failureDetails.push({
                    test: testName,
                    file: filePath,
                    message: msg,
                });
            }
            // Pytest failure headers: "FAILED tests/test_xyz.py::test_func - AssertionError: ..."
            const pytestFailMatch = line.match(/^FAILED\s+([^\s:]+)(?:::(\w+))?\s*(?:-\s*(.*))?$/);
            if (pytestFailMatch) {
                const filePath = pytestFailMatch[1].replace(/\\/g, "/");
                const testName = pytestFailMatch[2] || filePath;
                const msg = pytestFailMatch[3] || "Pytest test failure";
                affectedFilesSet.add(filePath);
                failureDetails.push({ test: testName, file: filePath, message: msg });
            }
            // Go test failures: "--- FAIL: TestFunction (0.00s)"
            const goFailMatch = line.match(/^---\s+FAIL:\s+(\w+)/);
            if (goFailMatch) {
                failureDetails.push({
                    test: goFailMatch[1],
                    message: `Go test ${goFailMatch[1]} failed`,
                });
            }
            // General stack trace file paths: e.g. "at ... (src/file.ts:12:5)" or "at file.js:4" or "File 'path.py', line 12"
            const stackMatch = line.match(/(?:at\s+.*\(|\bat\s+|File\s+["'])([a-zA-Z0-9_\-\.\/\\]+\.(?:ts|tsx|js|jsx|py|go|rs|java|cs|prisma))(?::(\d+)|['"])/i);
            if (stackMatch && stackMatch[1]) {
                const cand = stackMatch[1].replace(/\\/g, "/");
                if (!cand.includes("node_modules") && !cand.startsWith("internal/") && !cand.includes(".next")) {
                    affectedFilesSet.add(cand);
                }
            }
        }
        // Deduplicate failure details
        const uniqueFailures = [];
        const seen = new Set();
        for (const f of failureDetails) {
            const key = `${f.test}:${f.file || ""}:${f.message}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueFailures.push(f);
            }
        }
        return {
            status,
            total,
            passed,
            failed,
            logs: combinedLogs || (execution.exitCode === 0 ? "Test suite completed successfully." : "Test suite failed."),
            durationMs: execution.durationMs,
            failureDetails: uniqueFailures,
            affectedFiles: Array.from(affectedFilesSet),
        };
    }
}
exports.ResultParser = ResultParser;
