import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../src/storage/chatHistoryStore.js", () => ({
  appendMessage: vi.fn(),
  getUserHistoryForContext: vi.fn().mockReturnValue([]),
  clearUserHistory: vi.fn(),
}));

import { storeMessage, getHistory, clearHistory } from "../src/services/memory.service.js";
import {
  appendMessage,
  getUserHistoryForContext,
  clearUserHistory,
} from "../src/storage/chatHistoryStore.js";

// memory.service now receives a stable userId and, for getHistory, a displayName too.
describe("memory.service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("storeMessage()", () => {
    test("delegates to appendMessage with isAgent=false by default", () => {
      storeMessage("12345@c.us", "hello");
      expect(appendMessage).toHaveBeenCalledWith("12345@c.us", "hello", false);
    });

    test("passes isAgent=true when specified", () => {
      storeMessage("12345@c.us", "bot reply", true);
      expect(appendMessage).toHaveBeenCalledWith("12345@c.us", "bot reply", true);
    });
  });

  describe("getHistory()", () => {
    test("calls getUserHistoryForContext with userId, displayName, and maxMessages=15", () => {
      getHistory("12345@c.us", "Alice");
      expect(getUserHistoryForContext).toHaveBeenCalledWith("12345@c.us", "Alice", 15);
    });

    test("returns the delegated result", () => {
      vi.mocked(getUserHistoryForContext).mockReturnValue(["[10:00 AM] Alice: hi"]);
      expect(getHistory("12345@c.us", "Alice")).toEqual(["[10:00 AM] Alice: hi"]);
    });

    test("returns empty array when there is no history", () => {
      vi.mocked(getUserHistoryForContext).mockReturnValue([]);
      expect(getHistory("67890@c.us", "Bob")).toEqual([]);
    });
  });

  describe("clearHistory()", () => {
    test("delegates to clearUserHistory", () => {
      clearHistory("12345@c.us");
      expect(clearUserHistory).toHaveBeenCalledWith("12345@c.us");
    });
  });
});
