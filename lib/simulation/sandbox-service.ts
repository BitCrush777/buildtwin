import path from "path";
import fs from "fs";
import os from "os";

export interface SandboxInfo {
  sandboxId: string;
  sandboxPath: string;
  packageManager: "npm" | "pnpm" | "yarn";
}

export class SandboxService {
  /**
   * Creates an isolated ephemeral sandbox copy from a pristine cloned repository.
   * The original repository is never touched.
   */
  public static async createSandbox(sourceRepoPath: string, simulationId: string): Promise<SandboxInfo> {
    const rawSandboxPath = path.join(os.tmpdir(), "buildtwin", "sandboxes", simulationId);

    // Ensure clean destination
    if (fs.existsSync(rawSandboxPath)) {
      await this.cleanupSandbox(rawSandboxPath);
    }
    await fs.promises.mkdir(rawSandboxPath, { recursive: true });

    // Canonicalize Windows path to eliminate 8.3 short names (e.g. SAIDAR~1)
    const sandboxPath = fs.existsSync(rawSandboxPath)
      ? typeof fs.realpathSync.native === "function"
        ? fs.realpathSync.native(rawSandboxPath)
        : fs.realpathSync(rawSandboxPath)
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
  public static detectPackageManager(projectDir: string): "npm" | "pnpm" | "yarn" {
    if (fs.existsSync(path.join(projectDir, "pnpm-lock.yaml"))) {
      return "pnpm";
    }
    if (fs.existsSync(path.join(projectDir, "yarn.lock"))) {
      return "yarn";
    }
    return "npm";
  }

  /**
   * Cleans up the temporary sandbox directory safely.
   */
  public static async cleanupSandbox(sandboxPath: string): Promise<void> {
    if (!sandboxPath || !fs.existsSync(sandboxPath)) return;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await fs.promises.rm(sandboxPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        if (!fs.existsSync(sandboxPath)) return;
      } catch (err) {
        if (attempt === 5 && process.platform === "win32") {
          try {
            const { execSync } = require("child_process");
            execSync(`rmdir /s /q "${sandboxPath}"`, { stdio: "ignore" });
          } catch {}
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  private static async copyRecursive(src: string, dest: string): Promise<void> {
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    await fs.promises.mkdir(dest, { recursive: true });

    for (const entry of entries) {
      // Skip .git directory in sandbox copy to save memory and I/O
      if (entry.name === ".git") continue;

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyRecursive(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }
}
