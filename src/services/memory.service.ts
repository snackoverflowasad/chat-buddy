/**
 * Memory Service
 */
import {
  appendMessage,
  getUserHistoryForContext,
  clearUserHistory as clearPersistentHistory,
} from "../storage/chatHistoryStore.js";

export const storeMessage = (userId: string, message: string, isAgent: boolean = false): void => {
  appendMessage(userId, message, isAgent);
};

export const getHistory = (userId: string, contactName: string): string[] => {
  return getUserHistoryForContext(userId, contactName, 15);
};

export const clearHistory = (userId: string): void => {
  clearPersistentHistory(userId);
};
