import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../agents/agent.servce.js", () => ({
  runAgent: vi.fn(async () => "Test reply"),
}));

vi.mock("./memory.service.js", () => ({
  storeMessage: vi.fn(),
}));

vi.mock("./command.service.js", () => ({
  handleCommand: vi.fn(async () => {}),
}));

import {
  cleanupPendingReplies,
  getPendingReplyCount,
  handleMessages,
  stopPendingReplyCleanup,
} from "./messageHandler.service.js";

describe("messageHandler service", () => {
  const futureTimestamp = Math.floor(new Date("2099-01-01T00:00:00Z").getTime() / 1000);

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

  it("removes stale pending replies after the configured TTL", async () => {
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

  it("processes buffered replies and clears the pending entry after completion", async () => {
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
