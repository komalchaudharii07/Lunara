import { useEffect, useRef, useState } from "react";
import {
  askLunaraAI,
  getChatHistory,
  clearChatHistory,
} from "../../services/api";

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);

  const messagesEndRef = useRef(null);

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const token = getToken();

        if (!token) {
          return;
        }

        const data = await getChatHistory(token);

        setMessages(
          (data.chats || []).map((chat) => ({
            role: chat.role,
            text: chat.message,
          }))
        );
      } catch (error) {
        console.error("Chat history error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadChatHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending) {
      return;
    }

    const token = getToken();

    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Please login again to continue using Lunara AI.",
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: trimmedMessage,
      },
    ]);

    setMessage("");
    setSending(true);

    try {
      const data = await askLunaraAI(
        trimmedMessage,
        token
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.reply,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            error.message ||
            "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (clearing || messages.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to clear this conversation?"
    );

    if (!confirmed) {
      return;
    }

    const token = getToken();

    if (!token) {
      return;
    }

    setClearing(true);

    try {
      await clearChatHistory(token);
      setMessages([]);
    } catch (error) {
      window.alert(
        error.message || "Failed to clear chat history"
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fff5f7] -mx-5 -mt-20 px-5 pt-20 sm:-mx-8 sm:px-8 lg:-mx-10 lg:-mt-8 lg:px-10 lg:pt-8">
      <div className="mx-auto flex max-w-5xl flex-col">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#df829b]">
              Your personal health companion
            </p>

            <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
              Lunara AI
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Ask questions about your cycle, symptoms,
              periods, or general women's health.
            </p>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              disabled={clearing}
              className="shrink-0 rounded-xl border border-[#eadde1] bg-white px-4 py-2 text-xs font-medium text-gray-500 transition hover:border-[#e58da4] hover:text-[#d97d96] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {clearing ? "Clearing..." : "Clear chat"}
            </button>
          )}
        </div>

        <div className="flex min-h-[65vh] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
          <div className="border-b border-[#f1e4e7] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fdf0f3] text-xl text-[#e58da4]">
                ✦
              </div>

              <div>
                <h2 className="font-semibold text-[#292331]">
                  Ask Lunara
                </h2>

                <p className="text-xs text-gray-400">
                  Personalized using your cycle history
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {loading ? (
              <div className="flex min-h-[45vh] items-center justify-center">
                <p className="text-sm text-gray-400">
                  Loading your conversations...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-[45vh] items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf0f3] text-2xl text-[#e58da4]">
                    ✦
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-[#292331]">
                    How can I help you?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Ask me about your cycle, symptoms,
                    period tracking, or general women's
                    health.
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {[
                      "What can you tell me about my cycle?",
                      "Why do I get cramps?",
                      "How can I track my symptoms?",
                    ].map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() =>
                          setMessage(question)
                        }
                        className="rounded-full border border-[#eadde1] px-4 py-2 text-xs text-gray-500 transition hover:border-[#e58da4] hover:text-[#d97d96]"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((item, index) => (
                <div
                  key={index}
                  className={`flex ${item.role === "user"
                      ? "justify-end"
                      : "justify-start"
                    }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-6 ${item.role === "user"
                        ? "rounded-br-md bg-[#e58da4] text-white"
                        : "rounded-bl-md bg-[#fff5f7] text-[#4b4550]"
                      }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-[#fff5f7] px-5 py-4 text-sm text-gray-400">
                  Lunara is thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#f1e4e7] p-5">
            <form
              onSubmit={handleSubmit}
              className="flex gap-3"
            >
              <input
                type="text"
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                placeholder="Ask Lunara something..."
                className="h-12 min-w-0 flex-1 rounded-xl border border-[#eadde1] bg-[#fffafb] px-4 text-sm text-[#292331] outline-none transition placeholder:text-gray-400 focus:border-[#e58da4]"
              />

              <button
                type="submit"
                disabled={
                  sending || !message.trim()
                }
                className="h-12 rounded-xl bg-[#e58da4] px-6 text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "..." : "Send"}
              </button>
            </form>

            <p className="mt-3 text-center text-[11px] leading-5 text-gray-400">
              Lunara AI provides general information and
              does not replace professional medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}