"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class ProfileService {
    /**
     * Inspects a cloned repository directory and dynamically discovers its stack,
     * package manager, test framework, subprojects, and test command.
     */
    static async inspectRepository(repoPath, repoUrl, branch = "main", commit = "HEAD") {
        const repoName = this.extractRepoName(repoUrl, repoPath);
        const languagesSet = new Set();
        const lockfiles = [];
        const configFiles = [];
        const sourceDirs = [];
        const subprojects = [];
        // 1. Scan root directory entries
        let rootEntries = [];
        try {
            rootEntries = await fs_1.default.promises.readdir(repoPath);
        }
        catch {
            rootEntries = [];
        }
        // Check lockfiles
        if (rootEntries.includes("pnpm-lock.yaml"))
            lockfiles.push("pnpm-lock.yaml");
        if (rootEntries.includes("yarn.lock"))
            lockfiles.push("yarn.lock");
        if (rootEntries.includes("package-lock.json"))
            lockfiles.push("package-lock.json");
        if (rootEntries.includes("bun.lock") || rootEntries.includes("bun.lockb"))
            lockfiles.push("bun.lock");
        if (rootEntries.includes("poetry.lock"))
            lockfiles.push("poetry.lock");
        if (rootEntries.includes("uv.lock"))
            lockfiles.push("uv.lock");
        if (rootEntries.includes("Cargo.lock"))
            lockfiles.push("Cargo.lock");
        // Check config files
        const knownConfigs = [
            "tsconfig.json", "vite.config.ts", "vite.config.js", "next.config.js", "next.config.mjs", "next.config.ts",
            "vitest.config.ts", "vitest.config.js", "playwright.config.ts", "playwright.config.js", "jest.config.js", "jest.config.ts",
            "pyproject.toml", "requirements.txt", "pytest.ini", "go.mod", "Cargo.toml", "pom.xml", "build.gradle"
        ];
        for (const cfg of knownConfigs) {
            if (rootEntries.includes(cfg))
                configFiles.push(cfg);
        }
        // Check common source directories
        for (const dir of ["src", "lib", "app", "pages", "backend", "frontend", "tests", "test", "e2e", "pkg", "cmd"]) {
            if (rootEntries.includes(dir) && fs_1.default.statSync(path_1.default.join(repoPath, dir)).isDirectory()) {
                sourceDirs.push(dir);
            }
        }
        // 2. Identify Subprojects (fullstack or monorepo)
        const hasBackend = rootEntries.includes("backend") && fs_1.default.existsSync(path_1.default.join(repoPath, "backend", "package.json"));
        const hasFrontend = rootEntries.includes("frontend") && fs_1.default.existsSync(path_1.default.join(repoPath, "frontend", "package.json"));
        if (hasBackend) {
            subprojects.push({ name: "backend", path: "backend", type: "backend" });
        }
        if (hasFrontend) {
            subprojects.push({ name: "frontend", path: "frontend", type: "frontend" });
        }
        let projectType = "single";
        if (hasBackend && hasFrontend) {
            projectType = "fullstack";
        }
        else if (rootEntries.includes("pnpm-workspace.yaml") || (await this.hasWorkspaceConfig(repoPath))) {
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
        let packageManager = "unknown";
        if (lockfiles.includes("pnpm-lock.yaml")) {
            packageManager = "pnpm";
        }
        else if (lockfiles.includes("yarn.lock")) {
            packageManager = "yarn";
        }
        else if (lockfiles.includes("bun.lock")) {
            packageManager = "bun";
        }
        else if (lockfiles.includes("package-lock.json") || rootEntries.includes("package.json")) {
            packageManager = "npm";
        }
        else if (lockfiles.includes("poetry.lock")) {
            packageManager = "poetry";
        }
        else if (lockfiles.includes("uv.lock")) {
            packageManager = "uv";
        }
        else if (rootEntries.includes("requirements.txt") || rootEntries.includes("pyproject.toml")) {
            packageManager = "pip";
        }
        else if (rootEntries.includes("Cargo.toml") || lockfiles.includes("Cargo.lock")) {
            packageManager = "cargo";
        }
        else if (rootEntries.includes("go.mod")) {
            packageManager = "go";
        }
        else if (rootEntries.includes("pom.xml")) {
            packageManager = "maven";
        }
        else if (rootEntries.includes("build.gradle")) {
            packageManager = "gradle";
        }
        // 5. Detect Framework
        let framework = "None";
        const rootPkgPath = path_1.default.join(repoPath, "package.json");
        let rootPkg = null;
        if (fs_1.default.existsSync(rootPkgPath)) {
            try {
                rootPkg = JSON.parse(await fs_1.default.promises.readFile(rootPkgPath, "utf-8"));
            }
            catch { }
        }
        const allDeps = {
            ...(rootPkg?.dependencies || {}),
            ...(rootPkg?.devDependencies || {}),
        };
        if (allDeps["next"] || rootEntries.some(e => e.startsWith("next.config"))) {
            framework = "Next.js";
        }
        else if (allDeps["express"]) {
            framework = "Express";
        }
        else if (allDeps["vite"] || rootEntries.some(e => e.startsWith("vite.config"))) {
            framework = "Vite";
        }
        else if (allDeps["fastify"]) {
            framework = "Fastify";
        }
        else if (rootEntries.includes("pyproject.toml") || rootEntries.includes("requirements.txt")) {
            const pyContent = await this.readTextFiles(repoPath, ["requirements.txt", "pyproject.toml"]);
            if (/fastapi/i.test(pyContent))
                framework = "FastAPI";
            else if (/flask/i.test(pyContent))
                framework = "Flask";
            else if (/django/i.test(pyContent))
                framework = "Django";
        }
        // 6. Detect Database / ORM
        let databaseOrm = "none";
        if (fs_1.default.existsSync(path_1.default.join(repoPath, "prisma", "schema.prisma")) ||
            fs_1.default.existsSync(path_1.default.join(repoPath, "backend", "prisma", "schema.prisma"))) {
            databaseOrm = "prisma";
        }
        else if (allDeps["typeorm"]) {
            databaseOrm = "typeorm";
        }
        else if (allDeps["drizzle-orm"]) {
            databaseOrm = "drizzle";
        }
        // 7. Detect Test Framework and Command
        let testFramework = "unknown";
        let testCommand = "npm test";
        let testConfidence = "low";
        if (rootPkg && rootPkg.scripts && rootPkg.scripts.test) {
            const scriptVal = rootPkg.scripts.test;
            testCommand = `${packageManager === "yarn" ? "yarn" : packageManager === "pnpm" ? "pnpm" : packageManager === "bun" ? "bun" : "npm"} test`;
            testConfidence = "high";
            if (/vitest/i.test(scriptVal) || allDeps["vitest"]) {
                testFramework = "vitest";
            }
            else if (/jest/i.test(scriptVal) || allDeps["jest"]) {
                testFramework = "jest";
            }
            else if (/mocha/i.test(scriptVal) || allDeps["mocha"]) {
                testFramework = "mocha";
            }
            else if (/playwright/i.test(scriptVal) || allDeps["@playwright/test"]) {
                testFramework = "playwright";
            }
            else if (/node\s+--test/i.test(scriptVal)) {
                testFramework = "node:test";
            }
        }
        else if (primaryLanguage === "Python") {
            testCommand = "pytest";
            testFramework = "pytest";
            testConfidence = "high";
        }
        else if (primaryLanguage === "Go") {
            testCommand = "go test ./...";
            testFramework = "go test";
            testConfidence = "high";
        }
        else if (primaryLanguage === "Rust") {
            testCommand = "cargo test";
            testFramework = "cargo test";
            testConfidence = "high";
        }
        else if (primaryLanguage === "Java") {
            testCommand = fs_1.default.existsSync(path_1.default.join(repoPath, "mvnw")) ? "./mvnw test" : "mvn test";
            testConfidence = "medium";
        }
        const isShopLiteDemo = repoUrl.toLowerCase().includes("shoplite") ||
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
    static extractRepoName(url, repoPath) {
        const slugMatch = url.match(/\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)?$/);
        if (slugMatch && slugMatch[1]) {
            return slugMatch[1];
        }
        return path_1.default.basename(repoPath);
    }
    static async hasWorkspaceConfig(repoPath) {
        try {
            const pkgPath = path_1.default.join(repoPath, "package.json");
            if (fs_1.default.existsSync(pkgPath)) {
                const pkg = JSON.parse(await fs_1.default.promises.readFile(pkgPath, "utf-8"));
                return Boolean(pkg.workspaces);
            }
        }
        catch { }
        return false;
    }
    static async hasFileEnding(dirPath, extensions, depth = 0) {
        if (depth > 2)
            return false;
        try {
            const items = await fs_1.default.promises.readdir(dirPath, { withFileTypes: true });
            for (const item of items) {
                if (item.name === "node_modules" || item.name === ".git" || item.name === ".buildtwin")
                    continue;
                if (item.isFile() && extensions.some((ext) => item.name.endsWith(ext))) {
                    return true;
                }
                if (item.isDirectory()) {
                    const subFound = await this.hasFileEnding(path_1.default.join(dirPath, item.name), extensions, depth + 1);
                    if (subFound)
                        return true;
                }
            }
        }
        catch { }
        return false;
    }
    static async readTextFiles(dirPath, fileNames) {
        let combined = "";
        for (const name of fileNames) {
            const p = path_1.default.join(dirPath, name);
            if (fs_1.default.existsSync(p)) {
                try {
                    combined += (await fs_1.default.promises.readFile(p, "utf-8")) + "\n";
                }
                catch { }
            }
        }
        return combined;
    }
}
exports.ProfileService = ProfileService;
