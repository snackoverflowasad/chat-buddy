import { describe, test, expect } from "vitest";
import { createProtocols } from "../src/config/agent.protocol.js";

describe("createProtocols()", () => {
  test("sets name to the provided agentName", () => {
    expect(createProtocols("Luffy", "Asad").name).toBe("Luffy");
  });

  test("sets allowGroupReplies to false", () => {
    expect(createProtocols("Bot", "User").allowGroupReplies).toBe(false);
  });

  test("sets allowBadWords to true", () => {
    expect(createProtocols("Bot", "User").allowBadWords).toBe(true);
  });

  test("injects both agentName and username into the description", () => {
    const protocols = createProtocols("R2D2", "Luke");
    expect(protocols.description).toContain("Luke");
  });

  test("returns an object with the expected shape", () => {
    const protocols = createProtocols("Bot", "User");
    expect(protocols).toMatchObject({
      name: expect.any(String),
      allowGroupReplies: expect.any(Boolean),
      allowBadWords: expect.any(Boolean),
      description: expect.any(String),
    });
  });

  test("produces different descriptions for different usernames", () => {
    const a = createProtocols("Bot", "Alice");
    const b = createProtocols("Bot", "Bob");
    expect(a.description).not.toBe(b.description);
  });
});
