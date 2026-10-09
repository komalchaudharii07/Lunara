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
        const user = data.user;

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
          name: profile.name.trim(),
          age: Number(profile.age),
          height: profile.height ? Number(profile.height) : null,
          weight: profile.weight ? Number(profile.weight) : null,
          bloodGroup: profile.bloodGroup || null,
          phone: profile.phone.trim() || null,
          location: profile.location.trim() || null,
          activityLevel: profile.activityLevel || null,
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

  const inputClass =
    "h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]";
  const labelClass = "mb-2 block text-sm font-medium text-[#292331]";
  const cardClass =
    "mb-6 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-8";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-[#df829b]">Your account</p>

        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
          Profile
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Manage your personal information and health details.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div className={cardClass}>
          <h2 className="text-lg font-semibold text-[#292331]">
            Personal Information
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Basic information about you.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClass}>
                Full Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                autoComplete="name"
                value={profile.name}
                onChange={handleChange}
                required
                maxLength={100}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="h-12 w-full cursor-not-allowed rounded-xl border border-[#eadde1] bg-gray-50 px-4 text-sm text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="age" className={labelClass}>
                Age
              </label>
              <input
                id="age"
                type="number"
                name="age"
                value={profile.age}
                onChange={handleChange}
                min="10"
                max="100"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Optional"
                maxLength={20}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="location" className={labelClass}>
                Location
              </label>
              <input
                id="location"
                type="text"
                name="location"
                value={profile.location}
                onChange={handleChange}
                placeholder="City, State"
                maxLength={100}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Body Information */}
        <div className={cardClass}>
          <h2 className="text-lg font-semibold text-[#292331]">
            Body Information
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Optional details that help personalize your experience.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="height" className={labelClass}>
                Height (cm)
              </label>
              <input
                id="height"
                type="number"
                name="height"
                value={profile.height}
                onChange={handleChange}
                placeholder="e.g. 165"
                min="50"
                max="250"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="weight" className={labelClass}>
                Weight (kg)
              </label>
              <input
                id="weight"
                type="number"
                name="weight"
                value={profile.weight}
                onChange={handleChange}
                placeholder="e.g. 55"
                min="10"
                max="300"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="bloodGroup" className={labelClass}>
                Blood Group
              </label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={profile.bloodGroup}
                onChange={handleChange}
                className={`${inputClass} bg-white`}
              >
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Lifestyle */}
        <div className={cardClass}>
          <h2 className="text-lg font-semibold text-[#292331]">Lifestyle</h2>

          <p className="mt-1 text-sm text-gray-400">
            Help Lunara understand your daily activity.
          </p>

          <div className="mt-6">
            <label htmlFor="activityLevel" className={labelClass}>
              Activity Level
            </label>
            <select
              id="activityLevel"
              name="activityLevel"
              value={profile.activityLevel}
              onChange={handleChange}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select activity level</option>
              <option value="Sedentary">Sedentary</option>
              <option value="Lightly Active">Lightly Active</option>
              <option value="Moderately Active">Moderately Active</option>
              <option value="Very Active">Very Active</option>
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-red-500">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="mb-4 text-sm text-green-600">
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