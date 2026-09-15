import { useEffect, useState } from "react";
import {
  getCurrentUser,
  updateProfile,
} from "../../services/api";

export default function Profile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    age: "",
    height: "",
    weight: "",
    bloodGroup: "",
    phone: "",
    location: "",
    activityLevel: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = getToken();

        if (!token) {
          throw new Error("Please login again");
        }

        const data = await getCurrentUser(token);
        const user = data.user || data;

        setProfile({
          name: user.name || "",
          email: user.email || "",
          age: user.age || "",
          height: user.height || "",
          weight: user.weight || "",
          bloodGroup: user.bloodGroup || "",
          phone: user.phone || "",
          location: user.location || "",
          activityLevel: user.activityLevel || "",
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });

    setMessage("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Please login again");
      }

      await updateProfile(
        {
          name: profile.name,
          age: Number(profile.age),
          height: profile.height
            ? Number(profile.height)
            : undefined,
          weight: profile.weight
            ? Number(profile.weight)
            : undefined,
          bloodGroup: profile.bloodGroup || undefined,
          phone: profile.phone,
          location: profile.location,
          activityLevel:
            profile.activityLevel || undefined,
        },
        token
      );

      setMessage("Profile updated successfully.");
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-400">
          Loading profile...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-[#df829b]">
          Your account
        </p>

        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
          Profile
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Manage your personal information and health details.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-8">
          <h2 className="text-lg font-semibold text-[#292331]">
            Personal Information
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Basic information about you.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Full Name
              </label>

              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                required
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Email address
              </label>

              <input
                type="email"
                value={profile.email}
                disabled
                className="h-12 w-full cursor-not-allowed rounded-xl border border-[#eadde1] bg-gray-50 px-4 text-sm text-gray-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Age
              </label>

              <input
                type="number"
                name="age"
                value={profile.age}
                onChange={handleChange}
                min="10"
                max="100"
                required
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Phone Number
              </label>

              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Optional"
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Location
              </label>

              <input
                type="text"
                name="location"
                value={profile.location}
                onChange={handleChange}
                placeholder="City, State"
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]"
              />
            </div>
          </div>
        </div>

        {/* Body Information */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-8">
          <h2 className="text-lg font-semibold text-[#292331]">
            Body Information
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Optional details that help personalize your experience.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Height (cm)
              </label>

              <input
                type="number"
                name="height"
                value={profile.height}
                onChange={handleChange}
                placeholder="e.g. 165"
                min="50"
                max="250"
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Weight (kg)
              </label>

              <input
                type="number"
                name="weight"
                value={profile.weight}
                onChange={handleChange}
                placeholder="e.g. 55"
                min="10"
                max="300"
                className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Blood Group
              </label>

              <select
                name="bloodGroup"
                value={profile.bloodGroup}
                onChange={handleChange}
                className="h-12 w-full rounded-xl border border-[#eadde1] bg-white px-4 text-sm outline-none focus:border-[#e58da4]"
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lifestyle */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-8">
          <h2 className="text-lg font-semibold text-[#292331]">
            Lifestyle
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Help Lunara understand your daily activity.
          </p>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-[#292331]">
              Activity Level
            </label>

            <select
              name="activityLevel"
              value={profile.activityLevel}
              onChange={handleChange}
              className="h-12 w-full rounded-xl border border-[#eadde1] bg-white px-4 text-sm outline-none focus:border-[#e58da4]"
            >
              <option value="">Select activity level</option>
              <option value="Sedentary">
                Sedentary
              </option>
              <option value="Lightly Active">
                Lightly Active
              </option>
              <option value="Moderately Active">
                Moderately Active
              </option>
              <option value="Very Active">
                Very Active
              </option>
            </select>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-500">
            {error}
          </p>
        )}

        {message && (
          <p className="mb-4 text-sm text-green-600">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-xl bg-[#e58da4] px-7 text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}