/**
 * Banner
 */
import pc from "picocolors";
import ora from "ora";

const banner = ` ██████╗██╗  ██╗ █████╗ ████████╗   ██████╗ ██╗   ██╗██████╗ ██████╗ ██╗   ██╗
██╔════╝██║  ██║██╔══██╗╚══██╔══╝   ██╔══██╗██║   ██║██╔══██╗██╔══██╗╚██╗ ██╔╝
██║     ███████║███████║   ██║█████╗██████╔╝██║   ██║██║  ██║██║  ██║ ╚████╔╝ 
██║     ██╔══██║██╔══██║   ██║╚════╝██╔══██╗██║   ██║██║  ██║██║  ██║  ╚██╔╝  
╚██████╗██║  ██║██║  ██║   ██║      ██████╔╝╚██████╔╝██████╔╝██████╔╝   ██║   
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝      ╚═════╝  ╚═════╝ ╚═════╝ ╚═════╝    ╚═╝   
                                                                              `;

export const center = (text: string, width: number) =>
  text
    .split("\n")
    .map((line) => {
      const pad = Math.max(0, Math.floor((width - line.length) / 2));
      return " ".repeat(pad) + line;
    })
    .join("\n");

export const getBanner = async (agentName: string = "Bot", username: string = "User") => {
  const width = process.stdout.columns ?? 80;

  console.clear();
  console.log(pc.green(center(banner.trim(), width)));
  console.log();
  console.log(pc.bold(pc.green(center("🤖 Chat-Buddy — WhatsApp AI Bot", width))));
  console.log(pc.dim(center("Automate • Reply • Schedule • Assist", width)));
  console.log(pc.dim(center("────────────────────────────────────", width)));

  const spinner = ora({
    text: "Connecting to WhatsApp...",
    color: "green",
  }).start();

  await new Promise((r) => setTimeout(r, 1200));
  spinner.succeed("WhatsApp Connected");

  spinner.start("Loading AI memory...");
  await new Promise((r) => setTimeout(r, 1000));
  spinner.succeed("AI Ready");

  spinner.start("Starting services...");
  await new Promise((r) => setTimeout(r, 900));
  spinner.succeed("Bot Online ✅");

  console.log();
  console.log(pc.dim(center(`Agent  : ${agentName}`, width)));
  console.log(pc.dim(center(`Owner  : ${username}`, width)));
  console.log(pc.dim(center("Status : RUNNING", width)));
  console.log();
};
