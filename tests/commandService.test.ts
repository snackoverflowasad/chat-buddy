import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/services/memory.service.js", () => ({
  clearHistory: vi.fn(),
  getHistory: vi.fn().mockReturnValue([]),
}));

import { handleCommand } from "../src/services/command.service.js";
import { clearHistory, getHistory } from "../src/services/memory.service.js";

const USER_ID = "12345@c.us";

const makeMockMessage = () => ({
  from: USER_ID,
  reply: vi.fn().mockResolvedValue(undefined),
  getContact: vi.fn().mockResolvedValue({ pushname: "TestUser", number: "9999999999" }),
});

describe("handleCommand() — /time", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("pads single-digit minutes to two characters", async () => {
    vi.setSystemTime(new Date(2024, 0, 1, 9, 5, 0)); // local 09:05
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/time");
    const reply: string = msg.reply.mock.calls[0][0];
    expect(reply).toMatch(/\d+:05/);
  });

  test("replies with 'Good Morning' for hours before noon", async () => {
    vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0));
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/time");
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining("Good Morning"));
  });

  test("replies with 'Good Afternoon' for hours between noon and 5 pm", async () => {
    vi.setSystemTime(new Date(2024, 0, 1, 14, 0, 0));
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/time");
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining("Good Afternoon"));
  });

  test("replies with 'Good Evening' for hours at or after 5 pm", async () => {
    vi.setSystemTime(new Date(2024, 0, 1, 18, 0, 0));
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/time");
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining("Good Evening"));
  });
});

describe("handleCommand() — /reset", () => {
  beforeEach(() => vi.clearAllMocks());

  test("clears history by userId (message.from) and confirms via reply", async () => {
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/reset");
    // /reset uses message.from (stable userId) rather than contact display name
    expect(clearHistory).toHaveBeenCalledWith(USER_ID);
    expect(msg.reply).toHaveBeenCalledWith("Chat history has been cleared.");
  });
});

describe("handleCommand() — /history", () => {
  beforeEach(() => vi.clearAllMocks());

  test("replies with joined history when messages exist", async () => {
    vi.mocked(getHistory).mockReturnValue(["msg1", "msg2"]);
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/history");
    expect(msg.reply).toHaveBeenCalledWith("msg1\nmsg2");
  });

  test("replies with a 'no history' message when history is empty", async () => {
    vi.mocked(getHistory).mockReturnValue([]);
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/history");
    expect(msg.reply).toHaveBeenCalledWith("No chat history found.");
  });

  test("passes both userId and displayName to getHistory", async () => {
    vi.mocked(getHistory).mockReturnValue([]);
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/history");
    expect(getHistory).toHaveBeenCalledWith(USER_ID, "TestUser");
  });
});

describe("handleCommand() — / (help dashboard)", () => {
  test("replies with the list of available commands", async () => {
    const msg = makeMockMessage();
    await handleCommand(msg as never, "/");
    const reply: string = msg.reply.mock.calls[0][0];
    expect(reply).toContain("/time");
    expect(reply).toContain("/schedule");
    expect(reply).toContain("/history");
    expect(reply).toContain("/reset");
  });
});
