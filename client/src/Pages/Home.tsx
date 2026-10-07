import { useState, Fragment, type ChangeEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, User, Sparkles, AlertCircle, Square } from "lucide-react";

import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";

export default function RAGChatBot() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, stop, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isGenerating = status === "submitted" || status === "streaming";

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text || isGenerating) return;

    sendMessage({
      text: message.text,
    });

    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl w-full mx-auto p-4 sm:p-6">
      <Conversation className="flex-1 overflow-y-auto mb-4 rounded-xl">
        <ConversationContent className="space-y-6 max-w-3xl mx-auto px-2">
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
            return (
              <div
                key={message.id}
                className={`flex gap-3 sm:gap-4 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="h-8 w-8 rounded-full bg-[#10a37f] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                    isUser ? "items-end" : "items-start"
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

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 max-w-xl mx-auto">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error.message || "Failed to get a response. Please try again."}</span>
            </div>
          )}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      <div className="max-w-3xl w-full mx-auto relative">
        <PromptInput
          className="relative bg-secondary/80 rounded-2xl border border-border/70 shadow-sm focus-within:border-foreground/30 focus-within:ring-1 focus-within:ring-foreground/20"
          onSubmit={handleSubmit}
        >
          <PromptInputBody className="p-3">
            <PromptInputTextarea
              className=" text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 resize-none px-2 py-4 placeholder:text-muted-foreground"
              value={input}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              placeholder="Message Agent AI..."
            />

            <div className="flex items-center justify-between">
              <PromptInputTools />

              <div className="flex items-center gap-2">
                {isGenerating && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={stop}
                    aria-label="Stop generating"
                    title="Stop generating"
                    className="text-destructive rounded-full border border-destructive/20"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </Button>
                )}

                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  className={`rounded-full transition-all duration-150 ${
                    isGenerating
                      ? "bg-destructive text-white hover:bg-destructive/90"
                      : input.trim()
                      ? "bg-foreground text-background hover:opacity-90"
                      : "bg-muted text-muted-foreground hover:bg-muted"
                  }`}
                />
              </div>
            </div>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
