import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import ora from "ora";
import pc from "picocolors";
import { saveConfig, configExists, type BotConfig } from "../storage/configStore.js";

const banner = `
██████╗  ██████╗ ████████╗    ██╗    ██╗██╗████████╗██╗  ██╗    ██╗  ██╗ █████╗ ██╗  ██╗██╗
██╔══██╗██╔═══██╗╚══██╔══╝    ██║    ██║██║╚══██╔══╝██║  ██║    ██║  ██║██╔══██╗██║ ██╔╝██║
██████╔╝██║   ██║   ██║       ██║ █╗ ██║██║   ██║   ███████║    ███████║███████║█████╔╝ ██║
██╔══██╗██║   ██║   ██║       ██║███╗██║██║   ██║   ██╔══██║    ██╔══██║██╔══██║██╔═██╗ ██║
██████╔╝╚██████╔╝   ██║       ╚███╔███╔╝██║   ██║   ██║  ██║    ██║  ██║██║  ██║██║  ██╗██║
╚═════╝  ╚═════╝    ╚═╝        ╚══╝╚══╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝
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
  console.log(pc.bold(pc.green(center("🤖 BotWithHaki — Setup Wizard", width))));
  console.log(pc.dim(center("────────────────────────────────────", width)));
  console.log();

  if (configExists()) {
    console.log(pc.yellow("  ⚠ A configuration already exists. Running init will overwrite it."));
    console.log();
  }

  const rl = readline.createInterface({ input, output });

  try {
    // 1. Username
    console.log(pc.bold(pc.white("  📋 Step 1: Your Identity")));
    const username = await ask(rl, "Enter your name (e.g. Asad)");
    if (!username) {
      console.log(pc.red("  ✗ Username is required."));
      rl.close();
      return;
    }
    console.log();

    // 2. Agent Name
    console.log(pc.bold(pc.white("  🤖 Step 2: Agent Configuration")));
    const agentName = await ask(rl, "Enter your agent's name (e.g. Luffy)");
    if (!agentName) {
      console.log(pc.red("  ✗ Agent name is required."));
      rl.close();
      return;
    }
    console.log();

    // 3. OpenAI API Key
    console.log(pc.bold(pc.white("  🔑 Step 3: API Keys")));
    console.log(pc.dim("     Your keys are encrypted using AES-256 and stored locally."));
    console.log(pc.dim("     They are never sent anywhere except to the respective API services."));
    console.log();

    const openaiApiKey = await ask(rl, "Enter your OpenAI API key (sk-...)");
    if (!openaiApiKey || !openaiApiKey.startsWith("sk-")) {
      console.log(pc.red("  ✗ Invalid OpenAI API key. Must start with 'sk-'."));
      rl.close();
      return;
    }
    console.log();

    // 4. Google API Key
    const googleApiKey = await ask(rl, "Enter your Google API key (AIza...)");
    if (!googleApiKey) {
      console.log(pc.red("  ✗ Google API key is required."));
      rl.close();
      return;
    }
    console.log();

    rl.close();

    // Save config
    const spinner = ora({ text: "Encrypting and saving configuration...", color: "green" }).start();
    await new Promise((r) => setTimeout(r, 800));

    const config: BotConfig = {
      username,
      agentName,
      openaiApiKey,
      googleApiKey,
      allowGroupReplies: false,
      timezone: "Asia/Kolkata",
    };

    saveConfig(config);
    spinner.succeed("Configuration saved securely!");

    console.log();
    console.log(pc.green("  ✓ Setup complete! Your bot is ready."));
    console.log();
    console.log(pc.dim("  To start the bot, run:"));
    console.log(pc.bold(pc.cyan("    botwithaki run")));
    console.log();
    console.log(pc.dim("  You'll be prompted to scan a WhatsApp QR code."));
    console.log();
  } catch (error) {
    rl.close();
    throw error;
  }
};
