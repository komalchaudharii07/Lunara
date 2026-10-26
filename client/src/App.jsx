import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import ProtectedRoute, { PublicOnlyRoute } from "./components/auth/ProtectedRoute";

import Landing from "./pages/Landing/Landing";
import Login from "./pages/Auth/Login/Login";
import Register from "./pages/Auth/Register/Register";
import DoctorRegister from "./pages/Auth/DoctorRegister/DoctorRegister";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword/ResetPassword";
import LegalPage from "./pages/Legal/LegalPage";
import Onboarding from "./pages/Onboarding/Onboarding";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";

// dashboard pages load only when opened (keeps the first download small)
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Tracker = lazy(() => import("./pages/Tracker/Tracker"));
const DailyLog = lazy(() => import("./pages/DailyLog/DailyLog"));
const Insights = lazy(() => import("./pages/Insights/Insights"));
const AIChat = lazy(() => import("./pages/AIChat/AIChat"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Community = lazy(() => import("./pages/Community/Community"));
const Doctors = lazy(() => import("./pages/Doctors/Doctors"));
const Appointments = lazy(() => import("./pages/Appointments/MyAppointments"));
// adjust these three import paths to where your files really are
const BookAppointment = lazy(() => import("./pages/Appointments/BookAppointment"));
const DoctorPortal = lazy(() => import("./pages/Appointments/DoctorPortal"));
const Report = lazy(() => import("./pages/Reports/Report"));
const PrescriptionPage = lazy(() => import("./pages/Prescription/PrescriptionPage"));
const AdminDoctors = lazy(() => import("./pages/Admin/AdminDoctors"));

function Loading() {
  return (
    <div role="status" className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdf7f8] px-6 text-center">
      <h1 className="font-serif text-5xl font-semibold text-[#292331]">404</h1>
      <p className="mt-3 text-sm text-gray-500">We couldn't find that page.</p>
      <Link to="/" className="mt-6 rounded-xl bg-[#e58da4] px-5 py-3 text-sm font-semibold text-white">
        Back to Lunara
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />

          {/* Logged-in users are sent to the dashboard */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/doctor" element={<DoctorRegister />} />
          </Route>

          {/* Protected routes: require a token */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />

            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/daily-log" element={<DailyLog />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/community" element={<Community />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/doctors/:id/book" element={<BookAppointment />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/appointments/:id/prescription" element={<PrescriptionPage />} />
              <Route path="/doctor-portal" element={<DoctorPortal />} />
              <Route path="/report" element={<Report />} />
              <Route path="/admin/doctors" element={<AdminDoctors />} />
            </Route>
          </Route>

          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;