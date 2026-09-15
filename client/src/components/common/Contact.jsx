function Contact() {
  return (
    <section
      id="contact"
      className="bg-white px-6 py-24"
    >
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-pink-600">
            Contact us
          </p>

          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            We're here to
            <br />
            <span className="text-pink-600">
              listen.
            </span>
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-600">
            Have a question, suggestion, or simply want to reach out?
            We'd love to hear from you.
          </p>
        </div>

        {/* Contact Content */}
        <div className="mt-16 grid gap-10 lg:grid-cols-2">

          {/* Left */}
          <div className="rounded-[2rem] bg-pink-50 p-8 sm:p-10">

            <h3 className="text-2xl font-bold text-gray-900">
              Get in touch
            </h3>

            <p className="mt-3 leading-7 text-gray-600">
              Whether you have feedback about Lunara or need help with
              something, send us a message and we'll get back to you.
            </p>

            <div className="mt-10 space-y-6">

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  ✉️
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Email
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    hello@lunara.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  💬
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Support
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    We're here for you
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  🌙
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Lunara
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    Your cycle. Your story.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Right - Form */}
          <div className="rounded-[2rem] border border-pink-100 bg-white p-8 shadow-sm sm:p-10">

            <form className="space-y-6">

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Your name
                </label>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Subject
                </label>

                <input
                  id="subject"
                  type="text"
                  placeholder="How can we help?"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Message
                </label>

                <textarea
                  id="message"
                  rows="5"
                  placeholder="Write your message..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              {/* Button */}
              <button
                type="submit"
                className="w-full rounded-xl bg-pink-600 px-6 py-3.5 font-semibold text-white transition hover:bg-pink-700"
              >
                Send message
              </button>

            </form>
          </div>

        </div>
      </div>
    </section>
  );
}

export default Contact;