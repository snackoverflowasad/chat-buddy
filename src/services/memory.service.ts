import { appendMessage, getUserHistoryForContext, clearUserHistory as clearPersistentHistory } from "../storage/chatHistoryStore.js";

/**
 * Stores a message to persistent chat history with timestamp.
 */
export const storeMessage = (contactName: string, message: string, isAgent: boolean = false): void => {
  appendMessage(contactName, message, isAgent);
};

/**
 * Gets formatted history for agent context.
 */
export const getHistory = (contactName: string): string[] => {
  return getUserHistoryForContext(contactName, 15);
};

/**
 * Clears history for a user.
 */
export const clearHistory = (contactName: string): void => {
  clearPersistentHistory(contactName);
};
