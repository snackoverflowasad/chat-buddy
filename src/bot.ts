/**
 * Bot
 */
import fs from "fs";
import path from "path";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { handleMessages } from "./services/messageHandler.service.js";
import { getBanner } from "./utils/banner.js";
import { getStorageDir } from "./storage/configStore.js";

type ClientType = import("whatsapp-web.js").Client;

const { Client, LocalAuth } = pkg;

const clearPersistedWhatsAppSession = (dataPath: string): void => {
  let cleared = false;

  const removeDirIfExists = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) return;
    fs.rmSync(dirPath, { recursive: true, force: true });
    cleared = true;
  };

  // Remove LocalAuth session folders while preserving config and other app data.
  if (fs.existsSync(dataPath)) {
    const entries = fs.readdirSync(dataPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (/^session(?:-|$)/i.test(entry.name)) {
        removeDirIfExists(path.join(dataPath, entry.name));
      }
    }
  }

  for (const legacyFolder of [".wwebjs_auth", ".wwebjs_cache", ".wwebjs_session"]) {
    removeDirIfExists(path.join(dataPath, legacyFolder));
  }

  if (cleared) {
    console.log("Cleared saved WhatsApp session. QR scan is required for this run.");
  }
};

export class WhatsAppBot {
  private client: ClientType;
  private username: string;
  private agentName: string;
  private processedMessageIds = new Map<string, number>();

  constructor(username: string = "User", agentName: string = "Assistant") {
    this.username = username;
    this.agentName = agentName;

    const dataPath = getStorageDir();
    // Only clear persisted WhatsApp session when explicitly requested.
    // This avoids forcing a QR re-scan on every startup.
    const shouldClearSessions =
      process.env.CLEAR_WHATSAPP_SESSION === "true" || process.env.CLEAR_WHATSAPP_SESSION === "1";

    if (shouldClearSessions) {
      clearPersistedWhatsAppSession(dataPath);
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        timeout: 60000,
      },
    });

    this.initializeEvents();
  }

  private initializeEvents() {
    const shouldProcessMessage = (message: any): boolean => {
      const messageId = message?.id?._serialized;
      if (!messageId) return true;

      const now = Date.now();
      for (const [id, timestamp] of this.processedMessageIds.entries()) {
        if (now - timestamp > 5 * 60 * 1000) {
          this.processedMessageIds.delete(id);
        }
      }

      const existing = this.processedMessageIds.get(messageId);
      if (existing && now - existing < 30 * 1000) {
        return false;
      }

      this.processedMessageIds.set(messageId, now);
      return true;
    };

    this.client.on("qr", (qr) => {
      console.log("Scan QR to login:");
      qrcode.generate(qr, { small: true });
    });

    this.client.on("loading_screen", (percent, message) => {
      console.log(`WhatsApp loading: ${percent}% - ${message}`);
    });

    this.client.on("authenticated", () => {
      console.log("WhatsApp authenticated. Finishing startup...");
    });

    this.client.on("ready", async () => {
      try {
        console.clear();
        void getBanner(this.agentName, this.username);
      } catch (err) {
        console.log(err);
      }
    });

    this.client.on("auth_failure", (msg) => {
      console.log("Auth failed:", msg);
    });

    this.client.on("disconnected", (reason) => {
      console.log("Disconnected:", reason);
      console.log("Reconnecting...");
      this.client.initialize();
    });

    const onMessage = async (message: any) => {
      if (!shouldProcessMessage(message)) return;

      try {
        await handleMessages(message, this.username, this.agentName);
      } catch (err) {
        console.log("Message error:", err);
      }
    };

    this.client.on("message", onMessage);
    this.client.on("message_create", onMessage);
  }

  public start() {
    console.log("Launching WhatsApp browser session... this can take up to a minute on first run.");
    this.client.initialize().catch((err) => {
      console.log(err);
    });
  }
}

export const botRebootTime = Date.now();
