/**
 * ConfigStore
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

export interface BotConfig {
  configVersion?: number;
  username: string;
  agentName: string;
  openaiApiKey: string;
  enableGoogleCalendar: boolean;
  googleOAuthClientId?: string;
  googleOAuthClientSecret?: string;
  allowGroupReplies: boolean;
  timezone: string;
}

const STORAGE_DIR_NAME = ".botwithaki";

export const getStorageDir = (): string => {
  return path.join(os.homedir(), STORAGE_DIR_NAME);
};

export const getConfigPath = (): string => {
  return path.join(getStorageDir(), "config.json");
};

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

const getUsername = (): string => {
  try {
    return os.userInfo().username;
  } catch {
    return process.env.USER || process.env.USERNAME || "default-user";
  }
};

const deriveKey = (): Buffer => {
  const machineId = `${os.hostname()}::${getUsername()}::botwithaki-secret-salt`;
  return crypto.createHash("sha256").update(machineId).digest();
};

export const encrypt = (plainText: string): string => {
  if (!plainText) return "";
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return "";
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

export const ensureStorageDir = (): void => {
  const dir = getStorageDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(dir, 0o700);
    } catch {
      /* ignore */
    }
  }
};

export const saveConfig = (config: BotConfig): void => {
  ensureStorageDir();

  const encryptedConfig = {
    configVersion: 2,
    username: config.username,
    agentName: config.agentName,
    openaiApiKey: encrypt(config.openaiApiKey),
    enableGoogleCalendar: config.enableGoogleCalendar,
    googleOAuthClientId: config.googleOAuthClientId
      ? encrypt(config.googleOAuthClientId)
      : undefined,
    googleOAuthClientSecret: config.googleOAuthClientSecret
      ? encrypt(config.googleOAuthClientSecret)
      : undefined,
    allowGroupReplies: config.allowGroupReplies,
    timezone: config.timezone,
  };

  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(encryptedConfig, null, 2), "utf-8");

  if (process.platform !== "win32") {
    try {
      fs.chmodSync(configPath, 0o600);
    } catch {
      /* ignore */
    }
  }
};

export const loadConfig = (): BotConfig | null => {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const configVersion = raw.configVersion || 1;

    let enableGoogleCalendar = raw.enableGoogleCalendar ?? false;
    let clientId: string | undefined = raw.googleOAuthClientId
      ? decrypt(raw.googleOAuthClientId)
      : undefined;
    let clientSecret: string | undefined = raw.googleOAuthClientSecret
      ? decrypt(raw.googleOAuthClientSecret)
      : undefined;

    if (configVersion === 1) {
      const legacyBlob = raw.googleOAuthCredentials || raw.googleApiKey;
      if (legacyBlob) {
        try {
          const decryptedLegacy = decrypt(legacyBlob);
          try {
            const parsed = JSON.parse(decryptedLegacy);
            if (parsed.installed?.client_id && parsed.installed?.client_secret) {
              clientId = parsed.installed.client_id;
              clientSecret = parsed.installed.client_secret;
              enableGoogleCalendar = true;
            }
          } catch {
            if (decryptedLegacy.includes(":") && !decryptedLegacy.startsWith("AIza")) {
              const parts = decryptedLegacy.split(":");
              if (parts.length === 2 && parts[0] && parts[1]) {
                clientId = parts[0];
                clientSecret = parts[1];
                enableGoogleCalendar = true;
              } else {
                enableGoogleCalendar = false;
              }
            } else {
              enableGoogleCalendar = false;
            }
          }
        } catch {
          enableGoogleCalendar = false;
        }
      }
    }

    return {
      configVersion: configVersion,
      username: raw.username,
      agentName: raw.agentName,
      openaiApiKey: decrypt(raw.openaiApiKey),
      enableGoogleCalendar,
      googleOAuthClientId: clientId,
      googleOAuthClientSecret: clientSecret,
      allowGroupReplies: raw.allowGroupReplies ?? false,
      timezone: raw.timezone ?? "Asia/Kolkata",
    };
  } catch {
    console.error("Failed to load config. It may be corrupted or from another machine.");
    return null;
  }
};

export const configExists = (): boolean => {
  return fs.existsSync(getConfigPath());
};
