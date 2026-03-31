import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

const SPECIALTIES = [
  'Médecin généraliste',
  'Cardiologue',
  'Pédiatre',
  'Chirurgien',
  'Pharmacien',
  'Dermatologue',
  'Ophtalmologue',
  'Gynécologue',
  'Psychiatre',
  'Radiologue',
  'Autre',
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    specialty: '',
    rppsNumber: '',
    clinicName: '',
  });

  useEffect(() => {
    localStorage.setItem('onboarding_visited', 'true');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        setError('Profil utilisateur introuvable.');
        setLoading(false);
        return;
      }

      // Update the appropriate profile table based on role
      if (profile.role === 'doctor') {
        const updateData: {
          specialization?: string[];
          rpps_number?: string;
        } = {};

        if (formData.specialty) {
          updateData.specialization = [formData.specialty];
        }
        if (formData.rppsNumber) {
          updateData.rpps_number = formData.rppsNumber;
        }

        const { error: updateError } = await supabase
          .from('doctor_profiles')
          .update(updateData)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('[ONBOARDING] Error updating doctor profile:', updateError);
          setError('Erreur lors de la sauvegarde de vos informations.');
          setLoading(false);
          return;
        }
      } else if (profile.role === 'clinic') {
        const updateData: {
          clinic_name?: string;
        } = {};

        if (formData.clinicName) {
          updateData.clinic_name = formData.clinicName;
        }

        const { error: updateError } = await supabase
          .from('clinic_profiles')
          .update(updateData)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('[ONBOARDING] Error updating clinic profile:', updateError);
          setError('Erreur lors de la sauvegarde de vos informations.');
          setLoading(false);
          return;
        }
      }

      console.log('[ONBOARDING] Profile updated successfully');
      localStorage.setItem('onboarding_done', 'true');
      localStorage.removeItem('onboarding_visited');
      navigate('/clinic');
    } catch (err) {
      console.error('[ONBOARDING] Unexpected error:', err);
      setError('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_done', 'true');
    localStorage.removeItem('onboarding_visited');
    navigate('/clinic');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Bienvenue sur OrdoSur
            </h1>
            <p className="text-slate-600">
              Personnalisez votre profil pour commencer
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="specialty" className="block text-sm font-medium text-slate-700 mb-2">
                Spécialité
              </label>
              <select
                id="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="">Sélectionnez votre spécialité</option>
                {SPECIALTIES.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rppsNumber" className="block text-sm font-medium text-slate-700 mb-2">
                Numéro RPPS <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <Input
                id="rppsNumber"
                type="text"
                value={formData.rppsNumber}
                onChange={(e) => setFormData({ ...formData, rppsNumber: e.target.value })}
                placeholder="Ex: 10001234567"
                maxLength={11}
              />
            </div>

            <div>
              <label htmlFor="clinicName" className="block text-sm font-medium text-slate-700 mb-2">
                Établissement <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <Input
                id="clinicName"
                type="text"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                placeholder="Nom de votre clinique ou hôpital"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Passer
              </button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    Commencer
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-slate-600 mt-6">
          Vous pourrez modifier ces informations plus tard dans votre profil
        </p>
      </div>
    </div>
  );
}
