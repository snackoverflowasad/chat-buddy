/**
 * Command Service
 */
import { clearHistory, getHistory } from "./memory.service.js";

type MessageType = import("whatsapp-web.js").Message;

export const handleCommand = async (message: MessageType, text: string): Promise<void> => {
  if (text == "/") {
    await message.reply(`Welcome to bot helper dashboard : 
        - Enter /time for current time
        - Enter /schedule for setting an reminder
        - Enter /history for seeing the chat history
        - Enter /reset for reset it to null
        `);
  }

  if (text == "/time") {
    const date = new Date();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const period = hours < 12 ? "Good Morning" : hours < 17 ? "Good Afternoon" : "Good Evening";
    await message.reply(`${period}! The current time is ${hours}:${minutes}`);
  }

  if (text == "/schedule") {
    await message.reply(`Currently busy this week. Please feel free to reach out again next week.`);
  }

  if (text == "/reset") {
    const contact = await message.getContact();
    const contactName = contact.pushname || contact.number;
    clearHistory(contactName);
    await message.reply("Chat history has been cleared.");
  }

  if (text == "/history") {
    const contact = await message.getContact();
    const contactName = contact.pushname || contact.number;
    const history = getHistory(contactName);
    if (history.length === 0) {
      await message.reply("No chat history found.");
    } else {
      await message.reply(history.join("\n"));
    }
  }
};
