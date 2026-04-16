import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // [JWT] Replace with real token validation via GET /api/auth/me
  const token = localStorage.getItem('4ds_token');
  if (!token) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}
