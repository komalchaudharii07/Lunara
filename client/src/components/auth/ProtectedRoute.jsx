import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}