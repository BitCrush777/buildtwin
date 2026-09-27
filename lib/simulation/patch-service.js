"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * PatchService — parses a unified diff and applies it exclusively inside a
 * BuildTwin sandbox. No shell commands are used. All paths are validated
 * against the sandbox root before any file is written.
 *
 * Security invariants:
 *  1. Every target file must resolve within sandboxPath (traversal guard).
 *  2. Shell metacharacters in file paths are rejected.
 *  3. New/deleted file operations are bounded to the same sandbox root.
 *  4. The pristine clone directory is never referenced.
 */
class PatchService {
    static MAX_PATCH_BYTES = 512 * 1024; // 512 KB hard cap
    /**
     * Top-level entry point called by SimulationService.
     */
    static async applyPatch(sandboxPath, simulationId, patch) {
        // Basic input validation
        if (!patch || typeof patch !== "string" || patch.trim().length === 0) {
            return {
                simulationId,
                applied: false,
                changedFiles: [],
                diffSummary: "",
                error: "Patch is empty.",
            };
        }
        if (Buffer.byteLength(patch, "utf-8") > this.MAX_PATCH_BYTES) {
            return {
                simulationId,
                applied: false,
                changedFiles: [],
                diffSummary: "",
                error: `Patch exceeds maximum allowed size of ${this.MAX_PATCH_BYTES / 1024} KB.`,
            };
        }
        // Parse the unified diff
        let filePatches;
        try {
            filePatches = this.parseDiff(patch);
        }
        catch (err) {
            return {
                simulationId,
                applied: false,
                changedFiles: [],
                diffSummary: "",
                error: `Invalid unified diff: ${err.message || String(err)}`,
            };
        }
        if (filePatches.length === 0) {
            return {
                simulationId,
                applied: false,
                changedFiles: [],
                diffSummary: "",
                error: "No file patches found in the provided diff.",
            };
        }
        // Validate all target paths before touching any file
        const resolvedSandbox = path_1.default.resolve(sandboxPath);
        for (const fp of filePatches) {
            const validation = this.validateFilePath(fp.filePath, resolvedSandbox);
            if (!validation.valid) {
                return {
                    simulationId,
                    applied: false,
                    changedFiles: [],
                    diffSummary: "",
                    error: validation.error,
                };
            }
        }
        // Apply each file patch
        const changedFiles = [];
        for (const fp of filePatches) {
            try {
                await this.applyFilePatch(fp, resolvedSandbox);
                changedFiles.push(fp.filePath);
            }
            catch (err) {
                return {
                    simulationId,
                    applied: false,
                    changedFiles,
                    diffSummary: this.buildDiffSummary(filePatches),
                    error: `Failed to apply patch to ${fp.filePath}: ${err.message || String(err)}`,
                };
            }
        }
        return {
            simulationId,
            applied: true,
            changedFiles,
            diffSummary: this.buildDiffSummary(filePatches),
        };
    }
    // ---------------------------------------------------------------------------
    // Unified diff parser — supports standard "--- a/..." / "+++ b/..." headers
    // ---------------------------------------------------------------------------
    static parseDiff(patch) {
        const lines = patch.split(/\r?\n/);
        const filePatches = [];
        let current = null;
        let currentHunk = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // New file header — "--- a/path/to/file" or "--- path/to/file"
            if (line.startsWith("--- ")) {
                if (currentHunk && current)
                    current.hunks.push(currentHunk);
                currentHunk = null;
                if (current && current.hunks.length > 0)
                    filePatches.push(current);
                // "--- /dev/null" means a new file; skip it here — handled by "+++" line
                current = null;
                continue;
            }
            if (line.startsWith("+++ ")) {
                const rawPath = line.slice(4).trim();
                // Strip leading "b/" or "a/" prefix added by git diff
                const normalised = rawPath.replace(/^[ab]\//, "").trim();
                if (normalised === "/dev/null" || normalised === "dev/null") {
                    // Deleted file — no hunks to apply
                    current = null;
                    continue;
                }
                current = { filePath: normalised, hunks: [] };
                currentHunk = null;
                continue;
            }
            // Hunk header — "@@ -l,s +l,s @@"
            if (line.startsWith("@@") && current) {
                if (currentHunk)
                    current.hunks.push(currentHunk);
                const m = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
                if (!m)
                    throw new Error(`Malformed hunk header at line ${i + 1}: ${line}`);
                currentHunk = {
                    oldStart: parseInt(m[1], 10),
                    oldCount: m[2] !== undefined ? parseInt(m[2], 10) : 1,
                    newStart: parseInt(m[3], 10),
                    newCount: m[4] !== undefined ? parseInt(m[4], 10) : 1,
                    lines: [],
                };
                continue;
            }
            // Hunk body lines
            if (currentHunk && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ") || line === "")) {
                currentHunk.lines.push(line);
                continue;
            }
        }
        // Flush final hunk / file
        if (currentHunk && current)
            current.hunks.push(currentHunk);
        if (current && current.hunks.length > 0)
            filePatches.push(current);
        return filePatches;
    }
    // ---------------------------------------------------------------------------
    // Apply a single FilePatch to a file inside the sandbox
    // ---------------------------------------------------------------------------
    static async applyFilePatch(fp, resolvedSandbox) {
        const absolutePath = path_1.default.resolve(resolvedSandbox, fp.filePath);
        // Read existing content (file may not exist yet for new-file patches)
        let originalLines = [];
        if (fs_1.default.existsSync(absolutePath)) {
            const raw = await fs_1.default.promises.readFile(absolutePath, "utf-8");
            originalLines = raw.split(/\r?\n/);
        }
        // Apply hunks in reverse order so that line numbers remain valid
        const sortedHunks = [...fp.hunks].sort((a, b) => b.oldStart - a.oldStart);
        let workingLines = [...originalLines];
        for (const hunk of sortedHunks) {
            let start = Math.max(0, hunk.oldStart - 1); // convert 1-based to 0-based
            // Context matching: find exact match for context lines if line numbers have drifted
            const contextLines = hunk.lines
                .filter((l) => l.startsWith(" ") || l.startsWith("-"))
                .map((l) => l.slice(1));
            if (contextLines.length > 0) {
                let matchesAtStart = true;
                for (let c = 0; c < contextLines.length; c++) {
                    if (workingLines[start + c] !== contextLines[c]) {
                        matchesAtStart = false;
                        break;
                    }
                }
                if (!matchesAtStart) {
                    // Search around start line (-30 to +30 lines)
                    for (let offset = -30; offset <= 30; offset++) {
                        const candidate = start + offset;
                        if (candidate >= 0 && candidate + contextLines.length <= workingLines.length) {
                            let candidateMatches = true;
                            for (let c = 0; c < contextLines.length; c++) {
                                if (workingLines[candidate + c] !== contextLines[c]) {
                                    candidateMatches = false;
                                    break;
                                }
                            }
                            if (candidateMatches) {
                                start = candidate;
                                break;
                            }
                        }
                    }
                }
            }
            const removeCount = hunk.oldCount;
            const insertLines = [];
            for (const hl of hunk.lines) {
                if (hl.startsWith("+")) {
                    insertLines.push(hl.slice(1));
                }
                else if (hl.startsWith(" ")) {
                    insertLines.push(hl.slice(1));
                }
                // "-" lines are simply dropped (not added to insertLines)
            }
            workingLines.splice(start, removeCount, ...insertLines);
        }
        // Ensure parent directories exist
        await fs_1.default.promises.mkdir(path_1.default.dirname(absolutePath), { recursive: true });
        await fs_1.default.promises.writeFile(absolutePath, workingLines.join("\n"), "utf-8");
    }
    // ---------------------------------------------------------------------------
    // Path validation — sandbox confinement + shell-metachar guard
    // ---------------------------------------------------------------------------
    static validateFilePath(filePath, resolvedSandbox) {
        if (!filePath || typeof filePath !== "string") {
            return { valid: false, error: "Patch contains an empty file path." };
        }
        // Reject shell metacharacters in file paths
        if (/[;&|`$<>\n\r"']/.test(filePath)) {
            return {
                valid: false,
                error: `Patch file path contains forbidden characters: ${filePath}`,
            };
        }
        const absolute = path_1.default.resolve(resolvedSandbox, filePath);
        if (!absolute.startsWith(resolvedSandbox + path_1.default.sep) && absolute !== resolvedSandbox) {
            return {
                valid: false,
                error: `Path traversal detected: "${filePath}" resolves outside the sandbox.`,
            };
        }
        return { valid: true };
    }
    // ---------------------------------------------------------------------------
    // Build a human-readable diff summary
    // ---------------------------------------------------------------------------
    static buildDiffSummary(filePatches) {
        let added = 0;
        let removed = 0;
        for (const fp of filePatches) {
            for (const hunk of fp.hunks) {
                for (const line of hunk.lines) {
                    if (line.startsWith("+"))
                        added++;
                    else if (line.startsWith("-"))
                        removed++;
                }
            }
        }
        const files = filePatches.map((fp) => fp.filePath).join(", ");
        return `${filePatches.length} file(s) patched [+${added}/-${removed} lines]: ${files}`;
    }
}
exports.PatchService = PatchService;
