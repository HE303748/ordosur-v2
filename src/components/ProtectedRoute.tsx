import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AppRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'secretaire';

const ROLE_HOME: Record<string, string> = {
  super_admin: '/admin',
  clinic_admin: '/clinic/admin',
  doctor: '/doctor',
  secretaire: '/secretaire',
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
}

function SuspendedScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-4 font-sans">
      <div className="w-full max-w-md text-center bg-white border border-[#E5E5E0] rounded-2xl shadow-sm p-8">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#FEF2F2] flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-[#DC2626]" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-bold text-[#0A1628] mb-2 tracking-tight">Compte suspendu</h1>
        <p className="text-sm leading-relaxed text-[#475569] mb-5">
          L'accès à votre cabinet a été suspendu. Contactez le support Ordosur pour demander une réactivation.
        </p>
        <a
          href="mailto:support@ordosur.com"
          className="block mb-5 text-sm font-medium text-[#00A86B] hover:text-[#006B47] transition-colors"
        >
          support@ordosur.com
        </a>
        <button
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E5E5E0] text-[#0A1628] hover:border-[#0A1628] active:bg-[#FAFAF7] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, orgStatus, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
        <div className="w-6 h-6 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  // super_admin redirigé vers /admin s'il tente d'accéder à une route non-admin
  if (user.role === 'super_admin' && requiredRole !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  // Mauvais rôle → redirige vers le bon dashboard (pas de page "accès refusé")
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={ROLE_HOME[user.role] ?? '/'} replace />;
  }

  // Org suspendue — jamais applicable au super_admin
  if (orgStatus === 'suspended' && user.role !== 'super_admin') {
    return <SuspendedScreen onLogout={signOut} />;
  }

  return <>{children}</>;
}
