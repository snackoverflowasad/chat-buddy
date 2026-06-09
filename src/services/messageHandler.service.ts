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
  lastActivityAtMs: number;
};

const pendingReplies = new Map<string, PendingUserReply>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

const DEFAULT_PENDING_REPLY_TTL_MS = 60 * 60 * 1000;
const MIN_PENDING_REPLY_TTL_MS = 60 * 1000;
const MAX_PENDING_REPLY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MIN_CLEANUP_INTERVAL_MS = 10 * 1000;
const MAX_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const getPendingReplyTtlMs = (): number => {
  const hours = Number(process.env.CHAT_BUDDY_PENDING_REPLY_TTL_HOURS ?? "1");
  if (!Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_PENDING_REPLY_TTL_MS;
  }

  return clamp(Math.floor(hours * 60 * 60 * 1000), MIN_PENDING_REPLY_TTL_MS, MAX_PENDING_REPLY_TTL_MS);
};

const getCleanupIntervalMs = (): number => {
  const value = Number(
    process.env.CHAT_BUDDY_PENDING_REPLY_CLEANUP_INTERVAL_MS ?? String(DEFAULT_CLEANUP_INTERVAL_MS),
  );
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_CLEANUP_INTERVAL_MS;
  }

  return clamp(Math.floor(value), MIN_CLEANUP_INTERVAL_MS, MAX_CLEANUP_INTERVAL_MS);
};

const stopPendingReplyCleanup = (): void => {
  if (!cleanupTimer) return;
  clearInterval(cleanupTimer);
  cleanupTimer = null;
};

const cleanupStalePendingReplies = (nowMs: number = Date.now()): number => {
  const ttlMs = getPendingReplyTtlMs();
  let removed = 0;

  for (const [userId, pending] of pendingReplies.entries()) {
    if (pending.processing) continue;
    if (nowMs - pending.lastActivityAtMs < ttlMs) continue;

    if (pending.timer) {
      clearTimeout(pending.timer);
      pending.timer = null;
    }

    pendingReplies.delete(userId);
    removed += 1;
  }

  if (pendingReplies.size === 0) {
    stopPendingReplyCleanup();
  }

  return removed;
};

const startPendingReplyCleanup = (): void => {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const removed = cleanupStalePendingReplies();
    if (removed > 0) {
      console.log(`[MessageHandler] Cleaned ${removed} stale pending replies.`);
    }
  }, getCleanupIntervalMs());

  cleanupTimer.unref?.();
};

export const getDebounceMs = (): number => {
  const value = Number(process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS ?? "2200");
  if (!Number.isFinite(value)) return 2200;
  if (value < 300) return 300;
  if (value > 15000) return 15000;
  return Math.floor(value);
};

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
    if (pending.timer) {
      clearTimeout(pending.timer);
      pending.timer = null;
    }
    pendingReplies.delete(userId);
    if (pendingReplies.size === 0) {
      stopPendingReplyCleanup();
    }
    return;
  }

  const batchedInput = pending.messages.join("\n");
  const { latestMessage, contactName, username, agentName } = pending;
  pending.messages = [];
  pending.timer = null;
  pending.processing = true;
  pending.lastActivityAtMs = Date.now();

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
      if (pendingReplies.size === 0) {
        stopPendingReplyCleanup();
      }
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
    startPendingReplyCleanup();

    pendingReplies.set(userId, {
      messages: [text],
      latestMessage: message,
      contactName,
      username,
      agentName,
      timer: null,
      processing: false,
      lastActivityAtMs: Date.now(),
    });
  } else {
    existing.messages.push(text);
    existing.latestMessage = message;
    existing.contactName = contactName;
    existing.username = username;
    existing.agentName = agentName;
    existing.lastActivityAtMs = Date.now();
  }

  scheduleBufferedReply(userId);
};

export const shutdownPendingReplyCleanup = (): void => {
  stopPendingReplyCleanup();

  for (const pending of pendingReplies.values()) {
    if (pending.timer) {
      clearTimeout(pending.timer);
    }
  }

  pendingReplies.clear();
};

export const __internal = {
  cleanupStalePendingReplies,
  getPendingReplyTtlMs,
  getCleanupIntervalMs,
};
