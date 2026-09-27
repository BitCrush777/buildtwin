import path from "path";
import fs from "fs";
import { FailureDetail, ImpactedWorkflow } from "./types";

export interface ImpactOccurrence {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  category: "DIRECT IMPACT" | "INDIRECT IMPACT" | "POSSIBLE IMPACT";
}

export class ImpactService {
  private static readonly IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    ".next",
    ".buildtwin",
    "dist",
    "build",
    "coverage",
    ".turbo",
  ]);

  /**
   * Performs dynamic impact analysis across the repository for a given mutation.
   * Finds real occurrences, imports, and downstream consumers with exact line numbers.
   */
  public static async analyzeImpact(
    sandboxPath: string,
    mutatedFilePath: string,
    oldValue: string,
    newValue: string,
    failures: FailureDetail[] = [],
    isVerified: boolean = false
  ): Promise<{
    workflows: ImpactedWorkflow[];
    affectedFiles: string[];
  }> {
    const normMutated = mutatedFilePath.replace(/\\/g, "/");
    const occurrences: ImpactOccurrence[] = [];
    const affectedFilesSet = new Set<string>();
    affectedFilesSet.add(normMutated);

    // Also include files explicitly cited in test failures
    for (const f of failures) {
      if (f.file) {
        affectedFilesSet.add(f.file.replace(/\\/g, "/"));
      }
    }

    // Extract identifier for symbol searching (e.g. "email" from "email String @unique")
    const searchTokens = this.extractSearchTokens(oldValue);

    // Recursively scan repository source files
    await this.scanDirectory(sandboxPath, sandboxPath, searchTokens, normMutated, occurrences);

    // Construct workflows based on actual evidence
    const workflows: ImpactedWorkflow[] = [];
    const occurrencesByFile = new Map<string, ImpactOccurrence[]>();

    for (const occ of occurrences) {
      affectedFilesSet.add(occ.filePath);
      const list = occurrencesByFile.get(occ.filePath) || [];
      list.push(occ);
      occurrencesByFile.set(occ.filePath, list);
    }

    let wfIndex = 1;

    // 1. Target Mutated File
    const targetOccs = occurrencesByFile.get(normMutated) || [];
    const targetFailure = failures.find((f) => f.file && f.file.replace(/\\/g, "/") === normMutated);

    workflows.push({
      id: `wf-${wfIndex++}`,
      name: `${this.formatServiceName(normMutated)} (Target Mutation)`,
      filePath: normMutated,
      line: targetOccs[0]?.lineNumber || 1,
      state: isVerified ? "PASSED" : targetFailure || failures.length > 0 ? "FAILED" : "PASSED",
      count: targetOccs.length || 1,
      observedFailure: isVerified
        ? "Remediated: compatible accessor active"
        : targetFailure?.message || `Field definition mutated to '${newValue}'`,
      details: targetOccs[0]?.lineContent || `Mutation applied: ${oldValue} -> ${newValue}`,
      suggestedFix: isVerified
        ? "Patch verified"
        : `Provide backward-compatible accessor or deprecation shim for '${newValue}'`,
    });

    // 2. Add each file that has direct references or test failures
    for (const [relPath, occList] of Array.from(occurrencesByFile.entries())) {
      if (relPath === normMutated) continue;

      const fileFailure = failures.find((f) => f.file && f.file.replace(/\\/g, "/") === relPath);
      const isFailed = !isVerified && (fileFailure !== undefined || failures.length > 0);
      const firstOcc = occList[0];

      workflows.push({
        id: `wf-${wfIndex++}`,
        name: this.formatServiceName(relPath),
        filePath: relPath,
        line: firstOcc.lineNumber,
        state: isFailed ? "FAILED" : "PASSED",
        count: occList.length,
        observedFailure: isVerified
          ? "Remediated: compatible accessor active"
          : fileFailure?.message || `Direct reference to '${searchTokens[0] || oldValue}' at line ${firstOcc.lineNumber}`,
        details: firstOcc.lineContent.slice(0, 100),
        suggestedFix: isVerified
          ? "Patch verified"
          : `Update consumer to support '${newValue}' while retaining backward-compatible fallback`,
      });
    }

    // 3. Include any failing test file not already in workflows
    for (const f of failures) {
      const failPath = (f.file || "").replace(/\\/g, "/");
      if (failPath && !workflows.some((w) => w.filePath === failPath)) {
        affectedFilesSet.add(failPath);
        workflows.push({
          id: `wf-${wfIndex++}`,
          name: this.formatServiceName(failPath),
          filePath: failPath,
          line: 1,
          state: isVerified ? "PASSED" : "FAILED",
          count: 1,
          observedFailure: isVerified ? "Remediated: test suite verified" : f.message,
          details: f.test,
          suggestedFix: isVerified
            ? "Patch verified"
            : `Align assertions or provide compatibility bridge for '${newValue}'`,
        });
      }
    }

    return {
      workflows,
      affectedFiles: Array.from(affectedFilesSet),
    };
  }

  private static extractSearchTokens(val: string): string[] {
    const trimmed = val.trim();
    const tokens = new Set<string>();

    // If it's a field declaration like "email String @unique", extract "email"
    const fieldMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (fieldMatch && fieldMatch[1]) {
      tokens.add(fieldMatch[1]);
    }

    // If it's an assignment or property access like "email: ..."
    const propMatch = trimmed.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]/);
    if (propMatch && propMatch[1]) {
      tokens.add(propMatch[1]);
    }

    tokens.add(trimmed);
    return Array.from(tokens).filter((t) => t.length >= 3);
  }

  private static async scanDirectory(
    rootPath: string,
    currentPath: string,
    searchTokens: string[],
    mutatedRelPath: string,
    occurrences: ImpactOccurrence[]
  ): Promise<void> {
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (this.IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(currentPath, entry.name);
      const relPath = path.relative(rootPath, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        await this.scanDirectory(rootPath, fullPath, searchTokens, mutatedRelPath, occurrences);
      } else if (entry.isFile()) {
        // Only inspect code/text files
        if (!/\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|cs|prisma|json|yaml|yml|sql)$/i.test(entry.name)) {
          continue;
        }

        try {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          const lines = content.split(/\r?\n/);

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const hasMatch = searchTokens.some((token) => line.includes(token));

            if (hasMatch) {
              const isTestFile = /(?:test|spec)\b/i.test(relPath);
              const category: ImpactOccurrence["category"] =
                relPath === mutatedRelPath
                  ? "DIRECT IMPACT"
                  : isTestFile
                  ? "INDIRECT IMPACT"
                  : "DIRECT IMPACT";

              occurrences.push({
                filePath: relPath,
                lineNumber: i + 1,
                lineContent: line.trim(),
                category,
              });

              // Cap occurrences per file to avoid bloat
              if (occurrences.filter((o) => o.filePath === relPath).length >= 5) {
                break;
              }
            }
          }
        } catch {}
      }
    }
  }

  private static formatServiceName(filePath: string): string {
    const parts = filePath.split("/");
    const fileName = parts[parts.length - 1];
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");

    // Capitalize and format
    const readable = nameWithoutExt
      .split(/[-_.]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    if (parts.includes("routes") || parts.includes("controllers") || parts.includes("api")) {
      return `${readable} Endpoint`;
    }
    if (parts.includes("middleware")) {
      return `${readable} Middleware`;
    }
    if (parts.includes("models") || parts.includes("prisma") || parts.includes("entities")) {
      return `${readable} Schema/Model`;
    }
    if (parts.includes("services")) {
      return `${readable} Service`;
    }
    if (parts.includes("tests") || parts.includes("e2e")) {
      return `${readable} Test Suite`;
    }

    return `${readable} (${fileName})`;
  }
}
