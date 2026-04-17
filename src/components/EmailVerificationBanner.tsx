import { useState, useEffect } from 'react';
import { Mail, X, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function EmailVerificationBanner() {
  const { user, resendVerificationEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // null = still checking, true = confirmed, false = not confirmed
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    const refreshUserSession = async () => {
      try {
        await supabase.auth.refreshSession();
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        setEmailConfirmed(!!freshUser?.email_confirmed_at);
      } catch (error) {
        console.error('Error refreshing session:', error);
        // On error, assume confirmed to avoid false positive banner
        setEmailConfirmed(true);
      }
    };

    refreshUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        setEmailConfirmed(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Don't render while still checking (null) or if confirmed/dismissed
  if (!user || emailConfirmed !== false || dismissed) {
    return null;
  }

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;

    setLoading(true);
    try {
      await resendVerificationEmail();
      setSent(true);
      setCooldown(60);

      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeout(() => setSent(false), 5000);
    } catch (error) {
      console.error('Error resending verification email:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <Mail className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">
              Email non vérifié
            </h3>
            <p className="text-sm text-yellow-700 mb-2">
              Veuillez vérifier votre adresse email pour accéder à toutes les fonctionnalités.
            </p>
            {sent ? (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>Email envoyé avec succès</span>
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Envoi en cours...</span>
                  </span>
                ) : cooldown > 0 ? (
                  `Renvoyer dans ${cooldown}s`
                ) : (
                  'Renvoyer l\'email de vérification'
                )}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 hover:text-yellow-800 flex-shrink-0 ml-4"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
