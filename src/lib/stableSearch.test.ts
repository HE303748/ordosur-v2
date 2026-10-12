import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { searchKey, needsSearch, pickById, resolveActiveKey, moveActiveKey, indexOfKey } from './stableSearch';
import { dedupeMedicaments, dedupKey, type DedupMed } from './medDedupe';
import { medLabel, extractDosage } from './medLabel';

// Sprint 2c — l'élément ajouté est TOUJOURS celui qui est affiché sous le pointeur ou la sélection clavier.

// Fiches 🇲🇦 réelles renvoyées par search_medicaments('glucophage') le 12/10/2026 (ordre de la RPC).
const GLUCOPHAGE: DedupMed[] = [
  { id: '5ceb', nom: 'GLUCOPHAGE 1000', nom_commercial: 'GLUCOPHAGE 1000', dci: 'METFORMINE', forme: 'COMPRIME PELLICULE', dosage: '850   MG', laboratoire: 'COOPER PHARMA' },
  { id: 'c1a4', nom: 'GLUCOPHAGE 1000 COMPRIME PELLICULE à 1000 MG 1 BOITE 30 COMPRIME', nom_commercial: 'GLUCOPHAGE 1000', dci: 'METFORMINE', forme: 'COMPRIME PELLICULE à 1000 MG 1 BOITE 30 COMPRIME', dosage: '1000 MG', laboratoire: 'COOPER PHARMA' },
  { id: '38b5', nom: 'GLUCOPHAGE 1000 MG, Comprimé pelliculé', nom_commercial: 'GLUCOPHAGE 1000 MG', dci: 'CHLORHYDRATE DE METFORMINE', forme: 'Comprimé pelliculé', dosage: '1000 MG', laboratoire: 'PH: 18.50 dhs - COOPER PHARMA' },
  { id: '17e4', nom: 'GLUCOPHAGE 500', nom_commercial: 'GLUCOPHAGE 500', dci: 'METFORMINE', forme: 'COMPRIME PELLICULE', dosage: '1000   MG', laboratoire: 'COOPER PHARMA' },
  { id: '7776', nom: 'GLUCOPHAGE 500 COMPRIME PELLICULE à 500 MG 1 BOITE 50 COMPRIME', nom_commercial: 'GLUCOPHAGE 500', dci: 'METFORMINE', forme: 'COMPRIME PELLICULE à 500 MG 1 BOITE 50 COMPRIME', dosage: '500 MG', laboratoire: 'COOPER PHARMA' },
  { id: '8f6b', nom: 'GLUCOPHAGE 500 MG, Comprimé pelliculé', nom_commercial: 'GLUCOPHAGE 500 MG', dci: 'CHLORHYDRATE DE METFORMINE', forme: 'Comprimé pelliculé', dosage: '500 MG', laboratoire: 'PH: 13.74 dhs - COOPER PHARMA' },
  { id: '3e8b', nom: 'GLUCOPHAGE 850', nom_commercial: 'GLUCOPHAGE 850', dci: 'METFORMINE', forme: 'COMPRIME PELLICULE', dosage: '850   MG', laboratoire: 'COOPER PHARMA' },
  { id: 'a4ed', nom: 'GLUCOPHAGE 850 COMPRIME PELLICULE à 850 MG 1 BOITE 30 COMPRIME', nom_commercial: 'GLUCOPHAGE 850', dci: 'METFORMINE', forme: 'COMPRIME PELLICULE à 850 MG 1 BOITE 30 COMPRIME', dosage: '850 MG', laboratoire: 'COOPER PHARMA' },
  { id: '1a45', nom: 'GLUCOPHAGE 850 COMPRIME PELLICULE à 850 MG 1 BOITE 60 COMPRIME', nom_commercial: 'GLUCOPHAGE 850', dci: 'METFORMINE', forme: 'COMPRIME PELLICULE à 850 MG 1 BOITE 60 COMPRIME', dosage: '850 MG', laboratoire: 'COOPER PHARMA' },
  { id: '35ab', nom: 'GLUCOPHAGE 850 MG, Comprimé pelliculé', nom_commercial: 'GLUCOPHAGE 850 MG', dci: 'CHLORHYDRATE DE METFORMINE', forme: 'Comprimé pelliculé', dosage: '850 MG', laboratoire: 'PH: 29.86 dhs - COOPER PHARMA' },
];
const dose = (label: string) => label.match(/GLUCOPHAGE (\d+)/)![1];

describe('la liste change pendant qu’elle est ouverte → l’élément cliqué est celui ajouté', () => {
  const affichee = dedupeMedicaments(GLUCOPHAGE);

  it('cas du constat : « Glucophage 850 » visé, la liste est remplacée dans un autre ordre', () => {
    const vise = affichee.find(m => dose(medLabel(m)) === '850')!;
    const idPorte = vise.id;                 // identifiant porté par l'élément affiché (data-med-id)
    const positionVisee = affichee.indexOf(vise);
    // Une réponse plus récente arrive : mêmes fiches, autre ordre (le 500 prend la place du 850).
    const remplacee = [...affichee].reverse();
    expect(remplacee[positionVisee].id).not.toBe(idPorte);
    expect(dose(medLabel(remplacee[positionVisee]))).not.toBe('850'); // une sélection PAR INDEX aurait ajouté un autre dosage
    // Sélection par identifiant : c'est toujours la fiche visée qui est ajoutée, avec son dosage.
    const ajoute = pickById(remplacee, idPorte)!;
    expect(ajoute.id).toBe(idPorte);
    expect(dose(medLabel(ajoute))).toBe('850');
  });

  it('la fiche visée a disparu de la liste : rien n’est ajouté (jamais « la ligne à la même place »)', () => {
    const vise = affichee.find(m => dose(medLabel(m)) === '850')!;
    expect(pickById(affichee.filter(m => m.id !== vise.id), vise.id)).toBeNull();
    expect(pickById(affichee, null)).toBeNull();
    expect(pickById(affichee, undefined)).toBeNull();
  });

  it('une réponse ne remplace la liste que si la FRAPPE a changé (reprise de focus, retour sur l’onglet : rien)', () => {
    const shown = searchKey('Glucophage');
    expect(needsSearch('Glucophage', shown)).toBe(false);
    expect(needsSearch('glucophage ', shown)).toBe(false);
    expect(needsSearch('  GLUCOPHAGE', shown)).toBe(false);
    expect(needsSearch('Glucophage 8', shown)).toBe(true);
    expect(needsSearch('Gluco', shown)).toBe(true);
    expect(needsSearch('Glucophage', null)).toBe(true); // aucune liste affichée : on cherche
  });
});

describe('le dosage affiché est celui de la fiche ajoutée', () => {
  it('le dédoublonnage ne regroupe jamais deux dosages : 500, 850 et 1000 restent trois lignes', () => {
    const affichee = dedupeMedicaments(GLUCOPHAGE);
    expect(affichee.map(m => dose(medLabel(m))).sort()).toEqual(['1000', '500', '850']);
    for (const groupe of ['500', '850', '1000']) {
      const cles = new Set(GLUCOPHAGE.filter(m => dose(m.nom_commercial!) === groupe).map(dedupKey));
      expect(cles.size, groupe).toBe(1);
    }
    expect(new Set(GLUCOPHAGE.map(dedupKey)).size).toBe(3);
  });
  it('chaque fiche : le dosage du libellé affiché est celui de son nom — jamais la colonne « dosage » (fausse)', () => {
    for (const m of GLUCOPHAGE) {
      expect(medLabel(m), m.id).toContain(`GLUCOPHAGE ${dose(m.nom_commercial!)}`);
      const d = extractDosage(m);
      if (d) expect(d.replace(/\D/g, ''), m.id).toBe(dose(m.nom_commercial!));
    }
    // « GLUCOPHAGE 500 » dont la colonne dosage vaut « 1000 MG » : le libellé reste 500.
    expect(medLabel(GLUCOPHAGE[3])).toBe('GLUCOPHAGE 500, Comprimé pelliculé');
    expect(medLabel(GLUCOPHAGE[0])).toBe('GLUCOPHAGE 1000, Comprimé pelliculé');
  });
  it('le libellé de la ligne ajoutée est calculé sur la MÊME fiche que le libellé affiché', () => {
    const src = readFileSync(new URL('../pages/DoctorDashboard.tsx', import.meta.url), 'utf8');
    expect(src).toContain('{medLabel(med)}');           // liste
    expect(src).toContain('label: medLabel(med) || null'); // ligne ajoutée
  });
});

describe('sélection clavier par clé, jamais par index', () => {
  const A = ['exam-NFS', 'exam-CRP', 'pack-12', 'free-biologie'];
  it('la sélection suit son élément quand la liste change', () => {
    const active = moveActiveKey(A, null, 1); // ↓ depuis la 1re : « CRP »
    expect(active).toBe('exam-CRP');
    const B = ['exam-HBA1C', 'exam-NFS', 'exam-CRP', 'pack-12', 'free-biologie']; // un élément s'insère en tête
    expect(resolveActiveKey(B, active)).toBe('exam-CRP');   // toujours « CRP »
    expect(indexOfKey(B, resolveActiveKey(B, active))).toBe(2);
    expect(B[A.indexOf('exam-CRP')]).toBe('exam-NFS');      // l'ancien index aurait désigné « NFS »
  });
  it('élément disparu → première option ; liste vide → rien', () => {
    expect(resolveActiveKey(['exam-NFS'], 'exam-CRP')).toBe('exam-NFS');
    expect(resolveActiveKey([], 'exam-CRP')).toBeNull();
    expect(moveActiveKey([], null, 1)).toBeNull();
    expect(indexOfKey(A, null)).toBeNull();
    expect(indexOfKey(A, 'absent')).toBeNull();
  });
  it('flèches bornées, sans boucle', () => {
    expect(moveActiveKey(A, 'free-biologie', 1)).toBe('free-biologie');
    expect(moveActiveKey(A, 'exam-NFS', -1)).toBe('exam-NFS');
    expect(moveActiveKey(A, 'exam-CRP', -1)).toBe('exam-NFS');
    expect(moveActiveKey(A, 'pack-12', 1)).toBe('free-biologie');
  });
});

describe('la règle est appliquée à toutes les recherches', () => {
  const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
  it('Vérificateur : identifiant porté par l’élément, fiche résolue par identifiant, pas de relance au focus', () => {
    const s = SRC('../pages/DoctorDashboard.tsx');
    expect(s).toContain('data-med-id={med.id}');
    // Sprint 2d — le clic passe par pickMed : même règle (identifiant de la ligne cliquée), plus le garde-fou de position.
    expect(s).toContain('pickMed(medSearchResults, e.currentTarget.dataset.medId)');
    expect(s).toContain('pickMed(medSearchForeign ?? [], e.currentTarget.dataset.medId)');
    expect(s).toContain('const picked = pickById(list, id);');
    expect(s).toContain("decideClick(clickGuard, s, performance.now()) === 'hold'");
    expect(s).toContain('searchMedications(medSearchTerm, { onlyIfChanged: true })');
    expect(s).toContain('if (opts.onlyIfChanged && !needsSearch(term, medShownKeyRef.current)) return;');
  });
  it('formulaire d’ordonnance et traitement de fond', () => {
    for (const p of ['../components/PrescriptionFormModal.tsx', '../components/ui/TraitementFondSection.tsx']) {
      const s = SRC(p);
      expect(s, p).toContain('data-med-id={m.id}');
      expect(s, p).toContain('pickById(results, e.currentTarget.dataset.medId)');
      expect(s, p).toContain('if (!needsSearch(q, shownKey.current)) return;');
    }
  });
  it('examens et saisie rapide des bilans : plus aucune sélection mémorisée par index', () => {
    const ex = SRC('../components/exams/ExamRequestEditor.tsx');
    expect(ex).toContain('const [activeKey, setActiveKey] = useState<string | null>(null);');
    expect(ex).not.toContain('pick(options[');
    expect(ex).not.toContain('useState(0);\n  const [notice');
    const q = SRC('../components/bilans/QuickResultInput.tsx');
    expect(q).toContain('const [choiceCode, setChoiceCode] = useState<string | null>(null);');
    expect(q).not.toContain('useState<number | null>(null)');
  });
  it('pathologies : la valeur ajoutée est celle que porte l’élément cliqué', () => {
    expect(SRC('../components/PatientForm.tsx')).toContain('const v = e.currentTarget.dataset.value; if (v) add(v);');
  });
});
