/**
 * GoogleOAuthPaths
 */
import fs from "fs";
import os from "os";
import path from "path";

const GOOGLE_DIR = path.join(os.homedir(), ".botwithaki", "google");
const STORAGE_CREDENTIALS_PATH = path.join(GOOGLE_DIR, "credentials.json");
const STORAGE_TOKEN_PATH = path.join(GOOGLE_DIR, "token.json");

const CWD_TOKEN_PATH = path.join(process.cwd(), "token.json");

export const ensureGoogleDir = (): void => {
  if (!fs.existsSync(GOOGLE_DIR)) {
    fs.mkdirSync(GOOGLE_DIR, { recursive: true });
  }
};

export const writeCredentialsJson = (jsonString: string): string => {
  ensureGoogleDir();
  fs.writeFileSync(STORAGE_CREDENTIALS_PATH, jsonString, "utf-8");
  return STORAGE_CREDENTIALS_PATH;
};

export const resolveGoogleTokenPath = (): string => {
  ensureGoogleDir();

  if (fs.existsSync(STORAGE_TOKEN_PATH)) {
    return STORAGE_TOKEN_PATH;
  }

  if (fs.existsSync(CWD_TOKEN_PATH)) {
    fs.copyFileSync(CWD_TOKEN_PATH, STORAGE_TOKEN_PATH);
    return STORAGE_TOKEN_PATH;
  }

  return STORAGE_TOKEN_PATH;
};

export const getGoogleTokenCleanupPaths = (): string[] => {
  return [STORAGE_TOKEN_PATH, CWD_TOKEN_PATH];
};
