/**
 * GoogleAuth
 */
import { BotConfig } from "../storage/configStore.js";
import { google } from "googleapis";
import fs from "fs";
import { resolveGoogleTokenPath } from "../config/googleOAuthPaths.js";

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    public code: "NO_CONFIG" | "NO_TOKEN" | "INVALID_AUTH",
  ) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export type GoogleAuthContext = {
  clientId: string;
  clientSecret: string;
  source: "env" | "config";
};

export const resolveAuthContext = (config?: BotConfig): GoogleAuthContext | null => {
  // Docker / process.env overrides
  const envClientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const envClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  if (envClientId && envClientSecret) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      source: "env",
    };
  }

  // Encrypted config
  if (
    config &&
    config.enableGoogleCalendar &&
    config.googleOAuthClientId &&
    config.googleOAuthClientSecret
  ) {
    return {
      clientId: config.googleOAuthClientId,
      clientSecret: config.googleOAuthClientSecret,
      source: "config",
    };
  }

  return null;
};

export const getGoogleCredentialsJson = (
  auth: GoogleAuthContext,
  redirectUri = "http://localhost",
): string => {
  const credentials = {
    installed: {
      client_id: auth.clientId,
      project_id: "chat-buddy",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: auth.clientSecret,
      redirect_uris: [redirectUri],
    },
  };
  return JSON.stringify(credentials, null, 2);
};

export const loadOAuthClient = (
  authContext: GoogleAuthContext,
  redirectUri = "http://localhost",
) => {
  return new google.auth.OAuth2(authContext.clientId, authContext.clientSecret, redirectUri);
};

export const loadToken = () => {
  const tokenPath = resolveGoogleTokenPath();
  if (!fs.existsSync(tokenPath)) {
    throw new GoogleAuthError("Not authenticated. Run 'chat-buddy login' first.", "NO_TOKEN");
  }
  return JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
};

export const buildAuthedClient = (authContext: GoogleAuthContext) => {
  try {
    const oAuth2Client = loadOAuthClient(authContext);
    const token = loadToken();
    oAuth2Client.setCredentials(token);

    return oAuth2Client;
  } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    console.error("Google Auth Error:", error.message);
    if (error instanceof GoogleAuthError) {
      throw error;
    }
    throw new Error("Authentication failed. Run 'chat-buddy login' to continue.");
  }
};
