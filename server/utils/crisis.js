// Shared self-harm phrase detection (used by AI chat, community posts and appointment notes)
const SELF_HARM = [
  /\b(kill|hurt|harm|end)\s+(myself|my\s*life)\b/i,
  /\bsuicid(e|al)\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
  /\bend\s+it\s+all\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bno\s+reason\s+to\s+(live|go\s+on)\b/i,
  /\b(cut|cutting)\s+myself\b/i,
  /\bself[-\s]?harm\b/i,
  /\btake\s+my\s+own\s+life\b/i,
];

const SELF_HARM_ANY = new RegExp(SELF_HARM.map((r) => r.source).join("|"), "i");

module.exports = { SELF_HARM, SELF_HARM_ANY };