import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Organization, Doctor } from '../lib/supabase';

// ─── TYPES EXPORTÉS ──────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;       // auth.users uuid
  email: string;
  role: 'super_admin' | 'clinic_admin' | 'doctor' | 'secretaire';
  prenom: string;
  nom: string;
  full_name: string; // prenom + ' ' + nom (compat)
  org_id: string;
}

// DoctorProfile enrichi avec champs de compat pour les composants existants
export interface DoctorProfileContext extends Doctor {
  full_name: string | null;        // prenom + ' ' + nom depuis user_profiles
  specialization: string[] | null; // [specialite] pour compat
}

export type ClinicProfileContext = Organization;

interface SignUpProfileData {
  prenom: string;
  nom: string;
  org_name: string;
  org_type: 'cabinet' | 'clinique';
  adresse?: string;
  telephone?: string;
  rpps?: string;
  specialite?: string;
  ordre_number?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  doctorProfile: DoctorProfileContext | null;
  clinicProfile: ClinicProfileContext | null;
  loading: boolean;
  requiresPasswordReset: boolean; // toujours false en v2 (compat ProtectedRoute)
  signUp: (
    email: string,
    password: string,
    role: 'doctor' | 'clinic_admin',
    profileData: SignUpProfileData
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

// ─── CONTEXTE ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileContext | null>(null);
  const [clinicProfile, setClinicProfile] = useState<ClinicProfileContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] State change:', event);

      if (event === 'PASSWORD_RECOVERY') {
        // Stocker les tokens et rediriger vers reset-password
        if (session?.access_token && session?.refresh_token) {
          localStorage.setItem('recovery_access_token', session.access_token);
          localStorage.setItem('recovery_refresh_token', session.refresh_token);
          localStorage.setItem('recovery_timestamp', Date.now().toString());
        }
        window.location.replace('/reset-password');
        return;
      }

      (async () => {
        if (event === 'SIGNED_IN' && session) {
          await loadUserProfile(session.user.id, session.user.email ?? '');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setDoctorProfile(null);
          setClinicProfile(null);
        }
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.email ?? '');
      }
    } catch (error) {
      console.error('[AUTH] checkUser error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(userId: string, email: string) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AUTH] loadUserProfile error:', error);
        return;
      }

      if (!profile) {
        console.warn('[AUTH] Aucun profil trouvé pour userId:', userId);
        return;
      }

      const authUser: AuthUser = {
        id: userId,
        email,
        role: profile.role,
        prenom: profile.prenom ?? '',
        nom: profile.nom ?? '',
        full_name: `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim(),
        org_id: profile.org_id,
      };
      setUser(authUser);

      // Charger le profil médecin si rôle doctor
      if (profile.role === 'doctor') {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (doctorData) {
          setDoctorProfile({
            ...doctorData,
            full_name: authUser.full_name,
            specialization: doctorData.specialite ? [doctorData.specialite] : null,
          });
        }
      }

      // Charger l'organisation pour tous les rôles (nécessaire pour les ordonnances PDF)
      if (profile.org_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.org_id)
          .maybeSingle();

        if (orgData) {
          setClinicProfile(orgData);
        }
      }
    } catch (error) {
      console.error('[AUTH] Erreur loadUserProfile:', error);
    }
  }

  // ─── INSCRIPTION ───────────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    role: 'doctor' | 'clinic_admin',
    profileData: SignUpProfileData
  ) => {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role,
          prenom: profileData.prenom,
          nom: profileData.nom,
          org_name: profileData.org_name,
          org_type: profileData.org_type,
        },
      },
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Erreur lors de la création du compte');

    const userId = authData.user.id;

    // Utilise un RPC SECURITY DEFINER pour créer org + profil + médecin en un appel sécurisé.
    // Contourne le RLS (qui bloquerait les inserts anonymes) sans exposer la service_role key.
    const { error: rpcError } = await supabase.rpc('complete_signup', {
      p_user_id:      userId,
      p_role:         role,
      p_prenom:       profileData.prenom,
      p_nom:          profileData.nom,
      p_org_name:     profileData.org_name,
      p_org_type:     profileData.org_type,
      p_email:        email,
      p_adresse:      profileData.adresse     ?? null,
      p_telephone:    profileData.telephone   ?? null,
      p_rpps:         profileData.rpps        ?? null,
      p_specialite:   profileData.specialite  ?? null,
      p_ordre_number: profileData.ordre_number ?? null,
    });

    if (rpcError) {
      console.error('[AUTH] Erreur complete_signup RPC:', rpcError);
      throw new Error('Erreur lors de la création de votre compte. Veuillez réessayer.');
    }
  };

  // ─── CONNEXION ─────────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[AUTH] Erreur connexion:', error);
      throw error;
    }

    if (data.user) {
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        throw new Error('email_not_verified');
      }

      // Log this session (fire-and-forget — don't block login on failure)
      supabase.from('user_sessions').insert({
        user_id:    data.user.id,
        user_agent: navigator.userAgent,
        ip_address: null, // Not available client-side
      }).then(({ error: sessionErr }) => {
        if (sessionErr) console.warn('[AUTH] Session log error:', sessionErr);
      });

      await loadUserProfile(data.user.id, data.user.email ?? '');
    }
  };

  // ─── DÉCONNEXION ───────────────────────────────────────────────────────────

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDoctorProfile(null);
    setClinicProfile(null);
  };

  // ─── UTILITAIRES AUTH ──────────────────────────────────────────────────────

  const resendVerificationEmail = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser?.email) throw new Error('Aucun email associé à ce compte');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: currentUser.email,
    });
    if (error) throw error;
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        doctorProfile,
        clinicProfile,
        loading,
        requiresPasswordReset: false,
        signUp,
        signIn,
        signOut,
        resendVerificationEmail,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
