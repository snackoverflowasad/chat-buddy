#!/usr/bin/env node

import { Command } from "commander";
import { runInit } from "./init.js";
import { runBot } from "./run.js";

const program = new Command();

program
  .name("botwithaki")
  .description("🤖 WhatsApp AI Bot — Automate, Reply, Schedule, Assist")
  .version("1.0.0");

program
  .command("init")
  .description("Set up BotWithHaki — enter your API keys, username, and agent name")
  .action(async () => {
    try {
      await runInit();
    } catch (error) {
      console.error("Setup failed:", error);
      process.exit(1);
    }
  });

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

program.parse();
