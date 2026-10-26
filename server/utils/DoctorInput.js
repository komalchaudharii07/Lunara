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