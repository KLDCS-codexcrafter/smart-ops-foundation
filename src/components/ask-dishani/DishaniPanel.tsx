import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Send } from "lucide-react";
import { useDishani } from "./useDishani";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const SUGGESTIONS = [
  "How does procurement work?",
  "Where do I raise a PR?",
  "Explain GST in Operix",
  "What modules are available?",
  "How does payroll work?",
  "What is the Bridge Agent?",
];

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function DishaniPanel() {
  const { isOpen, closeDishani, messages, isLoading, sendMessage, clearMessages, currentPage } = useDishani();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] flex flex-col",
        "bg-background border-l border-border shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Ask Dishani</h2>
            <p className="text-[10px] text-muted-foreground">You are in: {currentPage}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeDishani}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-12 gap-4">
            <Sparkles className="h-10 w-10 text-primary opacity-60" />
            <h3 className="text-lg font-semibold text-foreground">Namaste! I am Dishani.</h3>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Ask me anything about Operix — how to use any module, Indian business rules, or where to find anything.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4 w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="bg-muted hover:bg-muted/80 text-muted-foreground text-xs rounded-lg px-3 py-2 text-left transition-colors leading-relaxed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1",
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {msg.role === "assistant" && (
                    <Sparkles className="h-3 w-3 text-primary inline-block mr-1.5 -mt-0.5" />
                  )}
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col gap-1 items-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                  <span className="text-muted-foreground animate-pulse">.</span>
                  <span className="text-muted-foreground animate-pulse" style={{ animationDelay: "0.2s" }}>.</span>
                  <span className="text-muted-foreground animate-pulse" style={{ animationDelay: "0.4s" }}>.</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Ask Dishani..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            size="icon"
            className="h-11 w-11 flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
