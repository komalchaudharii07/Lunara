import { Link } from "react-router-dom";

const pages = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["What we collect", "Your name, email, age and password (stored as a hash), and the optional details you add: height, weight, blood group, phone, location, and activity level. We also store the cycle, symptom, mood and notes you log, your Lunara AI chats, and your community posts and likes."],
      ["How we use it", "To run the app: show your cycle estimates and insights, answer your questions in Lunara AI, and let you post in the community. We do not sell your data."],
      ["Third-party services", "Lunara AI sends your messages, and a summary of your recent cycle data, to Google (Gemini) to generate answers. Nearby care search sends the location you choose to OpenStreetMap services (Nominatim and Overpass). Emails are sent through Resend."],
      ["Community posts", "Posts marked anonymous are not shown with your name to other users. We still link them to your account internally, for safety and so you can delete them with your account."],
      ["Your choices", "You can edit your profile, clear your cycle history and chats, and delete your account from Settings. Deleting your account removes your profile, cycles, chats, posts, likes and reviews."],
      ["Security", "Data is sent over HTTPS in production and passwords are hashed. No system is perfectly secure, so please use a strong, unique password."],
      ["Contact", "Questions about your data? Use the contact form on our home page."],
    ],
  },
  terms: {
    title: "Terms of Service",
    sections: [
      ["Not medical advice", "Lunara provides general information and estimates. It does not diagnose, treat or replace a doctor. Cycle, ovulation and fertile-window dates are estimates and must not be used as your only method of contraception. In an emergency, call your local emergency number (112 in India)."],
      ["Your account", "You are responsible for your password and for activity on your account. You must give accurate information and be old enough to use the service under the law that applies to you."],
      ["Community rules", "Be respectful. Do not post harassment, hate, spam, other people's private information, or medical misinformation. We may remove content or accounts that break these rules."],
      ["Lunara AI", "AI answers can be wrong or incomplete. Check important health decisions with a qualified professional."],
      ["Changes and termination", "We may update these terms and the service. You can delete your account at any time from Settings."],
    ],
  },
};

export default function LegalPage({ type }) {
  const page = pages[type];

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