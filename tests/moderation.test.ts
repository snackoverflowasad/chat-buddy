import { describe, test, expect } from "vitest";

import {
  containsBlockedWords,
  isDuplicateMessage,
  isRateLimited,
  trackUserMessage,
} from "../src/utils/moderation.js";

describe("Moderation Utilities", () => {
  test("detects blocked words", () => {
    expect(containsBlockedWords("fuck you")).toBe(true);
  });

  test("allows clean messages", () => {
    expect(containsBlockedWords("hello world")).toBe(false);
  });

  test("detects duplicate messages", () => {
    trackUserMessage("user1", "hello");

    expect(isDuplicateMessage("user1", "hello")).toBe(true);
  });

  test("detects rate limiting", () => {
    trackUserMessage("user2", "spam");

    expect(isRateLimited("user2")).toBe(true);
  });
});