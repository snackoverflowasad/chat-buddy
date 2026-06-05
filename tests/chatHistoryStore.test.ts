import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("fs", () => {
  const m = {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue("{}"),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    chmodSync: vi.fn(),
  };
  return { default: m, ...m };
});

vi.mock("../src/storage/configStore.js", () => ({
  getStorageDir: () => "/mock/storage",
  ensureStorageDir: vi.fn(),
}));

import {
  appendMessage,
  getUserHistoryForContext,
  clearUserHistory,
  clearAllHistory,
} from "../src/storage/chatHistoryStore.js";

// chatHistoryStore is now keyed by stable userId; displayName is passed at read time.
const USER_ID = "12345@c.us";
const DISPLAY_NAME = "Alice";

describe("chatHistoryStore", () => {
  beforeEach(() => {
    clearAllHistory();
  });

  test("appendMessage stores a message retrievable via getUserHistoryForContext", () => {
    appendMessage(USER_ID, "Hello, bot!");
    const history = getUserHistoryForContext(USER_ID, DISPLAY_NAME);
    expect(history).toHaveLength(1);
    expect(history[0]).toContain(`${DISPLAY_NAME}: Hello, bot!`);
  });

  test("appendMessage marks agent messages with an 'agent:' label", () => {
    appendMessage(USER_ID, "I am the agent", true);
    const history = getUserHistoryForContext(USER_ID, DISPLAY_NAME);
    expect(history[0]).toContain("agent: I am the agent");
  });

  test("getUserHistoryForContext respects the maxMessages limit", () => {
    // advance the clock 1 ms per message so each gets a unique timestamp key
    vi.useFakeTimers();
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(1);
      appendMessage(USER_ID, `Message ${i}`);
    }
    vi.useRealTimers();
    const history = getUserHistoryForContext(USER_ID, DISPLAY_NAME, 5);
    expect(history).toHaveLength(5);
    expect(history[4]).toContain("Message 19");
  });

  test("getUserHistoryForContext returns empty array for an unknown userId", () => {
    expect(getUserHistoryForContext("unknown@c.us", DISPLAY_NAME)).toEqual([]);
  });

  test("clearUserHistory removes only the targeted user's history", () => {
    appendMessage(USER_ID, "Hello");
    appendMessage("67890@c.us", "World");
    clearUserHistory(USER_ID);
    expect(getUserHistoryForContext(USER_ID, DISPLAY_NAME)).toHaveLength(0);
    expect(getUserHistoryForContext("67890@c.us", "Bob")).toHaveLength(1);
  });

  test("clearAllHistory wipes all users", () => {
    appendMessage(USER_ID, "Hello");
    appendMessage("67890@c.us", "World");
    clearAllHistory();
    expect(getUserHistoryForContext(USER_ID, DISPLAY_NAME)).toHaveLength(0);
    expect(getUserHistoryForContext("67890@c.us", "Bob")).toHaveLength(0);
  });
});
