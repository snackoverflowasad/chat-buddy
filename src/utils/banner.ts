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

const center = (text: string, width: number) =>
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

  console.log();
  console.log(pc.dim(center(`Agent  : ${agentName}`, width)));
  console.log(pc.dim(center(`Owner  : ${username}`, width)));
  console.log(pc.dim(center("Status : RUNNING", width)));
  console.log();
};
