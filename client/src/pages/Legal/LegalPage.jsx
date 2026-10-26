import { useEffect } from "react";
import { Link } from "react-router-dom";

const pages = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["What we collect", "Your name, email, age and password (stored as a hash), and the optional details you add: height, weight, blood group, phone, location, and activity level. We also store the cycle, symptom, mood and notes you log, your daily logs (flow, pain, mood, symptoms and notes), your Lunara AI chats, and your community posts and likes."],
      ["How we use it", "To run the app: show your cycle estimates and insights, answer your questions in Lunara AI, and let you post in the community. We do not sell your data."],
      ["Third-party services", "Lunara AI is off until you turn it on. Once on, it sends your messages, your last few chat messages, your recent cycle records (period dates, lengths, symptoms and mood) and your recent daily logs (flow, pain, mood and symptoms) to Google (Gemini) to generate answers. You can turn it off in Settings. Your name, email, phone, location and notes are not sent. Nearby care search sends the location you choose, and your IP address, to OpenStreetMap services (Nominatim and Overpass). Emails are sent through Resend. Payments for appointments are processed by Razorpay, which receives the payment details you enter in its window (Lunara does not store your card details). Video consultations use a video-call service (Jitsi by default) through a private room link."],
      ["Community posts", "Posts marked anonymous are not shown with your name to other users. We still link them to your account internally, for safety and so you can delete them. Members can report posts, and posts with several reports are hidden until a moderator reviews them."],
      ["Doctor appointments", "When you book an appointment, the doctor can see your name, your reason for the visit and the time. If you choose to share your cycle report, that doctor can also see your age, height, weight and blood group, a summary of your cycle pattern, and your last 6 months of periods and daily logs (not your personal notes, email or phone) from 24 hours before until 7 days after the visit. You can switch sharing off at any time on the Appointments page, and you can see when the report was opened. Platform administrators can also open shared reports. Appointment and payment records may be kept after you delete your account where the law requires."],
      ["Your choices", "You can edit or delete individual periods in the Cycle Tracker, edit or delete daily logs, clear your Lunara AI chats, turn Lunara AI on or off, download a copy of your data, log out of other devices, and delete your account, all from the app (Settings). Deleting your account cancels and refunds your upcoming paid appointments and removes your profile, cycles, daily logs, chats, posts, likes and reviews."],
      ["Security", "Data is sent over HTTPS in production and passwords are hashed. Your login session is kept in your browser's storage. No system is perfectly secure, so please use a strong, unique password."],
      ["Contact", "Questions about your data? Use the contact form on our home page or email hello@lunara.com."],
    ],
  },
  terms: {
    title: "Terms of Service",
    sections: [
      ["Not medical advice", "Lunara provides general information and estimates. It does not diagnose, treat or replace a doctor. Cycle, ovulation and fertile-window dates are estimates and must not be used as your only method of contraception. In an emergency, call your local emergency number (112 in India)."],
      ["Your account", "You are responsible for your password and for activity on your account. You must give accurate information and be old enough to use the service under the law that applies to you."],
      ["Community rules", "Be respectful. Do not post harassment, hate, spam, other people's private information, or medical misinformation. We may remove content or accounts that break these rules."],
      ["Lunara AI", "Lunara AI only works after you turn it on. AI answers can be wrong or incomplete. Check important health decisions with a qualified professional."],
      ["Changes and termination", "We may update these terms and the service. You can delete your account at any time from Settings."],
    ],
  },
};

export default function LegalPage({ type }) {
  const page = pages[type];

  useEffect(() => {
    if (page) document.title = `${page.title} · Lunara`;
    window.scrollTo(0, 0);
  }, [page]);

  // unknown type: show a friendly message instead of crashing the app
  if (!page) {
    return (
      <div className="min-h-screen bg-[#fdf7f8] px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
          <h1 className="font-serif text-3xl font-semibold text-[#292331]">
            Page not found
          </h1>
          <Link to="/" className="mt-6 inline-block text-sm font-medium text-[#e58da4]">
            ← Back to Lunara
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf7f8] px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm sm:p-12">
        <Link to="/" className="text-sm font-medium text-[#e58da4]">← Back to Lunara</Link>

        <h1 className="mt-6 font-serif text-4xl font-semibold text-[#292331]">{page.title}</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: October 2026</p>

        <div className="mt-8 space-y-7">
          {page.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="text-lg font-semibold text-[#292331]">{heading}</h2>
              <p className="mt-2 text-sm leading-7 text-gray-600">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}