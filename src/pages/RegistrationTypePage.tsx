import { useNavigate } from 'react-router-dom';
import { Building2, Stethoscope, Heart, ArrowLeft } from 'lucide-react';

export function RegistrationTypePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0A1628] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-lg rounded-xl">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">OrdoSur</h1>
          </div>
          <p className="text-white/90 text-lg">
            Rejoignez la plateforme médicale la plus avancée
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/80 text-sm">
            Déjà inscrit ?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-white font-semibold hover:underline"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à la connexion</span>
          </button>

          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-[#E6F4EE] rounded-xl">
                <Heart className="w-8 h-8 text-[#00A86B]" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">OrdoSur</h1>
            </div>
          </div>

          <div className="glass-effect rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte</h2>
            <p className="text-gray-600 mb-8">Choisissez le type de compte que vous souhaitez créer</p>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/register/doctor')}
                className="w-full p-6 bg-[#00A86B] text-white rounded-2xl hover:bg-[#006B47] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                      <Stethoscope className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-semibold">Compte Médecin</h3>
                      <p className="text-white/80 text-sm">Pour les professionnels de santé</p>
                    </div>
                  </div>
                  <div className="text-3xl">→</div>
                </div>
              </button>

              <button
                onClick={() => navigate('/register/clinic')}
                className="w-full p-6 bg-[#00A86B] text-white rounded-2xl hover:bg-[#006B47] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-semibold">Compte Clinique</h3>
                      <p className="text-white/80 text-sm">Pour les établissements de santé</p>
                    </div>
                  </div>
                  <div className="text-3xl">→</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
