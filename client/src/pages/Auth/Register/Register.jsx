import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout/AuthLayout";
import loginImage from "../../../assets/login.jpeg";
import { registerUser, saveToken } from "../../../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!accepted) {
      setError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        age: Number(age),
        acceptedTerms: accepted,
      });

      // clears any old token, then stores the new one
      saveToken(data.token, false); // session only: safer on shared devices

      navigate("/onboarding");
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
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex items-center justify-center px-10 py-12 sm:px-14">
            <div className="w-full max-w-[400px]">

              <div>
                <h1 className="font-serif text-[40px] font-semibold tracking-[-0.5px] text-[#292331]">
                  Create Account
                </h1>

                <p className="mt-1 text-[16px]">
                  <span className="text-[#a9a9a9]">or </span>
                  <Link
                    to="/login"
                    className="font-medium text-[#e58da4] hover:text-[#d47790]"
                  >
                    Log In
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">

                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-[#292331]"
                  >
                    Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                    className="h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#e58da4]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-[#292331]"
                  >
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
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-[#292331]"
                  >
                    Password
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
                    className="h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#e58da4]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="age"
                    className="mb-2 block text-sm font-medium text-[#292331]"
                  >
                    Age
                  </label>

                  <input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    placeholder="Enter your age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    min="10"
                    max="100"
                    className="h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#e58da4]"
                  />
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-500">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    required
                    className="mt-1 accent-[#e58da4]"
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#e58da4]"
                    >
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#e58da4]"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                {error && (
                  <p role="alert" className="text-sm text-red-500">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-[52px] w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>

              </form>

            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}