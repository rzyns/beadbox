import { execFile, type ExecFileOptions } from "child_process"
import { existsSync } from "fs"
import { homedir } from "os"
import { delimiter, join } from "path"
import { promisify } from "util"

// Augment process.env.PATH with common tool directories so child processes
// (bd, dolt) can find binaries regardless of how the Node process was launched.
// On Linux desktop environments and macOS GUI apps (Tauri sidecar), the inherited
// PATH is often stripped to a minimal set that excludes /usr/local/bin, Homebrew
// paths, and user-local install directories.
const COMMON_TOOL_DIRS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/home/linuxbrew/.linuxbrew/bin",
  join(homedir(), "go/bin"),
  join(homedir(), ".local/bin"),
  join(homedir(), ".dolt/bin"),
]

export function appendToolDirs(
  currentPath: string,
  toolDirs: string[],
  separator = delimiter,
): string {
  const currentDirs = new Set(currentPath.split(separator).filter(Boolean))
  const missing = toolDirs.filter((dir) => !currentDirs.has(dir))
  if (missing.length === 0) return currentPath
  return [currentPath, ...missing].filter(Boolean).join(separator)
}

process.env.PATH = appendToolDirs(
  process.env.PATH ?? "",
  COMMON_TOOL_DIRS.filter((dir) => existsSync(dir)),
)

const executeFile = promisify(execFile)

// Piped output alone does not stop Windows from creating a console for bd.exe.
// Keep stdout, stderr, timeouts and nonzero exit errors while hiding that console.
export const execFileAsync = (
  file: string,
  args: readonly string[],
  options: ExecFileOptions = {},
) => {
  return executeFile(file, args, { ...options, encoding: "utf8", windowsHide: true })
}
export { existsSync } from "fs"
