import { describe, it, expect } from 'vitest';
import { searchExams, normExam, hasDiabete, packKey, type ExamRef, type ExamPack } from './examSearch';
// Mêmes données que celles insérées en base (scripts/gen_examens.mjs).
import data from './examens_reference.data.json';

const refs = data.examens as ExamRef[];
const packs: ExamPack[] = data.packs.map((p, i) => ({
  id: `sys-${i}`, systeme: true, code: p.code, doctor_id: null, nom: p.nom, mots_cles: p.mots_cles,
  lignes: p.lignes as ExamPack['lignes'], archive: false, ordre: p.ordre,
}));
const codes = (q: string, pathologies: string[] = []) =>
  searchExams(q, refs, packs, { pathologies }).filter(r => r.kind === 'exam').map(r => (r.kind === 'exam' ? r.exam.code : ''));
const packCodes = (q: string) =>
  searchExams(q, refs, packs).filter(r => r.kind === 'pack').map(r => (r.kind === 'pack' ? r.pack.code : ''));

describe('référentiel', () => {
  it('codes uniques, types valides, jeûne cohérent', () => {
    expect(new Set(refs.map(r => r.code)).size).toBe(refs.length);
    for (const r of refs) {
      expect(['biologie', 'imagerie', 'exploration']).toContain(r.type);
      if (r.a_jeun) expect(r.delai_jeun_h).toBeGreaterThan(0); else expect(r.delai_jeun_h).toBeNull();
      if (r.injection_possible) expect(r.produit_contraste).not.toBeNull();
    }
  });
  it('aucune valeur normale pré-remplie', () => {
    expect(JSON.stringify(refs)).not.toMatch(/norme|valeur_normale|min_normal|max_normal/i);
  });
  it('chaque examen d’un pack système existe dans le référentiel', () => {
    const set = new Set(refs.map(r => r.code));
    for (const p of packs) for (const l of p.lignes) expect(set.has(l.examen_code!)).toBe(true);
    expect(packs).toHaveLength(13);
  });
  it('conversions standard présentes pour le Sprint 6', () => {
    const u = (c: string) => refs.find(r => r.code === c)!;
    expect(u('GLYCEMIE_JEUN').unites[0]).toMatchObject({ unite: 'mmol/L', facteur: 5.551 });
    expect(u('CREATININE').unites[0]).toMatchObject({ unite: 'µmol/L', facteur: 8.84 });
    expect(u('UREE').unites[0]).toMatchObject({ facteur: 16.65 });
    expect(u('CHOLESTEROL_TOTAL').unites[0]).toMatchObject({ facteur: 2.586 });
    expect(u('TRIGLYCERIDES').unites[0]).toMatchObject({ facteur: 1.129 });
    expect(u('HBA1C').unites[0]).toMatchObject({ unite: 'mmol/mol', a: 10.929, b: -2.15 });
    expect(u('BILIRUBINE').unites[0]).toMatchObject({ facteur: 1.71 });
    expect(u('ACIDE_URIQUE').unites[0]).toMatchObject({ facteur: 5.95 });
    expect(u('CALCIUM').unites[0]).toMatchObject({ unite: 'mmol/L', diviseur: 40.08 });
    expect(u('NFS').unites[0]).toMatchObject({ unite: 'g/L', facteur: 10 });
  });
});

describe('normalisation', () => {
  it('sans accents ni casse, ponctuation ignorée', () => {
    expect(normExam('Hémoglobine  Glyquée')).toBe('hemoglobine glyquee');
    expect(normExam('H. pylori')).toBe('h pylori');
    expect(normExam('Écho-endoscopie')).toBe('echo endoscopie');
    expect(normExam('œso-gastro')).toBe('oeso gastro');
  });
});

describe('recherche', () => {
  it('« hb » propose l’hémogramme ET l’HbA1c, NFS en premier sans diabète', () => {
    const r = codes('hb');
    expect(r).toContain('NFS');
    expect(r).toContain('HBA1C');
    expect(r[0]).toBe('NFS');
  });
  it('« hb » chez un patient diabétique : HbA1c en premier', () => {
    expect(codes('hb', ['Diabète de type 2'])[0]).toBe('HBA1C');
    expect(codes('HB', ['HTA', 'DT2'])[0]).toBe('HBA1C');
  });
  it('un diabète insipide ne compte pas comme un diabète', () => {
    expect(hasDiabete(['Diabète insipide'])).toBe(false);
    expect(hasDiabete(['Diabète de type 1'])).toBe(true);
    expect(codes('hb', ['Diabète insipide'])[0]).toBe('NFS');
  });
  it('« hémoglobine glyquée » et « glyquee » → HbA1c', () => {
    expect(codes('hémoglobine glyquée')[0]).toBe('HBA1C');
    expect(codes('glyquee')[0]).toBe('HBA1C');
  });
  it('« echo » et « écho » listent les échographies', () => {
    const r = codes('echo');
    for (const c of ['ECHO_ABDOMINALE', 'ECHO_ABDOMINO_PELVIENNE', 'ECHO_HEPATIQUE_DOPPLER', 'ECHO_RENALE_VESICALE', 'ECHO_THYROIDIENNE', 'ECHO_PELVIENNE']) {
      expect(r).toContain(c);
    }
    expect(r[0]).toBe('ECHO_ABDOMINALE');
    expect(codes('écho')).toEqual(r);
  });
  it('« tdm », « scanner » et « scan » listent les TDM', () => {
    for (const q of ['tdm', 'scanner', 'scan', 'TDM']) {
      expect(codes(q).slice(0, 3).sort()).toEqual(['TDM_ABDOMINO_PELVIENNE', 'TDM_CEREBRALE', 'TDM_THORACIQUE']);
    }
  });
  it('« fogd », « gastroscopie », « endoscopie haute » → FOGD', () => {
    expect(codes('fogd')[0]).toBe('FOGD');
    expect(codes('gastroscopie')[0]).toBe('FOGD');
    expect(codes('endoscopie haute')[0]).toBe('FOGD');
  });
  it('« dfg » et « clairance » → DFG ; « iono » → ionogramme ; « bhcg » → bêta-hCG', () => {
    expect(codes('dfg')[0]).toBe('DFG');
    expect(codes('clairance')[0]).toBe('DFG');
    expect(codes('iono')[0]).toBe('IONOGRAMME');
    expect(codes('bhcg')[0]).toBe('BETA_HCG');
  });
  it('« nfs », « hémogramme », « tsh », « irm », « pyl », « h pylori »', () => {
    expect(codes('nfs')[0]).toBe('NFS');
    expect(codes('hémogramme')[0]).toBe('NFS');
    expect(codes('tsh')[0]).toBe('TSH');
    expect(codes('irm').every(c => c.includes('IRM'))).toBe(true);
    expect(codes('pyl').slice(0, 3).every(c => c.startsWith('HP_'))).toBe(true);
    expect(codes('h pylori').slice(0, 3).every(c => c.startsWith('HP_'))).toBe(true);
  });
  it('requête en plusieurs mots : « echo hepatique », « tdm abdo »', () => {
    expect(codes('echo hepatique')[0]).toBe('ECHO_HEPATIQUE_DOPPLER');
    expect(codes('tdm abdo')[0]).toBe('TDM_ABDOMINO_PELVIENNE');
  });
  it('moins de 2 caractères ou saisie inconnue → aucun résultat', () => {
    expect(searchExams('h', refs, packs)).toEqual([]);
    expect(searchExams('  ', refs, packs)).toEqual([]);
    expect(searchExams('zzzzqq', refs, packs)).toEqual([]);
  });
  it('une saisie courte ne matche pas au milieu d’un mot', () => {
    const r = codes('ca');
    expect(r[0]).toBe('CALCIUM');
    expect(r).not.toContain('BILIRUBINE');
    expect(r).not.toContain('ECHOCARDIOGRAPHIE');
  });
});

describe('packs dans les résultats', () => {
  it('« bilan hépatique » : le pack en tête, puis ses examens', () => {
    const all = searchExams('bilan hépatique', refs, packs);
    expect(all[0]).toMatchObject({ kind: 'pack' });
    expect(packCodes('bilan hépatique')[0]).toBe('BILAN_HEPATIQUE');
    expect(codes('bilan hépatique')).toContain('ASAT');
  });
  it('mots-clés : « diabete », « preop », « hta »', () => {
    expect(packCodes('diabete')).toContain('SUIVI_DIABETE');
    expect(packCodes('preop')).toContain('PRE_OPERATOIRE');
    expect(packCodes('hta')).toContain('SUIVI_HTA');
  });
  it('un pack archivé n’est jamais proposé ; clé stable d’un pack', () => {
    const perso: ExamPack = { id: 'p1', systeme: false, code: null, doctor_id: 'd1', nom: 'Bilan hépatique complet', mots_cles: [], lignes: [], archive: false, ordre: 0 };
    const r = searchExams('bilan hepatique', refs, [...packs, perso, { ...perso, id: 'p2', nom: 'Bilan hépatique ancien', archive: true }]);
    const ps = r.filter(x => x.kind === 'pack').map(x => (x.kind === 'pack' ? x.pack.id : ''));
    expect(ps).not.toContain('p2');
    expect(ps).toContain('p1');
    expect(packKey(perso)).toBe('p1');
    expect(packKey(packs[0])).toBe(packs[0].code);
  });
  it('« hb » ne remonte aucun pack', () => {
    expect(packCodes('hb')).toEqual([]);
  });
});
