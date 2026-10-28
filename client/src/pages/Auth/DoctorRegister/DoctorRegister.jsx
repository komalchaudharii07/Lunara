import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../../layouts/AuthLayout/AuthLayout";
import {
  registerUser,
  saveToken,
  uploadDoctorDocuments,
  uploadDoctorPhoto,
} from "../../../services/api";

const MAX_BYTES = 5 * 1024 * 1024;
const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const field =
  "h-[52px] w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#e58da4]";
const label = "mb-2 block text-sm font-medium text-[#292331]";

export default function DoctorRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    specialization: "",
    qualification: "",
    experience: "",
    consultationFee: "",
    registrationCouncil: "",
    registrationNumber: "",
    bio: "",
    clinicName: "",
    clinicAddress: "",
    lat: "",
    lng: "",
  });
  const [locating, setLocating] = useState(false);
  const [docs, setDocs] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError("Your browser can't share its location.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
        }));
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. Allow location access, or find it from the address.");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  // finds the map point for the typed address (OpenStreetMap)
  const findFromAddress = async () => {
    const q = form.clinicAddress.trim();
    if (!q) return setError("Type the clinic address first.");
    setLocating(true);
    setError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`
      );
      const rows = await res.json();
      if (!rows?.[0]) throw new Error("We couldn't find that address on the map. Add the area or pincode.");
      setForm((f) => ({
        ...f,
        lat: Math.round(Number(rows[0].lat) * 1e6) / 1e6,
        lng: Math.round(Number(rows[0].lon) * 1e6) / 1e6,
      }));
    } catch (err) {
      setError(err.message || "The map search isn't working right now.");
    } finally {
      setLocating(false);
    }
  };

  const pickDocs = (e) => {
    const list = [...e.target.files];
    if (list.length > 3) return setError("You can add up to 3 documents.");
    if (list.some((f) => !DOC_TYPES.includes(f.type))) return setError("Documents must be PDF, JPG or PNG.");
    if (list.some((f) => f.size > MAX_BYTES)) return setError("Each document must be 5 MB or smaller.");
    setError("");
    setDocs(list);
  };

  const pickPhoto = (e) => {
    const f = e.target.files[0];
    if (!f) return setPhoto(null);
    if (!["image/jpeg", "image/png"].includes(f.type)) return setError("The photo must be a JPG or PNG.");
    if (f.size > 2 * 1024 * 1024) return setError("The photo must be 2 MB or smaller.");
    setError("");
    setPhoto(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (docs.length === 0) {
      setError("Please add your medical registration certificate (PDF, JPG or PNG).");
      return;
    }

    if (form.lat === "" || form.lng === "") {
      setError("Please set your clinic location on the map (use the buttons under the address).");
      return;
    }
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
          phone: form.phone.trim(),
          specialization: form.specialization.trim(),
          qualification: form.qualification.trim(),
          experience: Number(form.experience),
          consultationFee: Number(form.consultationFee),
          registrationCouncil: form.registrationCouncil.trim(),
          registrationNumber: form.registrationNumber.trim(),
          bio: form.bio.trim(),
          clinicName: form.clinicName.trim(),
          clinicAddress: form.clinicAddress.trim(),
          lat: Number(form.lat),
          lng: Number(form.lng),
        },
      });

      if (!data?.token) throw new Error("Registration failed. Please try again.");
      saveToken(data.token, false);

      // the files go up with the new login; if this fails the doctor can retry in the portal
      try {
        await uploadDoctorDocuments(docs);
        if (photo) await uploadDoctorPhoto(photo);
      } catch {
        /* the portal shows what is still missing */
      }

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
            <label htmlFor="phone" className={label}>Phone number</label>
            <input id="phone" type="tel" required maxLength={20} value={form.phone}
              onChange={set("phone")} autoComplete="tel" placeholder="+91 98765 43210" className={field} />
            <p className="mt-1 text-xs text-gray-400">Only the Lunara team sees this. Patients never do.</p>
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

          <div className="space-y-3 rounded-2xl bg-[#fdf7f8] p-4 sm:col-span-2">
            <p className="text-sm font-medium text-[#292331]">Verification documents</p>
            <div>
              <label htmlFor="docs" className="text-xs text-gray-500">
                Medical registration certificate (and ID proof if you like). PDF, JPG or PNG, up to 3 files, 5 MB each.
              </label>
              <input id="docs" type="file" multiple required accept=".pdf,.jpg,.jpeg,.png"
                onChange={pickDocs} className="mt-1 block w-full text-sm text-gray-600" />
              {docs.length > 0 && (
                <p className="mt-1 text-xs text-green-600">{docs.map((d) => d.name).join(", ")}</p>
              )}
            </div>
            <div>
              <label htmlFor="photo" className="text-xs text-gray-500">
                Profile photo (optional). JPG or PNG, 2 MB.
              </label>
              <input id="photo" type="file" accept=".jpg,.jpeg,.png" onChange={pickPhoto}
                className="mt-1 block w-full text-sm text-gray-600" />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl bg-[#fdf7f8] p-4 sm:col-span-2">
            <p className="text-sm font-medium text-[#292331]">Your clinic location</p>
            <p className="text-xs text-gray-500">
              Patients near you will see you on the map and can book you from there.
            </p>
            <input aria-label="Clinic name" placeholder="Clinic or hospital name" maxLength={120}
              value={form.clinicName} onChange={set("clinicName")} className={field} />
            <input aria-label="Clinic address" required minLength={5} maxLength={250}
              placeholder="Address, area, city, pincode" value={form.clinicAddress}
              onChange={set("clinicAddress")} className={field} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={findFromAddress} disabled={locating}
                className="rounded-lg border border-[#eadde1] bg-white px-3 py-2 text-xs font-medium text-[#292331] hover:border-[#e58da4] disabled:opacity-50">
                Find on map from address
              </button>
              <button type="button" onClick={useMyLocation} disabled={locating}
                className="rounded-lg border border-[#eadde1] bg-white px-3 py-2 text-xs font-medium text-[#292331] hover:border-[#e58da4] disabled:opacity-50">
                Use my current location
              </button>
              {form.lat !== "" && form.lng !== "" ? (
                <span className="text-xs text-green-600">Pin set ({form.lat}, {form.lng})</span>
              ) : (
                <span className="text-xs text-red-500">Pin not set yet</span>
              )}
            </div>
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