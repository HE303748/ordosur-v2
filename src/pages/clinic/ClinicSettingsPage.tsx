import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Users, AlertTriangle, Building2 } from 'lucide-react';

interface ClinicSettings {
  id: string;
  name: string;
  adresse: string;
  telephone: string;
  siret: string;
}

export function ClinicSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState<ClinicSettings>({
    id: '',
    name: '',
    adresse: '',
    telephone: '',
    siret: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadClinicSettings();
  }, []);

  async function loadClinicSettings() {
    try {
      setLoading(true);

      const orgId = user?.org_id;
      if (!orgId) {
        setLoading(false);
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();

      if (orgError) throw orgError;

      if (org) {
        setSettings({
          id: org.id,
          name: org.name || '',
          adresse: org.adresse || '',
          telephone: org.telephone || '',
          siret: org.siret || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading clinic settings:', error);
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: settings.name,
          adresse: settings.adresse,
          telephone: settings.telephone,
          siret: settings.siret || null,
        })
        .eq('id', settings.id);

      if (updateError) throw updateError;

      setSuccess('Paramètres enregistrés avec succès');
    } catch (error: any) {
      setError(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFAF7] via-white to-[#E6F4EE]">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white border-r border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => navigate('/clinic/admin')}
              className="flex items-center gap-3 w-full"
            >
              <div className="w-10 h-10 bg-gradient-to-br [#00A86B] rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-gray-900">Ma Clinique</h2>
                <p className="text-xs text-gray-500">Administration</p>
              </div>
            </button>
          </div>

          <nav className="p-4">
            <div className="space-y-1">
              <button
                onClick={() => navigate('/clinic/admin')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Tableau de bord</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/doctors')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span>Médecins</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/stats')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Statistiques</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/settings')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-blue-50 text-blue-700 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Paramètres</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres de la clinique</h1>
              <p className="text-gray-600">Gérez les informations de votre clinique</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-800">{success}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Informations générales</h2>
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <Input
                      label="Nom de la clinique"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      required
                    />

                    <Input
                      label="Adresse"
                      value={settings.adresse}
                      onChange={(e) => setSettings({ ...settings, adresse: e.target.value })}
                    />

                    <Input
                      label="Téléphone"
                      type="tel"
                      value={settings.telephone}
                      onChange={(e) => setSettings({ ...settings, telephone: e.target.value })}
                    />

                    <Input
                      label="SIRET"
                      value={settings.siret}
                      onChange={(e) => setSettings({ ...settings, siret: e.target.value })}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" loading={saving}>
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-xl font-bold text-red-900 mb-2">Zone dangereuse</h2>
                      <p className="text-red-700 mb-4">
                        Les actions suivantes sont irréversibles. Procédez avec prudence.
                      </p>
                    </div>
                  </div>
                  <Button variant="secondary" disabled className="bg-red-600 text-white hover:bg-red-700">
                    Désactiver la clinique
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
