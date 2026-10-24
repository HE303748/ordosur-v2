// Sprint 2e — liste de suggestions fiable : garde-fou de clic, page qui ne raccourcit pas, doublons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CLICK_STABLE_MS, MOVE_TOLERANCE_PX, cardCompensation, createPositionGuard, decideClick, findDuplicate,
  isOutside, labelKey, listSignature, pickOutcome, reservedMinHeight, sameListPlace,
} from './stableSearch';

const ids = ['g500', 'g850', 'g1000'];

describe('Garde-fou : seuls les mouvements RÉELS de la liste comptent', () => {
  it('retrait puis ajout 1 s plus tard : accepté du premier coup', () => {
    // La liste s'ouvre à t = 0 et ne bouge plus. À t = 200 ms un médicament est retiré PLUS BAS
    // (ligne de la sélection, toast, verdict vidé) : la position et le contenu de la liste sont inchangés.
    const g = createPositionGuard();
    g.observe(listSignature(412, 24, ids), 0);
    for (let t = 16; t <= 1200; t += 16) g.observe(listSignature(412, 24, ids), t);
    expect(decideClick(g, listSignature(412, 24, ids), 1200)).toBe('accept');
  });

  it('arrondi de sous-pixel (zoom 125 %) : ce n’est pas un mouvement', () => {
    const g = createPositionGuard();
    g.observe(listSignature(412.4, 24, ids), 0);
    // La position oscille entre 412 et 413 à chaque image (412,49 / 412,51).
    for (let t = 16; t <= 1000; t += 16) g.observe(listSignature(t % 32 ? 412.51 : 412.49, 24.5, ids), t);
    expect(decideClick(g, listSignature(412.51, 24, ids), 1000)).toBe('accept');
    expect(sameListPlace(listSignature(412, 24, ids), listSignature(413, 25, ids))).toBe(true);
  });

  it('décalage réel (≥ 2 px) juste avant le clic : retenu', () => {
    const g = createPositionGuard();
    g.observe(listSignature(412, 24, ids), 0);
    expect(decideClick(g, listSignature(412 + MOVE_TOLERANCE_PX, 24, ids), 1000)).toBe('hold');
    expect(decideClick(g, listSignature(412 + MOVE_TOLERANCE_PX, 24, ids), 1000 + CLICK_STABLE_MS)).toBe('accept');
  });

  it('dérive lente (1 px par image) : mesurée depuis le dernier état stable, elle finit par compter', () => {
    const g = createPositionGuard();
    g.observe(listSignature(400, 0, ids), 0);
    let top = 400;
    for (let t = 16; t <= 160; t += 16) g.observe(listSignature(++top, 0, ids), t);
    expect(top - 400).toBeGreaterThanOrEqual(MOVE_TOLERANCE_PX);
    expect(decideClick(g, listSignature(top, 0, ids), 200)).toBe('hold');
  });

  it('contenu changé (autre ordre, nouvelle ligne) : retenu, même sans mouvement', () => {
    const g = createPositionGuard();
    g.observe(listSignature(400, 0, ids), 0);
    expect(decideClick(g, listSignature(400, 0, ['g850', 'g500', 'g1000']), 2000)).toBe('hold');
    expect(sameListPlace(listSignature(400, 0, ids), listSignature(400, 0, [...ids, 'x']))).toBe(false);
  });
});

describe('La page ne raccourcit pas pendant la saisie (aucun retour de défilement sous la liste)', () => {
  it('hauteur réservée : ne fait que croître tant que le champ est actif, libérée ensuite', () => {
    let h = reservedMinHeight(null, 1800, true);
    expect(h).toBe(1800);
    h = reservedMinHeight(h, 1500, true);   // verdict vidé après un retrait
    expect(h).toBe(1800);
    h = reservedMinHeight(h, 2100.4, true); // nouveau verdict plus long
    expect(h).toBe(2101);
    expect(reservedMinHeight(h, 1500, false)).toBeNull();
  });

  it('compensation : seulement si la carte patient est AU-DESSUS du champ (colonne unique)', () => {
    expect(cardCompensation(300, 364, true, true)).toBe(64);
    expect(cardCompensation(300, 240, true, true)).toBe(-60);
    expect(cardCompensation(300, 364, false, true)).toBe(0);  // deux colonnes : la carte est à côté
    expect(cardCompensation(300, 364, true, false)).toBe(0);  // pas de saisie en cours
    expect(cardCompensation(null, 364, true, true)).toBe(0);  // première mesure
    expect(cardCompensation(300, 300.4, true, true)).toBe(0);
  });
});

describe('Doublon : jamais ajouté une 2e fois par erreur', () => {
  const selection = [
    { id: 'solu20a', nom: 'SOLUPRED', label: 'Solupred 20 mg, comprimé orodispersible' },
    { id: 'gluco850', nom: 'GLUCOPHAGE 850', label: null },
  ];

  it('même fiche : « déjà dans la sélection », rien à ajouter', () => {
    const d = findDuplicate(selection, { id: 'solu20a', label: 'Solupred 20 mg, comprimé orodispersible' });
    expect(d?.kind).toBe('meme_fiche');
    expect(pickOutcome('accept', d)).toBe('deja');
    expect(pickOutcome('hold', d)).toBe('deja');
  });

  it('autre fiche au même libellé (accents, casse, espaces ignorés) : confirmation', () => {
    const d = findDuplicate(selection, { id: 'solu20b', label: 'SOLUPRED 20 MG,  Comprimé Orodispersible' });
    expect(d?.kind).toBe('meme_libelle');
    expect(d?.existing.id).toBe('solu20a');
    expect(pickOutcome('accept', d)).toBe('confirmer_doublon');
    // Sans libellé, la sélection est comparée sur son nom.
    expect(findDuplicate(selection, { id: 'x', label: 'Glucophage 850' })?.existing.id).toBe('gluco850');
  });

  it('autre dosage : pas un doublon', () => {
    expect(findDuplicate(selection, { id: 'solu5', label: 'Solupred 5 mg, comprimé orodispersible' })).toBeNull();
    expect(findDuplicate(selection, { id: 'g1000', label: 'Glucophage 1000' })).toBeNull();
    expect(pickOutcome('accept', null)).toBe('ajouter');
  });

  it('liste qui a bougé : question d’abord, puis le contrôle de doublon', () => {
    const d = findDuplicate(selection, { id: 'solu20b', label: 'Solupred 20 mg, comprimé orodispersible' });
    expect(pickOutcome('hold', null)).toBe('confirmer_liste');
    expect(pickOutcome('hold', d)).toBe('confirmer_liste');
    expect(pickOutcome('accept', d)).toBe('confirmer_doublon'); // après « Ajouter »
  });

  it('libellé normalisé', () => {
    expect(labelKey('  Doliprane   1000 MG ')).toBe('doliprane 1000 mg');
    expect(labelKey('Éfferalgan')).toBe('efferalgan');
  });
});

describe('Clic à l’extérieur', () => {
  const node = (inside: object[] = []) => ({ contains: (t: unknown) => t === node || inside.includes(t as object) });
  it('dans le champ ou la liste : la liste reste ouverte ; ailleurs : elle se ferme', () => {
    const row = {};
    const list = node([row]);
    const input = node();
    expect(isOutside(row as unknown as Node, list as unknown as Node, input as unknown as Node)).toBe(false);
    expect(isOutside({} as Node, list as unknown as Node, input as unknown as Node)).toBe(true);
    expect(isOutside(null, list as unknown as Node)).toBe(true);
  });
});

describe('Vérificateur : câblage (source)', () => {
  const src = readFileSync(new URL('../pages/DoctorDashboard.tsx', import.meta.url), 'utf8');
  const checker = src.slice(src.indexOf('function CheckerView('), src.indexOf('{/* Action buttons */}'));

  it('focus synchrone : plus de requestAnimationFrame pour rendre le focus au champ', () => {
    expect(checker).toMatch(/const focusMedSearch = \(\) => \{\s*medInputRef\.current\?\.focus\(\{ preventScroll: true \}\);\s*\};/);
  });

  it('✕ et « Annuler » : le champ garde le focus, rendu AVANT le retrait', () => {
    expect(checker).toContain('onClick={() => { focusMedSearchIfPointer(); removeMedication(med.id); }}');
    expect(checker).toMatch(/focusMedSearchIfPointer\(\);\s*removeMedication\(addedVisible\.id\);/);
  });

  it('après chaque clic dans la liste, elle se ferme : plus de ligne « retenue » laissée ouverte', () => {
    expect(checker).not.toContain('heldMedId');
    expect(checker).toMatch(/if \(outcome === 'ajouter'\) \{ commitPick\(target\); return; \}\s*clearMedSearch\(\);/);
  });

  it('Échap ne remonte pas (élément le plus haut seulement) et le champ le revendique', () => {
    expect(checker).toContain("data-esc-own={medDropdownOpen || pendingPick ? '1' : undefined}");
    expect(checker).toMatch(/e\.stopPropagation\(\);\s*e\.nativeEvent\.stopImmediatePropagation\(\);/);
  });

  it('textes des questions', () => {
    expect(checker).toContain('Déjà dans la sélection — ajouter quand même');
    expect(checker).toContain('La liste a bougé — ajouter');
  });
});
