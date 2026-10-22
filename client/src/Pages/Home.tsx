import { useEffect, useState, Fragment, type ChangeEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, User, Sparkles, AlertCircle, Check, Copy, Square, X, ArrowUp } from "lucide-react";

import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import type { UIMessage } from "ai";

import { apiUrl } from "@/config";

type HomeProps = {
  chatId: string;
  savedMessages: UIMessage[];
  onMessagesChange: (chatId: string, messages: UIMessage[]) => void;
};

export default function RAGChatBot({ chatId, savedMessages, onMessagesChange }: HomeProps) {
  const [input, setInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState(false);
  const { messages, sendMessage, stop, status, error } = useChat({
    id: chatId,
    messages: savedMessages,
    transport: new DefaultChatTransport({
      api: apiUrl("/api/chat"),
    }),
  });

  useEffect(() => {
    if (error) {
      setDismissedError(false);
    }
  }, [error]);

  useEffect(() => {
    onMessagesChange(chatId, messages);
  }, [chatId, messages, onMessagesChange]);

  const isGenerating = status === "submitted" || status === "streaming";

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text || isGenerating) return;

    sendMessage({
      text: message.text,
    });

    setInput("");
  };

  const handleCopy = async (messageId: string, text: string) => {
  await navigator.clipboard.writeText(text);

  setCopiedMessageId(messageId);

  setTimeout(() => {
    setCopiedMessageId(null);
  }, 1500);
};

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl w-full mx-auto p-4 sm:p-6">
      <Conversation className="flex-1 min-h-0 mb-4 rounded-xl">
        <ConversationContent
          scrollClassName="conversation-scroll-area max-w-3xl w-full mx-auto"
          className="space-y-6 w-full px-2"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[#10a37f]/10 text-[#10a37f] flex items-center justify-center shadow-xs">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                What can I help you with today?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask questions about your uploaded PDF documents or prompt for any assistance.
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const hasVisibleText = message.parts.some(
              (part) => part.type === "text" && part.text.trim().length > 0,
            );

            if (!isUser && !hasVisibleText) return null;

            return (
              <div
                key={message.id}
                className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"
                  }`}
              >
                {!isUser && (
                  <div className="h-8 w-8 rounded-full bg-[#10a37f] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"
                    }`}
                >
                  <div>
                    {message.parts.map((part, index) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <Fragment key={`${message.id}-${index}`}>
                              <Message from={message.role}>
                                <MessageContent className="bg-transparent text-inherit">
                                  <MessageResponse className="text-sm leading-relaxed">
                                    {part.text}
                                  </MessageResponse>
                                  {!isUser && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(message.id, part.text)}
                                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {copiedMessageId === message.id ? (
                                        <>
                                          <Check className="h-3.5 w-3.5" />
                                          Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3.5 w-3.5" />
                                          Copy
                                        </>
                                      )}
                                    </button>
                                  )}
                                </MessageContent>
                              </Message>
                            </Fragment>
                          );
                        default:
                          return null;
                      }
                    })}
                  </div>
                </div>

                {isUser && (
                  <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex gap-3 sm:gap-4 items-start">
              <div className="h-8 w-8 rounded-full bg-[#10a37f] text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/40 rounded-full px-4 py-2 border border-border/50">
                <span>AI is thinking...</span>
              </div>
            </div>
          )}

          {error && !dismissedError && (
            <div className="flex items-center justify-between gap-3 text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl border border-destructive/20 max-w-xl mx-auto shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <span className="truncate">{error.message || "Failed to get a response. Please try again."}</span>
              </div>
              <button
                type="button"
                onClick={() => setDismissedError(true)}
                className="text-destructive/70 hover:text-destructive hover:bg-destructive/20 p-1 rounded-full transition-colors cursor-pointer"
                title="Dismiss error"
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </ConversationContent>
      </Conversation>
            
      <div className="max-w-3xl w-full mx-auto relative">
        {isGenerating && (
          <div className="flex justify-center mb-2.5">
           
          </div>
        )}

        <PromptInput
          className="chat-prompt-form"
          onSubmit={handleSubmit}
        >
          <PromptInputBody className="chat-prompt-body">
            <PromptInputTextarea
              className="chat-prompt-textarea"
              rows={1}
              value={input}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && input) {
                  e.preventDefault();
                  setInput("");
                }
              }}
              placeholder="Message Agent AI..."
            />
            
            <div className="chat-prompt-controls">
              <span className="chat-prompt-hint">
                {isGenerating
                  ? "Generating response..."
                  : "Shift + Enter for new line"}
              </span>

              <div className="chat-prompt-actions">
                {input.trim().length > 0 && !isGenerating && (
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="chat-clear-button"
                    title="Clear input (Esc)"
                    aria-label="Clear input text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {isGenerating ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="chat-stop-button"
                    title="Stop generating"
                    aria-label="Stop generating"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={`chat-submit-button ${
                      input.trim() ? "active" : "disabled"
                    }`}
                    title="Send message (Enter)"
                    aria-label="Send message"
                  >
                    <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
