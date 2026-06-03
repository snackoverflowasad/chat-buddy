import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const tempStorageDir = path.join(os.tmpdir(), `chat-buddy-history-${Date.now()}`);

vi.mock("./configStore.js", async () => {
  const actual = await vi.importActual<typeof import("./configStore.js")>("./configStore.js");
  return {
    ...actual,
    getStorageDir: () => tempStorageDir,
    ensureStorageDir: () => fs.mkdirSync(tempStorageDir, { recursive: true }),
  };
});

import * as chatHistoryStore from "./chatHistoryStore.js";

describe("chatHistoryStore userId storage", () => {
  afterEach(() => {
    chatHistoryStore.clearAllHistory();
    chatHistoryStore.resetChatHistoryCache();
    fs.rmSync(tempStorageDir, { recursive: true, force: true });
  });

  it("stores history by stable userId and formats with display name", () => {
    const userId = "12345@c.us";
    const displayName = "Alice";

    chatHistoryStore.appendMessage(userId, "Hello", false);
    chatHistoryStore.appendMessage(userId, "Hello from bot", true);

    const history = chatHistoryStore.getUserHistoryForContext(userId, displayName);

    expect(history).toHaveLength(2);
    expect(history[0]).toContain(`${displayName}: Hello`);
    expect(history[1]).toContain("agent: Hello from bot");
  });

  it("preserves history when display name changes", () => {
    const userId = "12345@c.us";

    chatHistoryStore.appendMessage(userId, "Hello again", false);
    const history = chatHistoryStore.getUserHistoryForContext(userId, "Bob");

    expect(history).toHaveLength(1);
    expect(history[0]).toContain("Bob: Hello again");
  });

  it("clears history for the correct userId", () => {
    const userId = "12345@c.us";

    chatHistoryStore.appendMessage(userId, "Leaving a message", false);
    chatHistoryStore.clearUserHistory(userId);

    const history = chatHistoryStore.getUserHistoryForContext(userId, "Alice");
    expect(history).toEqual([]);
  });
});
