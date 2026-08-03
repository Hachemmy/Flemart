import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import { getApiUrl, authorizedFetch } from "../../config/api";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:underline"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-0.5">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => (
          <h1 className="text-base font-bold mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold mb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1">{children}</h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-brand-400 pl-3 italic opacity-80 mb-2">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block bg-gray-900 dark:bg-black/40 text-green-300 text-xs rounded-lg px-3 py-2 my-2 overflow-x-auto whitespace-pre">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-gray-200 dark:bg-surface-600 text-red-500 dark:text-red-400 text-xs px-1.5 py-0.5 rounded">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-1">{children}</pre>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-gray-300 dark:border-surface-600">
            {children}
          </thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-gray-200 dark:border-surface-600">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="text-left px-2 py-1 font-semibold">{children}</th>
        ),
        td: ({ children }) => <td className="px-2 py-1">{children}</td>,
        hr: () => (
          <hr className="my-2 border-gray-300 dark:border-surface-600" />
        ),
        br: () => <br />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function ChatWidget() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isLoading]);

  const resizeTextarea = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await authorizedFetch(`${getApiUrl()}/api/chat`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || t("chat.error"));
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setError(t("chat.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await authorizedFetch(`${getApiUrl()}/api/chat`, token, {
        method: "DELETE",
      });
    } catch {
      // silent — UI already cleared
    }
    setMessages([]);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 md:bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-float flex items-center justify-center transition-all duration-200 hover:scale-105"
        aria-label={t("chat.title")}
      >
        {isOpen ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] rounded-2xl bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 shadow-float flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-surface-700 bg-brand-50 dark:bg-surface-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t("chat.title")}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors"
                aria-label={t("chat.newChat")}
                title={t("chat.newChat")}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors"
                aria-label={t("chat.close")}
                title={t("chat.close")}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8 px-4">
                {t("chat.welcome")}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 text-white px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 dark:bg-surface-700 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm leading-relaxed">
                    <MarkdownContent content={msg.content} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-surface-700 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-flex gap-1">
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    >
                      •
                    </span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    >
                      •
                    </span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    >
                      •
                    </span>
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-surface-700">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.placeholder")}
                maxLength={2000}
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-surface-700 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none overflow-y-auto leading-relaxed transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                aria-label={t("chat.send")}
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
