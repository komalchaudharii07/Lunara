import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "../../services/api";

export default function Onboarding() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    const ageNumber = Number(age);

    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }

    if (!Number.isInteger(ageNumber) || ageNumber < 10 || ageNumber > 100) {
      setError("Please enter your age as a whole number between 10 and 100.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // the token is attached by api.js; an expired session goes to /login there
      await updateProfile({ name: cleanName, age: ageNumber });

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#e58da4]";

  return (
    <div className="min-h-screen bg-[#fdf5f6] px-6 py-10">
      <div className="mx-auto flex min-h-[90vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(170,95,120,0.10)] sm:p-12">
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-[#e58da4]">
              Welcome to Lunara
            </p>

            <h1 className="font-serif text-4xl font-semibold text-[#292331]">
              Let’s get to know you
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Tell us a little about yourself to personalize your Lunara
              experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                className={inputClass}
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
                className={inputClass}
              />
            </div>

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
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}