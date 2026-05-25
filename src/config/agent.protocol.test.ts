import { describe, it, expect } from "vitest";
import { createProtocols } from "./agent.protocol.js";

describe("createProtocols", () => {
  it("builds protocol with agent and username correctly", () => {
    const protocol = createProtocols("TestBot", "TestUser");
    expect(protocol.name).toBe("TestBot");
    expect(protocol.allowGroupReplies).toBe(false);
    expect(protocol.allowBadWords).toBe(true);
    expect(protocol.description).toContain("TestUser");
  });

  it("mirrors rules description customized for the user", () => {
    const protocol = createProtocols("Luffy", "Asad");
    expect(protocol.name).toBe("Luffy");
    expect(protocol.allowGroupReplies).toBe(false);
    expect(protocol.description).toContain("Asad");
    expect(protocol.description).toContain("AI assistant");
  });
});
