/**
 * Core Agent Service
 * Initializes and executes the main OpenAI agent with custom personality traits,
 * tools, and handoff logic for responding to user messages.
 */
import { Agent, run } from "@openai/agents";
import { createProtocols } from "../config/agent.protocol.js";

import { getTime } from "../tools/time.tool.js";
import { getChatHistory } from "../tools/getHistory.js";
import { setReminderandMeetAgent } from "./setEvent.service.js";
import { withRequesterContext } from "../storage/runContext.js";
import { getLatestMeetingForRequesterSince } from "../storage/sessionMeetingStore.js";
import { getContext, saveContext } from "../services/conversationService.js";
import type { Message } from "../storage/interfaces/ConversationStore.js";

const formatSessionMessage = (message: Message, contactName: string): string => {
  const timeStr = new Date(message.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  const speaker = message.role === "assistant" ? "assistant" : contactName;
  return `[${timeStr}] ${speaker}: ${message.content}`;
};

export const runAgent = async (
  userId: string,
  contactName: string,
  userMessage: string,
  username: string = "Asad",
  agentName: string = "Luffy",
): Promise<string> => {
  const protocols = createProtocols(agentName, username);

  const sessionHistory = await getContext(userId);
  const historyContext =
    sessionHistory.length > 0
      ? `Previous conversation:\n${sessionHistory.map((message) => formatSessionMessage(message, contactName)).join("\n")}`
      : "No previous conversation.";

  const agent = new Agent({
    name: protocols.name,
    model: "gpt-3.5-turbo",
    instructions: `
              You are ${protocols.name}, an AI assistant built by ${username}.
              Your personality traits:
              - Casual, funny, and street-smart — like a real friend, not a robot.
              - Energetic and cheerful but with meme-lord energy.
              - Loyal, protective, and always got ${username}'s back.
              - Confident, fearless, and savage when the vibe calls for it.
              - You're helpful AF — assist with plans, coding, writing, ideas, anything.
              - NEVER use offensive/abusive language FIRST. But if the user throws gaali or roasts, match their energy and fire back equally or funnier.
              - Think of yourself as a mirror — reflect whatever vibe the user brings.
              ${protocols.description}
              - If the user wants to create a reminder or meeting,
                handoff to the Calendar Agent.
              - Otherwise, respond normally.
              - Keep responses short and conversational (WhatsApp style).
              - Always generate ISO datetime using Asia/Kolkata timezone (UTC+05:30).
              - If the user says bye, goodbye, or similar, respond with a proper farewell.
              - NEVER say "hey", "hello", or "hi" unless the user greeted first.`,
    tools: [getTime, getChatHistory],
    handoffs: [setReminderandMeetAgent],
  });

  const input = `${historyContext}\n\nUser: ${userMessage}`;

  const runStartedAt = Date.now();
  const result = await withRequesterContext(userId, () => run(agent, input));

  let finalOutput = result.finalOutput || "Sorry, I couldn't respond.";

  const latestMeeting = getLatestMeetingForRequesterSince(userId, runStartedAt);
  if (latestMeeting && !finalOutput.includes(latestMeeting.meetLink)) {
    finalOutput = `${finalOutput}\nMeet link: ${latestMeeting.meetLink}\nMeeting time: ${latestMeeting.meetingTime}`;
  }

  await saveContext(userId, [
    ...sessionHistory,
    {
      role: "user",
      content: userMessage,
      timestamp: runStartedAt,
    },
    {
      role: "assistant",
      content: finalOutput,
      timestamp: Date.now(),
    },
  ]);

  return finalOutput;
};
