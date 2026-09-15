const features = [
  {
    icon: "🩸",
    title: "Period Tracking",
    description:
      "Track your periods and understand your cycle with a simple and intuitive calendar.",
  },
  {
    icon: "📊",
    title: "Cycle Insights",
    description:
      "See your cycle patterns, symptoms and trends in one clear and easy-to-understand place.",
  },
  {
    icon: "✨",
    title: "Personalized Insights",
    description:
      "Get helpful insights based on the information you choose to track.",
  },
  {
    icon: "📝",
    title: "Daily Wellness",
    description:
      "Log your mood, symptoms, pain and other daily experiences effortlessly.",
  },
  {
    icon: "🤍",
    title: "Private & Secure",
    description:
      "Your personal information should stay personal. Lunara is designed with privacy in mind.",
  },
  {
    icon: "🌸",
    title: "Made for Women",
    description:
      "A calm, supportive space designed around women's everyday health needs.",
  },
];

function Features() {
  return (
    <section
      id="features"
      className="bg-pink-50/60 px-6 py-24"
    >
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-pink-600">
            Everything you need
          </p>

          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Your health journey,
            <br />
            <span className="text-pink-600">all in one place.</span>
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-600">
            Lunara helps you understand your cycle, track how you feel,
            and build a better understanding of your body.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-pink-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-2xl transition group-hover:scale-110">
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="mt-6 text-xl font-bold text-gray-900">
                {feature.title}
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

export default Features;