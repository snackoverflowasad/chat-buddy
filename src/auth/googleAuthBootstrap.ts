/**
 * GoogleAuthBootstrap
 */
import { BotConfig, loadConfig } from "../storage/configStore.js";
import { resolveAuthContext, buildAuthedClient, GoogleAuthError } from "./googleAuth.js";

let cachedConfig: BotConfig | null = null;

const getConfig = () => {
  if (!cachedConfig) cachedConfig = loadConfig();
  return cachedConfig;
};

export const getAuthedClient = () => {
  const config = getConfig();
  const context = resolveAuthContext(config || undefined);

  if (!context) {
    throw new GoogleAuthError(
      "Google Calendar integration is not configured. Run 'chat-buddy init' or set environment variables.",
      "NO_CONFIG",
    );
  }

  return buildAuthedClient(context);
};
