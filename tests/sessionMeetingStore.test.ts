import { describe, test, expect, beforeEach, vi } from "vitest";

type StoreModule = typeof import("../src/storage/sessionMeetingStore.js");

describe("sessionMeetingStore", () => {
  let store: StoreModule;

  beforeEach(async () => {
    vi.resetModules();
    store = await import("../src/storage/sessionMeetingStore.js");
  });

  const makeRecord = (requestedBy: string, title = "Test Meeting") => ({
    requestedBy,
    title,
    meetingTime: "2024-06-15T10:00:00Z",
    meetLink: "https://meet.google.com/abc-defg-hij",
  });

  test("caps the store at 20 records when more are added", () => {
    for (let i = 0; i < 25; i++) {
      store.addSessionMeetingRecord(makeRecord("alice", `Meeting ${i}`));
    }
    expect(store.getSessionMeetingRecords()).toHaveLength(20);
  });

  test("retains the most recent 20 records after capping", () => {
    for (let i = 0; i < 25; i++) {
      store.addSessionMeetingRecord(makeRecord("alice", `Meeting ${i}`));
    }
    const records = store.getSessionMeetingRecords();
    expect(records[0].title).toBe("Meeting 5");
    expect(records[19].title).toBe("Meeting 24");
  });

  test("addSessionMeetingRecord stamps a createdAt ISO timestamp", () => {
    const record = store.addSessionMeetingRecord(makeRecord("bob"));
    expect(() => new Date(record.createdAt)).not.toThrow();
    expect(new Date(record.createdAt).getTime()).toBeGreaterThan(0);
  });

  test("getLatestMeetingForRequesterSince returns the most recent match", () => {
    const start = Date.now();
    store.addSessionMeetingRecord(makeRecord("alice", "First"));
    store.addSessionMeetingRecord(makeRecord("alice", "Second"));
    const result = store.getLatestMeetingForRequesterSince("alice", start);
    expect(result?.title).toBe("Second");
  });

  test("getLatestMeetingForRequesterSince returns null for a different requester", () => {
    store.addSessionMeetingRecord(makeRecord("alice"));
    expect(store.getLatestMeetingForRequesterSince("bob", 0)).toBeNull();
  });

  test("getLatestMeetingForRequesterSince returns null when record is too old", () => {
    store.addSessionMeetingRecord(makeRecord("alice"));
    const future = Date.now() + 60_000;
    expect(store.getLatestMeetingForRequesterSince("alice", future)).toBeNull();
  });

  test("getSessionMeetingRecords returns a copy (mutation does not affect store)", () => {
    store.addSessionMeetingRecord(makeRecord("alice"));
    const copy = store.getSessionMeetingRecords();
    copy.pop();
    expect(store.getSessionMeetingRecords()).toHaveLength(1);
  });
});
