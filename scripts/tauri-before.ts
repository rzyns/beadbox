import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const mode = process.argv[2]
if (mode !== "dev" && mode !== "build") {
  throw new Error("Usage: bun scripts/tauri-before.ts <dev|build>")
}

const root = resolve(import.meta.dir, "..")
let shell = "bash"
if (process.platform === "win32") {
  // `bash` on Windows PATH may be WSL, which cannot use the native toolchain.
  const git = Bun.which("git")
  const candidates = [
    ...(git
      ? [resolve(dirname(git), "../bin/bash.exe"), resolve(dirname(git), "../usr/bin/bash.exe")]
      : []),
    ...[process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA]
      .filter((base): base is string => !!base)
      .flatMap((base) => [join(base, "Git/bin/bash.exe"), join(base, "Programs/Git/bin/bash.exe")]),
  ]
  const gitBash = candidates.find((candidate) => existsSync(candidate))
  if (!gitBash)
    throw new Error("Git Bash not found. Install Git for Windows before building Beadbox.")
  shell = gitBash
}

const sidecar = Bun.spawn(
  [shell, "src-tauri/scripts/copy-sidecar.sh", ...(mode === "dev" ? ["--skip-upx"] : [])],
  {
    cwd: root,
    stdio: ["inherit", "inherit", "inherit"],
  },
)
const sidecarExit = await sidecar.exited
if (sidecarExit !== 0) process.exit(sidecarExit)

const client = Bun.spawn([process.execPath, "run", mode], {
  cwd: join(root, "packages/client"),
  stdio: ["inherit", "inherit", "inherit"],
})
process.exit(await client.exited)
