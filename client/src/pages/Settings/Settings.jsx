import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changePassword,
  deleteAccount,
  saveToken,
  clearToken,
} from "../../services/api";

export default function Settings() {
  const navigate = useNavigate();

  // change password state
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (form.newPassword === form.currentPassword) {
      setError("New password must be different from the current one.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const data = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      // the old token is no longer valid; keep the same storage choice
      saveToken(data.token, !!localStorage.getItem("token"));

      setMessage("Password changed successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();

    if (
      !window.confirm(
        "This permanently deletes your account and all your data. Continue?"
      )
    )
      return;

    try {
      setDeleting(true);
      setDeleteError("");
      await deleteAccount(deletePassword);
      clearToken();
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none transition focus:border-[#e58da4]";
  const labelClass = "mb-2 block text-sm font-medium text-[#292331]";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-[#df829b]">Account preferences</p>

        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
          Settings
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Manage your account and security preferences.
        </p>
      </div>

      {/* CHANGE PASSWORD */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#292331]">
            Change Password
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Keep your Lunara account secure with a strong password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="space-y-5">
            <div>
              <label htmlFor="currentPassword" className={labelClass}>
                Current Password
              </label>
              <input
                id="currentPassword"
                type={showPasswords ? "text" : "password"}
                name="currentPassword"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className={labelClass}>
                New Password
              </label>
              <input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                name="newPassword"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={form.newPassword}
                onChange={handleChange}
                required
                minLength={8}
                maxLength={72}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type={showPasswords ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={8}
                maxLength={72}
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="accent-[#e58da4]"
              />
              Show passwords
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-5 text-sm text-red-500">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="mt-5 text-sm text-green-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-6 h-12 rounded-xl bg-[#e58da4] px-7 text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* DELETE ACCOUNT */}
      <div className="mt-6 rounded-3xl border border-red-100 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-[#292331]">Delete account</h2>

        <p className="mt-1 text-sm text-gray-500">
          Permanently removes your profile, cycles, chats, posts and reviews.
          This cannot be undone.
        </p>

        <form onSubmit={handleDelete} className="mt-5 max-w-2xl">
          <label htmlFor="deletePassword" className={labelClass}>
            Confirm with your password
          </label>
          <input
            id="deletePassword"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            required
            className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-red-300"
          />

          {deleteError && (
            <p role="alert" className="mt-3 text-sm text-red-500">
              {deleteError}
            </p>
          )}

          <button
            type="submit"
            disabled={deleting}
            className="mt-5 h-12 rounded-xl bg-red-500 px-7 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete my account"}
          </button>
        </form>
      </div>
    </div>
  );
}