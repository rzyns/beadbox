import { spawn } from "node:child_process"
import { resolve } from "node:path"
import { NodeIo, RPCChannel } from "kkrpc"

const executable = process.argv[2]
if (!executable) throw new Error("Usage: bun smoke-compiled.ts <sidecar-executable>")

const child = spawn(resolve(executable), [], {
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
})
child.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk))
const channel = new RPCChannel<
  Record<string, never>,
  { system: { getLogDirectory(): Promise<string | null> } }
>(new NodeIo(child.stdout, child.stdin))
let timer: ReturnType<typeof setTimeout> | undefined
try {
  const failed = new Promise<never>((_, reject) => {
    child.once("error", reject)
    child.once("exit", (code) => reject(new Error(`Sidecar exited before RPC reply: ${code}`)))
    timer = setTimeout(() => reject(new Error("Sidecar RPC timed out after 10 seconds")), 10_000)
  })
  const result = await Promise.race([channel.getAPI().system.getLogDirectory(), failed])
  if (result !== null && typeof result !== "string") throw new Error("Invalid sidecar RPC reply")
  console.log("Compiled sidecar RPC smoke check passed")
} finally {
  clearTimeout(timer)
  channel.destroy()
  child.kill()
}
