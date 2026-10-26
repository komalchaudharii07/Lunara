import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changePassword,
  clearChatHistory,
  clearCycleHistory,
  clearDailyLogs,
  clearToken,
  deleteAccount,
  exportMyData,
  getCurrentUser,
  isRemembered,
  logoutOtherDevices,
  saveToken,
  setAiConsent,
} from "../../services/api";

const card =
  "rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-7";
const input =
  "h-12 w-full rounded-xl border border-[#eadde1] bg-[#fffafb] px-4 text-sm outline-none focus:border-[#e58da4]";
const primaryBtn =
  "h-11 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60";
const outlineBtn =
  "rounded-xl border border-[#eadde1] px-4 py-2.5 text-sm text-gray-600 transition hover:border-[#e58da4] disabled:cursor-not-allowed disabled:opacity-60";

function Notice({ state }) {
  if (!state?.text) return null;
  return (
    <p
      role={state.type === "error" ? "alert" : "status"}
      className={`mt-4 rounded-xl px-4 py-3 text-sm ${
        state.type === "error"
          ? "bg-[#fff0f1] text-red-500"
          : "bg-[#f0faf3] text-green-600"
      }`}
    >
      {state.text}
    </p>
  );
}

export default function Settings() {
  const navigate = useNavigate();

  // PASSWORD
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNote, setPwNote] = useState(null);

  // AI
  const [aiOn, setAiOn] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState(null);

  // SESSIONS
  const [sessBusy, setSessBusy] = useState(false);
  const [sessNote, setSessNote] = useState(null);

  // DATA
  const [dataBusy, setDataBusy] = useState("");
  const [dataNote, setDataNote] = useState(null);

  // DELETE ACCOUNT
  const [del, setDel] = useState({ word: "", password: "" });
  const [delBusy, setDelBusy] = useState(false);
  const [delNote, setDelNote] = useState(null);

  useEffect(() => {
    let ignore = false;
    getCurrentUser()
      .then((data) => {
        if (!ignore) setAiOn(!!data.user?.aiConsent);
      })
      .catch(() => {
        if (!ignore) setAiNote({ type: "error", text: "Couldn't load your AI setting." });
      });
    return () => {
      ignore = true;
    };
  }, []);

  // a token that lives in localStorage means "remember me" was chosen
  const remembered = isRemembered;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwNote(null);

    if (pw.next !== pw.confirm) {
      setPwNote({ type: "error", text: "The new passwords don't match." });
      return;
    }

    setPwBusy(true);
    try {
      const data = await changePassword({
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      // the server signed us out everywhere else and gave this device a new token
      if (data.token) saveToken(data.token, remembered());
      setPw({ current: "", next: "", confirm: "" });
      setPwNote({
        type: "success",
        text: "Password changed. Other devices were signed out.",
      });
    } catch (err) {
      setPwNote({ type: "error", text: err.message });
    } finally {
      setPwBusy(false);
    }
  };

  const toggleAi = async () => {
    if (aiOn === null) return;
    const next = !aiOn;
    setAiBusy(true);
    setAiNote(null);
    try {
      await setAiConsent(next);
      setAiOn(next);
      setAiNote({
        type: "success",
        text: next ? "Lunara AI is on." : "Lunara AI is off. Nothing will be sent to Gemini.",
      });
    } catch (err) {
      setAiNote({ type: "error", text: err.message });
    } finally {
      setAiBusy(false);
    }
  };

  const handleLogoutOthers = async () => {
    if (!window.confirm("Log out of every other device?")) return;
    setSessBusy(true);
    setSessNote(null);
    try {
      const data = await logoutOtherDevices();
      if (data.token) saveToken(data.token, remembered());
      setSessNote({ type: "success", text: "Done. Other devices are logged out." });
    } catch (err) {
      setSessNote({ type: "error", text: err.message });
    } finally {
      setSessBusy(false);
    }
  };

  const handleExport = async () => {
    setDataBusy("export");
    setDataNote(null);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lunara-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDataNote({ type: "success", text: "Your data was downloaded." });
    } catch (err) {
      setDataNote({ type: "error", text: err.message });
    } finally {
      setDataBusy("");
    }
  };

  const handleClear = async (key, label, fn) => {
    if (!window.confirm(`Delete all your ${label}? This can't be undone.`)) return;
    setDataBusy(key);
    setDataNote(null);
    try {
      await fn();
      setDataNote({ type: "success", text: `Your ${label} were deleted.` });
    } catch (err) {
      setDataNote({ type: "error", text: err.message });
    } finally {
      setDataBusy("");
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDelNote(null);

    if (del.word !== "DELETE") {
      setDelNote({ type: "error", text: 'Type DELETE (capital letters) to confirm.' });
      return;
    }

    setDelBusy(true);
    try {
      await deleteAccount(del.password);
      clearToken();
      navigate("/", { replace: true });
    } catch (err) {
      setDelNote({ type: "error", text: err.message });
      setDelBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-[#df829b]">Your account</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
          Settings
        </h1>
      </div>

      {/* PASSWORD */}
      <section className={card}>
        <h2 className="text-lg font-semibold text-[#292331]">Change password</h2>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            aria-label="Current password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
            required
            className={input}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password (at least 8 characters)"
            aria-label="New password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            required
            minLength={8}
            maxLength={72}
            className={input}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            aria-label="Confirm new password"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            required
            maxLength={72}
            className={input}
          />
          <button type="submit" disabled={pwBusy} className={primaryBtn}>
            {pwBusy ? "Saving..." : "Change password"}
          </button>
        </form>
        <Notice state={pwNote} />
      </section>

      {/* AI */}
      <section className={card}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#292331]">Lunara AI</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              When on, your messages, recent cycle records and recent daily logs
              are sent to Google Gemini to write replies. When off, nothing is
              sent.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={!!aiOn}
            aria-label="Lunara AI"
            disabled={aiOn === null || aiBusy}
            onClick={toggleAi}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
              aiOn ? "bg-[#e58da4]" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${
                aiOn ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <Notice state={aiNote} />
      </section>

      {/* SESSIONS */}
      <section className={card}>
        <h2 className="text-lg font-semibold text-[#292331]">Devices</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Lost a phone or used a shared computer? Log out everywhere else. You
          stay logged in here.
        </p>
        <button
          type="button"
          onClick={handleLogoutOthers}
          disabled={sessBusy}
          className={`mt-4 ${outlineBtn}`}
        >
          {sessBusy ? "Working..." : "Log out other devices"}
        </button>
        <Notice state={sessNote} />
      </section>

      {/* YOUR DATA */}
      <section className={card}>
        <h2 className="text-lg font-semibold text-[#292331]">Your data</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Download a copy of everything Lunara stores about you, or delete
          parts of it. The downloaded file contains private health details, so
          keep it somewhere safe.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={!!dataBusy}
            className={outlineBtn}
          >
            {dataBusy === "export" ? "Preparing..." : "Download my data (JSON)"}
          </button>
          <button
            type="button"
            disabled={!!dataBusy}
            onClick={() => handleClear("cycles", "cycle history", clearCycleHistory)}
            className={outlineBtn}
          >
            Delete cycle history
          </button>
          <button
            type="button"
            disabled={!!dataBusy}
            onClick={() => handleClear("logs", "daily logs", clearDailyLogs)}
            className={outlineBtn}
          >
            Delete daily logs
          </button>
          <button
            type="button"
            disabled={!!dataBusy}
            onClick={() => handleClear("chats", "AI chats", clearChatHistory)}
            className={outlineBtn}
          >
            Delete AI chats
          </button>
        </div>
        <Notice state={dataNote} />
      </section>

      {/* DELETE ACCOUNT */}
      <section className="rounded-3xl border border-red-100 bg-white p-6 sm:p-7">
        <h2 className="text-lg font-semibold text-red-600">Delete account</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          This permanently deletes your profile, cycles, daily logs, chats,
          posts and reviews. Upcoming appointments are cancelled and any
          payment is refunded. It can't be undone.
        </p>

        <form onSubmit={handleDelete} className="mt-4 space-y-3">
          <input
            type="text"
            autoComplete="off"
            placeholder='Type "DELETE" to confirm'
            aria-label="Type DELETE to confirm"
            value={del.word}
            onChange={(e) => setDel({ ...del, word: e.target.value })}
            className={input}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            aria-label="Your password"
            value={del.password}
            onChange={(e) => setDel({ ...del, password: e.target.value })}
            required
            className={input}
          />
          <button
            type="submit"
            disabled={delBusy || del.word !== "DELETE" || !del.password}
            className="h-11 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {delBusy ? "Deleting..." : "Delete my account"}
          </button>
        </form>
        <Notice state={delNote} />
      </section>
    </div>
  );
}