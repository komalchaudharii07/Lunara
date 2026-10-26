import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout/AuthLayout";
import { registerUser, saveToken } from "../../../services/api";

const field =
  "h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#e58da4]";
const label = "mb-2 block text-sm font-medium text-[#292331]";

export default function DoctorRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
    qualification: "",
    experience: "",
    consultationFee: "",
    registrationCouncil: "",
    registrationNumber: "",
    bio: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

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
        accountType: "doctor",
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        acceptedTerms: accepted,
        doctor: {
          specialization: form.specialization.trim(),
          qualification: form.qualification.trim(),
          experience: Number(form.experience),
          consultationFee: Number(form.consultationFee),
          registrationCouncil: form.registrationCouncil.trim(),
          registrationNumber: form.registrationNumber.trim(),
          bio: form.bio.trim(),
        },
      });

      if (!data?.token) throw new Error("Registration failed. Please try again.");
      saveToken(data.token, false);

      navigate("/doctor-portal", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-180 rounded-[28px] bg-white px-6 py-10 shadow-[0_20px_60px_rgba(170,95,120,0.12)] sm:px-12">
        <h1 className="font-serif text-[36px] font-semibold tracking-[-0.5px] text-[#292331]">
          Join as a doctor
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[#e58da4]">
            Log in
          </Link>
          . Patients?{" "}
          <Link to="/register" className="font-medium text-[#e58da4]">
            Sign up here
          </Link>
          .
        </p>
        <p className="mt-3 rounded-xl bg-[#fdf1f4] px-4 py-3 text-xs leading-5 text-[#8a5a68]">
          An admin checks your medical registration before your profile is shown to
          patients. You can set your weekly schedule while you wait.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={label}>Full name</label>
            <input id="name" required maxLength={100} value={form.name} onChange={set("name")}
              placeholder="Dr. Full Name" autoComplete="name" className={field} />
          </div>

          <div>
            <label htmlFor="email" className={label}>Email address</label>
            <input id="email" type="email" required value={form.email} onChange={set("email")}
              autoComplete="email" className={field} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="password" className={label}>Password</label>
            <input id="password" type="password" required minLength={8} maxLength={72}
              value={form.password} onChange={set("password")} autoComplete="new-password"
              placeholder="At least 8 characters" className={field} />
          </div>

          <div>
            <label htmlFor="specialization" className={label}>Specialization</label>
            <input id="specialization" required maxLength={100} value={form.specialization}
              onChange={set("specialization")} placeholder="e.g. Gynecologist" className={field} />
          </div>

          <div>
            <label htmlFor="qualification" className={label}>Qualification</label>
            <input id="qualification" required maxLength={200} value={form.qualification}
              onChange={set("qualification")} placeholder="e.g. MBBS, MD (Obstetrics & Gynaecology)"
              className={field} />
          </div>

          <div>
            <label htmlFor="experience" className={label}>Experience (years)</label>
            <input id="experience" type="number" required min="0" max="70" step="1"
              value={form.experience} onChange={set("experience")} className={field} />
          </div>

          <div>
            <label htmlFor="fee" className={label}>Consultation fee (₹)</label>
            <input id="fee" type="number" required min="0" max="100000" step="1"
              value={form.consultationFee} onChange={set("consultationFee")} className={field} />
          </div>

          <div>
            <label htmlFor="council" className={label}>Medical council</label>
            <input id="council" required maxLength={100} value={form.registrationCouncil}
              onChange={set("registrationCouncil")} placeholder="e.g. Delhi Medical Council"
              className={field} />
          </div>

          <div>
            <label htmlFor="regno" className={label}>Registration number</label>
            <input id="regno" required minLength={4} maxLength={40} value={form.registrationNumber}
              onChange={set("registrationNumber")} className={field} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="bio" className={label}>About you (optional)</label>
            <textarea id="bio" rows={3} maxLength={600} value={form.bio} onChange={set("bio")}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#e58da4]" />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-500 sm:col-span-2">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}
              required className="mt-1 accent-[#e58da4]" />
            <span>
              I agree to the{" "}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-[#e58da4]">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#e58da4]">Privacy Policy</Link>
              , and confirm the details above are true.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-500 sm:col-span-2">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="h-13 w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
            {loading ? "Creating account..." : "Create doctor account"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}