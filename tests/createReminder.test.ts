import { describe, test, expect, vi } from "vitest";

vi.mock("@openai/agents", () => ({
  tool: vi.fn().mockImplementation((config: unknown) => config),
}));

vi.mock("../src/services/googleReminder.service.js", () => ({
  createReminder: vi.fn(),
}));

vi.mock("../src/services/googleReminder.service.js", () => ({
  createReminder: vi.fn(),
}));

import { ReminderInputSchema, ReminderOutputSchema } from "../src/tools/createReminder.tool.js";

describe("ReminderInputSchema", () => {
  test("accepts a complete valid input", () => {
    const result = ReminderInputSchema.safeParse({
      title: "Doctor appointment",
      description: "Annual checkup",
      date: "2024-06-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  test("defaults description to an empty string when omitted", () => {
    const result = ReminderInputSchema.safeParse({
      title: "Dentist",
      date: "2024-06-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
    }
  });

  test("rejects input without a title", () => {
    const result = ReminderInputSchema.safeParse({
      date: "2024-06-15T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  test("rejects input without a date", () => {
    const result = ReminderInputSchema.safeParse({
      title: "Meeting",
    });
    expect(result.success).toBe(false);
  });

  test("rejects extra fields (strict mode)", () => {
    const result = ReminderInputSchema.safeParse({
      title: "Meeting",
      date: "2024-06-15T10:00:00Z",
      unknownField: "value",
    });
    expect(result.success).toBe(false);
  });
});

describe("ReminderOutputSchema", () => {
  test("accepts a success result with all optional fields", () => {
    const result = ReminderOutputSchema.safeParse({
      success: true,
      message: "Reminder created successfully",
      eventId: "evt-abc123",
      scheduledFor: "2024-06-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  test("accepts a failure result with an error field", () => {
    const result = ReminderOutputSchema.safeParse({
      success: false,
      message: "Failed to create reminder",
      error: "Calendar API unavailable",
    });
    expect(result.success).toBe(true);
  });

  test("rejects extra fields (strict mode)", () => {
    const result = ReminderOutputSchema.safeParse({
      success: true,
      message: "ok",
      unknownField: "value",
    });
    expect(result.success).toBe(false);
  });
});
