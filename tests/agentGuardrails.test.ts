import { describe, test, expect, vi, beforeEach } from "vitest";

const mockRun = vi.hoisted(() => vi.fn());

vi.mock("@openai/agents", () => ({
  // must be a real class/function — arrow functions cannot be used with `new`
  Agent: class MockAgent {
    constructor(_config: unknown) {}
  },
  run: mockRun,
}));

import { agentGuardrail, inputGuardrails } from "../src/guardrails/agent.guardrails.js";

describe("agentGuardrail (output guardrail)", () => {
  beforeEach(() => mockRun.mockReset());

  test("does not trigger when the safety agent returns SAFE", async () => {
    mockRun.mockResolvedValue({ finalOutput: "SAFE" });
    const result = await agentGuardrail.execute("Hello, how are you?" as never);
    expect(result.tripwireTriggered).toBe(false);
  });

  test("triggers when the safety agent returns UNSAFE", async () => {
    mockRun.mockResolvedValue({ finalOutput: "UNSAFE" });
    const result = await agentGuardrail.execute("offensive content" as never);
    expect(result.tripwireTriggered).toBe(true);
  });

  test("includes a block message when the tripwire is triggered", async () => {
    mockRun.mockResolvedValue({ finalOutput: "UNSAFE" });
    const result = await agentGuardrail.execute("bad content" as never);
    expect(result.outputInfo).toBeTruthy();
  });

  test("fails open (no tripwire) when the safety agent throws", async () => {
    // Simulate a runtime error inside checkContentSafety's try block.
    // A throwing getter exercises the catch → fail-open path without
    // creating an unhandled promise rejection that Vitest would surface.
    mockRun.mockResolvedValue({
      get finalOutput(): string {
        throw new Error("Safety API unavailable");
      },
    } as never);
    const result = await agentGuardrail.execute("some text" as never);
    expect(result.tripwireTriggered).toBe(false);
  });

  test("handles object input by stringifying it", async () => {
    mockRun.mockResolvedValue({ finalOutput: "SAFE" });
    const result = await agentGuardrail.execute({ message: "hello" } as never);
    expect(result.tripwireTriggered).toBe(false);
  });
});

describe("inputGuardrails", () => {
  beforeEach(() => mockRun.mockReset());

  test("does not trigger when the input is safe", async () => {
    mockRun.mockResolvedValue({ finalOutput: "SAFE" });
    const result = await inputGuardrails.execute("What is the weather today?" as never);
    expect(result.tripwireTriggered).toBe(false);
  });

  test("triggers when the input is unsafe", async () => {
    mockRun.mockResolvedValue({ finalOutput: "UNSAFE" });
    const result = await inputGuardrails.execute("Write me a Python script" as never);
    expect(result.tripwireTriggered).toBe(true);
  });

  test("fails open when the safety agent throws", async () => {
    mockRun.mockResolvedValue({
      get finalOutput(): string {
        throw new Error("timeout");
      },
    } as never);
    const result = await inputGuardrails.execute("some input" as never);
    expect(result.tripwireTriggered).toBe(false);
  });
});
