import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { ProtectedRoute } from './app/providers/ProtectedRoute';
import { AppLayout } from './widgets/Layout/AppLayout';

const LoginPage = lazy(() => import('./pages/LoginPage/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/LoginPage/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const RequestResetPage = lazy(() => import('./pages/LoginPage/RequestResetPage').then((m) => ({ default: m.RequestResetPage })));
const ConfirmResetPage = lazy(() => import('./pages/LoginPage/ConfirmResetPage').then((m) => ({ default: m.ConfirmResetPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ApartmentsPage = lazy(() => import('./pages/ApartmentsPage/ApartmentsPage').then((m) => ({ default: m.ApartmentsPage })));
const ApartmentDetailPage = lazy(() => import('./pages/ApartmentDetailPage/ApartmentDetailPage').then((m) => ({ default: m.ApartmentDetailPage })));
const LeaseDetailPage = lazy(() => import('./pages/LeaseDetailPage/LeaseDetailPage').then((m) => ({ default: m.LeaseDetailPage })));
const TenantsPage = lazy(() => import('./pages/TenantsPage/TenantsPage').then((m) => ({ default: m.TenantsPage })));
const LeasesPage = lazy(() => import('./pages/LeasesPage/LeasesPage').then((m) => ({ default: m.LeasesPage })));
const RentPage = lazy(() => import('./pages/RentPage/RentPage').then((m) => ({ default: m.RentPage })));
const UtilitiesPage = lazy(() => import('./pages/UtilitiesPage/UtilitiesPage').then((m) => ({ default: m.UtilitiesPage })));
const UtilityDetailPage = lazy(() => import('./pages/UtilityDetailPage/UtilityDetailPage').then((m) => ({ default: m.UtilityDetailPage })));
const RepairsPage = lazy(() => import('./pages/RepairsPage/RepairsPage').then((m) => ({ default: m.RepairsPage })));
const RepairDetailPage = lazy(() => import('./pages/RepairDetailPage/RepairDetailPage').then((m) => ({ default: m.RepairDetailPage })));
const TenantDetailPage = lazy(() => import('./pages/TenantDetailPage/TenantDetailPage').then((m) => ({ default: m.TenantDetailPage })));
const ContractorsPage = lazy(() => import('./pages/ContractorsPage/ContractorsPage').then((m) => ({ default: m.ContractorsPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const WebhooksPage = lazy(() => import('./pages/WebhooksPage/WebhooksPage').then((m) => ({ default: m.WebhooksPage })));
const TagsPage = lazy(() => import('./pages/TagsPage/TagsPage').then((m) => ({ default: m.TagsPage })));
const AccountingPage = lazy(() => import('./pages/AccountingPage/AccountingPage').then((m) => ({ default: m.AccountingPage })));

function Loader() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<RequestResetPage />} />
        <Route path="/reset-password" element={<ConfirmResetPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/apartments" element={<ApartmentsPage />} />
            <Route path="/apartments/:id" element={<ApartmentDetailPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/tenants/:id" element={<TenantDetailPage />} />
            <Route path="/leases" element={<LeasesPage />} />
            <Route path="/leases/:id" element={<LeaseDetailPage />} />
            <Route path="/rent" element={<RentPage />} />
            <Route path="/utilities" element={<UtilitiesPage />} />
            <Route path="/utilities/:id" element={<UtilityDetailPage />} />
            <Route path="/repairs" element={<RepairsPage />} />
            <Route path="/repairs/:id" element={<RepairDetailPage />} />
            <Route path="/contractors" element={<ContractorsPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/webhooks" element={<WebhooksPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/accounting" element={<AccountingPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
