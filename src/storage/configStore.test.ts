import { describe, it, expect, vi, afterEach } from "vitest";
import { encrypt, decrypt } from "./configStore.js";
import os from "os";

describe("configStore crypto", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips plaintext correctly", () => {
    const secret = "sk-test-key-12345";
    const encrypted = encrypt(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted).toContain(":");
    expect(decrypt(encrypted)).toBe(secret);
  });

  it("returns empty string for empty input", () => {
    expect(encrypt("")).toBe("");
    expect(decrypt("")).toBe("");
  });

  it("throws an error for invalid ciphertext formats", () => {
    expect(() => decrypt("invalid-ciphertext-no-colon")).toThrow("Invalid encrypted data format");
    expect(() => decrypt(":")).toThrow("Invalid encrypted data format");
  });

  it("handles os.userInfo() throwing an error and falls back gracefully", () => {
    const spy = vi.spyOn(os, "userInfo").mockImplementation(() => {
      throw new Error("uv_os_get_passwd returned ENOENT");
    });

    const secret = "sk-test-key-fallback-12345";
    const encrypted = encrypt(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted).toContain(":");
    expect(decrypt(encrypted)).toBe(secret);

    expect(spy).toHaveBeenCalled();
  });
});
