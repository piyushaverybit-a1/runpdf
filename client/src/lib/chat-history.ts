import type { UIMessage } from "ai";

export type SavedChat = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
};

export const CHAT_HISTORY_KEY = "agent-ai-chat-history";

export function loadChatHistory(): SavedChat[] {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}
