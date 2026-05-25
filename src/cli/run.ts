/**
 * Run
 */
import pc from "picocolors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { loadConfig, configExists, BotConfig } from "../storage/configStore.js";
import { WhatsAppBot } from "../bot.js";
import { resolveAuthContext } from "../auth/googleAuth.js";

const envPath = path.join(process.cwd(), ".env");
const envPathAlt = path.join(process.cwd(), "env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envPathAlt)) {
  dotenv.config({ path: envPathAlt });
}

export const runBot = async (): Promise<void> => {
  console.log();

  let openaiKey: string | undefined;
  let username: string = "User";
  let agentName: string = "Assistant";
  let config: BotConfig | null = null;

  if (configExists()) {
    config = loadConfig();
    if (config) {
      openaiKey = config.openaiApiKey;
      username = config.username;
      agentName = config.agentName;
      console.log(
        pc.green(`  ✓ Config loaded for ${pc.bold(username)} with agent ${pc.bold(agentName)}`),
      );
    } else {
      console.log(pc.yellow("  ⚠ Config found but could not be decrypted. Falling back to .env"));
    }
  } else {
    console.log(pc.yellow("  ⚠ No config found. Checking .env file..."));
  }

  if (!openaiKey) {
    openaiKey = process.env.OPENAI_API_KEY;
  }

  if (!openaiKey) {
    console.log(pc.red("  ✗ OpenAI API key not found!"));
    console.log(
      pc.dim("    Run 'Chat-Buddy init' to set up, or create a .env with OPENAI_API_KEY."),
    );
    process.exit(1);
  }

  const googleAuth = resolveAuthContext(config || undefined);
  if (!googleAuth) {
    console.log(
      pc.yellow(
        "  ⚠ Google Calendar integration is disabled or credentials not found. Calendar features will be disabled.",
      ),
    );
  } else {
    console.log(pc.green(`  ✓ Google Calendar features enabled (${googleAuth.source}).`));
  }

  process.env.OPENAI_API_KEY = openaiKey;

  console.log();
  console.log(pc.dim("  Starting WhatsApp bot... Scan the QR code when it appears."));
  console.log();

  const bot = new WhatsAppBot(username, agentName);
  bot.start();
};
