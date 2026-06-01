/**
 * LocalAuth
 */
import { authenticate } from "@google-cloud/local-auth";
import fs from "fs";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { resolveGoogleTokenPath, writeCredentialsJson } from "./googleOAuthPaths.js";
import { loadConfig } from "../storage/configStore.js";
import { resolveAuthContext, getGoogleCredentialsJson } from "../auth/googleAuth.js";

const promptForCredentials = async (): Promise<string> => {
  if (!process.stdin.isTTY) {
    throw new Error(
      "Google OAuth credentials not found. Run 'chat-buddy init' or set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables.",
    );
  }

  console.log("Google OAuth credentials not found.");
  console.log("Paste your OAuth Desktop App credentials once to continue.");

  const rl = readline.createInterface({ input, output });
  try {
    const clientId = (await rl.question("Google OAuth Client ID: ")).trim();
    const clientSecret = (await rl.question("Google OAuth Client Secret: ")).trim();
    const redirectUriInput = (
      await rl.question("Redirect URI (press Enter for http://localhost): ")
    ).trim();

    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are required to generate credentials.");
    }

    const jsonString = getGoogleCredentialsJson(
      { clientId, clientSecret, source: "env" },
      redirectUriInput || "http://localhost",
    );
    return writeCredentialsJson(jsonString);
  } finally {
    rl.close();
  }
};

export async function generateGoogleToken(): Promise<void> {
  let credPath: string | null = null;
  const config = loadConfig();
  const authContext = resolveAuthContext(config || undefined);

  if (authContext) {
    const jsonString = getGoogleCredentialsJson(authContext);
    credPath = writeCredentialsJson(jsonString);
  } else {
    credPath = await promptForCredentials();
  }

  const tokenPath = resolveGoogleTokenPath();

  let auth;
  try {
    auth = await authenticate({
      keyfilePath: credPath,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
  } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    const message = String(error?.message || "");
    if (/redirect_uri_mismatch/i.test(message)) {
      throw new Error(
        "Google OAuth redirect URI mismatch. Use an OAuth Client ID of type 'Desktop app' in Google Cloud Console, then update credentials via 'npm run key' (or re-run init) and try 'npm run login' again.",
      );
    }
    throw error;
  }

  fs.writeFileSync(tokenPath, JSON.stringify(auth.credentials, null, 2), "utf-8");
  console.log(`Google login successful. Token saved at: ${tokenPath}`);
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("config/localAuth.js");

if (isMain) {
  generateGoogleToken().catch(console.error);
}
