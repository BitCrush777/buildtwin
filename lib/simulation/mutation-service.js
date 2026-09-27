"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class MutationService {
    /**
     * Applies a controlled find/replace mutation to a specified file inside the sandbox.
     * Never modifies anything outside the sandbox.
     */
    static async applyMutation(sandboxPath, relativeFilePath, oldValue, newValue) {
        if (!relativeFilePath || typeof relativeFilePath !== "string") {
            throw new Error("Target file path is required.");
        }
        if (!oldValue || typeof oldValue !== "string") {
            throw new Error("Find pattern (oldValue) cannot be empty.");
        }
        // Sanitize path to prevent directory traversal
        let safeRelativePath = path_1.default.normalize(relativeFilePath).replace(/^(\.\.[\/\\])+/, "");
        let absoluteFilePath = path_1.default.resolve(sandboxPath, safeRelativePath);
        // Verify file stays within the sandbox directory
        if (!absoluteFilePath.startsWith(path_1.default.resolve(sandboxPath))) {
            throw new Error("Invalid target file path: Directory traversal detected.");
        }
        // If not found directly, check subdirectories (e.g. backend/)
        if (!fs_1.default.existsSync(absoluteFilePath)) {
            const backendSubPath = path_1.default.join(sandboxPath, "backend", safeRelativePath);
            if (fs_1.default.existsSync(backendSubPath)) {
                absoluteFilePath = backendSubPath;
                safeRelativePath = path_1.default.join("backend", safeRelativePath);
            }
            else {
                throw new Error(`Target file not found in sandbox repository: ${safeRelativePath}`);
            }
        }
        const fileContent = await fs_1.default.promises.readFile(absoluteFilePath, "utf-8");
        // Replace the pattern (exact match first, then whitespace-tolerant regex)
        let updatedContent;
        if (fileContent.includes(oldValue)) {
            updatedContent = fileContent.replace(oldValue, newValue);
        }
        else {
            const escaped = oldValue.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
            const regex = new RegExp(escaped);
            if (regex.test(fileContent)) {
                updatedContent = fileContent.replace(regex, newValue);
            }
            else {
                throw new Error(`Pattern to replace was not found in ${safeRelativePath}.\nExpected to find: "${oldValue}"`);
            }
        }
        // Save only inside the sandbox
        await fs_1.default.promises.writeFile(absoluteFilePath, updatedContent, "utf-8");
        return {
            applied: true,
            filePath: safeRelativePath.replace(/\\/g, "/"),
            oldValue,
            newValue,
            changedFiles: [safeRelativePath.replace(/\\/g, "/")],
        };
    }
}
exports.MutationService = MutationService;
