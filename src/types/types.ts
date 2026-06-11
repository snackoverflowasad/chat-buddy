/**
 * Types
 */

export interface protocolType {
  name: string;
  allowGroupReplies: boolean;
  allowBadWords: boolean;
  description: string;
}

type ContactGroup = {
  number: number[];
};

export type Contacts = {
  importants: ContactGroup;
  friends: ContactGroup;
};

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

export interface UserModerationState {
  lastMessage: string;
  timestamp: number;
  strikes: number;
}