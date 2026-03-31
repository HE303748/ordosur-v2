import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RegistrationSuccessPage } from './pages/RegistrationSuccessPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { MandatoryPasswordResetPage } from './pages/MandatoryPasswordResetPage';
import OnboardingPage from './pages/OnboardingPage';
import { ClinicDashboard } from './pages/ClinicDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import DoctorProfilePage from './pages/DoctorProfilePage';
import { ClinicAdminDashboard } from './pages/clinic/ClinicAdminDashboard';
import { DoctorManagementPage } from './pages/clinic/DoctorManagementPage';
import { ClinicStatsPage } from './pages/clinic/ClinicStatsPage';
import { ClinicSettingsPage } from './pages/clinic/ClinicSettingsPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/registration-success" element={<RegistrationSuccessPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/mandatory-password-reset" element={<MandatoryPasswordResetPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

          <Route
            path="/clinic"
            element={
              <ProtectedRoute requiredRole="clinic">
                <ClinicDashboard />
              </ProtectedRoute>
            }
          />

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

          <Route
            path="/doctor"
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
