import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { clearToken, getCurrentUser } from "../../services/api";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // doctors get an extra "Doctor Portal" link
  useEffect(() => {
    let alive = true;
    getCurrentUser()
      .then((data) => {
        if (!alive) return;
        setIsDoctor(Boolean(data?.user?.isDoctor));
        setIsAdmin(Boolean(data?.user?.isAdmin));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // close the mobile menu with the Escape key
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    // stop the page behind the open menu from scrolling
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Cycle Tracker", path: "/tracker" },
    { label: "Daily Log", path: "/daily-log" },
    { label: "Insights", path: "/insights" },
    { label: "Lunara AI", path: "/ai-chat" },
    { label: "Community", path: "/community" },
    { label: "Doctors", path: "/doctors" },

    { label: "Appointments", path: "/appointments" },
    { label: "My Records", path: "/records" },
    { label: "Report", path: "/report" },
    ...(isDoctor ? [{ label: "Doctor Portal", path: "/doctor-portal" }] : []),
    ...(isAdmin ? [{ label: "Doctor Approvals", path: "/admin/doctors" }] : []),
  ];

  const bottomItems = [
    { label: "Profile", path: "/profile" },
    { label: "Settings", path: "/settings" },
  ];

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#fdf7f8]">
      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#f1e4e7] bg-white px-5 print:hidden lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="text-xl text-[#292331]"
        >
          ☰
        </button>

        <span className="font-serif text-xl font-semibold text-[#292331]">
          Lunara
        </span>

        <div className="h-9 w-9 rounded-full bg-[#f9dfe5]" />
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh print:hidden w-64 flex-col border-r border-[#f1e4e7] bg-white px-5 py-6 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-2">
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="font-serif text-2xl font-semibold text-[#292331]"
          >
            Lunara
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="text-gray-500 lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-medium transition ${isActive
                  ? "bg-[#fdf0f3] text-[#d97d96]"
                  : "text-gray-500 hover:bg-[#fdf7f8] hover:text-[#292331]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-[#f1e4e7] pt-5">
          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-medium transition ${isActive
                  ? "bg-[#fdf0f3] text-[#d97d96]"
                  : "text-gray-500 hover:bg-[#fdf7f8] hover:text-[#292331]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-500 transition hover:bg-[#fdf7f8] hover:text-[#292331]"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-screen lg:ml-64 print:ml-0">
        <div className="px-5 pb-10 pt-20 sm:px-8 lg:px-10 lg:pt-8">
          <Suspense
            fallback={<p role="status" className="text-sm text-gray-500">Loading...</p>}
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}