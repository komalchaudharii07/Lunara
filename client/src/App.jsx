import { BrowserRouter, Routes, Route } from "react-router-dom";

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
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Dashboard Layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route
            path="/profile"
            element={<Profile />}
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/community" element={<Community />} />
          <Route path="/doctors" element={<Doctors />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;