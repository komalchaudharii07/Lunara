import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="w-full border-b border-pink-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-xl">
            🌙
          </div>

          <span className="text-2xl font-bold tracking-tight text-gray-900">
            Lunara
          </span>
        </Link>

        {/* Navigation */}
        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-gray-600 transition hover:text-pink-600"
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className="text-sm font-medium text-gray-600 transition hover:text-pink-600"
          >
            How it works
          </a>

          <a
            href="#about"
            className="text-sm font-medium text-gray-600 transition hover:text-pink-600"
          >
            About
          </a>

          <a
            href="#contact"
            className="text-sm font-medium text-gray-600 transition hover:text-pink-600"
          >
            Contact
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-pink-600 sm:block"
          >
            Log in
          </Link>

          <Link
            to="/register"
            className="rounded-full bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-700"
          >
            Get started
          </Link>
        </div>

      </div>
    </nav>
  );
}

export default Navbar;