import { describe, it, expect } from 'vitest';
import { analysisIndicatorState, INDICATOR_LABELS } from './AnalysisIndicator';

describe('indicateur d’analyse à côté du champ de recherche', () => {
  const verdict = { severity: 'dangerous' as const, title: 'Prescription à risque' };

  it('sans patient ou sans médicament : rien', () => {
    expect(analysisIndicatorState({ hasPatient: false, medCount: 2, failed: false, verdict: null }).kind).toBe('hidden');
    expect(analysisIndicatorState({ hasPatient: true, medCount: 0, failed: false, verdict: null }).kind).toBe('hidden');
    // Jamais de pastille sans patient, même si un verdict traîne.
    expect(analysisIndicatorState({ hasPatient: false, medCount: 1, failed: false, verdict }).kind).toBe('hidden');
  });
  it('médicament ajouté, pas encore de verdict : « Analyse… »', () => {
    expect(analysisIndicatorState({ hasPatient: true, medCount: 1, failed: false, verdict: null }).kind).toBe('running');
  });
  it('analyse en échec : signalée, jamais de pastille de verdict', () => {
    expect(analysisIndicatorState({ hasPatient: true, medCount: 1, failed: true, verdict: null }).kind).toBe('failed');
  });
  it('verdict établi : pastille de SON niveau (repris tel quel, rien n’est recalculé)', () => {
    expect(analysisIndicatorState({ hasPatient: true, medCount: 2, failed: false, verdict }))
      .toEqual({ kind: 'verdict', severity: 'dangerous', title: 'Prescription à risque' });
  });
  it('un libellé court par niveau', () => {
    expect(Object.keys(INDICATOR_LABELS).sort()).toEqual(['attention', 'conditional', 'dangerous', 'safe']);
  });
});
