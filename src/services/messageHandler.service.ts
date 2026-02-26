import { Message as MessageType } from "whatsapp-web.js";
import { runAgent } from "../agents/agent.servce.js";
import { botRebootTime } from "../bot.js";
import { protocols } from "../config/agent.protocol.js";
import { getHistory, memoryStore, storeMessage } from "./memory.service.js";
import { handleCommand } from "./command.service.js";
import { createEvent } from "../utils/response.js";

export const handleMessages = async (message: MessageType): Promise<void> => {
  // Ignore bot's own messages
  if (message.fromMe) return;

  // Ignore old synced messages
  if (message.timestamp * 1000 < botRebootTime) return;

  //  Ignore empty
  if (!message.body) return;

  const userId = message.from;
  const text = message.body.trim().toLowerCase();

  // Ignore groups if disabled
  if (
    (message.from.endsWith("@g.us") && !protocols.allowGroupReplies) ||
    message.from === "status@broadcast"
  ) {
    return;
  }

  // Store normalized message
  storeMessage(userId, text);
  const contact = await message.getContact();
  const name = contact.pushname || contact.number;
  console.log(`${name}: ${text}`);
  const history = getHistory(userId);
  // console.log(history);

  // Commands
  if (text.startsWith("/")) {
    await handleCommand(message, text);
    return;
  }

  // Greeting shortcut
  if (["hi", "hello", "hey"].includes(text)) {
    await message.reply(
      `Hi ${name}! I'm ${protocols.name}. Asad is currently busy, so I’ll be handling the conversation for now. How can I help you today?`,
    );
    return;
  }

  // agent reply
  try {
    const reply = await runAgent(userId, text);
    const history = memoryStore.get(userId);
    history?.push(reply);
    memoryStore.set(userId, history || []);
    await message.reply(reply);
  } catch (error) {
    console.log("Tripwire triggered:", error);
    await message.reply("I cannot respond to that request.");
  }

  // // creating event
  // try {
  //   const res = await createEvent(event);

  //   console.log("Reminder created successfully!");
  //   console.log(res);
  // } catch (err) {
  //   console.log(err);
  //   await message.reply(
  //     "Something went wrong while creating the reminder. Can you clarify the time?",
  //   );
  // }
};
