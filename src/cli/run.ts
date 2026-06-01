/**
 * Run
 */
import pc from "picocolors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { loadConfig, configExists, BotConfig } from "../storage/configStore.js";
import { WhatsAppBot } from "../bot.js";
import { resolveAuthContext } from "../auth/googleAuth.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// Determine project root by searching upwards from the current working
// directory for a package.json. Fall back to moduleDir's ancestor if not found.
const findProjectRoot = (): string => {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // fallback to module directory parent
  return path.resolve(moduleDir, "..", "..");
};

const projectRoot = findProjectRoot();
const envPath = path.join(projectRoot, ".env");
const envPathAlt = path.join(projectRoot, "env");
if (fs.existsSync(envPath)) {
  // Do not override existing environment variables by default; file values
  // should not silently clobber environment variables in production.
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envPathAlt)) {
  dotenv.config({ path: envPathAlt });
}

const readOpenRouterKeyFromEnvFile = (): string | undefined => {
  const candidatePaths = [envPath, envPathAlt];

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) continue;

    try {
      const raw = fs.readFileSync(candidatePath, "utf-8");
      const lines = raw.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const match = trimmed.match(/^\uFEFF?(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (!match) continue;

        const key = match[1];
        let value = match[2] ?? "";

        // Strip matching surrounding quotes if present.
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        const normalizedValue = value.trim();
        if (!normalizedValue.startsWith("sk-or-")) continue;

        if (
          key === "OPENAI_ROUTER_KEY" ||
          key === "OPEN_ROUTER_API_KEY" ||
          key === "OPENAI_API_KEY"
        ) {
          return normalizedValue;
        }
      }
    } catch {
      // Ignore unreadable .env and continue checking other candidates.
    }
  }

  return undefined;
};

export const runBot = async (): Promise<void> => {
  console.log();

  let openRouterKey: string | undefined;
  let username: string = "User";
  let agentName: string = "Assistant";
  let config: BotConfig | null = null;

  if (configExists()) {
    config = loadConfig();
    if (config) {
      if (config.openRouterApiKey?.trim().startsWith("sk-or-")) {
        openRouterKey = config.openRouterApiKey;
      }
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

  const envOpenRouterKeyCandidates = [
    process.env.OPENAI_ROUTER_KEY?.trim(),
    process.env.OPEN_ROUTER_API_KEY?.trim(),
    process.env.OPENAI_API_KEY?.trim(),
    process.env["\uFEFFOPENAI_ROUTER_KEY"]?.trim(),
    readOpenRouterKeyFromEnvFile(),
  ];

  const envOpenRouterKey = envOpenRouterKeyCandidates.find(
    (value) => typeof value === "string" && value.startsWith("sk-or-"),
  );

  if (!openRouterKey && envOpenRouterKey) {
    openRouterKey = envOpenRouterKey;
  }

  if (!openRouterKey) {
    console.log(pc.red("  ✗ API key not found!"));
    console.log(
      pc.dim("    Run 'Chat-Buddy init' to set up, or create a .env with OPENAI_ROUTER_KEY."),
    );
    process.exit(1);
  }

  if (openRouterKey) {
    process.env.OPENAI_ROUTER_KEY = openRouterKey;
    console.log(pc.green("  ✓ Open Router API key detected."));
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

  console.log();
  console.log(pc.dim("  Starting WhatsApp bot... Scan the QR code when it appears."));
  console.log();

  const bot = new WhatsAppBot(username, agentName);
  bot.start();
};
