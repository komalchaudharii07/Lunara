import { useState } from "react";
import { changePassword } from "../../services/api";

export default function Settings() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    setMessage("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const token = getToken();

      if (!token) {
        throw new Error("Please login again.");
      }

      await changePassword(
        {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        },
        token
      );

      setMessage("Password changed successfully.");

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-[#df829b]">
          Account preferences
        </p>

        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
          Settings
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Manage your account and security preferences.
        </p>
      </div>

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
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Current Password
              </label>

              <input
                type={showPasswords ? "text" : "password"}
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                required
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none transition focus:border-[#e58da4]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                New Password
              </label>

              <input
                type={showPasswords ? "text" : "password"}
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none transition focus:border-[#e58da4]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Confirm New Password
              </label>

              <input
                type={showPasswords ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none transition focus:border-[#e58da4]"
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
            <p className="mt-5 text-sm text-red-500">
              {error}
            </p>
          )}

          {message && (
            <p className="mt-5 text-sm text-green-600">
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
    </div>
  );
}