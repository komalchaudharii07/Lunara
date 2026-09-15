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

    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please login again");
      }

      await updateProfile(
        {
          name,
          age: Number(age),
        },
        token
      );

      navigate("/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

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
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Name
              </label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#e58da4]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Age
              </label>

              <input
                type="number"
                placeholder="Enter your age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                min="10"
                max="100"
                className="h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#e58da4]"
              />
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
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}