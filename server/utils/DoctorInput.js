// Checks the doctor details sent from the sign-up form or the profile form.
// requireAll = true when creating; false when a doctor edits part of their profile.
const isString = (v) => typeof v === "string";

const text = (v, max) => (isString(v) ? v.trim() : "").slice(0, max + 1);

function parseDoctorInput(body = {}, { requireAll = true, withLicence = true } = {}) {
  const value = {};
  const has = (k) => body[k] !== undefined;

  const field = (key, label, max, { min = 2 } = {}) => {
    if (!has(key)) {
      if (requireAll) return `${label} is required`;
      return null;
    }
    const s = text(body[key], max);
    if (s.length < min || s.length > max) return `${label} must be ${min}-${max} characters`;
    value[key] = s;
    return null;
  };

  const num = (key, label, min, max) => {
    if (!has(key)) {
      if (requireAll) return `${label} is required`;
      return null;
    }
    const n = typeof body[key] === "number" ? body[key] : Number(body[key]);
    if (!Number.isFinite(n) || n < min || n > max) return `${label} must be between ${min} and ${max}`;
    value[key] = Math.round(n);
    return null;
  };

  const problems = [
    field("name", "Name", 100),
    field("specialization", "Specialization", 100),
    field("qualification", "Qualification", 200),
    num("experience", "Experience (years)", 0, 70),
    num("consultationFee", "Consultation fee", 0, 100000),
  ];

  if (has("bio")) {
    const bio = text(body.bio, 600);
    if (bio.length > 600) problems.push("About you must be 600 characters or fewer");
    else value.bio = bio;
  }

  // phone: needed at sign-up, can be changed later
  if (has("phone") || (requireAll && withLicence)) {
    const phone = text(body.phone, 20);
    const digits = phone.replace(/\D/g, "");
    if (!/^\+?[0-9 ()-]{7,20}$/.test(phone) || digits.length < 7 || digits.length > 15) {
      problems.push("Please enter a valid phone number");
    } else {
      value.phone = phone;
    }
  }

  // optional clinic place (shown on the map)
  for (const [key, label, max] of [
    ["clinicName", "Clinic name", 120],
    ["clinicAddress", "Clinic address", 250],
  ]) {
    if (has(key)) {
      const v = text(body[key], max);
      if (v.length > max) problems.push(`${label} must be ${max} characters or fewer`);
      else value[key] = v;
    }
  }
  if (has("lat") || has("lng")) {
    const clear = (body.lat === null || body.lat === "") && (body.lng === null || body.lng === "");
    if (clear) {
      problems.push("Clinic location is required. Please set your pin on the map.");
    } else {
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        problems.push("Clinic location isn't valid. Please set it again.");
      } else {
        value.lat = Math.round(lat * 1e6) / 1e6;
        value.lng = Math.round(lng * 1e6) / 1e6;
      }
    }
  }

  // a new doctor must give the clinic address and the map pin
  if (requireAll && withLicence) {
    if (!value.clinicAddress || value.clinicAddress.length < 5) {
      problems.push("Clinic address is required");
    }
    if (value.lat === undefined || value.lng === undefined) {
      problems.push("Clinic location is required. Please set your pin on the map.");
    }
  }

  if (withLicence) {
    problems.push(field("registrationCouncil", "Medical council", 100));
    const reg = field("registrationNumber", "Registration number", 40, { min: 4 });
    problems.push(reg);
    if (!reg && value.registrationNumber && !/^[A-Za-z0-9/\-. ]+$/.test(value.registrationNumber)) {
      problems.push("Registration number can only use letters, numbers, / - and .");
    }
  }

  if (has("available")) {
    if (typeof body.available !== "boolean") problems.push("Available must be true or false");
    else value.available = body.available;
  }

  const error = problems.find(Boolean) || null;
  return { error, value };
}

module.exports = { parseDoctorInput };