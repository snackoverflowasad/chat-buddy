/**
 * Command Service
 */
import { clearHistory, getHistory } from "./memory.service.js";
import { rememberOutgoingReply } from "./outgoingReplyTracker.js";
import { tryCreateMeetingFromText } from "./meetingScheduler.service.js";

type MessageType = import("whatsapp-web.js").Message;

const getSafeContactName = async (message: MessageType, fallbackName: string): Promise<string> => {
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

export const handleCommand = async (message: MessageType, text: string): Promise<void> => {
  const normalizedText = text.trim();
  const lowerText = normalizedText.toLowerCase();

  if (normalizedText === "/") {
    const replyText = `Welcome to bot helper dashboard : 
      - Enter /time for current time
      - Enter /schedule for setting an reminder
      - Enter /history for seeing the chat history
      - Enter /reset for reset it to null
      `;
    rememberOutgoingReply(message.from, replyText);
    await message.reply(replyText);
  }

  if (lowerText === "/time") {
    const date = new Date();
    const replyText = `The current time is ${date.getHours()}:${date.getMinutes()}`;
    rememberOutgoingReply(message.from, replyText);
    await message.reply(replyText);
  }

  if (lowerText.startsWith("/schedule")) {
    // Resolve the requester to a stable contact name so meeting records
    // remain consistent with other call sites that use contact names.
    const requesterName = await getSafeContactName(message, "User");
    const result = await tryCreateMeetingFromText(requesterName, normalizedText);

    if (result) {
      rememberOutgoingReply(message.from, result.reply);
      await message.reply(result.reply);
      return;
    }

    const promptReply =
      "Send me a meeting time like `/schedule meeting at 8pm` and I will create the Google Meet link.";
    rememberOutgoingReply(message.from, promptReply);
    await message.reply(promptReply);
  }

  if (lowerText === "/reset") {
    const contactName = await getSafeContactName(message, "User");
    clearHistory(contactName);
    const replyText = "Chat history has been cleared.";
    rememberOutgoingReply(message.from, replyText);
    await message.reply(replyText);
  }

  if (lowerText === "/history") {
    const contactName = await getSafeContactName(message, "User");
    const history = getHistory(contactName);
    if (history.length === 0) {
      const replyText = "No chat history found.";
      rememberOutgoingReply(message.from, replyText);
      await message.reply(replyText);
    } else {
      const replyText = history.join("\n");
      rememberOutgoingReply(message.from, replyText);
      await message.reply(replyText);
    }
  }
};
