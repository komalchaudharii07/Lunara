import { Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Features from "../../components/common/Features";
import HowItWorks from "../../components/common/HowItWorks";
import About from "../../components/common/About";
import Contact from "../../components/common/Contact";
import Footer from "../../components/common/Footer";
import { getToken } from "../../services/api";

function Landing() {
  const loggedIn = !!getToken();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="flex min-h-[80vh] items-center justify-center px-6">
          <div className="text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-pink-600">
              Welcome to Lunara
            </p>

            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Understand your cycle.
              <br />

              <span className="text-pink-600">
                Understand yourself.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              A simple and personal space to track your cycle, understand
              your patterns, and take better care of yourself.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={loggedIn ? "/dashboard" : "/register"}
                className="rounded-full bg-pink-600 px-7 py-3.5 font-semibold text-white transition hover:bg-pink-700"
              >
                {loggedIn ? "Go to your dashboard" : "Start your journey"}
              </Link>

              <a
                href="#features"
                className="rounded-full border border-gray-200 px-7 py-3.5 font-semibold text-gray-700 transition hover:border-pink-300 hover:text-pink-600"
              >
                Explore Lunara
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <Features />

        {/* How It Works */}
        <HowItWorks />

        {/* About */}
        <About />

        {/* Contact */}
        <Contact />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Landing;