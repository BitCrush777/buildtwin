import path from "path";
import fs from "fs";

export interface RepositoryProfile {
  repoUrl: string;
  repoName: string;
  branch: string;
  commit: string;
  primaryLanguage: string;
  languages: string[];
  framework: string;
  projectType: "single" | "fullstack" | "monorepo" | "unknown";
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "pip" | "poetry" | "uv" | "go" | "cargo" | "maven" | "gradle" | "dotnet" | "unknown";
  lockfiles: string[];
  testFramework: "vitest" | "jest" | "mocha" | "playwright" | "node:test" | "pytest" | "go test" | "cargo test" | "unknown";
  testCommand: string;
  testConfidence: "high" | "medium" | "low";
  subprojects: Array<{
    name: string;
    path: string;
    type: "frontend" | "backend" | "service" | "root";
    packageManager?: string;
  }>;
  databaseOrm?: "prisma" | "typeorm" | "drizzle" | "sqlalchemy" | "alembic" | "none";
  sourceDirs: string[];
  configFiles: string[];
  isShopLiteDemo?: boolean;
}

export class ProfileService {
  /**
   * Inspects a cloned repository directory and dynamically discovers its stack,
   * package manager, test framework, subprojects, and test command.
   */
  public static async inspectRepository(
    repoPath: string,
    repoUrl: string,
    branch: string = "main",
    commit: string = "HEAD"
  ): Promise<RepositoryProfile> {
    const repoName = this.extractRepoName(repoUrl, repoPath);
    const languagesSet = new Set<string>();
    const lockfiles: string[] = [];
    const configFiles: string[] = [];
    const sourceDirs: string[] = [];
    const subprojects: RepositoryProfile["subprojects"] = [];

    // 1. Scan root directory entries
    let rootEntries: string[] = [];
    try {
      rootEntries = await fs.promises.readdir(repoPath);
    } catch {
      rootEntries = [];
    }

    // Check lockfiles
    if (rootEntries.includes("pnpm-lock.yaml")) lockfiles.push("pnpm-lock.yaml");
    if (rootEntries.includes("yarn.lock")) lockfiles.push("yarn.lock");
    if (rootEntries.includes("package-lock.json")) lockfiles.push("package-lock.json");
    if (rootEntries.includes("bun.lock") || rootEntries.includes("bun.lockb")) lockfiles.push("bun.lock");
    if (rootEntries.includes("poetry.lock")) lockfiles.push("poetry.lock");
    if (rootEntries.includes("uv.lock")) lockfiles.push("uv.lock");
    if (rootEntries.includes("Cargo.lock")) lockfiles.push("Cargo.lock");

    // Check config files
    const knownConfigs = [
      "tsconfig.json", "vite.config.ts", "vite.config.js", "next.config.js", "next.config.mjs", "next.config.ts",
      "vitest.config.ts", "vitest.config.js", "playwright.config.ts", "playwright.config.js", "jest.config.js", "jest.config.ts",
      "pyproject.toml", "requirements.txt", "pytest.ini", "go.mod", "Cargo.toml", "pom.xml", "build.gradle"
    ];
    for (const cfg of knownConfigs) {
      if (rootEntries.includes(cfg)) configFiles.push(cfg);
    }

    // Check common source directories
    for (const dir of ["src", "lib", "app", "pages", "backend", "frontend", "tests", "test", "e2e", "pkg", "cmd"]) {
      if (rootEntries.includes(dir) && fs.statSync(path.join(repoPath, dir)).isDirectory()) {
        sourceDirs.push(dir);
      }
    }

    // 2. Identify Subprojects (fullstack or monorepo)
    const hasBackend = rootEntries.includes("backend") && fs.existsSync(path.join(repoPath, "backend", "package.json"));
    const hasFrontend = rootEntries.includes("frontend") && fs.existsSync(path.join(repoPath, "frontend", "package.json"));

    if (hasBackend) {
      subprojects.push({ name: "backend", path: "backend", type: "backend" });
    }
    if (hasFrontend) {
      subprojects.push({ name: "frontend", path: "frontend", type: "frontend" });
    }

    let projectType: RepositoryProfile["projectType"] = "single";
    if (hasBackend && hasFrontend) {
      projectType = "fullstack";
    } else if (rootEntries.includes("pnpm-workspace.yaml") || (await this.hasWorkspaceConfig(repoPath))) {
      projectType = "monorepo";
    }

    // 3. Detect Languages
    if (rootEntries.includes("tsconfig.json") || (await this.hasFileEnding(repoPath, [".ts", ".tsx"]))) {
      languagesSet.add("TypeScript");
    }
    if (rootEntries.includes("package.json") || (await this.hasFileEnding(repoPath, [".js", ".jsx", ".mjs"]))) {
      languagesSet.add("JavaScript");
    }
    if (rootEntries.includes("pyproject.toml") || rootEntries.includes("requirements.txt") || (await this.hasFileEnding(repoPath, [".py"]))) {
      languagesSet.add("Python");
    }
    if (rootEntries.includes("go.mod") || (await this.hasFileEnding(repoPath, [".go"]))) {
      languagesSet.add("Go");
    }
    if (rootEntries.includes("Cargo.toml") || (await this.hasFileEnding(repoPath, [".rs"]))) {
      languagesSet.add("Rust");
    }
    if (rootEntries.includes("pom.xml") || rootEntries.includes("build.gradle") || (await this.hasFileEnding(repoPath, [".java"]))) {
      languagesSet.add("Java");
    }
    if (await this.hasFileEnding(repoPath, [".csproj", ".sln"])) {
      languagesSet.add("C#");
    }

    const languages = Array.from(languagesSet);
    const primaryLanguage = languages[0] || "JavaScript";

    // 4. Detect Package Manager
    let packageManager: RepositoryProfile["packageManager"] = "unknown";
    if (lockfiles.includes("pnpm-lock.yaml")) {
      packageManager = "pnpm";
    } else if (lockfiles.includes("yarn.lock")) {
      packageManager = "yarn";
    } else if (lockfiles.includes("bun.lock")) {
      packageManager = "bun";
    } else if (lockfiles.includes("package-lock.json") || rootEntries.includes("package.json")) {
      packageManager = "npm";
    } else if (lockfiles.includes("poetry.lock")) {
      packageManager = "poetry";
    } else if (lockfiles.includes("uv.lock")) {
      packageManager = "uv";
    } else if (rootEntries.includes("requirements.txt") || rootEntries.includes("pyproject.toml")) {
      packageManager = "pip";
    } else if (rootEntries.includes("Cargo.toml") || lockfiles.includes("Cargo.lock")) {
      packageManager = "cargo";
    } else if (rootEntries.includes("go.mod")) {
      packageManager = "go";
    } else if (rootEntries.includes("pom.xml")) {
      packageManager = "maven";
    } else if (rootEntries.includes("build.gradle")) {
      packageManager = "gradle";
    }

    // 5. Detect Framework
    let framework = "None";
    const rootPkgPath = path.join(repoPath, "package.json");
    let rootPkg: any = null;
    if (fs.existsSync(rootPkgPath)) {
      try {
        rootPkg = JSON.parse(await fs.promises.readFile(rootPkgPath, "utf-8"));
      } catch {}
    }

    const allDeps = {
      ...(rootPkg?.dependencies || {}),
      ...(rootPkg?.devDependencies || {}),
    };

    if (allDeps["next"] || rootEntries.some(e => e.startsWith("next.config"))) {
      framework = "Next.js";
    } else if (allDeps["express"]) {
      framework = "Express";
    } else if (allDeps["vite"] || rootEntries.some(e => e.startsWith("vite.config"))) {
      framework = "Vite";
    } else if (allDeps["fastify"]) {
      framework = "Fastify";
    } else if (rootEntries.includes("pyproject.toml") || rootEntries.includes("requirements.txt")) {
      const pyContent = await this.readTextFiles(repoPath, ["requirements.txt", "pyproject.toml"]);
      if (/fastapi/i.test(pyContent)) framework = "FastAPI";
      else if (/flask/i.test(pyContent)) framework = "Flask";
      else if (/django/i.test(pyContent)) framework = "Django";
    }

    // 6. Detect Database / ORM
    let databaseOrm: RepositoryProfile["databaseOrm"] = "none";
    if (
      fs.existsSync(path.join(repoPath, "prisma", "schema.prisma")) ||
      fs.existsSync(path.join(repoPath, "backend", "prisma", "schema.prisma"))
    ) {
      databaseOrm = "prisma";
    } else if (allDeps["typeorm"]) {
      databaseOrm = "typeorm";
    } else if (allDeps["drizzle-orm"]) {
      databaseOrm = "drizzle";
    }

    // 7. Detect Test Framework and Command
    let testFramework: RepositoryProfile["testFramework"] = "unknown";
    let testCommand = "npm test";
    let testConfidence: RepositoryProfile["testConfidence"] = "low";

    if (rootPkg && rootPkg.scripts && rootPkg.scripts.test) {
      const scriptVal = rootPkg.scripts.test;
      testCommand = `${packageManager === "yarn" ? "yarn" : packageManager === "pnpm" ? "pnpm" : packageManager === "bun" ? "bun" : "npm"} test`;
      testConfidence = "high";

      if (/vitest/i.test(scriptVal) || allDeps["vitest"]) {
        testFramework = "vitest";
      } else if (/jest/i.test(scriptVal) || allDeps["jest"]) {
        testFramework = "jest";
      } else if (/mocha/i.test(scriptVal) || allDeps["mocha"]) {
        testFramework = "mocha";
      } else if (/playwright/i.test(scriptVal) || allDeps["@playwright/test"]) {
        testFramework = "playwright";
      } else if (/node\s+--test/i.test(scriptVal)) {
        testFramework = "node:test";
      }
    } else if (primaryLanguage === "Python") {
      testCommand = "pytest";
      testFramework = "pytest";
      testConfidence = "high";
    } else if (primaryLanguage === "Go") {
      testCommand = "go test ./...";
      testFramework = "go test";
      testConfidence = "high";
    } else if (primaryLanguage === "Rust") {
      testCommand = "cargo test";
      testFramework = "cargo test";
      testConfidence = "high";
    } else if (primaryLanguage === "Java") {
      testCommand = fs.existsSync(path.join(repoPath, "mvnw")) ? "./mvnw test" : "mvn test";
      testConfidence = "medium";
    }

    const isShopLiteDemo =
      repoUrl.toLowerCase().includes("shoplite") ||
      repoName.toLowerCase() === "shoplite" ||
      (hasBackend && hasFrontend && databaseOrm === "prisma");

    return {
      repoUrl,
      repoName,
      branch,
      commit,
      primaryLanguage,
      languages,
      framework,
      projectType,
      packageManager,
      lockfiles,
      testFramework,
      testCommand,
      testConfidence,
      subprojects,
      databaseOrm,
      sourceDirs,
      configFiles,
      isShopLiteDemo,
    };
  }

  private static extractRepoName(url: string, repoPath: string): string {
    const slugMatch = url.match(/\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)?$/);
    if (slugMatch && slugMatch[1]) {
      return slugMatch[1];
    }
    return path.basename(repoPath);
  }

  private static async hasWorkspaceConfig(repoPath: string): Promise<boolean> {
    try {
      const pkgPath = path.join(repoPath, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(await fs.promises.readFile(pkgPath, "utf-8"));
        return Boolean(pkg.workspaces);
      }
    } catch {}
    return false;
  }

  private static async hasFileEnding(dirPath: string, extensions: string[], depth: number = 0): Promise<boolean> {
    if (depth > 2) return false;
    try {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const item of items) {
        if (item.name === "node_modules" || item.name === ".git" || item.name === ".buildtwin") continue;
        if (item.isFile() && extensions.some((ext) => item.name.endsWith(ext))) {
          return true;
        }
        if (item.isDirectory()) {
          const subFound = await this.hasFileEnding(path.join(dirPath, item.name), extensions, depth + 1);
          if (subFound) return true;
        }
      }
    } catch {}
    return false;
  }

  private static async readTextFiles(dirPath: string, fileNames: string[]): Promise<string> {
    let combined = "";
    for (const name of fileNames) {
      const p = path.join(dirPath, name);
      if (fs.existsSync(p)) {
        try {
          combined += (await fs.promises.readFile(p, "utf-8")) + "\n";
        } catch {}
      }
    }
    return combined;
  }
}
