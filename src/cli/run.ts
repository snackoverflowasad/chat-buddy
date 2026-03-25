import pc from "picocolors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { loadConfig, configExists } from "../storage/configStore.js";
import { WhatsAppBot } from "../bot.js";

// Load .env or env file (support both naming conventions)
const envPath = path.join(process.cwd(), ".env");
const envPathAlt = path.join(process.cwd(), "env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envPathAlt)) {
  dotenv.config({ path: envPathAlt });
}

export const runBot = async (): Promise<void> => {
  console.log();

  // Try loading config from .botwithaki/config.json
  let openaiKey: string | undefined;
  let googleKey: string | undefined;
  let username: string = "User";
  let agentName: string = "Assistant";

  if (configExists()) {
    const config = loadConfig();
    if (config) {
      openaiKey = config.openaiApiKey;
      googleKey = config.googleApiKey;
      username = config.username;
      agentName = config.agentName;
      console.log(pc.green(`  ✓ Config loaded for ${pc.bold(username)} with agent ${pc.bold(agentName)}`));
    } else {
      console.log(pc.yellow("  ⚠ Config found but could not be decrypted. Falling back to .env"));
    }
  } else {
    console.log(pc.yellow("  ⚠ No config found. Checking .env file..."));
  }

  // Fallback to .env
  if (!openaiKey) {
    openaiKey = process.env.OPENAI_API_KEY;
  }
  if (!googleKey) {
    googleKey = process.env.GOOGLE_API;
  }

  // Validate keys exist
  if (!openaiKey) {
    console.log(pc.red("  ✗ OpenAI API key not found!"));
    console.log(pc.dim("    Run 'botwithaki init' to set up, or create a .env with OPENAI_API_KEY."));
    process.exit(1);
  }

  if (!googleKey) {
    console.log(pc.yellow("  ⚠ Google API key not found. Google Calendar features will be disabled."));
  }

  // Set environment variables for the bot
  process.env.OPENAI_API_KEY = openaiKey;
  if (googleKey) {
    process.env.GOOGLE_API = googleKey;
  }

  console.log();
  console.log(pc.dim("  Starting WhatsApp bot... Scan the QR code when it appears."));
  console.log();

  // Start the bot with config
  const bot = new WhatsAppBot(username, agentName);
  bot.start();
};
