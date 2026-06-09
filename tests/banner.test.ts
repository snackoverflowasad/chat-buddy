import { describe, test, expect, vi } from "vitest";

vi.mock("picocolors", () => ({
  default: { green: (s: string) => s, bold: (s: string) => s, dim: (s: string) => s },
}));
vi.mock("ora", () => ({ default: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() }) }));

import { center } from "../src/utils/banner.js";

describe("center()", () => {
  test("pads a single line to the correct width", () => {
    // pad = floor((15 - 5) / 2) = 5
    const result = center("hello", 15);
    expect(result).toBe("     hello");
  });

  test("does not apply negative padding when line exceeds width", () => {
    const result = center("hello world", 5);
    expect(result).toBe("hello world");
  });

  test("handles multi-line input, centering each line independently", () => {
    // pad for "ab" with width 10 = floor((10 - 2) / 2) = 4
    const result = center("ab\ncd", 10);
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("    ab");
    expect(lines[1]).toBe("    cd");
  });

  test("handles empty string (pads with spaces equal to half the width)", () => {
    // pad = floor(10 / 2) = 5
    const result = center("", 10);
    expect(result).toBe("     ");
  });

  test("applies zero padding when line length exactly equals width", () => {
    const result = center("hello", 5);
    expect(result).toBe("hello");
  });

  test("returns text unchanged when width is 0", () => {
    const result = center("hi", 0);
    expect(result).toBe("hi");
  });
});
