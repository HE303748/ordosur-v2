import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegistrationTypePage } from './pages/RegistrationTypePage';
import { DoctorRegistrationPage } from './pages/DoctorRegistrationPage';
import { ClinicRegistrationPage } from './pages/ClinicRegistrationPage';
import { RegistrationSuccessPage } from './pages/RegistrationSuccessPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { MandatoryPasswordResetPage } from './pages/MandatoryPasswordResetPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';

// Sprint P — tableaux de bord chargés à la demande : la page de connexion ne télécharge plus
// l'application entière.
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const DoctorProfilePage = lazy(() => import('./pages/DoctorProfilePage'));
const ClinicAdminDashboard = lazy(() => import('./pages/clinic/ClinicAdminDashboard').then(m => ({ default: m.ClinicAdminDashboard })));
const DoctorManagementPage = lazy(() => import('./pages/clinic/DoctorManagementPage').then(m => ({ default: m.DoctorManagementPage })));
const ClinicStatsPage = lazy(() => import('./pages/clinic/ClinicStatsPage').then(m => ({ default: m.ClinicStatsPage })));
const ClinicSettingsPage = lazy(() => import('./pages/clinic/ClinicSettingsPage').then(m => ({ default: m.ClinicSettingsPage })));
const SecretaireDashboard = lazy(() => import('./pages/SecretaireDashboard').then(m => ({ default: m.SecretaireDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]" role="status" aria-label="Chargement"><div className="w-8 h-8 border-2 border-[#00A86B]/30 border-t-[#00A86B] rounded-full animate-spin" /></div>}>
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationTypePage />} />
          <Route path="/register/doctor" element={<DoctorRegistrationPage />} />
          <Route path="/register/clinic" element={<ClinicRegistrationPage />} />
          <Route path="/registration-success" element={<RegistrationSuccessPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/mandatory-password-reset" element={<MandatoryPasswordResetPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

          {/* Dashboard médecin */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute requiredRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          {/* Liens directs : /doctor/patients, /doctor/checker, /doctor/ordonnances… (vue lue par useViewState) */}
          <Route
            path="/doctor/:vue"
            element={
              <ProtectedRoute requiredRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DoctorProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Dashboard clinic_admin */}
          <Route
            path="/clinic/admin"
            element={
              <ProtectedRoute requiredRole="clinic_admin">
                <ClinicAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/admin/doctors"
            element={
              <ProtectedRoute requiredRole="clinic_admin">
                <DoctorManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/admin/stats"
            element={
              <ProtectedRoute requiredRole="clinic_admin">
                <ClinicStatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinic/admin/settings"
            element={
              <ProtectedRoute requiredRole="clinic_admin">
                <ClinicSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Dashboard secrétaire */}
          <Route
            path="/secretaire"
            element={
              <ProtectedRoute requiredRole="secretaire">
                <SecretaireDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dashboard super_admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
