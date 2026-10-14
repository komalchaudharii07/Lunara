import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../../services/api";

// pages that need a login
export default function ProtectedRoute() {
  const location = useLocation();

  if (!getToken()) {
    // remember where the user was going, so Login can send them back
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

// login / register: someone who is already logged in goes to the dashboard
export function PublicOnlyRoute() {
  if (getToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}