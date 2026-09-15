import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout/AuthLayout";
import loginImage from "../../../assets/login.jpeg";
import { loginUser } from "../../../services/api";

function MailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3 3.9" />
      <path d="M6.7 6.7C3.7 8.6 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const data = await loginUser({
        email,
        password,
      });

      if (rememberMe) {
        localStorage.setItem("token", data.token);
      } else {
        sessionStorage.setItem("token", data.token);
      }

      navigate("/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[1080px] overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(170,95,120,0.12)]">
        <div className="grid min-h-[650px] md:grid-cols-2">

          <div className="hidden md:block">
            <img
              src={loginImage}
              alt="Healthcare professional"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex items-center justify-center px-10 py-12 sm:px-14">
            <div className="w-full max-w-[400px]">

              <div>
                <h1 className="font-serif text-[40px] font-semibold tracking-[-0.5px] text-[#292331]">
                  Welcome Back
                </h1>

                <p className="mt-1 text-[16px]">
                  <span className="text-[#a9a9a9]">or </span>
                  <Link
                    to="/register"
                    className="font-medium text-[#e58da4] hover:text-[#d47790]"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#292331]">
                    Email address
                  </label>

                  <div className="flex h-[52px] items-center gap-3 rounded-xl border border-gray-200 px-4 focus-within:border-[#e58da4]">
                    <span className="text-gray-400">
                      <MailIcon />
                    </span>

                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent text-sm text-[#292331] outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#292331]">
                    Password
                  </label>

                  <div className="flex h-[52px] items-center gap-3 rounded-xl border border-gray-200 px-4 focus-within:border-[#e58da4]">
                    <span className="text-gray-400">
                      <LockIcon />
                    </span>

                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-transparent text-sm text-[#292331] outline-none placeholder:text-gray-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 transition hover:text-gray-600"
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-gray-500">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-[#e58da4]"
                    />
                    Remember me
                  </label>

                  <Link
                    to="/forgot-password"
                    className="font-medium text-[#e58da4] hover:text-[#d47790]"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <p className="text-sm text-red-500">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-[52px] w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>

              </form>

            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}