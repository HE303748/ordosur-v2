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
import { DoctorDashboard } from './pages/DoctorDashboard';
import DoctorProfilePage from './pages/DoctorProfilePage';
import { ClinicAdminDashboard } from './pages/clinic/ClinicAdminDashboard';
import { DoctorManagementPage } from './pages/clinic/DoctorManagementPage';
import { ClinicStatsPage } from './pages/clinic/ClinicStatsPage';
import { ClinicSettingsPage } from './pages/clinic/ClinicSettingsPage';
import { SecretaireDashboard } from './pages/SecretaireDashboard';

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
