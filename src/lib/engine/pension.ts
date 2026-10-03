/**
 * Moteur du site : table de référence du ministère de la Justice et paramètres sociaux et
 * fiscaux 2026. Fonctions pures, tous les nombres viennent de `data/params-2026.json`.
 */
import P from '../../data/params-2026.json';

export type Mode = 'reduit' | 'classique' | 'alterne';
export const MODES: Mode[] = ['reduit', 'classique', 'alterne'];
export const MODE_INDEX: Record<Mode, number> = { reduit: 0, classique: 1, alterne: 2 };
export const MV = P.bareme.minimum_vital;
export const MAX_ENFANTS = 6;
const TAUX = P.bareme.taux as Record<string, number[]>;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Taux par enfant de la table (1 à 6 enfants ; au-delà de 6, la table s'arrête à 6). */
export function taux(enfants: number, mode: Mode): number {
  const n = Math.min(MAX_ENFANTS, Math.max(1, Math.round(enfants)));
  return TAUX[String(n)][MODE_INDEX[mode]];
}

export interface Pension { base: number; tauxEnfant: number; parEnfant: number; total: number; enfants: number; sousMinimum: boolean }

/** Pension indicative : (revenu net imposable mensuel − minimum vital) × taux, par enfant, × nombre d'enfants. */
export function pension(revenu: number, enfants: number, mode: Mode): Pension {
  const n = Math.max(1, Math.round(enfants));
  const base = Math.max(0, revenu - MV);
  const t = taux(n, mode);
  const parEnfant = r2(base * t);
  return { base, tauxEnfant: t, parEnfant, total: r2(parEnfant * n), enfants: n, sousMinimum: revenu <= MV };
}

/** Une ligne de la table officielle (même présentation que justice.fr). */
export function ligneBareme(revenu: number): number[] {
  const out: number[] = [];
  for (let n = 1; n <= MAX_ENFANTS; n++) for (const m of MODES) out.push(pension(revenu, n, m).parEnfant);
  return out;
}

/** Revenu à partir duquel la pension par enfant atteint un montant donné. */
export function revenuPourPension(cible: number, enfants: number, mode: Mode): number {
  return MV + cible / taux(enfants, mode);
}

/* ---------- ASF ---------- */
export const ASF = P.asf.montant_par_enfant;
export interface Asf { parEnfant: number; total: number; differentielle: boolean; nonVerse: boolean }
/** ASF pour un parent isolé : complète la pension reçue jusqu'à l'ASF ; rien sous 15 € d'écart. */
export function asf(pensionParEnfant: number, enfants: number): Asf {
  const n = Math.max(1, Math.round(enfants));
  const ecart = Math.max(0, ASF - pensionParEnfant);
  const nonVerse = ecart > 0 && ecart < P.asf.seuil_non_versement;
  const parEnfant = nonVerse ? 0 : r2(ecart);
  return { parEnfant, total: r2(parEnfant * n), differentielle: pensionParEnfant > 0 && parEnfant > 0, nonVerse };
}

/* ---------- Revalorisation ---------- */
export function revaloriser(montant: number, indiceBase: number, indiceNouveau: number): number {
  if (indiceBase <= 0) return montant;
  return r2((montant * indiceNouveau) / indiceBase);
}

/* ---------- Impayés ---------- */
export interface Arrieres { moisRecuperables: number; montantRecuperable: number; perdu: number; paiementDirectArrieres: number; paiementDirectMensuel: number; plainte: boolean }
export function arrieres(pensionMensuelle: number, moisImpayes: number): Arrieres {
  const R = P.recouvrement;
  const m = Math.max(0, Math.floor(moisImpayes));
  const rec = Math.min(m, R.anciennete_max_ans * 12);
  const pd = Math.min(m, R.paiement_direct_mois_arrieres) * pensionMensuelle;
  return {
    moisRecuperables: rec, montantRecuperable: r2(rec * pensionMensuelle), perdu: r2((m - rec) * pensionMensuelle),
    paiementDirectArrieres: r2(pd), paiementDirectMensuel: r2(pensionMensuelle + pd / R.paiement_direct_etalement_mois),
    plainte: m > R.abandon_famille_mois,
  };
}

/* ---------- Fiscalité ---------- */
const F = P.fiscalite;
/** Impôt brut au barème progressif pour un nombre de parts (sans décote ni plafonnement du quotient). */
export function impotBareme(revenuImposable: number, parts = 1): number {
  const q = Math.max(0, revenuImposable) / Math.max(1, parts);
  let prev = 0, imp = 0;
  for (const t of F.tranches) {
    const haut = t.jusqua ?? Infinity;
    if (q > prev) imp += (Math.min(q, haut) - prev) * t.taux;
    prev = haut;
  }
  return r2(imp * Math.max(1, parts));
}
export function tauxMarginal(revenuImposable: number, parts = 1): number {
  const q = Math.max(0, revenuImposable) / Math.max(1, parts);
  for (const t of F.tranches) if (t.jusqua === null || q <= t.jusqua) return t.taux;
  return 0.45;
}
export type Enfant = 'mineur' | 'majeur' | 'majeur-heberge' | 'alterne';
export interface Deduction { deductible: number; plafonne: boolean; economie: number; tmi: number }
/** Pension annuelle déductible pour le parent qui la verse, et l'économie d'impôt estimée. */
export function deduction(pensionAnnuelle: number, enfant: Enfant, revenuImposable: number, parts = 1, marie = false): Deduction {
  let d = 0, plafonne = false;
  if (enfant === 'mineur') d = pensionAnnuelle;
  else if (enfant === 'majeur') { const cap = marie ? F.plafond_majeur_parent_seul_charge_famille : F.plafond_majeur; d = Math.min(pensionAnnuelle, cap); plafonne = pensionAnnuelle > cap; }
  else if (enfant === 'majeur-heberge') { const f = marie ? F.forfait_hebergement_majeur_marie : F.forfait_hebergement_majeur; d = Math.min(f + pensionAnnuelle, Math.max(f, F.plafond_majeur)); plafonne = f + pensionAnnuelle > Math.max(f, F.plafond_majeur); }
  const economie = d > 0 ? r2(impotBareme(revenuImposable, parts) - impotBareme(revenuImposable - d, parts)) : 0;
  return { deductible: r2(d), plafonne, economie, tmi: tauxMarginal(revenuImposable, parts) };
}
/** Pension reçue : montant imposable après l'abattement de 10 % (minimum par pensionné, maximum par foyer). */
export function pensionImposable(pensionAnnuelle: number): { abattement: number; imposable: number } {
  if (pensionAnnuelle <= 0) return { abattement: 0, imposable: 0 };
  const ab = Math.min(pensionAnnuelle, Math.min(F.abattement_max_par_foyer, Math.max(F.abattement_min_par_pensionne, pensionAnnuelle * F.abattement_pensions)));
  return { abattement: r2(ab), imposable: r2(pensionAnnuelle - ab) };
}
export const PLAFOND_MAJEUR = F.plafond_majeur;

/* ---------- Plusieurs familles ---------- */
export interface DeuxFamilles { separe: number; ensemble: number; ecart: number; aSepare: number; bSepare: number; aEnsemble: number; bEnsemble: number }
/** Deux lectures de la table quand le débiteur a des enfants de deux unions. */
export function deuxFamilles(revenu: number, nA: number, modeA: Mode, nB: number, modeB: Mode): DeuxFamilles {
  const aS = pension(revenu, nA, modeA).total, bS = nB > 0 ? pension(revenu, nB, modeB).total : 0;
  const tot = nA + Math.max(0, nB);
  const base = Math.max(0, revenu - MV);
  const aE = r2(base * taux(tot, modeA) * nA), bE = nB > 0 ? r2(base * taux(tot, modeB) * nB) : 0;
  return { separe: r2(aS + bS), ensemble: r2(aE + bE), ecart: r2(aS + bS - aE - bE), aSepare: aS, bSepare: bS, aEnsemble: aE, bEnsemble: bE };
}

/* ---------- Ascendants, prestation compensatoire ---------- */
export function deductionAscendant(versementsAnnuels: number, heberge: boolean): number {
  return heberge ? P.ascendants.forfait_hebergement : Math.max(0, versementsAnnuels);
}
export function reductionPrestationCompensatoire(capital: number): number {
  const C = P.prestation_compensatoire;
  return r2(Math.min(capital, C.reduction_assiette_max) * C.reduction_taux);
}
export { P };
