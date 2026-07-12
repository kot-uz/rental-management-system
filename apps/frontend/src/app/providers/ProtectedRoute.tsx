import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../shared/hooks/useAppSelector';

export function ProtectedRoute() {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  // No token → back to the auth page.
  if (!accessToken) return <Navigate to="/" replace state={{ auth: 'login' }} />;
  return <Outlet />;
}
