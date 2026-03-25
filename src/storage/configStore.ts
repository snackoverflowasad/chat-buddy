import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

// --- Types ---
export interface BotConfig {
  username: string;
  agentName: string;
  openaiApiKey: string;
  googleApiKey: string;
  allowGroupReplies: boolean;
  timezone: string;
}

// --- Paths ---
const STORAGE_DIR_NAME = ".botwithaki";

export const getStorageDir = (): string => {
  return path.join(os.homedir(), STORAGE_DIR_NAME);
};

export const getConfigPath = (): string => {
  return path.join(getStorageDir(), "config.json");
};

// --- Encryption (AES-256-CBC, machine-derived key) ---
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Derives a deterministic 32-byte encryption key from machine-specific identifiers.
 * This ensures config files are useless if copied to another machine.
 */
const deriveKey = (): Buffer => {
  const machineId = `${os.hostname()}::${os.userInfo().username}::botwithaki-secret-salt`;
  return crypto.createHash("sha256").update(machineId).digest();
};

export const encrypt = (plainText: string): string => {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Store IV alongside encrypted data: iv:encrypted
  return `${iv.toString("hex")}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const key = deriveKey();
  const [ivHex, encrypted] = encryptedText.split(":");
  if (!ivHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

// --- Storage Directory ---
export const ensureStorageDir = (): void => {
  const dir = getStorageDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Set restrictive permissions (owner-only) on non-Windows
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(dir, 0o700);
    } catch {
      // Ignore permission errors on some file systems
    }
  }
};

// --- Config CRUD ---

/**
 * Saves config to disk with API keys encrypted.
 * NEVER stores API keys in plain text.
 */
export const saveConfig = (config: BotConfig): void => {
  ensureStorageDir();

  const encryptedConfig = {
    username: config.username,
    agentName: config.agentName,
    openaiApiKey: encrypt(config.openaiApiKey),
    googleApiKey: encrypt(config.googleApiKey),
    allowGroupReplies: config.allowGroupReplies,
    timezone: config.timezone,
  };

  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(encryptedConfig, null, 2), "utf-8");

  // Set restrictive permissions on the config file
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(configPath, 0o600);
    } catch {
      // Ignore permission errors
    }
  }
};

/**
 * Loads config from disk, decrypting API keys in memory.
 * Returns null if config doesn't exist.
 */
export const loadConfig = (): BotConfig | null => {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return {
      username: raw.username,
      agentName: raw.agentName,
      openaiApiKey: decrypt(raw.openaiApiKey),
      googleApiKey: decrypt(raw.googleApiKey),
      allowGroupReplies: raw.allowGroupReplies ?? false,
      timezone: raw.timezone ?? "Asia/Kolkata",
    };
  } catch (error) {
    console.error("Failed to load config. It may be corrupted or from another machine.");
    return null;
  }
};

/**
 * Checks if a valid config exists.
 */
export const configExists = (): boolean => {
  return fs.existsSync(getConfigPath());
};
