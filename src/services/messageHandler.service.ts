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
import { rememberOutgoingReply, shouldIgnoreOutgoingEcho } from "./outgoingReplyTracker.js";
import { tryCreateMeetingFromText } from "./meetingScheduler.service.js";

type MessageType = import("whatsapp-web.js").Message;

type PendingUserReply = {
  messages: string[];
  latestMessage: MessageType;
  contactName: string;
  username: string;
  agentName: string;
  timer: ReturnType<typeof setTimeout> | null;
  processing: boolean;
};

const pendingReplies = new Map<string, PendingUserReply>();
let openRouterDisabledUntil = 0;

const getQuotaFallbackReply = (): string =>
  "Open Router is unavailable right now, so I can't generate a reply. Please try again later.";

const isQuotaError = (error: unknown): boolean => {
  const maybeError = error as { code?: string; status?: number; error?: { code?: string } } | null;
  return (
    maybeError?.code === "insufficient_quota" ||
    maybeError?.status === 429 ||
    maybeError?.error?.code === "insufficient_quota"
  );
};

const resolveContactName = async (message: MessageType, fallbackName: string): Promise<string> => {
  if (message.fromMe) {
    return fallbackName;
  }

  try {
    const contact = await message.getContact();
    return contact.pushname || contact.number || fallbackName;
  } catch {
    return fallbackName;
  }
};

const getDebounceMs = (): number => {
  const value = Number(process.env.CHAT_BUDDY_RESPONSE_DEBOUNCE_MS ?? "2200");
  if (!Number.isFinite(value)) return 2200;
  if (value < 300) return 300;
  if (value > 15000) return 15000;
  return Math.floor(value);
};

const clearPendingReply = (userId: string): void => {
  const pending = pendingReplies.get(userId);
  if (!pending) return;

  if (pending.timer) {
    clearTimeout(pending.timer);
  }

  pendingReplies.delete(userId);
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
    pendingReplies.delete(userId);
    return;
  }

  const batchedInput = pending.messages.join("\n");
  const { latestMessage, contactName, username, agentName } = pending;
  pending.messages = [];
  pending.timer = null;
  pending.processing = true;

  if (Date.now() < openRouterDisabledUntil) {
    const reply = getQuotaFallbackReply();
    storeMessage(contactName, reply, true);
    rememberOutgoingReply(userId, reply);
    await latestMessage.reply(reply);
    pending.processing = false;
    if (pending.messages.length > 0) {
      scheduleBufferedReply(userId);
    } else {
      pendingReplies.delete(userId);
    }
    return;
  }

  try {
    const reply = await runAgent(userId, contactName, batchedInput, username);

    storeMessage(contactName, reply, true);
    rememberOutgoingReply(userId, reply);

    await latestMessage.reply(reply);
  } catch (error) {
    console.log("Tripwire triggered:", error);
    const fallbackReply = isQuotaError(error)
      ? getQuotaFallbackReply()
      : "I cannot respond to that request.";

    if (isQuotaError(error)) {
      openRouterDisabledUntil = Date.now() + 10 * 60 * 1000;
    }

    storeMessage(contactName, fallbackReply, true);
    rememberOutgoingReply(userId, fallbackReply);
    await latestMessage.reply(fallbackReply);
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
  if (message.timestamp * 1000 < botRebootTime) return;

  if (!message.body) return;

  const userId = message.from;
  const text = message.body.trim();
  const textLower = text.toLowerCase();

  const protocols = createProtocols(agentName, username);

  const processOutgoing = process.env.PROCESS_OUTGOING_MESSAGES === "true";
  // By default ignore messages that originate from the bot itself to avoid
  // accidental echo loops. Enable processing of outgoing messages with
  // `PROCESS_OUTGOING_MESSAGES=true` when desired (e.g., for testing).
  if (message.fromMe && !processOutgoing) {
    return;
  }

  if (message.fromMe && shouldIgnoreOutgoingEcho(userId, text)) {
    return;
  }

  if (
    (message.from.endsWith("@g.us") && !protocols.allowGroupReplies) ||
    message.from === "status@broadcast"
  ) {
    return;
  }

  const contactName = await resolveContactName(message, username);
  console.log(`${contactName}: ${text}`);

  storeMessage(contactName, text, false);

  if (textLower.startsWith("/")) {
    await handleCommand(message, text);
    return;
  }

  const scheduledMeeting = await tryCreateMeetingFromText(contactName, text);
  if (scheduledMeeting) {
    clearPendingReply(userId);
    storeMessage(contactName, scheduledMeeting.reply, true);
    rememberOutgoingReply(userId, scheduledMeeting.reply);
    await message.reply(scheduledMeeting.reply);
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
    });
  } else {
    existing.messages.push(text);
    existing.latestMessage = message;
    existing.contactName = contactName;
    existing.username = username;
    existing.agentName = agentName;
  }

  scheduleBufferedReply(userId);
};
