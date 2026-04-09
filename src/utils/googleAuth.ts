import { google } from "googleapis";
import fs from "fs";
import {
  resolveGoogleCredentialsPath,
  resolveGoogleTokenPath,
} from "../config/googleOAuthPaths.js";

export async function getAuth() {
  try {
    const credentialsPath = resolveGoogleCredentialsPath();
    const tokenPath = resolveGoogleTokenPath();

    // Load OAuth credentials
    const credentials = JSON.parse(
      fs.readFileSync(credentialsPath, "utf-8")
    );

    const { client_secret, client_id, redirect_uris } =
      credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Load saved token
    if (!fs.existsSync(tokenPath)) {
      throw new Error(
        "Not authenticated. Run 'chat-buddy login' first."
      );
    }

    const token = JSON.parse(
      fs.readFileSync(tokenPath, "utf-8")
    );

    oAuth2Client.setCredentials(token);

    return oAuth2Client;
  } catch (error: any) {
    console.error("Google Auth Error:", error.message);

    throw new Error(
      "Authentication failed. Run 'chat-buddy login' to continue."
    );
  }
}