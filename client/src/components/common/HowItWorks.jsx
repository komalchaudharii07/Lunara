const steps = [
  {
    number: "01",
    icon: "🩸",
    title: "Track your cycle",
    description:
      "Log your periods, symptoms, mood and how you feel throughout your cycle.",
  },
  {
    number: "02",
    icon: "🔍",
    title: "Understand your patterns",
    description:
      "Lunara helps you see your cycle patterns and understand changes over time.",
  },
  {
    number: "03",
    icon: "🌸",
    title: "Take better care",
    description:
      "Use your insights to become more aware of your body and make informed choices.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-white px-6 py-24"
    >
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-pink-600">
            How it works
          </p>

          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple steps.
            <br />
            <span className="text-pink-600">
              Better understanding.
            </span>
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-600">
            Lunara makes it easy to build a clearer picture of your
            cycle and everyday wellbeing.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16 grid gap-8 md:grid-cols-3">

          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-3xl border border-pink-100 bg-pink-50/50 p-8 text-center transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Number */}
              <div className="absolute right-6 top-5 text-sm font-bold text-pink-200">
                {step.number}
              </div>

              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
                {step.icon}
              </div>

              <h3 className="mt-7 text-xl font-bold text-gray-900">
                {step.title}
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                {step.description}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}

export default HowItWorks;