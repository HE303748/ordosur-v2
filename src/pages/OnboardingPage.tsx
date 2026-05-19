import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// En v2, toutes les données sont collectées lors de l'inscription.
// Cette page redirige simplement vers le dashboard approprié.

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    localStorage.removeItem('onboarding_done');
    localStorage.removeItem('onboarding_visited');

    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    if (user.role === 'doctor') {
      navigate('/doctor', { replace: true });
    } else if (user.role === 'clinic_admin') {
      navigate('/clinic/admin', { replace: true });
    } else if (user.role === 'super_admin') {
      navigate('/super-admin', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00A86B] border-t-transparent"></div>
    </div>
  );
}
