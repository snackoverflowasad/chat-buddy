import { describe, test, expect, vi, beforeEach } from "vitest";

const mockStore = vi.hoisted(() => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock("../src/storage/adapters/FileConversationStore.js", () => ({
  // must use a regular function (not an arrow) so it can be called with `new`
  FileConversationStore: vi.fn(function () {
    return mockStore;
  }),
}));

import { getContext, saveContext, clearContext } from "../src/services/conversationService.js";
import type { Message } from "../src/storage/interfaces/ConversationStore.js";

const makeMessage = (content: string): Message => ({
  role: "user",
  content,
  timestamp: Date.now(),
});

describe("conversationService", () => {
  beforeEach(() => {
    mockStore.loadSession.mockReset();
    mockStore.saveSession.mockReset();
    mockStore.clearSession.mockReset();
  });

  describe("getContext()", () => {
    test("delegates to store.loadSession and returns the result", async () => {
      const messages = [makeMessage("hello")];
      mockStore.loadSession.mockResolvedValue(messages);
      const result = await getContext("user-1");
      expect(mockStore.loadSession).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(messages);
    });

    test("returns an empty array when the session is empty", async () => {
      mockStore.loadSession.mockResolvedValue([]);
      expect(await getContext("user-1")).toEqual([]);
    });
  });

  describe("saveContext()", () => {
    test("delegates to store.saveSession with the correct arguments", async () => {
      const messages = [makeMessage("hello")];
      mockStore.saveSession.mockResolvedValue(undefined);
      await saveContext("user-1", messages);
      expect(mockStore.saveSession).toHaveBeenCalledWith("user-1", messages);
    });
  });

  describe("clearContext()", () => {
    test("delegates to store.clearSession", async () => {
      mockStore.clearSession.mockResolvedValue(undefined);
      await clearContext("user-1");
      expect(mockStore.clearSession).toHaveBeenCalledWith("user-1");
    });
  });
});
