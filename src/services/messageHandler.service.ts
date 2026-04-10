import { Message as MessageType } from "whatsapp-web.js";
import { runAgent } from "../agents/agent.servce.js";
import { botRebootTime } from "../bot.js";
import { createProtocols } from "../config/agent.protocol.js";
import { storeMessage } from "./memory.service.js";
import { handleCommand } from "./command.service.js";

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

const getDebounceMs = (): number => {
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

    // Store agent reply with timestamp
    storeMessage(contactName, reply, true);

    await latestMessage.reply(reply);
  } catch (error) {
    console.log("Tripwire triggered:", error);
    await latestMessage.reply("I cannot respond to that request.");
  } finally {
    pending.processing = false;

    // If more messages arrived while the agent was processing, debounce again.
    if (pending.messages.length > 0) {
      scheduleBufferedReply(userId);
      return;
    }

    pendingReplies.delete(userId);
  }
};

export const handleMessages = async (
  message: MessageType,
  username: string = "Asad",
  agentName: string = "Luffy",
): Promise<void> => {
  // Ignore bot's own messages
  if (message.fromMe) return;

  // Ignore old synced messages
  if (message.timestamp * 1000 < botRebootTime) return;

  // Ignore empty
  if (!message.body) return;

  const userId = message.from;
  const text = message.body.trim();
  const textLower = text.toLowerCase();

  const protocols = createProtocols(agentName, username);

  // Ignore groups if disabled
  if (
    (message.from.endsWith("@g.us") && !protocols.allowGroupReplies) ||
    message.from === "status@broadcast"
  ) {
    return;
  }

  // Get contact name for chat history
  const contact = await message.getContact();
  const contactName = contact.pushname || contact.number;
  console.log(`${contactName}: ${text}`);

  // Store user message with timestamp
  storeMessage(contactName, text, false);

  // Commands
  if (textLower.startsWith("/")) {
    await handleCommand(message, textLower);
    return;
  }

  // Debounce user bursts: combine rapid consecutive messages into one agent call.
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
