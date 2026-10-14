import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout/AuthLayout";
import loginImage from "../../../assets/login.jpeg";
import { resetPassword } from "../../../services/api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  // never redirect after the user has already left the page
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token, password);
      setDone(true);
      timerRef.current = setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#e58da4]";

  return (
    <AuthLayout>
      <div className="w-full max-w-[1080px] overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(170,95,120,0.12)]">
        <div className="grid min-h-[650px] md:grid-cols-2">
          <div className="hidden md:block">
            <img src={loginImage} alt="" className="h-full w-full object-cover" />
          </div>

          <div className="flex items-center justify-center px-10 py-12 sm:px-14">
            <div className="w-full max-w-[400px]">
              <h1 className="font-serif text-[40px] font-semibold tracking-[-0.5px] text-[#292331]">
                New Password
              </h1>

              {done ? (
                <p role="status" className="mt-6 rounded-xl bg-[#f0faf3] p-4 text-sm text-green-700">
                  Password updated. Redirecting you to log in...
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#292331]">
                      New password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      maxLength={72}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm" className="mb-2 block text-sm font-medium text-[#292331]">
                      Confirm new password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                      maxLength={72}
                      className={inputClass}
                    />
                  </div>

                  {error && (
                    <p role="alert" className="text-sm text-red-500">
                      {error}
                      {/expired|invalid/i.test(error) && (
                        <>
                          {" "}
                          <Link to="/forgot-password" className="font-medium underline">
                            Request a new link
                          </Link>
                        </>
                      )}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-[52px] w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:opacity-60"
                  >
                    {loading ? "Saving..." : "Reset Password"}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center text-sm text-gray-500">
                <Link to="/login" className="font-medium text-[#e58da4] hover:text-[#d47790]">
                  Back to Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}