import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout/AuthLayout";
import loginImage from "../../../assets/login.jpeg";

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email });
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[1080px] overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(170,95,120,0.12)]">
        <div className="grid min-h-[650px] md:grid-cols-2">

          {/* Image */}
          <div className="hidden md:block">
            <img
              src={loginImage}
              alt="Healthcare professional"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Form */}
          <div className="flex items-center justify-center px-10 py-12 sm:px-14">
            <div className="w-full max-w-[400px]">

              <div>
                <h1 className="font-serif text-[40px] font-semibold tracking-[-0.5px] text-[#292331]">
                  Forgot Password
                </h1>

                <p className="mt-3 text-[15px] leading-6 text-gray-500">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8">
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

                <button
                  type="submit"
                  className="mt-6 h-[52px] w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white transition hover:bg-[#d97d96]"
                >
                  Send Reset Link
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500">
                <Link
                  to="/login"
                  className="font-medium text-[#e58da4] hover:text-[#d47790]"
                >
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