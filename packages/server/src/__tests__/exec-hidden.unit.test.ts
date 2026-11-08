import { describe, expect, test } from "bun:test"
import { tmpdir } from "node:os"
import { execFileAsync } from "../lib/exec"

describe("background command execution", () => {
  test("preserves arguments, cwd, environment, stdout and stderr", async () => {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        "-e",
        "process.stdout.write(JSON.stringify({args:process.argv.slice(1),cwd:process.cwd(),value:process.env.BEADBOX_EXEC_TEST})); process.stderr.write('diagnostic')",
        "argument with spaces & punctuation",
      ],
      { cwd: tmpdir(), env: { ...process.env, BEADBOX_EXEC_TEST: "kept" } },
    )
    expect(JSON.parse(stdout)).toEqual({
      args: ["argument with spaces & punctuation"],
      cwd: tmpdir().replace(/[\\/]$/, ""),
      value: "kept",
    })
    expect(stderr).toBe("diagnostic")
  })

  test("rejects a failed command with its exit code and both output streams", async () => {
    await expect(
      execFileAsync(process.execPath, [
        "-e",
        "process.stdout.write('before failure'); process.stderr.write('failure detail'); process.exit(7)",
      ]),
    ).rejects.toMatchObject({ code: 7, stdout: "before failure", stderr: "failure detail" })
  })

  test.skipIf(process.platform !== "win32")(
    "Windows command has no visible console",
    async () => {
      const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class ConsoleProbe { [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow(); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); }'; [Console]::Write([ConsoleProbe]::IsWindowVisible([ConsoleProbe]::GetConsoleWindow()))`
      const { stdout } = await execFileAsync(
        "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        { timeout: 15_000 },
      )
      expect(stdout).toBe("False")
    },
    20_000,
  )

  test.skipIf(!Bun.which("bd"))("real bd succeeds and reports invalid-command errors", async () => {
    const { stdout } = await execFileAsync("bd", ["version", "--json"], { timeout: 15_000 })
    expect(JSON.parse(stdout).version).toMatch(/\d+\.\d+\.\d+/)
    try {
      await execFileAsync("bd", ["beadbox-nonexistent-test-command"], { timeout: 15_000 })
      throw new Error("bd unexpectedly accepted an invalid command")
    } catch (error) {
      expect(error).toMatchObject({ code: 1 })
      expect((error as { stderr: string }).stderr).toContain("beadbox-nonexistent-test-command")
    }
  })
})
