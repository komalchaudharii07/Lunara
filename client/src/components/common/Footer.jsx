import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="border-t border-pink-100 bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-xl">
                🌙
              </div>

              <span className="text-2xl font-bold tracking-tight">
                Lunara
              </span>
            </div>

            <p className="mt-5 max-w-md leading-7 text-gray-400">
              A simple and personal space to track your cycle, understand
              your patterns, and take better care of yourself.
            </p>

            <p className="mt-6 text-sm text-gray-500">
              Your cycle. Your story.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Explore
            </h3>

            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href="#features"
                  className="text-sm text-gray-400 transition hover:text-pink-400"
                >
                  Features
                </a>
              </li>

              <li>
                <a
                  href="#how-it-works"
                  className="text-sm text-gray-400 transition hover:text-pink-400"
                >
                  How it works
                </a>
              </li>

              <li>
                <a
                  href="#about"
                  className="text-sm text-gray-400 transition hover:text-pink-400"
                >
                  About Lunara
                </a>
              </li>

              <li>
                <a
                  href="#contact"
                  className="text-sm text-gray-400 transition hover:text-pink-400"
                >
                  Contact us
                </a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Account
            </h3>

            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  to="/login"
                  className="text-sm text-gray-400 transition hover:text-pink-400"
                >
                  Log in
                </Link>
              </li>

              <li>
                <Link
                  to="/register"
                  className="text-sm text-gray-400 transition hover:text-pink-400"
                >
                  Create account
                </Link>
              </li>

              <li>
                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-400 transition hover:text-pink-400"
                >
                  Forgot password
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-14 flex flex-col gap-4 border-t border-gray-800 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Lunara. All rights reserved.
          </p>

          <div className="flex gap-6">
            <Link
              to="/privacy"
              className="text-sm text-gray-500 transition hover:text-pink-400"
            >
              Privacy Policy
            </Link>

            <Link
              to="/terms"
              className="text-sm text-gray-500 transition hover:text-pink-400"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;