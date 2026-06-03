/**
 * ChatHistoryStore
 */
import fs from "fs";
import path from "path";
import { getStorageDir, ensureStorageDir } from "./configStore.js";

export type UserChatHistory = Record<string, string>;
export type ChatHistory = Record<string, UserChatHistory>;

let chatHistoryCache: ChatHistory | null = null;

const getChatHistoryPath = (): string => {
  return path.join(getStorageDir(), "chat_history.json");
};

export const loadChatHistory = (): ChatHistory => {
  if (chatHistoryCache) return chatHistoryCache;

  const historyPath = getChatHistoryPath();
  if (!fs.existsSync(historyPath)) {
    chatHistoryCache = {};
    return chatHistoryCache;
  }

  try {
    chatHistoryCache = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
    return chatHistoryCache!;
  } catch {
    chatHistoryCache = {};
    return chatHistoryCache;
  }
};

const saveChatHistory = (): void => {
  if (!chatHistoryCache) return;
  ensureStorageDir();
  const historyPath = getChatHistoryPath();
  fs.writeFileSync(historyPath, JSON.stringify(chatHistoryCache, null, 2), "utf-8");
};

export const appendMessage = (userId: string, message: string, isAgent: boolean = false): void => {
  const history = loadChatHistory();

  if (!history[userId]) {
    history[userId] = {};
  }

  const timestamp = new Date().toISOString();
  const formattedMessage = isAgent ? `[agent] ${message}` : message;
  history[userId][timestamp] = formattedMessage;

  chatHistoryCache = history;
  saveChatHistory();
};

export const getUserHistoryForContext = (
  userId: string,
  displayName: string,
  maxMessages: number = 15,
): string[] => {
  const history = loadChatHistory();
  const userHistory = history[userId];

  if (!userHistory) return [];

  const entries = Object.entries(userHistory);
  const recentEntries = entries.slice(-maxMessages);

  return recentEntries.map(([timestamp, message]) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });

    if (message.startsWith("[agent] ")) {
      return `[${timeStr}] agent: ${message.replace("[agent] ", "")}`;
    }
    return `[${timeStr}] ${displayName}: ${message}`;
  });
};

export const getUserHistory = (userId: string): UserChatHistory => {
  const history = loadChatHistory();
  return history[userId] || {};
};

export const clearUserHistory = (userId: string): void => {
  const history = loadChatHistory();
  delete history[userId];
  chatHistoryCache = history;
  saveChatHistory();
};

export const clearAllHistory = (): void => {
  chatHistoryCache = {};
  saveChatHistory();
};

export const resetChatHistoryCache = (): void => {
  chatHistoryCache = null;
};
