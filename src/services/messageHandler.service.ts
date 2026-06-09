/**
 * Message Handler Service
 * Processes incoming WhatsApp messages, handles debouncing for rapid consecutive texts,
 * filters unwanted messages, and orchestrates agent responses and commands.
 */
import { runAgent } from "../agents/agent.servce.js";
import { botRebootTime } from "../bot.js";
import { createProtocols } from "../config/agent.protocol.js";
import { storeMessage } from "./memory.service.js";
import { handleCommand } from "./command.service.js";

type MessageType = import("whatsapp-web.js").Message;

type PendingUserReply = {
  messages: string[];
  latestMessage: MessageType;
  contactName: string;
  username: string;
  agentName: string;
  timer: ReturnType<typeof setTimeout> | null;
  processing: boolean;
  lastActivity: number;
};

const pendingReplies = new Map<string, PendingUserReply>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const getDebounceMs = (): number => {
  const value = Number(process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS ?? "2200");
  if (!Number.isFinite(value)) return 2200;
  if (value < 300) return 300;
  if (value > 15000) return 15000;
  return Math.floor(value);
};

const getPendingReplyTTLHours = (): number => {
  const value = Number(process.env.CHAT_BUDDY_PENDING_REPLY_TTL_HOURS ?? "1");
  if (!Number.isFinite(value)) return 1;
  if (value < 0.1) return 0.1;
  if (value > 168) return 168;
  return value;
};

const getPendingReplyCleanupIntervalMs = (): number => {
  const value = Number(process.env.CHAT_BUDDY_PENDING_REPLY_CLEANUP_INTERVAL_MS ?? `${5 * 60 * 1000}`);
  if (!Number.isFinite(value)) return 5 * 60 * 1000;
  if (value < 60000) return 60000;
  if (value > 3600000) return 3600000;
  return Math.floor(value);
};

export const getPendingReplyCount = (): number => pendingReplies.size;

const getPendingReplyTTLMs = (): number => Math.floor(getPendingReplyTTLHours() * 60 * 60 * 1000);

export const cleanupPendingReplies = (): void => {
  const now = Date.now();
  const ttlMs = getPendingReplyTTLMs();

  for (const [userId, pending] of pendingReplies) {
    if (now - pending.lastActivity < ttlMs) {
      continue;
    }

    if (pending.timer) {
      clearTimeout(pending.timer);
      pending.timer = null;
    }

    if (pending.processing) {
      continue;
    }

    pendingReplies.delete(userId);
  }
};

export const stopPendingReplyCleanup = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};

const startPendingReplyCleanup = (): void => {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(cleanupPendingReplies, getPendingReplyCleanupIntervalMs());
};

startPendingReplyCleanup();

const scheduleBufferedReply = (userId: string): void => {
  const pending = pendingReplies.get(userId);
  if (!pending) return;

  if (pending.timer) {
    clearTimeout(pending.timer);
  }

  pending.timer = setTimeout(() => {
    void flushBufferedReply(userId);
  }, getDebounceMs());
};

const flushBufferedReply = async (userId: string): Promise<void> => {
  const pending = pendingReplies.get(userId);
  if (!pending) return;

  if (pending.processing) {
    scheduleBufferedReply(userId);
    return;
  }

  if (pending.messages.length === 0) {
    pendingReplies.delete(userId);
    return;
  }

  const batchedInput = pending.messages.join("\n");
  const { latestMessage, contactName, username, agentName } = pending;
  pending.messages = [];
  pending.timer = null;
  pending.processing = true;

  try {
    const reply = await runAgent(userId, contactName, batchedInput, username, agentName);

    storeMessage(userId, reply, true);

    await latestMessage.reply(reply);
  } catch (error) {
    console.log("Tripwire triggered:", error);
    await latestMessage.reply("I cannot respond to that request.");
  } finally {
    pending.processing = false;

    if (pending.messages.length > 0) {
      scheduleBufferedReply(userId);
    } else {
      pendingReplies.delete(userId);
    }
  }
};

export const handleMessages = async (
  message: MessageType,
  username: string = "Asad",
  agentName: string = "Luffy",
): Promise<void> => {
  if (message.fromMe) return;

  if (message.timestamp * 1000 < botRebootTime) return;

  if (!message.body) return;

  const userId = message.from;
  const text = message.body.trim();
  const textLower = text.toLowerCase();

  const protocols = createProtocols(agentName, username);

  if (
    (message.from.endsWith("@g.us") && !protocols.allowGroupReplies) ||
    message.from === "status@broadcast"
  ) {
    return;
  }

  const contact = await message.getContact();
  const contactName = contact.pushname || contact.number;
  console.log(`${contactName}: ${text}`);

  storeMessage(userId, text, false);

  if (textLower.startsWith("/")) {
    await handleCommand(message, textLower);
    return;
  }

  const existing = pendingReplies.get(userId);
  if (!existing) {
    pendingReplies.set(userId, {
      messages: [text],
      latestMessage: message,
      contactName,
      username,
      agentName,
      timer: null,
      processing: false,
      lastActivity: Date.now(),
    });
  } else {
    existing.messages.push(text);
    existing.latestMessage = message;
    existing.contactName = contactName;
    existing.username = username;
    existing.agentName = agentName;
    existing.lastActivity = Date.now();
  }

  scheduleBufferedReply(userId);
};
