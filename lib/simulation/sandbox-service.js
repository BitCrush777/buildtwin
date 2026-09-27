"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
class SandboxService {
    /**
     * Creates an isolated ephemeral sandbox copy from a pristine cloned repository.
     * The original repository is never touched.
     */
    static async createSandbox(sourceRepoPath, simulationId) {
        const rawSandboxPath = path_1.default.join(os_1.default.tmpdir(), "buildtwin", "sandboxes", simulationId);
        // Ensure clean destination
        if (fs_1.default.existsSync(rawSandboxPath)) {
            await this.cleanupSandbox(rawSandboxPath);
        }
        await fs_1.default.promises.mkdir(rawSandboxPath, { recursive: true });
        // Canonicalize Windows path to eliminate 8.3 short names (e.g. SAIDAR~1)
        const sandboxPath = fs_1.default.existsSync(rawSandboxPath)
            ? typeof fs_1.default.realpathSync.native === "function"
                ? fs_1.default.realpathSync.native(rawSandboxPath)
                : fs_1.default.realpathSync(rawSandboxPath)
            : rawSandboxPath;
        // Copy repository files into the sandbox
        await this.copyRecursive(sourceRepoPath, sandboxPath);
        // Detect package manager
        const packageManager = this.detectPackageManager(sandboxPath);
        return {
            sandboxId: simulationId,
            sandboxPath,
            packageManager,
        };
    }
    /**
     * Detects the package manager used by the project.
     */
    static detectPackageManager(projectDir) {
        if (fs_1.default.existsSync(path_1.default.join(projectDir, "pnpm-lock.yaml"))) {
            return "pnpm";
        }
        if (fs_1.default.existsSync(path_1.default.join(projectDir, "yarn.lock"))) {
            return "yarn";
        }
        return "npm";
    }
    /**
     * Cleans up the temporary sandbox directory safely.
     */
    static async cleanupSandbox(sandboxPath) {
        if (!sandboxPath || !fs_1.default.existsSync(sandboxPath))
            return;
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                await fs_1.default.promises.rm(sandboxPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
                if (!fs_1.default.existsSync(sandboxPath))
                    return;
            }
            catch (err) {
                if (attempt === 5 && process.platform === "win32") {
                    try {
                        const { execSync } = require("child_process");
                        execSync(`rmdir /s /q "${sandboxPath}"`, { stdio: "ignore" });
                    }
                    catch { }
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }
    }
    static async copyRecursive(src, dest) {
        const entries = await fs_1.default.promises.readdir(src, { withFileTypes: true });
        await fs_1.default.promises.mkdir(dest, { recursive: true });
        for (const entry of entries) {
            // Skip .git directory in sandbox copy to save memory and I/O
            if (entry.name === ".git")
                continue;
            const srcPath = path_1.default.join(src, entry.name);
            const destPath = path_1.default.join(dest, entry.name);
            if (entry.isDirectory()) {
                await this.copyRecursive(srcPath, destPath);
            }
            else {
                await fs_1.default.promises.copyFile(srcPath, destPath);
            }
        }
    }
}
exports.SandboxService = SandboxService;
