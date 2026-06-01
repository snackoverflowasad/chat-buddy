/**
 * Init
 */
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import ora from "ora";
import pc from "picocolors";
import { saveConfig, configExists, type BotConfig } from "../storage/configStore.js";

const banner = ` ██████╗██╗  ██╗ █████╗ ████████╗   ██████╗ ██╗   ██╗██████╗ ██████╗ ██╗   ██╗
██╔════╝██║  ██║██╔══██╗╚══██╔══╝   ██╔══██╗██║   ██║██╔══██╗██╔══██╗╚██╗ ██╔╝
██║     ███████║███████║   ██║█████╗██████╔╝██║   ██║██║  ██║██║  ██║ ╚████╔╝ 
██║     ██╔══██║██╔══██║   ██║╚════╝██╔══██╗██║   ██║██║  ██║██║  ██║  ╚██╔╝  
╚██████╗██║  ██║██║  ██║   ██║      ██████╔╝╚██████╔╝██████╔╝██████╔╝   ██║   
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝      ╚═════╝  ╚═════╝ ╚═════╝ ╚═════╝    ╚═╝   
                                                                              `;

const center = (text: string, width: number) =>
  text
    .split("\n")
    .map((line) => {
      const pad = Math.max(0, Math.floor((width - line.length) / 2));
      return " ".repeat(pad) + line;
    })
    .join("\n");

const ask = async (rl: readline.Interface, question: string): Promise<string> => {
  const answer = await rl.question(pc.cyan(`  ➤ ${question}: `));
  return answer.trim();
};

export const runInit = async (): Promise<void> => {
  const width = process.stdout.columns ?? 80;

  console.clear();
  console.log(pc.green(center(banner.trim(), width)));
  console.log();
  console.log(pc.bold(pc.green(center("🤖 Chat-Buddy — Setup Wizard", width))));
  console.log(pc.dim(center("────────────────────────────────────", width)));
  console.log();

  if (configExists()) {
    console.log(pc.yellow("  ⚠ A configuration already exists. Running init will overwrite it."));
    console.log();
  }

  const rl = readline.createInterface({ input, output });

  try {
    console.log(pc.bold(pc.white("  📋 Step 1: Your Identity")));
    const username = await ask(rl, "Enter your name (e.g. Asad)");
    if (!username) {
      console.log(pc.red("  ✗ Username is required."));
      rl.close();
      return;
    }
    console.log();

    console.log(pc.bold(pc.white("  🤖 Step 2: Agent Configuration")));
    const agentName = await ask(rl, "Enter your agent's name (e.g. Luffy)");
    if (!agentName) {
      console.log(pc.red("  ✗ Agent name is required."));
      rl.close();
      return;
    }
    console.log();

    console.log(pc.bold(pc.white("  🔑 Step 3: API Keys & Integrations")));
    console.log(pc.dim("     Your keys are encrypted using AES-256 and stored locally."));
    console.log(pc.dim("     They are never sent anywhere except to the respective API services."));
    console.log();

    const apiKey = await ask(rl, "Enter your Open Router API key (sk-or-...)");
    if (!apiKey || !apiKey.startsWith("sk-or-")) {
      console.log(pc.red("  ✗ Invalid API key. Must start with 'sk-or-'."));
      rl.close();
      return;
    }
    console.log();

    console.log(pc.dim("     Google Calendar Integration requires OAuth 2.0 Credentials."));
    const enableGoogleAns = await ask(rl, "Enable Google Calendar integration? (y/N)");
    const enableGoogleCalendar = enableGoogleAns.toLowerCase() === "y";
    let googleOAuthClientId: string | undefined;
    let googleOAuthClientSecret: string | undefined;

    if (enableGoogleCalendar) {
      googleOAuthClientId = await ask(rl, "Google OAuth Client ID");
      googleOAuthClientSecret = await ask(rl, "Google OAuth Client Secret");
      if (!googleOAuthClientId || !googleOAuthClientSecret) {
        console.log(
          pc.red("  ✗ Client ID and Client Secret are required when Google Calendar is enabled."),
        );
        rl.close();
        return;
      }
    }
    console.log();

    rl.close();

    const spinner = ora({ text: "Encrypting and saving configuration...", color: "green" }).start();
    await new Promise((r) => setTimeout(r, 800));

    const config: BotConfig = {
      configVersion: 2,
      username,
      agentName,
      openRouterApiKey: apiKey,
      enableGoogleCalendar,
      googleOAuthClientId,
      googleOAuthClientSecret,
      allowGroupReplies: false,
      timezone: "Asia/Kolkata",
    };

    saveConfig(config);
    spinner.succeed("Configuration saved securely!");

    console.log();
    console.log(pc.green("  ✓ Setup complete! Your bot is ready."));
    console.log();
    console.log(pc.dim("  To start the bot, run:"));
    console.log(pc.bold(pc.cyan("    chat-buddy run")));
    console.log();
    console.log(pc.dim("  You'll be prompted to scan a WhatsApp QR code."));
    console.log();
  } catch (error) {
    rl.close();
    throw error;
  }
};
