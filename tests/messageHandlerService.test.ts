import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";

vi.mock("../src/bot.js", () => ({ botRebootTime: Date.now() }));
vi.mock("../src/agents/agent.servce.js", () => ({ runAgent: vi.fn(async () => "Test reply") }));
vi.mock("../src/config/agent.protocol.js", () => ({ createProtocols: vi.fn(() => ({ allowGroupReplies: true })) }));
vi.mock("../src/services/memory.service.js", () => ({ storeMessage: vi.fn() }));
vi.mock("../src/services/command.service.js", () => ({ handleCommand: vi.fn(async () => {}) }));

import { getDebounceMs, cleanupPendingReplies, getPendingReplyCount, handleMessages, stopPendingReplyCleanup } from "../src/services/messageHandler.service.js";

const futureTimestamp = Math.floor(new Date("2099-01-01T00:00:00Z").getTime() / 1000);

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
});

describe("messageHandler service", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2025, 0, 1, 0, 0, 0) });
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "86400000";
    process.env.CHAT_BUDDY_PENDING_REPLY_TTL_HOURS = "1";
    process.env.CHAT_BUDDY_PENDING_REPLY_CLEANUP_INTERVAL_MS = "300000";
  });

  afterEach(() => {
    vi.useRealTimers();
    stopPendingReplyCleanup();
    delete process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS;
    delete process.env.CHAT_BUDDY_PENDING_REPLY_TTL_HOURS;
    delete process.env.CHAT_BUDDY_PENDING_REPLY_CLEANUP_INTERVAL_MS;
    vi.restoreAllMocks();
  });

  test("removes stale pending replies after the configured TTL", async () => {
    const message = {
      fromMe: false,
      timestamp: futureTimestamp,
      body: "hello",
      from: "user@c.us",
      getContact: vi.fn(async () => ({ pushname: "Test User", number: "12345" })),
      reply: vi.fn(async () => {}),
    } as any;

    await handleMessages(message, "Asad", "Luffy");
    expect(getPendingReplyCount()).toBe(1);

    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    cleanupPendingReplies();

    expect(getPendingReplyCount()).toBe(0);
  });

  test("processes buffered replies and clears the pending entry after completion", async () => {
    process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS = "2200";

    const message = {
      fromMe: false,
      timestamp: futureTimestamp,
      body: "hi",
      from: "user@c.us",
      getContact: vi.fn(async () => ({ pushname: "Test User", number: "12345" })),
      reply: vi.fn(async () => {}),
    } as any;

    await handleMessages(message, "Asad", "Luffy");
    expect(getPendingReplyCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(2200);

    expect(getPendingReplyCount()).toBe(0);
    expect(message.reply).toHaveBeenCalled();
  });
});
