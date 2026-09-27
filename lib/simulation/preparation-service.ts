import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { RepositoryProfile } from "./profile-service";

export interface PreparationResult {
  success: boolean;
  packageManager: string;
  stepsExecuted: string[];
  error?: string;
}

export class PreparationService {
  /**
   * Safely executes an internal approved setup command inside the sandbox.
   * No arbitrary user commands are permitted.
   */
  public static async executeInternal(
    cwd: string,
    command: string,
    timeoutMs: number = 60000
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const isWindows = process.platform === "win32";

    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      const child = isWindows
        ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command], {
            cwd,
            windowsHide: true,
            env: {
              ...process.env,
              CI: "true",
              FORCE_COLOR: "0",
            },
          })
        : spawn(command.split(/\s+/)[0], command.split(/\s+/).slice(1), {
            cwd,
            windowsHide: true,
            env: {
              ...process.env,
              CI: "true",
              FORCE_COLOR: "0",
            },
          });

      const timer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {}
        reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
      }, timeoutMs);

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Prepares dependencies, database, and sandbox isolation for any repository.
   * Dynamically adapts to package manager and project structure.
   */
  public static async prepareSandbox(
    sandboxPath: string,
    profile?: RepositoryProfile
  ): Promise<PreparationResult> {
    const stepsExecuted: string[] = [];

    // 1. Detect package manager from lockfiles or profile
    let packageManager = profile?.packageManager || "npm";
    if (packageManager === "unknown" || !profile) {
      if (fs.existsSync(path.join(sandboxPath, "pnpm-lock.yaml"))) {
        packageManager = "pnpm";
      } else if (fs.existsSync(path.join(sandboxPath, "yarn.lock"))) {
        packageManager = "yarn";
      } else if (fs.existsSync(path.join(sandboxPath, "bun.lock")) || fs.existsSync(path.join(sandboxPath, "bun.lockb"))) {
        packageManager = "bun";
      } else if (fs.existsSync(path.join(sandboxPath, "package-lock.json"))) {
        packageManager = "npm";
      } else if (fs.existsSync(path.join(sandboxPath, "requirements.txt")) || fs.existsSync(path.join(sandboxPath, "pyproject.toml"))) {
        packageManager = "pip";
      }
    }

    const hasRootLock = fs.existsSync(path.join(sandboxPath, "package-lock.json"));
    const installCmd =
      packageManager === "pnpm"
        ? "pnpm install --frozen-lockfile"
        : packageManager === "yarn"
        ? "yarn install --frozen-lockfile"
        : packageManager === "bun"
        ? "bun install --frozen-lockfile"
        : hasRootLock
        ? "npm ci"
        : "npm install --no-audit";

    // 2. Install root dependencies if package.json exists
    const rootPkgPath = path.join(sandboxPath, "package.json");
    if (fs.existsSync(rootPkgPath)) {
      stepsExecuted.push(`Root dependencies (${installCmd})`);
      const res = await this.executeInternal(sandboxPath, installCmd, 120000);
      if (res.exitCode !== 0 && packageManager === "npm" && installCmd === "npm ci") {
        stepsExecuted.push("Root dependencies fallback (npm install --no-audit)");
        await this.executeInternal(sandboxPath, "npm install --no-audit", 120000);
      }
    }

    // 3. Handle Python dependencies if requirements.txt exists and python is primary
    const reqTxt = path.join(sandboxPath, "requirements.txt");
    if (fs.existsSync(reqTxt) && !fs.existsSync(rootPkgPath)) {
      stepsExecuted.push("Python dependencies (pip install -r requirements.txt)");
      try {
        await this.executeInternal(sandboxPath, "pip install -r requirements.txt", 90000);
      } catch {
        // Continue if pip not available globally
      }
    }

    // 4. Handle Subprojects (e.g. backend / frontend in fullstack repositories)
    const backendPath = path.join(sandboxPath, "backend");
    const backendPkg = path.join(backendPath, "package.json");
    if (fs.existsSync(backendPkg)) {
      const hasBackendLock = fs.existsSync(path.join(backendPath, "package-lock.json"));
      const backendInstall = hasBackendLock ? "npm ci" : "npm install --no-audit";
      stepsExecuted.push(`Backend dependencies (${backendInstall})`);
      const res = await this.executeInternal(backendPath, backendInstall, 120000);
      if (res.exitCode !== 0 && backendInstall === "npm ci") {
        await this.executeInternal(backendPath, "npm install --no-audit", 120000);
      }

      // Prepare backend .env if .env.example exists
      const envExample = path.join(backendPath, ".env.example");
      const envFile = path.join(backendPath, ".env");
      if (fs.existsSync(envExample) && !fs.existsSync(envFile)) {
        await fs.promises.copyFile(envExample, envFile);
        stepsExecuted.push("Created backend .env from .env.example");
      }
    }

    // 5. Database Setup (Prisma schema in backend or root)
    const prismaLocations = [
      path.join(sandboxPath, "backend", "prisma", "schema.prisma"),
      path.join(sandboxPath, "prisma", "schema.prisma"),
    ];

    for (const prismaSchema of prismaLocations) {
      if (fs.existsSync(prismaSchema)) {
        const schemaDir = path.dirname(path.dirname(prismaSchema));
        const pkgFile = path.join(schemaDir, "package.json");
        let hasPrisma = false;
        if (fs.existsSync(pkgFile)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
            hasPrisma = Boolean(
              pkg.dependencies?.["@prisma/client"] ||
              pkg.devDependencies?.["@prisma/client"] ||
              pkg.dependencies?.["prisma"] ||
              pkg.devDependencies?.["prisma"]
            );
          } catch {}
        }

        if (hasPrisma) {
          stepsExecuted.push("Generate Prisma client");
          try {
            await this.executeInternal(schemaDir, "npx prisma generate", 45000);
          } catch {}

          stepsExecuted.push("Push database schema (db push)");
          try {
            await this.executeInternal(schemaDir, "npx prisma db push", 45000);
          } catch {}

          // Seed database if seed.ts exists
          const seedPath = path.join(path.dirname(prismaSchema), "seed.ts");
          if (fs.existsSync(seedPath)) {
            stepsExecuted.push("Seed database with demo credentials");
            try {
              await this.executeInternal(schemaDir, "npx tsx prisma/seed.ts", 45000);
            } catch {
              // Seed is also executed within test beforeAll
            }
          }
        }
        break;
      }
    }

    // 6. Frontend Subproject and Port Collision Safeguard
    const frontendPath = path.join(sandboxPath, "frontend");
    const frontendPkg = path.join(frontendPath, "package.json");
    if (fs.existsSync(frontendPkg)) {
      const hasFrontendLock = fs.existsSync(path.join(frontendPath, "package-lock.json"));
      const frontendInstall = hasFrontendLock ? "npm ci" : "npm install --no-audit";
      stepsExecuted.push(`Frontend dependencies (${frontendInstall})`);
      const res = await this.executeInternal(frontendPath, frontendInstall, 120000);
      if (res.exitCode !== 0 && frontendInstall === "npm ci") {
        await this.executeInternal(frontendPath, "npm install --no-audit", 120000);
      }

      // Isolate frontend port in sandbox so Playwright doesn't conflict with host BuildTwin on port 3000
      let pkgContent = await fs.promises.readFile(frontendPkg, "utf-8");
      if (pkgContent.includes("3000")) {
        pkgContent = pkgContent
          .replace(/--port\s+3000/g, "--port 3099")
          .replace(/--port=3000/g, "--port=3099")
          .replace(/port:\s*3000/g, "port: 3099");
        await fs.promises.writeFile(frontendPkg, pkgContent, "utf-8");
        stepsExecuted.push("Configured isolated sandbox frontend package.json port: 3099");
      }

      const viteConfig = path.join(frontendPath, "vite.config.ts");
      if (fs.existsSync(viteConfig)) {
        let content = await fs.promises.readFile(viteConfig, "utf-8");
        if (content.includes("port: 3000")) {
          content = content.replace("port: 3000", "port: 3099");
          await fs.promises.writeFile(viteConfig, content, "utf-8");
          stepsExecuted.push("Configured isolated sandbox frontend port: 3099");
        }
      }

      const playwrightConfig = path.join(sandboxPath, "playwright.config.ts");
      if (fs.existsSync(playwrightConfig)) {
        let content = await fs.promises.readFile(playwrightConfig, "utf-8");
        if (content.includes("http://localhost:3000")) {
          content = content.replace(/http:\/\/localhost:3000/g, "http://localhost:3099");
        }
        content = content.replace(/reuseExistingServer:\s*true/g, "reuseExistingServer: false");
        content = content.replace(/timeout:\s*30000/g, "timeout: 60000");
        await fs.promises.writeFile(playwrightConfig, content, "utf-8");
        stepsExecuted.push("Configured Playwright to target sandbox port: 3099 with clean server lifecycle");
      }
    }

    // Free sandbox test ports before test execution starts
    this.freePorts([5000, 3099]);

    return {
      success: true,
      packageManager,
      stepsExecuted,
    };
  }

  /**
   * Re-syncs database or ORM client after a mutation has been applied.
   */
  public static async postMutationSetup(
    sandboxPath: string,
    mutatedFilePath: string,
    profile?: RepositoryProfile
  ): Promise<void> {
    const normalized = mutatedFilePath.replace(/\\/g, "/");
    if (normalized.includes("prisma/schema.prisma")) {
      const backendPath = path.join(sandboxPath, "backend");
      const targetDir = fs.existsSync(path.join(backendPath, "package.json")) ? backendPath : sandboxPath;
      const pkgFile = path.join(targetDir, "package.json");
      let hasPrisma = false;
      if (fs.existsSync(pkgFile)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
          hasPrisma = Boolean(
            pkg.dependencies?.["@prisma/client"] ||
            pkg.devDependencies?.["@prisma/client"] ||
            pkg.dependencies?.["prisma"] ||
            pkg.devDependencies?.["prisma"]
          );
        } catch {}
      }

      if (hasPrisma) {
        // Free ports to ensure background processes don't hold SQLite dev.db locked
        this.freePorts([5000, 3099]);

        // Re-generate Prisma Client inside the sandbox so changes reflect immediately
        await this.executeInternal(targetDir, "npx prisma generate", 30000);
        // Push mutated schema to SQLite database so columns match (force-reset ensures SQLite table recreation)
        await this.executeInternal(targetDir, "npx prisma db push --force-reset", 45000);
      }
    }
  }

  /**
   * Frees ports on Windows to prevent EADDRINUSE or stale server connections.
   */
  public static freePorts(ports: number[]): void {
    if (process.platform !== "win32") return;
    for (const port of ports) {
      try {
        const { execSync } = require("child_process");
        const stdout = execSync(`netstat -ano | findstr :${port}`, {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        });
        const lines = stdout.split(/\r?\n/).filter((l: string) => l.includes("LISTENING"));
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0" && parseInt(pid, 10) !== process.pid) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
            } catch {}
          }
        }
      } catch {}
    }
  }
}
