import path from "path";
import fs from "fs";

export interface MutationResult {
  applied: boolean;
  filePath: string;
  oldValue: string;
  newValue: string;
  changedFiles: string[];
}

export class MutationService {
  /**
   * Applies a controlled find/replace mutation to a specified file inside the sandbox.
   * Never modifies anything outside the sandbox.
   */
  public static async applyMutation(
    sandboxPath: string,
    relativeFilePath: string,
    oldValue: string,
    newValue: string
  ): Promise<MutationResult> {
    if (!relativeFilePath || typeof relativeFilePath !== "string") {
      throw new Error("Target file path is required.");
    }

    if (!oldValue || typeof oldValue !== "string") {
      throw new Error("Find pattern (oldValue) cannot be empty.");
    }

    // Sanitize path to prevent directory traversal
    let safeRelativePath = path.normalize(relativeFilePath).replace(/^(\.\.[\/\\])+/, "");
    let absoluteFilePath = path.resolve(sandboxPath, safeRelativePath);

    // Verify file stays within the sandbox directory
    if (!absoluteFilePath.startsWith(path.resolve(sandboxPath))) {
      throw new Error("Invalid target file path: Directory traversal detected.");
    }

    // If not found directly, check subdirectories (e.g. backend/)
    if (!fs.existsSync(absoluteFilePath)) {
      const backendSubPath = path.join(sandboxPath, "backend", safeRelativePath);
      if (fs.existsSync(backendSubPath)) {
        absoluteFilePath = backendSubPath;
        safeRelativePath = path.join("backend", safeRelativePath);
      } else {
        throw new Error(`Target file not found in sandbox repository: ${safeRelativePath}`);
      }
    }

    const fileContent = await fs.promises.readFile(absoluteFilePath, "utf-8");

    // Replace the pattern (exact match first, then whitespace-tolerant regex)
    let updatedContent: string;
    if (fileContent.includes(oldValue)) {
      updatedContent = fileContent.replace(oldValue, newValue);
    } else {
      const escaped = oldValue.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      const regex = new RegExp(escaped);
      if (regex.test(fileContent)) {
        updatedContent = fileContent.replace(regex, newValue);
      } else {
        throw new Error(
          `Pattern to replace was not found in ${safeRelativePath}.\nExpected to find: "${oldValue}"`
        );
      }
    }

    // Save only inside the sandbox
    await fs.promises.writeFile(absoluteFilePath, updatedContent, "utf-8");

    return {
      applied: true,
      filePath: safeRelativePath.replace(/\\/g, "/"),
      oldValue,
      newValue,
      changedFiles: [safeRelativePath.replace(/\\/g, "/")],
    };
  }
}
