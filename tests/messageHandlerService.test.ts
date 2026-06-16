import { describe, test, expect, afterEach, vi } from "vitest";

vi.mock("../src/bot.js", () => ({ botRebootTime: Date.now() }));
vi.mock("../src/agents/agent.servce.js", () => ({ runAgent: vi.fn() }));
vi.mock("../src/config/agent.protocol.js", () => ({ createProtocols: vi.fn() }));
vi.mock("../src/services/memory.service.js", () => ({ storeMessage: vi.fn() }));
vi.mock("../src/services/command.service.js", () => ({ handleCommand: vi.fn() }));

import { getDebounceMs } from "../src/services/messageHandler.service.js";

describe("getDebounceMs()", () => {
  afterEach(() => {
    delete process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS;
  });

  test("returns 2200 when the env var is not set", () => {
    delete process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS;
    expect(getDebounceMs()).toBe(2200);
  });

  test("clamps to the minimum of 300 when the value is too low", () => {
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "50";
    expect(getDebounceMs()).toBe(300);
  });

  test("clamps to the maximum of 15000 when the value is too high", () => {
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "99999";
    expect(getDebounceMs()).toBe(15000);
  });

  test("returns 2200 for a non-numeric value", () => {
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "not-a-number";
    expect(getDebounceMs()).toBe(2200);
  });

  test("clamps to 300 for an empty string (Number('') === 0, which is below the min)", () => {
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "";
    expect(getDebounceMs()).toBe(300);
  });

  test("returns the value unchanged when it is within the valid range", () => {
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "5000";
    expect(getDebounceMs()).toBe(5000);
  });

  test("floors decimal values", () => {
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "2500.9";
    expect(getDebounceMs()).toBe(2500);
  });

  test("returns valid debounce value within range", () => {
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "1000";

    expect(getDebounceMs()).toBe(1000);
  });
});
