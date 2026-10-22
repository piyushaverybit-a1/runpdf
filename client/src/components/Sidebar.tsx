import { X, MessageSquare, Plus } from "lucide-react";
import type { SavedChat } from "@/lib/chat-history";

type SidebarProps = {
  chats: SavedChat[];
  activeChatId: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
};

export function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: SidebarProps) {
  return (
    <aside className="chat-sidebar">
      <button className="new-chat-button" type="button" onClick={onNewChat}>
        <Plus className="h-4 w-4" />
        <span>New chat</span>
      </button>

      <h2 className="history-heading">History</h2>
      {chats.length === 0 ? (
        <p className="empty-history">No chat history</p>
      ) : (
        <ul className="chat-history-list">
          {chats.map((chat) => (
            <li key={chat.id} className="history-chat-item">
              <button
                className={`history-chat${chat.id === activeChatId ? " active" : ""}`}
                type="button"
                onClick={() => onSelectChat(chat.id)}
                title={chat.title}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="history-chat-title">{chat.title}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="history-delete-button"
                title="Delete chat"
                aria-label="Delete chat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
