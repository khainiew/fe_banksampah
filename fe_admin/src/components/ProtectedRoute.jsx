import { Navigate } from "react-router-dom";
import { getAdminToken } from "../api";

export default function ProtectedRoute({ children }) {
  const token = getAdminToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}