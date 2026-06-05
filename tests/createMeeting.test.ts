import { describe, test, expect, vi } from "vitest";

vi.mock("@openai/agents", () => ({
  tool: vi.fn().mockImplementation((config: unknown) => config),
}));

vi.mock("../src/services/googleMeet.service.js", () => ({
  createMeeting: vi.fn(),
}));

vi.mock("../src/storage/runContext.js", () => ({
  getRequestedByFromContext: vi.fn().mockReturnValue("test-user"),
}));

vi.mock("../src/storage/sessionMeetingStore.js", () => ({
  addSessionMeetingRecord: vi.fn(),
}));

import { MeetingInputSchema, MeetingOutputSchema } from "../src/tools/createMeeting.tool.js";

describe("MeetingInputSchema", () => {
  test("accepts a fully valid meeting input", () => {
    const result = MeetingInputSchema.safeParse({
      title: "Team Sync",
      description: "Weekly standup",
      date: "2024-06-15T10:00:00Z",
      attendees: ["alice@example.com", "bob@example.com"],
    });
    expect(result.success).toBe(true);
  });

  test("defaults description to an empty string when omitted", () => {
    const result = MeetingInputSchema.safeParse({
      title: "Team Sync",
      date: "2024-06-15T10:00:00Z",
      attendees: ["alice@example.com"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
    }
  });

  test("rejects an empty title", () => {
    const result = MeetingInputSchema.safeParse({
      title: "",
      date: "2024-06-15T10:00:00Z",
      attendees: ["alice@example.com"],
    });
    expect(result.success).toBe(false);
  });

  test("rejects an invalid attendee email address", () => {
    const result = MeetingInputSchema.safeParse({
      title: "Meeting",
      date: "2024-06-15T10:00:00Z",
      attendees: ["not-an-email"],
    });
    expect(result.success).toBe(false);
  });

  test("rejects an empty attendees array", () => {
    const result = MeetingInputSchema.safeParse({
      title: "Meeting",
      date: "2024-06-15T10:00:00Z",
      attendees: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects input missing the required title", () => {
    const result = MeetingInputSchema.safeParse({
      date: "2024-06-15T10:00:00Z",
      attendees: ["alice@example.com"],
    });
    expect(result.success).toBe(false);
  });

  test("rejects input missing attendees", () => {
    const result = MeetingInputSchema.safeParse({
      title: "Meeting",
      date: "2024-06-15T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("MeetingOutputSchema", () => {
  test("accepts a full success result", () => {
    const result = MeetingOutputSchema.safeParse({
      success: true,
      message: "Meeting created",
      eventId: "evt-123",
      meetLink: "https://meet.google.com/abc-defg-hij",
      scheduledFor: "2024-06-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  test("accepts a minimal success result without optional fields", () => {
    const result = MeetingOutputSchema.safeParse({
      success: true,
      message: "Meeting created",
    });
    expect(result.success).toBe(true);
  });

  test("rejects a meetLink that is not a URL", () => {
    const result = MeetingOutputSchema.safeParse({
      success: true,
      message: "Meeting created",
      meetLink: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects extra fields (strict mode)", () => {
    const result = MeetingOutputSchema.safeParse({
      success: true,
      message: "ok",
      unknownField: "value",
    });
    expect(result.success).toBe(false);
  });
});
