function About() {
  return (
    <section
      id="about"
      className="bg-pink-50/60 px-6 py-24"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">

        {/* Left Content */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-pink-600">
            About Lunara
          </p>

          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            A little more
            <br />
            <span className="text-pink-600">
              understanding.
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            Lunara is a personal space designed to help women understand
            their menstrual cycle and everyday wellbeing.
          </p>

          <p className="mt-4 leading-7 text-gray-600">
            From tracking your periods and symptoms to understanding your
            cycle patterns, Lunara brings everything together in one
            simple and supportive experience.
          </p>

          <p className="mt-4 leading-7 text-gray-600">
            Our goal is simple — help you become more aware of your body,
            understand your patterns, and feel more confident about your
            health journey.
          </p>
        </div>

        {/* Right Content */}
        <div className="relative">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-pink-100">

            <div className="flex items-center gap-4 border-b border-pink-100 pb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-2xl">
                🌙
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Why Lunara?
                </h3>

                <p className="text-sm text-gray-500">
                  Because understanding matters.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">

              <div className="flex gap-4">
                <div className="text-xl">🌸</div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    Simple
                  </h4>

                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Easy-to-use tools without unnecessary complexity.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-xl">💗</div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    Personal
                  </h4>

                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Your experience, your data, and your journey.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-xl">🔒</div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    Privacy-focused
                  </h4>

                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Built with care for your personal health information.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default About;