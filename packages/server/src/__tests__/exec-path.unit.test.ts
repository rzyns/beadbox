import { describe, expect, test } from "bun:test"
import { appendToolDirs } from "../lib/exec"

describe("tool PATH augmentation", () => {
  test("keeps Windows drive letters and semicolon-separated entries intact", () => {
    const original = String.raw`C:\Windows;C:\Program Files\Git\cmd`
    const extra = String.raw`C:\Users\tester\go\bin`
    expect(appendToolDirs(original, [extra], ";").split(";")).toEqual([
      String.raw`C:\Windows`,
      String.raw`C:\Program Files\Git\cmd`,
      extra,
    ])
  })

  test("does not duplicate directories on repeated startup", () => {
    const dirs = [String.raw`C:\tools\bd`, String.raw`C:\tools\dolt`]
    const once = appendToolDirs(String.raw`C:\Windows`, dirs, ";")
    expect(appendToolDirs(once, dirs, ";")).toBe(once)
  })

  test("retains POSIX separators and handles an initially empty PATH", () => {
    expect(appendToolDirs("/usr/bin", ["/usr/bin", "/usr/local/bin"], ":")).toBe(
      "/usr/bin:/usr/local/bin",
    )
    expect(appendToolDirs("", ["/usr/bin"], ":")).toBe("/usr/bin")
  })
})
