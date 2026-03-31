import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  role: 'doctor' | 'clinic' | 'clinic_admin' | 'admin' | 'user';
  full_name: string;
  account_status: 'pending' | 'active' | 'suspended';
  email_confirmed: boolean;
  clinic_id?: string | null;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  medical_license_number: string;
  specialization: string[];
  rpps_number: string;
  phone_number: string;
}

export interface ClinicProfile {
  id: string;
  user_id: string;
  clinic_name: string;
  business_registration_number: string;
  address_street: string;
  address_city: string;
  address_postal_code: string;
  address_country: string;
  primary_contact_name: string;
  phone_number: string;
}

interface AuthContextType {
  user: UserProfile | null;
  doctorProfile: DoctorProfile | null;
  clinicProfile: ClinicProfile | null;
  loading: boolean;
  requiresPasswordReset: boolean;
  signUp: (email: string, password: string, role: 'doctor' | 'clinic', profileData: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  checkAccountLock: (email: string) => Promise<{ isLocked: boolean; lockedUntil: string | null; attemptsCount: number }>;
  checkMandatoryPasswordReset: (userId: string) => Promise<{ requiresReset: boolean; reason: string | null; expiresAt: string | null }>;
  completeMandatoryPasswordReset: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let hasRedirectedToOnboarding = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH CONTEXT] Auth state change event:', event);

      // CRITICAL: Handle PASSWORD_RECOVERY event FIRST before any other event
      // When ConfirmationURL is used, Supabase automatically establishes the session
      // before firing the PASSWORD_RECOVERY event
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[PASSWORD_RECOVERY] Event detected');

        // Store recovery session tokens in localStorage so they survive page reload
        if (session && session.access_token && session.refresh_token) {
          console.log('[PASSWORD_RECOVERY] Storing recovery session tokens');
          localStorage.setItem('recovery_access_token', session.access_token);
          localStorage.setItem('recovery_refresh_token', session.refresh_token);
          localStorage.setItem('recovery_timestamp', Date.now().toString());
        }

        // Force full page reload to /reset-password to ensure proper auth state
        console.log('[PASSWORD_RECOVERY] Redirecting to /reset-password');
        window.location.replace('/reset-password');
        return;
      }

      (async () => {
        if (event === 'SIGNED_IN' && session) {
          const user = session.user;
          const confirmedAt = user.email_confirmed_at;
          const createdAt = user.created_at;

          if (confirmedAt && createdAt) {
            const confirmTime = new Date(confirmedAt).getTime();
            const createTime = new Date(createdAt).getTime();

            const freshConfirmation = (confirmTime - createTime) < 5 * 60 * 1000;
            const onboardingDone = localStorage.getItem('onboarding_done');

            if (freshConfirmation && !onboardingDone && !hasRedirectedToOnboarding) {
              hasRedirectedToOnboarding = true;
              localStorage.setItem('onboarding_done', 'true');
              console.log('[AUTH] User just confirmed email for first time, redirecting to onboarding');
              window.location.replace('/onboarding');
              return;
            }
          }

          await loadUserProfile(session.user.id);
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
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          full_name: profile.full_name,
          account_status: profile.account_status,
          email_confirmed: profile.email_confirmed,
          clinic_id: profile.clinic_id,
        });

        if (profile.role === 'doctor') {
          const { data: doctorData } = await supabase
            .from('doctor_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (doctorData) {
            setDoctorProfile(doctorData);
          }
        } else if (profile.role === 'clinic') {
          const { data: clinicData } = await supabase
            .from('clinic_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (clinicData) {
            setClinicProfile(clinicData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  const signUp = async (
    email: string,
    password: string,
    role: 'doctor' | 'clinic',
    profileData: any
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: profileData.full_name || profileData.clinic_name,
            role: role,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      const userId = authData.user.id;

      if (role === 'doctor') {
        const { error: profileError } = await supabase
          .from('doctor_profiles')
          .update({
            full_name: profileData.full_name,
            medical_license_number: profileData.medical_license_number,
            specialization: profileData.specialization,
            rpps_number: profileData.rpps_number,
            phone_number: profileData.phone_number,
          })
          .eq('user_id', userId);

        if (profileError) {
          console.error('Error updating doctor profile:', profileError);
          throw new Error('Erreur lors de la création du profil médecin');
        }
      } else if (role === 'clinic') {
        const { error: profileError } = await supabase
          .from('clinic_profiles')
          .update({
            clinic_name: profileData.clinic_name,
            business_registration_number: profileData.business_registration_number,
            address_street: profileData.address_street,
            address_city: profileData.address_city,
            address_postal_code: profileData.address_postal_code,
            address_country: profileData.address_country,
            primary_contact_name: profileData.primary_contact_name,
            phone_number: profileData.phone_number,
          })
          .eq('user_id', userId);

        if (profileError) {
          console.error('Error updating clinic profile:', profileError);
          throw new Error('Erreur lors de la création du profil clinique');
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const lockStatus = await checkAccountLock(email);

      if (lockStatus.isLocked) {
        throw new Error(`Compte verrouillé jusqu'à ${new Date(lockStatus.lockedUntil!).toLocaleTimeString('fr-FR')}`);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await supabase.rpc('record_login_attempt', {
          user_email: email,
          attempt_success: false,
        });

        await supabase.rpc('log_auth_event', {
          log_user_id: null,
          log_email: email,
          log_event_type: 'login_failure',
          log_success: false,
          log_failure_reason: error.message,
        });

        throw error;
      }

      if (data.user) {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser && !authUser.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error('email_not_verified');
        }

        await supabase.rpc('record_login_attempt', {
          user_email: email,
          attempt_success: true,
        });

        const resetStatus = await checkMandatoryPasswordReset(data.user.id);

        if (resetStatus.requiresReset) {
          setRequiresPasswordReset(true);

          await supabase.rpc('mark_temporary_password_used', {
            use_user_id: data.user.id,
          });

          await supabase.rpc('log_auth_event', {
            log_user_id: data.user.id,
            log_email: email,
            log_event_type: 'login_success',
            log_success: true,
            log_details: {
              requires_password_reset: true,
              reset_reason: resetStatus.reason,
            },
          });

          await loadUserProfile(data.user.id);
          return;
        }

        await supabase.rpc('log_auth_event', {
          log_user_id: data.user.id,
          log_email: email,
          log_event_type: 'login_success',
          log_success: true,
        });

        await loadUserProfile(data.user.id);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setDoctorProfile(null);
      setClinicProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const resendVerificationEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('[PASSWORD RESET] redirectTo configured as:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('[PASSWORD RESET] Supabase error:', error);
        throw error;
      }

      console.log('[PASSWORD RESET] Email sent successfully. Check inbox for recovery link.');
    } catch (error) {
      console.error('[PASSWORD RESET] Request error:', error);
      throw error;
    }
  };

  const checkAccountLock = async (email: string): Promise<{ isLocked: boolean; lockedUntil: string | null; attemptsCount: number }> => {
    try {
      const { data, error } = await supabase.rpc('check_account_locked', {
        user_email: email,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return {
          isLocked: data[0].is_locked,
          lockedUntil: data[0].locked_until,
          attemptsCount: data[0].attempts_count,
        };
      }

      return { isLocked: false, lockedUntil: null, attemptsCount: 0 };
    } catch (error) {
      console.error('Error checking account lock:', error);
      return { isLocked: false, lockedUntil: null, attemptsCount: 0 };
    }
  };

  const checkMandatoryPasswordReset = async (userId: string): Promise<{ requiresReset: boolean; reason: string | null; expiresAt: string | null }> => {
    try {
      const { data, error } = await supabase.rpc('check_mandatory_password_reset', {
        check_user_id: userId,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return {
          requiresReset: data[0].requires_reset || false,
          reason: data[0].reason || null,
          expiresAt: data[0].expires_at || null,
        };
      }

      return { requiresReset: false, reason: null, expiresAt: null };
    } catch (error) {
      console.error('Error checking mandatory password reset:', error);
      return { requiresReset: false, reason: null, expiresAt: null };
    }
  };

  const completeMandatoryPasswordReset = async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc('complete_mandatory_password_reset', {
        reset_user_id: userId,
      });

      if (error) throw error;

      setRequiresPasswordReset(false);
    } catch (error) {
      console.error('Error completing mandatory password reset:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      doctorProfile,
      clinicProfile,
      loading,
      requiresPasswordReset,
      signUp,
      signIn,
      signOut,
      resendVerificationEmail,
      requestPasswordReset,
      checkAccountLock,
      checkMandatoryPasswordReset,
      completeMandatoryPasswordReset,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
