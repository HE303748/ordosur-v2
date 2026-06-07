import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ClinicSidebar, ClinicViewType } from '../../components/ui/ClinicSidebar';
import { TopBar } from '../../components/ui/TopBar';
import { AIChat } from '../../components/ui/AIChat';
import { ToastManager, ToastItem } from '../../components/ui/Toast';
import { useNotifications } from '../../components/ui/NotificationsPanel';
import { ClinicAgendaView } from './views/ClinicAgendaView';
import { ClinicHomeView } from './views/ClinicHomeView';
import { ClinicMedecinsView } from './views/ClinicMedecinsView';
import { ClinicPatientsView } from './views/ClinicPatientsView';
import { ClinicOrdonnancesView } from './views/ClinicOrdonnancesView';
import { ClinicStatsView } from './views/ClinicStatsView';
import { ClinicSettingsView } from './views/ClinicSettingsView';
import { ClinicNotificationsView } from './views/ClinicNotificationsView';
import { ErrorBoundary } from '../../components/ErrorBoundary';

/* ── Types ──────────────────────────────────────────────────────── */
export interface DoctorWithProfile {
  id: string;
  user_id: string;
  rpps: string | null;
  specialite: string | null;
  prenom: string;
  nom: string;
  email: string;
}

/* ── Component ──────────────────────────────────────────────────── */
export function ClinicAdminDashboard() {
  const navigate = useNavigate();
  const { user, clinicProfile, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const [activeView, setActiveView] = useState<ClinicViewType>('home');
  const [showAIChat, setShowAIChat] = useState(false);
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /* ── Toast helpers ──────────────────────────────────────────────── */
  const showToast = useCallback(
    (message: string, type: ToastItem['type'] = 'info') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts(prev => [...prev, { id, message, type }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /* ── Load doctors ───────────────────────────────────────────────── */
  const loadDoctors = useCallback(async () => {
    if (!user?.org_id) return;
    try {
      // 1. Fetch doctor rows for this org
      const { data: doctorRows, error: doctorErr } = await supabase
        .from('doctors')
        .select('id, user_id, rpps, specialite')
        .eq('org_id', user.org_id);

      if (doctorErr) {
        console.error('[ClinicAdmin] doctors query error:', doctorErr);
        return;
      }
      if (!doctorRows || doctorRows.length === 0) {
        setDoctors([]);
        return;
      }

      // 2. Fetch user_profiles for those user_ids
      const userIds = doctorRows.map(d => d.user_id).filter(Boolean);
      const { data: profiles, error: profileErr } = await supabase
        .from('user_profiles')
        .select('user_id, prenom, nom')
        .in('user_id', userIds);

      if (profileErr) {
        console.error('[ClinicAdmin] user_profiles query error:', profileErr);
      }

      // 3. Merge
      const profileMap = new Map<string, { prenom: string; nom: string }>();
      (profiles || []).forEach(p => {
        profileMap.set(p.user_id, {
          prenom: p.prenom ?? '',
          nom: p.nom ?? '',
        });
      });

      const merged: DoctorWithProfile[] = doctorRows.map(d => {
        const prof = profileMap.get(d.user_id) ?? { prenom: '', nom: '' };
        return {
          id: d.id,
          user_id: d.user_id,
          rpps: d.rpps ?? null,
          specialite: d.specialite ?? null,
          prenom: prof.prenom,
          nom: prof.nom,
          email: '',
        };
      });

      setDoctors(merged);
    } catch (err) {
      console.error('[ClinicAdmin] loadDoctors error:', err);
    }
  }, [user?.org_id]);

  /* ── Load patients count ────────────────────────────────────────── */
  const loadPatientsCount = useCallback(async () => {
    if (!user?.org_id) return;
    try {
      const { count, error } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', user.org_id);

      if (!error && count !== null) {
        setPatientsCount(count);
      }
    } catch (err) {
      console.error('[ClinicAdmin] loadPatientsCount error:', err);
    }
  }, [user?.org_id]);

  useEffect(() => {
    loadDoctors();
    loadPatientsCount();
  }, [loadDoctors, loadPatientsCount]);

  /* ── Logout ─────────────────────────────────────────────────────── */
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  /* ── Derived ────────────────────────────────────────────────────── */
  const initials = (
    `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`
  ).toUpperCase() || 'CA';

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0A0F1E] overflow-hidden font-sans">
      <ClinicSidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onAIChat={() => setShowAIChat(true)}
        onLogout={handleLogout}
        clinicName={clinicProfile?.name}
        adminInitials={initials}
        adminName={`${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim()}
        medecinsCount={doctors.length}
        patientsCount={patientsCount}
        notifCount={unreadCount}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          activeView={activeView}
          userInitials={initials}
          onNavigate={(v) => setActiveView(v as ClinicViewType)}
        />

        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0A0F1E]">
          <ErrorBoundary
            fallbackTitle="Cette vue a rencontré un problème"
            resetKey={activeView}
          >
          <AnimatePresence mode="wait">
            {activeView === 'home' && (
              <ClinicHomeView key="home" doctors={doctors} orgId={user?.org_id} />
            )}
            {activeView === 'medecins' && (
              <ClinicMedecinsView
                key="medecins"
                doctors={doctors}
                orgId={user?.org_id}
                onDoctorsChange={loadDoctors}
              />
            )}
            {activeView === 'patients' && (
              <ClinicPatientsView key="patients" orgId={user?.org_id} doctors={doctors} />
            )}
            {activeView === 'agenda' && (
              <ClinicAgendaView
                key="agenda"
                orgId={user?.org_id}
                doctors={doctors}
                showToast={showToast}
              />
            )}
            {activeView === 'ordonnances' && (
              <ClinicOrdonnancesView key="ordonnances" orgId={user?.org_id} />
            )}
            {activeView === 'stats' && (
              <ClinicStatsView key="stats" orgId={user?.org_id} doctors={doctors} />
            )}
            {activeView === 'notifications' && (
              <ClinicNotificationsView key="notifications" />
            )}
            {activeView === 'settings' && (
              <ClinicSettingsView key="settings" />
            )}
          </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>

      <AnimatePresence>
        {showAIChat && (
          <AIChat
            onClose={() => setShowAIChat(false)}
            systemPrompt={
              `Tu es un assistant intelligent pour l'administrateur de la clinique "${clinicProfile?.name || 'OrdoSur'}". ` +
              'Tu aides avec la gestion de la clinique, les statistiques, les questions médicales générales, la coordination des médecins et l\'optimisation des processus. ' +
              'Tu es concis, professionnel et orienté solutions. ' +
              "Tu rappelles que tes réponses sont indicatives et ne remplacent pas l'expertise médicale."
            }
            suggestedQuestions={[
              'Quels sont mes médecins les plus actifs ?',
              'Comment interpréter les interactions médicamenteuses ?',
              'Quels patients sont à risque élevé ?',
              "Comment optimiser l'agenda de ma clinique ?",
            ]}
            contextLabel={`Clinique ${clinicProfile?.name || ''}`}
          />
        )}
      </AnimatePresence>

      <ToastManager toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
