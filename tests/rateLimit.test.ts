import { describe, test, expect } from "vitest";

import {
  isRateLimited,
  trackUserMessage,
} from "../src/utils/moderation.js";

describe("Rate Limiting", () => {
  test("rate limits rapid consecutive messages", () => {
    trackUserMessage("rapid-user", "hello");

    expect(isRateLimited("rapid-user")).toBe(true);
  });
});