import type { SavedChat } from "@/lib/chat-history";

type SidebarProps = {
  chats: SavedChat[];
  activeChatId: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
};

export function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
}: SidebarProps) {
  return (
    <aside className="chat-sidebar">
      <button className="new-chat-button" type="button" onClick={onNewChat}>
        + New chat 
      </button>

      <h2 className="history-heading">History</h2>
      {chats.length === 0 ? (
        <p className="empty-history">History Not Found</p>
      ) : (
        <ul className="chat-history-list">
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                className={`history-chat${chat.id === activeChatId ? " active" : ""}`}
                type="button"
                onClick={() => onSelectChat(chat.id)}
                title={chat.title}
              >
                {chat.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
