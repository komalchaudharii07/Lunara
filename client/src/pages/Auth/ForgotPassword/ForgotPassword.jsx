import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout/AuthLayout";
import loginImage from "../../../assets/login.jpeg";
import { forgotPassword } from "../../../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
                Forgot Password
              </h1>

              {sent ? (
                <div role="status" className="mt-6 rounded-xl bg-[#f0faf3] p-4 text-sm leading-6 text-green-700">
                  If an account exists for <strong>{email}</strong>, we've sent a
                  reset link. It's valid for 15 minutes. Check your spam folder too.
                </div>
              ) : (
                <>
                  <p className="mt-3 text-[15px] leading-6 text-gray-500">
                    Enter your email address and we'll send you a link to reset
                    your password.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-8">
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#292331]">
                      Email address
                    </label>

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#e58da4]"
                    />

                    {error && (
                      <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-6 h-[52px] w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:opacity-60"
                    >
                      {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </form>
                </>
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