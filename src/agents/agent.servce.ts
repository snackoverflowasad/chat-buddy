/**
 * Core Agent Service
 * Initializes and executes the Open Router reply flow for responding to user messages.
 */
import OpenAI from "openai";
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

const formatLocalTime = (): string =>
  new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

const getOpenRouterKey = (): string | undefined => {
  const envOpenRouter = process.env.OPENAI_ROUTER_KEY?.trim();
  if (envOpenRouter) return envOpenRouter;

  return undefined;
};

const getOpenRouterModel = (): string =>
  process.env.OPEN_ROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct";

const getOpenRouterClient = (): OpenAI | undefined => {
  const apiKey = getOpenRouterKey();
  if (!apiKey) return undefined;

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/snackoverflowasad/BotWithHaki",
      "X-Title": "Chat-Buddy",
    },
  });
};

const createLocalFallbackReply = (userMessage: string, contactName: string): string => {
  const normalizedMessage = userMessage.trim().toLowerCase();

  if (/^(hi|hello|hey|hii|yo)\b/.test(normalizedMessage)) {
    return `Hey ${contactName}! I am running in local fallback mode right now, but I am here and listening.`;
  }

  if (/(what can you do|help|commands|features)/.test(normalizedMessage)) {
    return "I can handle greetings, time, history, resets, reminders, meetings, and simple WhatsApp replies. The AI quota is currently unavailable, so I'm using a local fallback.";
  }

  if (/\btime\b/.test(normalizedMessage)) {
    return `Current time in Asia/Kolkata is ${formatLocalTime()}.`;
  }

  if (/(thank you|thanks|thx)/.test(normalizedMessage)) {
    return "Anytime. Send me another message and I will reply again.";
  }

  if (/(remind|reminder|meeting|schedule|calendar)/.test(normalizedMessage)) {
    return "I can help with reminders and meetings. Send the date, time, and details again, or I can still help with local commands like /time and /history.";
  }

  return `I received: ${userMessage}. The AI service is temporarily unavailable, so I am replying with a local fallback instead of leaving you hanging.`;
};

const sanitizeReply = (reply: string, userMessage: string, contactName: string): string => {
  const trimmedReply = reply.trim();

  const contradictionPattern =
    /(?:no,\s*)?i(?:\s+did)?(?:n't| not) mention|miscommunication|i don't have any prior requests|i do not have any prior requests/i;
  if (contradictionPattern.test(trimmedReply)) {
    return createLocalFallbackReply(userMessage, contactName);
  }

  return trimmedReply;
};

export const runAgent = async (
  userId: string,
  contactName: string,
  userMessage: string,
  username: string = "Asad",
): Promise<string> => {
  const sessionHistory = await getContext(userId);
  const historyContext =
    sessionHistory.length > 0
      ? `Previous conversation:\n${sessionHistory.map((message) => formatSessionMessage(message, contactName)).join("\n")}`
      : "No previous conversation.";

  const runStartedAt = Date.now();
  let finalOutput: string;

  const openRouterClient = getOpenRouterClient();

  if (openRouterClient) {
    try {
      finalOutput = await runOpenRouterReply(
        openRouterClient,
        historyContext,
        userMessage,
        username,
        contactName,
      );
    } catch (orError) {
      console.log("Open Router fallback activated:", orError);
      finalOutput = createLocalFallbackReply(userMessage, contactName);
    }
  } else {
    console.log("Open Router API key not found; using local fallback.");
    finalOutput = createLocalFallbackReply(userMessage, contactName);
  }

  const latestMeeting = getLatestMeetingForRequesterSince(contactName, runStartedAt);
  if (latestMeeting && !finalOutput.includes(latestMeeting.meetLink)) {
    finalOutput = `${finalOutput}\nMeet link: ${latestMeeting.meetLink}\nMeeting time: ${latestMeeting.meetingTime}`;
  }

  finalOutput = sanitizeReply(finalOutput, userMessage, contactName);

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

const runOpenRouterReply = async (
  client: OpenAI,
  historyContext: string,
  userMessage: string,
  username: string,
  contactName: string,
): Promise<string> => {
  const completion = await client.chat.completions.create({
    model: getOpenRouterModel(),
    messages: [
      {
        role: "system",
        content:
          `You are ${username}'s concise WhatsApp assistant. ` +
          `Do not contradict the user, do not say they never mentioned something unless they explicitly deny it, ` +
          `and do not invent prior requests or meetings. ` +
          `If the user says to start fresh or corrects you, acknowledge briefly and continue helpfully.`,
      },
      { role: "user", content: `${historyContext}\n\nUser: ${userMessage}` },
    ],
    temperature: 0.7,
    max_tokens: 256,
  });

  const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
  return text || createLocalFallbackReply(userMessage, contactName);
};
