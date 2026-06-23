/**
 * Bot
 */
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import { handleMessages } from "./services/messageHandler.service.js";
import { getBanner } from "./utils/banner.js";
import { getStorageDir } from "./storage/configStore.js";

type ClientType = import("whatsapp-web.js").Client;

const { Client, LocalAuth } = pkg;

// ==========================================
// GLOBAL SAFETY NET FOR SILENT BACKGROUND CRASHES
// ==========================================
process.on("unhandledRejection", (reason: unknown) => {
  console.error('\n' + chalk.red.bold('✕ Critical Application Error (Unhandled Rejection)!'));
  
  if (reason instanceof Error) {
    console.error(chalk.dim(`Details: ${reason.message}`));
  } else {
    console.error(chalk.dim(`Details: ${String(reason)}`));
  }

  console.error(chalk.yellow('\nPossible Root Causes:'));
  console.error('  • Network is completely offline (Wi-Fi turned off).');
  console.error('  • Puppeteer hit a silent timeout waiting for WhatsApp Web.');

  console.error(chalk.cyan('\n👉 Action: Check your connection and restart with: ') + chalk.green('npm run dev\n'));
  process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
  console.error('\n' + chalk.red.bold('✕ Unexpected System Exception!'));
  console.error(chalk.dim(`Error: ${error.message}`));
  process.exit(1);
});
// ==========================================

export class WhatsAppBot {
  private client: ClientType;
  private username: string;
  private agentName: string;

  constructor(username: string = "User", agentName: string = "Assistant") {
    this.username = username;
    this.agentName = agentName;

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: getStorageDir() }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        timeout: 60000,
      },
    });

    this.initializeEvents();
  }

  private initializeEvents() {
    this.client.on("qr", (qr) => {
      console.log(chalk.cyan("\n📱 Action Required: Scan the QR code to log in:"));
      qrcode.generate(qr, { small: true });
    });

    this.client.on("ready", async () => {
      try {
        console.clear();
        await getBanner(this.agentName, this.username);
        console.log(chalk.green.bold("\n🚀 chat-buddy is live and monitoring messages!"));
      } catch (err) {
        console.error(chalk.red("Failed to load welcome banner:"), err);
      }
    });

    this.client.on("auth_failure", (msg) => {
      console.error('\n' + chalk.red.bold('✕ Authentication Failed!'));
      console.error(chalk.yellow(`Details: ${msg}`));
      console.error(chalk.cyan('👉 Solution: Your session might be invalid. Try clearing your local cache or storage directory, then restart.'));
      process.exit(1);
    });

    this.client.on("disconnected", (reason) => {
      console.warn('\n' + chalk.yellow.bold('⚠️ WhatsApp Connection Lost!'));
      console.error(chalk.dim(`Reason: ${reason}`));
      
      console.error(chalk.cyan('\n🛠️  How to recover:'));
      console.error(`  1. Verify your computer's internet connection.`);
      console.error(`  2. Rerun the command to re-authenticate: ${chalk.green('npm run dev')}\n`);
      
      process.exit(0);
    });

    this.client.on("message", async (message) => {
      try {
        await handleMessages(message, this.username, this.agentName);
      } catch (err) {
        console.error(chalk.red("\n❌ Message processing encountered an error:"), err);
      }
    });
  }

  /**
   * Starts the WhatsApp client and captures initialization failures
   */
  public async start(): Promise<void> {
    console.log(chalk.blue("⏳ Initializing WhatsApp client connection..."));
    
    try {
      await this.client.initialize();
    } catch (err: unknown) {
      console.error('\n' + chalk.red.bold('✕ Client Initialization Failed!'));
      
      if (err instanceof Error) {
        console.error(chalk.dim(`Error Message: ${err.message}`));
      } else {
        console.error(chalk.dim(`Error Details: ${String(err)}`));
      }
      
      console.error(chalk.yellow('\nPossible Root Causes:'));
      console.error('  • Network is completely unreachable (Wi-Fi turned off).');
      console.error('  • Chromium/Puppeteer timed out trying to reach the WhatsApp server.');
      
      console.error(chalk.cyan('\n👉 Action: Please check your internet connection and rerun the command.\n'));
      
      process.exit(1);
    }
  }
}

export const botRebootTime = Date.now();