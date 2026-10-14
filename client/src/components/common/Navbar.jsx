import { useState } from "react";
import { Link } from "react-router-dom";
import { getToken } from "../../services/api";

const links = [
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["About", "#about"],
  ["Contact", "#contact"],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const loggedIn = !!getToken();

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
      >
        <Link to="/" className="font-serif text-2xl font-semibold text-pink-600">
          Lunara
        </Link>

        {/* desktop */}
        <ul className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                className="text-sm font-medium text-gray-600 transition hover:text-pink-600"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {loggedIn ? (
            <Link
              to="/dashboard"
              className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-gray-700 transition hover:text-pink-600"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        {/* mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 md:hidden"
        >
          <span className="text-2xl leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </nav>

      {/* mobile menu */}
      {open && (
        <div id="mobile-menu" className="border-t border-gray-100 bg-white px-6 py-4 md:hidden">
          <ul className="space-y-1">
            {links.map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={close}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-pink-50"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-3">
            {loggedIn ? (
              <Link
                to="/dashboard"
                onClick={close}
                className="flex-1 rounded-xl bg-pink-600 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={close}
                  className="flex-1 rounded-xl bg-pink-600 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}