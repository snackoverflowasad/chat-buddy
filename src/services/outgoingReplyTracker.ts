const recentOutgoingReplies = new Map<string, Set<string>>();

export const rememberOutgoingReply = (userId: string, reply: string): void => {
  const trimmedReply = reply.trim();
  if (!trimmedReply) return;

  const replies = recentOutgoingReplies.get(userId) ?? new Set<string>();
  replies.add(trimmedReply);
  recentOutgoingReplies.set(userId, replies);

  setTimeout(() => {
    const currentReplies = recentOutgoingReplies.get(userId);
    if (!currentReplies) return;

    currentReplies.delete(trimmedReply);
    if (currentReplies.size === 0) {
      recentOutgoingReplies.delete(userId);
    }
  }, 15000);
};

export const shouldIgnoreOutgoingEcho = (userId: string, text: string): boolean => {
  const replies = recentOutgoingReplies.get(userId);
  if (!replies) return false;
  return replies.has(text.trim());
};
