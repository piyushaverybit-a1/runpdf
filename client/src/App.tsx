import { useCallback, useEffect, useState } from 'react'
import type { UIMessage } from 'ai'
import './App.css'
import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import Home from './Pages/Home'
import { CHAT_HISTORY_KEY, loadChatHistory, type SavedChat } from './lib/chat-history'

const App = () => {
  const [chats, setChats] = useState<SavedChat[]>(loadChatHistory)
  const [activeChatId, setActiveChatId] = useState(
    () => chats[0]?.id ?? crypto.randomUUID(),
  )

  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chats))
  }, [chats])

  const handleMessagesChange = useCallback((chatId: string, messages: UIMessage[]) => {
    if (messages.length === 0) return

    const firstUserMessage = messages.find((message) => message.role === 'user')
    const firstText = firstUserMessage?.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim()
    const title = firstText
      ? firstText.length > 36 ? `${firstText.slice(0, 36)}...` : firstText
      : 'New chat'

    setChats((currentChats) => {
      const existingChat = currentChats.find((chat) => chat.id === chatId)
      const updatedChat: SavedChat = {
        id: chatId,
        title: existingChat?.title ?? title,
        messages,
        updatedAt: Date.now(),
      }

      return [updatedChat, ...currentChats.filter((chat) => chat.id !== chatId)]
    })
  }, [])

  return (
    <div>
      <Navbar />
      <div className="chat-layout">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={() => setActiveChatId(crypto.randomUUID())}
          onSelectChat={setActiveChatId}
        />
        <main className="app-main">
          <Home
            key={activeChatId}
            chatId={activeChatId}
            savedMessages={chats.find((chat) => chat.id === activeChatId)?.messages ?? []}
            onMessagesChange={handleMessagesChange}
          />
        </main>
      </div>
    </div>
  )
}

export default App

