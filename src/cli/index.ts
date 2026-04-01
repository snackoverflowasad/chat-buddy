#!/usr/bin/env node

import { Command } from "commander";
import { runInit } from "./init.js";
import { runBot } from "./run.js";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import pc from "picocolors";
import ora from "ora";
import fs from "fs";
import path from "path";
import {
  loadConfig,
  saveConfig,
  configExists,
  getStorageDir,
  type BotConfig,
} from "../storage/configStore.js";

const program = new Command();

program
  .name("chat-buddy")
  .description("🤖 Chat-Buddy — Automate, Reply, Schedule, Assist")
  .version("1.0.4");

// ─── init ───────────────────────────────────────────────────────────────────
program
  .command("init")
  .description("Set up Chat-Buddy — enter your API keys, username, and agent name")
  .action(async () => {
    try {
      await runInit();
    } catch (error) {
      console.error("Setup failed:", error);
      process.exit(1);
    }
  });

// ─── run ────────────────────────────────────────────────────────────────────
program
  .command("run")
  .description("Start the WhatsApp AI Bot")
  .action(async () => {
    try {
      await runBot();
    } catch (error) {
      console.error("Bot failed to start:", error);
      process.exit(1);
    }
  });

// ─── log ────────────────────────────────────────────────────────────────────
program
  .command("log")
  .description("Generate a Google Calendar OAuth token (replaces npm run log)")
  .action(async () => {
    try {
      console.log();
      console.log(pc.bold(pc.cyan("  🔑 Google Calendar — Token Generator")));
      console.log(pc.dim("  ─────────────────────────────────────────"));
      console.log();

      const { generateGoogleToken } = await import("../utils/localAuth.js");
      const spinner = ora({ text: "Authenticating with Google...", color: "green" }).start();

      try {
        await generateGoogleToken();
        spinner.succeed("Google token generated and saved to token.json!");
      } catch (err: any) {
        spinner.fail("Google authentication failed.");
        console.log(pc.red(`  ✗ ${err.message}`));
        process.exit(1);
      }

      console.log();
    } catch (error) {
      console.error("Log command failed:", error);
      process.exit(1);
    }
  });

// ─── key ────────────────────────────────────────────────────────────────────
program
  .command("key")
  .description("Rotate / update your OpenAI and Google API keys")
  .action(async () => {
    console.log();
    console.log(pc.bold(pc.cyan("  🔄 API Key Rotation")));
    console.log(pc.dim("  ─────────────────────────────────────────"));
    console.log();

    if (!configExists()) {
      console.log(pc.red("  ✗ No configuration found. Run 'chat-buddy init' first."));
      process.exit(1);
    }

    const config = loadConfig();
    if (!config) {
      console.log(pc.red("  ✗ Could not decrypt config. It may be corrupted."));
      process.exit(1);
    }

    const rl = readline.createInterface({ input, output });

    try {
      console.log(pc.dim("  Leave a field blank to keep the current key.\n"));

      const newOpenai = await rl.question(pc.cyan("  ➤ New OpenAI API key (sk-...): "));
      const newGoogle = await rl.question(pc.cyan("  ➤ New Google API key (AIza...): "));

      rl.close();

      const trimmedOpenai = newOpenai.trim();
      const trimmedGoogle = newGoogle.trim();

      if (trimmedOpenai && !trimmedOpenai.startsWith("sk-")) {
        console.log(pc.red("  ✗ Invalid OpenAI API key. Must start with 'sk-'."));
        process.exit(1);
      }

      const updatedConfig: BotConfig = {
        ...config,
        openaiApiKey: trimmedOpenai || config.openaiApiKey,
        googleApiKey: trimmedGoogle || config.googleApiKey,
      };

      const spinner = ora({ text: "Encrypting and saving new keys...", color: "green" }).start();
      await new Promise((r) => setTimeout(r, 500));
      saveConfig(updatedConfig);
      spinner.succeed("API keys updated securely!");
      console.log();
    } catch (error) {
      rl.close();
      throw error;
    }
  });

// ─── new --config ───────────────────────────────────────────────────────────
program
  .command("new")
  .description("Reconfigure Chat-Buddy — change agent name, rotate keys & reset auth sessions")
  .option("--config", "Run full reconfiguration")
  .action(async () => {
    console.log();
    console.log(pc.bold(pc.cyan("  ⚡ Chat-Buddy — Full Reconfiguration")));
    console.log(pc.dim("  ─────────────────────────────────────────"));
    console.log();

    if (!configExists()) {
      console.log(pc.red("  ✗ No configuration found. Run 'chat-buddy init' first."));
      process.exit(1);
    }

    const config = loadConfig();
    if (!config) {
      console.log(pc.red("  ✗ Could not decrypt config. It may be corrupted."));
      process.exit(1);
    }

    const rl = readline.createInterface({ input, output });

    try {
      // 1 — Agent Name
      console.log(pc.bold(pc.white("  🤖 New Agent Identity")));
      console.log(pc.dim(`     Current agent name: ${pc.bold(config.agentName)}`));
      const newAgentName = await rl.question(pc.cyan("  ➤ New agent name (leave blank to keep): "));
      console.log();

      // 2 — API Keys
      console.log(pc.bold(pc.white("  🔑 API Key Rotation")));
      console.log(pc.dim("     Leave blank to keep the current key.\n"));
      const newOpenai = await rl.question(pc.cyan("  ➤ New OpenAI API key (sk-...): "));
      const newGoogle = await rl.question(pc.cyan("  ➤ New Google API key (AIza...): "));
      console.log();

      rl.close();

      const trimmedAgent = newAgentName.trim();
      const trimmedOpenai = newOpenai.trim();
      const trimmedGoogle = newGoogle.trim();

      if (trimmedOpenai && !trimmedOpenai.startsWith("sk-")) {
        console.log(pc.red("  ✗ Invalid OpenAI API key. Must start with 'sk-'."));
        process.exit(1);
      }

      // 3 — Reset auth sessions
      console.log(pc.bold(pc.white("  🗑  Clearing auth sessions...")));
      const storageDir = getStorageDir();

      // Delete WhatsApp session
      const waAuthPath = path.join(storageDir, ".wwebjs_auth");
      if (fs.existsSync(waAuthPath)) {
        fs.rmSync(waAuthPath, { recursive: true, force: true });
        console.log(pc.green("     ✓ WhatsApp session cleared"));
      } else {
        console.log(pc.dim("     – No WhatsApp session found"));
      }

      // Delete Google token
      const tokenPath = path.join(process.cwd(), "token.json");
      if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
        console.log(pc.green("     ✓ Google token removed"));
      } else {
        console.log(pc.dim("     – No Google token found"));
      }

      console.log();

      // 4 — Save updated config
      const updatedConfig: BotConfig = {
        ...config,
        agentName: trimmedAgent || config.agentName,
        openaiApiKey: trimmedOpenai || config.openaiApiKey,
        googleApiKey: trimmedGoogle || config.googleApiKey,
      };

      const spinner = ora({ text: "Saving new configuration...", color: "green" }).start();
      await new Promise((r) => setTimeout(r, 500));
      saveConfig(updatedConfig);
      spinner.succeed("Reconfiguration complete!");

      console.log();
      console.log(pc.green(`  ✓ Agent name: ${pc.bold(updatedConfig.agentName)}`));
      console.log(pc.green("  ✓ API keys updated securely"));
      console.log(pc.green("  ✓ Auth sessions cleared — re-scan QR on next run"));
      console.log();
      console.log(pc.dim("  To start the bot, run:"));
      console.log(pc.bold(pc.cyan("    chat-buddy run")));
      console.log();
    } catch (error) {
      rl.close();
      throw error;
    }
  });

program.parse();
