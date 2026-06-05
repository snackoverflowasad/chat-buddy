import { describe, test, expect, vi, beforeEach } from "vitest";
import os from "os";
import path from "path";

vi.mock("fs", () => {
  const m = {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    chmodSync: vi.fn(),
  };
  return { default: m, ...m };
});

import fs from "fs";
import {
  encrypt,
  decrypt,
  getStorageDir,
  getConfigPath,
  configExists,
  loadConfig,
} from "../src/storage/configStore.js";

describe("encrypt() / decrypt()", () => {
  test("round-trips a plaintext string", () => {
    const plain = "sk-openai-test-key-abc123";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  test("returns empty string for empty encrypt input", () => {
    expect(encrypt("")).toBe("");
  });

  test("returns empty string for empty decrypt input", () => {
    expect(decrypt("")).toBe("");
  });

  test("throws on invalid encrypted format (no colon separator)", () => {
    expect(() => decrypt("notvalidformat")).toThrow("Invalid encrypted data format");
  });

  test("produces different ciphertext for different plaintext", () => {
    expect(encrypt("key-alpha")).not.toBe(encrypt("key-beta"));
  });

  test("produces a unique ciphertext each call (randomised IV)", () => {
    const a = encrypt("same-text");
    const b = encrypt("same-text");
    expect(a).not.toBe(b);
  });

  test("round-trips a string containing special characters", () => {
    const plain = "p@$$w0rd!#&=?";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });
});

describe("getStorageDir() / getConfigPath()", () => {
  test("getStorageDir returns a path inside the home directory", () => {
    expect(getStorageDir()).toContain(os.homedir());
  });

  test("getStorageDir path ends with .botwithaki", () => {
    expect(getStorageDir()).toBe(path.join(os.homedir(), ".botwithaki"));
  });

  test("getConfigPath returns a path ending with config.json", () => {
    expect(getConfigPath()).toBe(path.join(getStorageDir(), "config.json"));
  });
});

describe("configExists()", () => {
  beforeEach(() => vi.mocked(fs.existsSync).mockReset());

  test("returns true when the config file exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    expect(configExists()).toBe(true);
  });

  test("returns false when the config file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(configExists()).toBe(false);
  });
});

describe("loadConfig()", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
  });

  test("returns null when the config file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(loadConfig()).toBeNull();
  });

  test("loads and decrypts a v2 config correctly", () => {
    const raw = {
      configVersion: 2,
      username: "TestUser",
      agentName: "TestBot",
      openaiApiKey: encrypt("sk-real-key"),
      enableGoogleCalendar: false,
      allowGroupReplies: false,
      timezone: "UTC",
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(raw) as never);

    const config = loadConfig();

    expect(config).not.toBeNull();
    expect(config?.username).toBe("TestUser");
    expect(config?.agentName).toBe("TestBot");
    expect(config?.openaiApiKey).toBe("sk-real-key");
    expect(config?.enableGoogleCalendar).toBe(false);
    expect(config?.timezone).toBe("UTC");
  });

  test("decrypts optional OAuth fields when present in v2 config", () => {
    const raw = {
      configVersion: 2,
      username: "TestUser",
      agentName: "TestBot",
      openaiApiKey: encrypt("sk-key"),
      enableGoogleCalendar: true,
      googleOAuthClientId: encrypt("client-id-123"),
      googleOAuthClientSecret: encrypt("client-secret-abc"),
      allowGroupReplies: false,
      timezone: "Asia/Kolkata",
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(raw) as never);

    const config = loadConfig();

    expect(config?.googleOAuthClientId).toBe("client-id-123");
    expect(config?.googleOAuthClientSecret).toBe("client-secret-abc");
    expect(config?.enableGoogleCalendar).toBe(true);
  });

  test("returns null when the config file is corrupted JSON", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("not valid json" as never);
    expect(loadConfig()).toBeNull();
  });
});
