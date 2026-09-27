import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ClonedRepo {
  clonePath: string;
  repoName: string;
  branch: string;
  commit: string;
}

export class RepositoryService {
  /**
   * Validates that the input repository URL is a legitimate GitHub repository URL.
   * Strips malicious shell characters.
   */
  public static validateUrl(url: string): { valid: boolean; error?: string; repoName?: string } {
    if (!url || typeof url !== "string") {
      return { valid: false, error: "Repository URL is required." };
    }

    const trimmed = url.trim();

    // Check for dangerous characters (shell injection prevention)
    const dangerousChars = /[;&|`$<>\n\r\\]/;
    if (dangerousChars.test(trimmed)) {
      return { valid: false, error: "Repository URL contains invalid characters." };
    }

    // Support local test fixtures
    if (trimmed.startsWith("fixture:")) {
      const fixtureName = trimmed.replace("fixture:", "").trim();
      return { valid: true, repoName: fixtureName };
    }
    if (trimmed === "local-fixture" || trimmed === "fixture" || trimmed === "shoplite-fixture") {
      return { valid: true, repoName: "shoplite-core" };
    }

    // Support standard GitHub URLs and owner/repo slug format
    const githubUrlRegex = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)?$/;
    const slugRegex = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;

    const urlMatch = trimmed.match(githubUrlRegex);
    if (urlMatch) {
      return { valid: true, repoName: urlMatch[2] };
    }

    const slugMatch = trimmed.match(slugRegex);
    if (slugMatch) {
      return { valid: true, repoName: slugMatch[2] };
    }

    return {
      valid: false,
      error: "Please enter a valid GitHub repository URL (e.g., https://github.com/example/shoplite)",
    };
  }

  /**
   * Clones a repository into a unique temporary directory.
   * If it matches the demo/fixture repository, uses the local verified fixture.
   */
  public static async cloneRepository(url: string, requestedBranch?: string): Promise<ClonedRepo> {
    const validation = this.validateUrl(url);
    if (!validation.valid || !validation.repoName) {
      throw new Error(validation.error || "Invalid repository URL");
    }

    const branch = requestedBranch?.trim() || "main";
    const repoName = validation.repoName;
    const uniqueId = `bt-repo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const rawTempDir = path.join(os.tmpdir(), "buildtwin", "clones", uniqueId);
    await fs.promises.mkdir(rawTempDir, { recursive: true });

    const tempDir = fs.existsSync(rawTempDir)
      ? typeof fs.realpathSync.native === "function"
        ? fs.realpathSync.native(rawTempDir)
        : fs.realpathSync(rawTempDir)
      : rawTempDir;

    // Only use internal fixture for explicit local test fixture requests
    const isLocalFixtureOnly =
      url.startsWith("fixture:") ||
      url === "local-fixture" ||
      url === "fixture" ||
      url === "shoplite-fixture";

    if (isLocalFixtureOnly) {
      const fixtureSubdir = url.startsWith("fixture:")
        ? url.replace("fixture:", "").trim()
        : "shoplite-core";
      const fixtureDir = path.join(process.cwd(), "fixtures", fixtureSubdir);
      if (fs.existsSync(fixtureDir)) {
        await this.copyRecursive(fixtureDir, tempDir);
        let commit = "7f9a2e1";
        try {
          const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], {
            cwd: tempDir,
          });
          commit = stdout.trim() || commit;
        } catch {
          // fallback commit
        }
        return {
          clonePath: tempDir,
          repoName: repoName,
          branch,
          commit,
        };
      }
    }

    // Real GitHub Repository Clone
    const cloneArgs = ["clone", "--depth", "1"];
    if (requestedBranch && requestedBranch !== "main") {
      cloneArgs.push("-b", requestedBranch);
    }
    cloneArgs.push(url.trim(), tempDir);

    try {
      await execFileAsync("git", cloneArgs, {
        timeout: 30000, // 30s clone timeout
        maxBuffer: 10 * 1024 * 1024,
      });

      let commit = "HEAD";
      try {
        const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], {
          cwd: tempDir,
        });
        commit = stdout.trim() || commit;
      } catch {
        // commit fallback
      }

      return {
        clonePath: tempDir,
        repoName,
        branch,
        commit,
      };
    } catch (err: any) {
      // Clean up temp dir on clone failure
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      throw new Error(`Failed to clone repository: ${err.message || String(err)}`);
    }
  }

  /**
   * Helper to copy directories recursively preserving file tree
   */
  private static async copyRecursive(src: string, dest: string): Promise<void> {
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    await fs.promises.mkdir(dest, { recursive: true });

    for (const entry of entries) {
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
