import { useEffect, useRef, useState } from "react";
import {
  askLunaraAI,
  getChatHistory,
  clearChatHistory,
  getCurrentUser,
  setAiConsent,
} from "../../services/api";

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);

  // null = still checking, true = Lunara AI is on, false = needs permission
  const [consent, setConsent] = useState(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState("");

  const messagesEndRef = useRef(null);

  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadChatHistory = async () => {
      try {
        // the token is attached by api.js; an expired session goes to /login there
        const data = await getChatHistory();
        if (ignore) return;

        setMessages(
          (data.chats || []).map((chat) => ({
            id: chat._id,
            role: chat.role,
            text: chat.message,
          }))
        );
      } catch {
        if (!ignore) {
          setHistoryError(
            "Couldn't load your earlier messages. Please refresh to try again."
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    const loadConsent = async () => {
      try {
        const data = await getCurrentUser();
        if (!ignore) setConsent(!!data.user?.aiConsent);
      } catch {
        // unknown: the server still enforces consent, so default to asking
        if (!ignore) setConsent(false);
      }
    };

    loadChatHistory();
    loadConsent();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending]);

  const handleEnableAi = async () => {
    setConsentSaving(true);
    setConsentError("");

    try {
      await setAiConsent(true);
      setConsent(true);
    } catch (error) {
      setConsentError(error.message || "Couldn't turn on Lunara AI.");
    } finally {
      setConsentSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending || consent !== true) {
      return;
    }

    const tempId = `tmp-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", text: trimmedMessage },
    ]);

    setMessage("");
    setSending(true);

    try {
      const data = await askLunaraAI(trimmedMessage);

      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "ai", text: data.reply },
      ]);
    } catch (error) {
      if (error.code === "AI_CONSENT_REQUIRED") setConsent(false);

      // the server saves nothing when a request fails, so drop the question,
      // show what went wrong, and give the text back so it isn't lost
      setMessages((prev) => [
        ...prev.filter((item) => item.id !== tempId),
        {
          id: `err-${Date.now()}`,
          role: "ai",
          error: true,
          text:
            error.message || "Something went wrong. Please try again.",
        },
      ]);
      setMessage(trimmedMessage);
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

    setClearing(true);

    try {
      await clearChatHistory();
      setMessages([]);
      setHistoryError("");
    } catch (error) {
      setHistoryError(error.message || "Failed to clear chat history");
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

          <div
            aria-live="polite"
            className="flex-1 space-y-5 overflow-y-auto p-6"
          >
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
                  key={item.id ?? index}
                  className={`flex ${item.role === "user"
                      ? "justify-end"
                      : "justify-start"
                    }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-6 ${item.role === "user"
                        ? "rounded-br-md bg-[#e58da4] text-white"
                        : item.error
                        ? "rounded-bl-md bg-red-50 text-red-600"
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

            {historyError && (
              <p role="alert" className="text-center text-sm text-red-500">
                {historyError}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#f1e4e7] p-5">
            {consent === false && (
              <div className="mb-4 rounded-2xl bg-[#fff5f7] p-5">
                <h3 className="text-sm font-semibold text-[#292331]">
                  Turn on Lunara AI
                </h3>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  To answer you, Lunara sends your messages, your recent cycle
                  records and your recent daily logs to Google Gemini. Nothing
                  is sent until you turn this on, and you can turn it off any
                  time in Settings.
                </p>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  In an emergency call 112. If you are struggling, Tele-MANAS
                  is free at 14416.
                </p>

                {consentError && (
                  <p role="alert" className="mt-2 text-xs text-red-500">
                    {consentError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleEnableAi}
                  disabled={consentSaving}
                  className="mt-4 rounded-xl bg-[#e58da4] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:opacity-60"
                >
                  {consentSaving ? "Turning on..." : "Turn on Lunara AI"}
                </button>
              </div>
            )}

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
                maxLength={2000}
                disabled={consent !== true}
                aria-label="Message Lunara"
                className="h-12 min-w-0 flex-1 rounded-xl border border-[#eadde1] bg-[#fffafb] px-4 text-sm text-[#292331] outline-none transition placeholder:text-gray-400 focus:border-[#e58da4] disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={
                  sending || !message.trim() || consent !== true
                }
                className="h-12 rounded-xl bg-[#e58da4] px-6 text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "..." : "Send"}
              </button>
            </form>

            <p className="mt-3 text-center text-xs leading-5 text-gray-500">
              Lunara AI provides general information and
              does not replace professional medical advice. In an emergency,
              call 112. Your messages, recent cycle data and daily logs are sent to
              Google Gemini to generate replies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}