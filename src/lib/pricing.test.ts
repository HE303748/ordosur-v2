import { describe, it, expect } from 'vitest';
import {
  PRICE_MONTHLY_HT, PRICE_YEARLY_HT, TRIAL_DAYS, TVA_RATE, YEARLY_FREE_MONTHS,
  formatAmount, MONTHLY_LABEL, YEARLY_LABEL, TRIAL_LABEL, YEARLY_DISCOUNT_LABEL, PLAN_MONTHLY_HT, ttc,
} from './pricing';

const clean = (s: string) => s.replace(/[  ]/g, ' ');

describe('pricing — offre unique', () => {
  it('montants de la décision tarifaire', () => {
    expect(PRICE_MONTHLY_HT).toBe(349);
    expect(PRICE_YEARLY_HT).toBe(3490);
    expect(TVA_RATE).toBe(0.2);
    expect(TRIAL_DAYS).toBe(30);
  });

  it("l'annuel offre exactement 2 mois", () => {
    expect(YEARLY_FREE_MONTHS).toBe(2);
    expect(clean(YEARLY_DISCOUNT_LABEL)).toBe('2 mois offerts');
  });

  it('libellés affichés', () => {
    expect(clean(MONTHLY_LABEL)).toBe('349 DH HT / mois');
    expect(clean(YEARLY_LABEL)).toBe('3 490 DH HT / an');
    expect(clean(TRIAL_LABEL)).toBe('Essai gratuit 30 jours');
  });

  it('formatage des montants', () => {
    expect(clean(formatAmount(3490))).toBe('3 490');
    expect(clean(formatAmount(290.8333))).toBe('290,83');
    expect(ttc(349)).toBe(418.8);
  });

  it('MRR : annuel ramené au mois', () => {
    expect(PLAN_MONTHLY_HT.mensuel).toBe(349);
    expect(PLAN_MONTHLY_HT.annuel).toBeCloseTo(290.83, 2);
  });
});
