import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Log full URL for debugging
        console.log('[AUTH CALLBACK] Full URL:', window.location.href);
        console.log('[AUTH CALLBACK] Search:', location.search);
        console.log('[AUTH CALLBACK] Hash:', location.hash);

        // Parse recovery type from URL
        const params = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.slice(1));

        const type = params.get('type') || hashParams.get('type');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');

        console.log('[AUTH CALLBACK] Detected type:', type);
        console.log('[AUTH CALLBACK] Error param:', errorParam);

        // Handle Supabase errors
        if (errorParam) {
          console.error('[AUTH CALLBACK] Auth error:', errorDescription);
          setError(errorDescription || 'Une erreur est survenue');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 3000);
          return;
        }

        // Wait for Supabase to process the token and create session
        // The auth link contains access_token in hash which Supabase processes automatically
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AUTH CALLBACK] Session exists:', !!session);
        if (session) {
          console.log('[AUTH CALLBACK] Session user ID:', session.user?.id);
        }

        // Route based on recovery type
        if (type === 'recovery') {
          console.log('[AUTH CALLBACK] Recovery detected - redirecting to /reset-password');
          navigate('/reset-password', { replace: true });
        } else if (type === 'signup' || type === 'email_change') {
          console.log('[AUTH CALLBACK] Signup/email_change detected');
          // Wait for session to be fully established before redirecting
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.location.href = '/';
        } else if (type === 'magiclink') {
          console.log('[AUTH CALLBACK] Magic link detected');
          navigate('/', { replace: true });
        } else {
          console.log('[AUTH CALLBACK] No type detected - defaulting to login');
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        console.error('[AUTH CALLBACK] Callback error:', err);
        setError('Une erreur est survenue lors du traitement du lien');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [location, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-error-600 mb-2">Erreur</h2>
            <p className="text-neutral-600 mb-4">{error}</p>
            <p className="text-sm text-neutral-500">Redirection en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-neutral-600">Traitement du lien...</p>
      </div>
    </div>
  );
}
