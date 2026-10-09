import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";


import Landing from "./pages/Landing/Landing";
import Login from "./pages/Auth/Login/Login";
import Register from "./pages/Auth/Register/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";
import Onboarding from "./pages/Onboarding/Onboarding";
import Dashboard from "./pages/Dashboard/Dashboard";
import Tracker from "./pages/Tracker/Tracker";
import Insights from "./pages/Insights/Insights";
import AIChat from "./pages/AIChat/AIChat";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import Profile from "./pages/Profile/Profile";
import Settings from "./pages/Settings/Settings";
import Community from "./pages/Community/Community";
import Doctors from "./pages/Doctors/Doctors";
import ResetPassword from "./pages/Auth/ResetPassword/ResetPassword";
import LegalPage from "./pages/Legal/LegalPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
<Route path="/" element={<Landing />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password/:token" element={<ResetPassword />} />


<Route path="/privacy" element={<LegalPage type="privacy" />} />
<Route path="/terms" element={<LegalPage type="terms" />} />

        {/* Protected routes: require a token */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/community" element={<Community />} />
            <Route path="/doctors" element={<Doctors />} />
          </Route>
        </Route>

        {/* Unknown URLs go home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;