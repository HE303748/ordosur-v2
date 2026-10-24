import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Logo } from '../components/Logo';
import {
  PRICE_MONTHLY_HT, PRICE_YEARLY_HT, TRIAL_DAYS,
  YEARLY_FREE_MONTHS, formatAmount, TRIAL_LABEL, YEARLY_DISCOUNT_LABEL,
} from '../lib/pricing';

// Fonctionnalités réellement présentes dans l'application — aucune promesse hors produit.
const FEATURES: string[] = [
  'Patients illimités',
  'Accès secrétaire (agenda, dossiers, impressions)',
  'Moteur de sécurité : interactions, contre-indications, allergies, fonction rénale',
  'Ordonnances en PDF',
  "Demandes d'examens et suivi des résultats de bilans",
  "Lettres d'adressage aux confrères",
  'Assistant IA',
];

type Periode = 'mensuel' | 'annuel';

export function PricingPage() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState<Periode>('mensuel');
  const annuel = periode === 'annuel';

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#0A1628] overflow-x-hidden">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-5">
        <button onClick={() => navigate('/')} aria-label="Accueil Ordosur">
          <Logo variant="horizontal-light" size="md" />
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-sm font-medium text-[#475569] hover:text-[#0A1628] transition-colors"
        >
          Se connecter
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mt-6 sm:mt-10 mb-8">
          <h1 className="text-[28px] sm:text-4xl font-bold tracking-tight">Une seule offre, tout inclus</h1>
          <p className="mt-3 text-[15px] text-[#475569]">
            Un tarif par médecin. {TRIAL_LABEL}, sans engagement.
          </p>
        </div>

        {/* Bascule mensuel / annuel */}
        <div className="flex justify-center mb-6">
          <div role="tablist" aria-label="Périodicité" className="inline-flex p-1 bg-white border border-[#E5E5E0] rounded-full">
            {(['mensuel', 'annuel'] as Periode[]).map(p => (
              <button
                key={p}
                role="tab"
                aria-selected={periode === p}
                onClick={() => setPeriode(p)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  periode === p ? 'bg-[#0A1628] text-white' : 'text-[#475569] hover:text-[#0A1628]'
                }`}
              >
                {p === 'mensuel' ? 'Mensuel' : (
                  <>Annuel <span className={periode === p ? 'text-white/70' : 'text-[#00A86B]'}>· {YEARLY_DISCOUNT_LABEL}</span></>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Carte unique */}
        <section className="max-w-md mx-auto bg-white border border-[#E5E5E0] rounded-2xl shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold">Ordosur</h2>
          <p className="text-sm text-[#475569] mt-1">Par médecin, toutes les fonctionnalités</p>

          <div className="mt-6 flex items-baseline flex-wrap gap-x-2">
            <span className="text-5xl font-bold tracking-tight tabular-nums">
              {formatAmount(annuel ? PRICE_YEARLY_HT : PRICE_MONTHLY_HT)}
            </span>
            <span className="text-base font-semibold">DH HT</span>
            <span className="text-base text-[#475569]">/ {annuel ? 'an' : 'mois'}</span>
          </div>
          <p className="mt-2 text-sm text-[#475569] min-h-[20px]">
            {annuel
              ? `Soit 12 mois pour le prix de ${12 - YEARLY_FREE_MONTHS} (au lieu de ${formatAmount(PRICE_MONTHLY_HT * 12)} DH HT).`
              : 'Facturation mensuelle, sans engagement.'}
          </p>
          <p className="mt-1 text-xs text-[#94A3B8]">Prix hors taxes, TVA en sus.</p>

          <button
            onClick={() => navigate('/register')}
            className="mt-6 w-full h-11 inline-flex items-center justify-center gap-2 bg-[#00A86B] hover:bg-[#006B47] text-white font-semibold rounded-md shadow-sm shadow-[#00A86B]/20 transition-colors text-sm"
          >
            Commencer l'essai gratuit
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-2 text-center text-xs text-[#475569]">
            {TRIAL_DAYS} jours gratuits, sans engagement ni carte bancaire.
          </p>

          <ul className="mt-6 pt-6 border-t border-[#E5E5E0] space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#00A86B]" strokeWidth={2.5} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-center text-sm text-[#475569]">
          Une question ?{' '}
          <a href="mailto:contact@ordosur.com" className="font-semibold text-[#00A86B] hover:text-[#006B47]">
            contact@ordosur.com
          </a>
        </p>
      </main>
    </div>
  );
}
