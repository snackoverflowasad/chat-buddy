/**
 * Moderation Utilities
 * Handles spam detection, duplicate message checks,
 * blocked words, and simple rate limiting.
 */

const blockedWords = [
  "fuck",
  "bitch",
  "shit",
  "madarchod",
  "bhenchod",
  "mc",
  "bc",
];

const userMessageCache = new Map<
  string,
  {
    lastMessage: string;
    timestamp: number;
    strikes: number;
  }
>();

const RATE_LIMIT_WINDOW = 5000;

export const containsBlockedWords = (text: string): boolean => {
  const normalized = text.toLowerCase();

  return blockedWords.some((word) => normalized.includes(word));
};

export const isDuplicateMessage = (
  userId: string,
  message: string,
): boolean => {
  const existing = userMessageCache.get(userId);

  if (!existing) return false;

  return (
    existing.lastMessage === message &&
    Date.now() - existing.timestamp < RATE_LIMIT_WINDOW
  );
};

export const isRateLimited = (userId: string): boolean => {
  const existing = userMessageCache.get(userId);

  if (!existing) return false;

  return Date.now() - existing.timestamp < 1500;
};

export const trackUserMessage = (
  userId: string,
  message: string,
): void => {
  const existing = userMessageCache.get(userId);

  userMessageCache.set(userId, {
    lastMessage: message,
    timestamp: Date.now(),
    strikes: existing ? existing.strikes + 1 : 1,
  });
};

export const getUserStrikes = (userId: string): number => {
  return userMessageCache.get(userId)?.strikes ?? 0;
};