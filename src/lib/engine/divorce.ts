/**
 * Moteur « argent du divorce » : prestation compensatoire (méthodes indicatives et fiscalité),
 * soulte et droit de partage, frais réglementés, aide juridictionnelle, allocations familiales
 * en garde alternée, impôt de chaque foyer après la séparation, pension de réversion.
 * Fonctions pures ; tous les nombres viennent de `data/params-2026.json`.
 */
import P from '../../data/params-2026.json';
import { impotBareme, pensionImposable, tauxMarginal } from './pension';

const r2 = (x: number) => Math.round(x * 100) / 100;
const pos = (x: number) => (Number.isFinite(x) ? Math.max(0, x) : 0);
const F = P.fiscalite;
const PC = P.prestation_compensatoire;

/* ---------- Prestation compensatoire : méthodes indicatives ---------- */
export interface MethodesPC { tiers: number; vingt: number; demi: number; min: number; max: number; mediane: number; ecartMensuel: number }
/**
 * Trois méthodes de la pratique, sans valeur légale (aucun barème dans le Code civil).
 * `revA` et `revB` : revenus mensuels des deux époux ; l'écart se calcule toujours en valeur absolue.
 */
export function methodesPC(revA: number, revB: number, dureeAns: number): MethodesPC {
  const M = PC.methodes;
  const ecartMensuel = Math.abs(pos(revA) - pos(revB));
  const ecartAnnuel = ecartMensuel * 12;
  const d = pos(dureeAns);
  const tiers = r2(ecartAnnuel * M.tiers.part_difference_annuelle * d * M.tiers.part_duree);
  const vingt = d > 0 ? r2(ecartAnnuel * M.vingt_pour_cent.part_difference_annuelle * M.vingt_pour_cent.annees) : 0;
  const demi = r2(ecartMensuel * M.demi_ecart_mensuel.part_difference_mensuelle * d);
  const v = [tiers, vingt, demi].sort((a, b) => a - b);
  return { tiers, vingt, demi, min: v[0], max: v[2], mediane: v[1], ecartMensuel };
}

export type FormePC = 'capital12' | 'etale' | 'rente';
export interface FiscalPC { reduction: number; deduction: number; economie: number; coutNet: number; imposableBeneficiaire: number }
/**
 * Effet fiscal d'une prestation compensatoire pour celui qui la verse.
 * capital12 : versée en une fois ou sur 12 mois au plus → réduction de 25 % dans la limite de 30 500 € (CGI art. 199 octodecies).
 * etale / rente : versements sur plus de 12 mois ou rente → déductibles (CGI art. 156) et imposables chez le bénéficiaire.
 * `montantAnnee` : sommes versées dans l'année ; `revenuImposable` : revenu annuel du payeur, une part.
 */
export function fiscalPC(montantAnnee: number, forme: FormePC, revenuImposable: number): FiscalPC {
  const m = pos(montantAnnee);
  if (forme === 'capital12') {
    const reduction = r2(Math.min(m, PC.reduction_assiette_max) * PC.reduction_taux);
    const impot = impotBareme(revenuImposable, 1);
    const economie = r2(Math.min(reduction, impot));
    return { reduction, deduction: 0, economie, coutNet: r2(m - economie), imposableBeneficiaire: 0 };
  }
  const economie = r2(impotBareme(revenuImposable, 1) - impotBareme(revenuImposable - m, 1));
  return { reduction: 0, deduction: m, economie, coutNet: r2(m - economie), imposableBeneficiaire: pensionImposable(m).imposable };
}

/* ---------- Partage et soulte ---------- */
/** Droit de partage consécutif à un divorce, une séparation de corps ou une rupture de Pacs : 1,10 % de l'actif net partagé, 25 € au moins. */
export function droitPartage(actifNet: number): number {
  const a = pos(actifNet);
  if (a <= 0) return 0;
  return r2(Math.max(P.partage.minimum, a * P.partage.taux_divorce));
}

export interface Soulte { valeurNette: number; soulte: number; droitPartage: number; aFinancer: number; partConserve: number }
/**
 * Soulte due par celui qui garde le bien : (valeur − capital restant dû) × part de celui qui sort.
 * `aFinancer` : soulte + capital restant dû repris seul + droit de partage (hors émoluments du notaire).
 */
export function soulte(valeur: number, capitalRestantDu: number, partSortant = 0.5): Soulte {
  const q = Math.min(1, Math.max(0, partSortant));
  const valeurNette = r2(pos(valeur) - pos(capitalRestantDu));
  const s = r2(Math.max(0, valeurNette) * q);
  const dp = droitPartage(Math.max(0, valeurNette));
  return { valeurNette, soulte: s, droitPartage: dp, aFinancer: r2(s + pos(capitalRestantDu) + dp), partConserve: r2(Math.max(0, valeurNette) * (1 - q)) };
}

export interface Liquidation { actifNet: number; partA: number; partB: number; droitPartage: number }
/**
 * Partage d'une communauté : actif commun − dettes communes, chaque époux a droit à la moitié,
 * corrigée des récompenses (ce que la communauté doit à un époux, ou ce qu'il lui doit).
 * `recompenseA` > 0 : la communauté doit à A ; < 0 : A doit à la communauté.
 */
export function liquidation(actifCommun: number, dettesCommunes: number, recompenseA = 0): Liquidation {
  const masse = pos(actifCommun) - pos(dettesCommunes);
  const apres = masse - recompenseA;
  const partA = r2(apres / 2 + recompenseA);
  const partB = r2(apres / 2);
  return { actifNet: r2(masse), partA, partB, droitPartage: droitPartage(masse) };
}

/* ---------- Coût du divorce ---------- */
export type Procedure = 'notaire' | 'juge';
export interface Cout { depotNotaire: number; droitPartage: number; reglemente: number; honoraires: number; total: number; parEpoux: number }
/** Frais réglementés connus + honoraires saisis (libres, fixés par convention d'honoraires). */
export function coutDivorce(procedure: Procedure, honorairesEpouxA: number, honorairesEpouxB: number, actifNetPartage: number): Cout {
  const depotNotaire = procedure === 'notaire' ? P.divorce.depot_notaire_ttc : 0;
  const dp = droitPartage(actifNetPartage);
  const reglemente = r2(depotNotaire + dp);
  const honoraires = r2(pos(honorairesEpouxA) + pos(honorairesEpouxB));
  const total = r2(reglemente + honoraires);
  return { depotNotaire, droitPartage: dp, reglemente, honoraires, total, parEpoux: r2(total / 2) };
}

/** Taux d'aide juridictionnelle selon le revenu fiscal de référence et la taille du foyer (1 à 5 personnes). */
export function aideJuridictionnelle(rfr: number, personnes: number): number {
  const n = Math.min(5, Math.max(1, Math.round(personnes)));
  const pl = (P.aide_juridictionnelle.plafonds as Record<string, number[]>)[String(n)];
  const r = pos(rfr);
  for (let i = 0; i < pl.length; i++) if (r <= pl[i]) return P.aide_juridictionnelle.taux[i];
  return 0;
}

/* ---------- Délais ---------- */
/** Nombre minimal de jours entre l'envoi du projet de convention et le dépôt chez le notaire (consentement mutuel sans juge). */
export function delaiMinimalConsentement(): number {
  const D = P.divorce;
  return D.reflexion_jours + D.transmission_notaire_jours + D.depot_notaire_delai_jours;
}
/** Mois restant avant de pouvoir invoquer l'altération définitive du lien conjugal (un an de cessation de vie commune). */
export function moisAvantAlteration(moisSepares: number): number {
  return Math.max(0, P.divorce.alteration_cessation_vie_commune_mois - Math.floor(pos(moisSepares)));
}
/** Mois restant avant de pouvoir demander seul la conversion d'une séparation de corps en divorce. */
export function moisAvantConversion(moisDepuisJugement: number): number {
  return Math.max(0, P.divorce.conversion_separation_corps_ans * 12 - Math.floor(pos(moisDepuisJugement)));
}

/* ---------- Allocations familiales ---------- */
/** Allocations familiales mensuelles du foyer (2 à 4 enfants ; au-delà, le barème de 4 enfants est retenu). */
export function allocationsFamiliales(enfants: number, ressourcesAnnuelles: number, enfantsMajores = 0): number {
  const n = Math.round(enfants);
  if (n < 2) return 0;
  const k = String(Math.min(4, n));
  const A = P.allocations_familiales;
  const pl = (A.plafonds as Record<string, number[]>)[k];
  const tranche = ressourcesAnnuelles <= pl[0] ? 0 : ressourcesAnnuelles <= pl[1] ? 1 : 2;
  const base = (A.montants as Record<string, number[]>)[k][tranche];
  // Pour 2 enfants, la majoration d'âge ne vaut que pour le 2e enfant (l'aîné n'y ouvre pas droit).
  const maj = Math.min(Math.max(0, Math.round(enfantsMajores)), n === 2 ? 1 : n) * A.majoration_age[tranche];
  return r2(base + maj);
}

/* ---------- Quotient familial et impôt d'un parent séparé ---------- */
export type Garde = 'principale' | 'alternee' | 'aucune';
export interface Foyer { parts: number; impot: number; plafonne: boolean; impotSansEnfant: number }
/**
 * Impôt d'un parent divorcé ou séparé, imposé seul, selon la garde de ses enfants mineurs.
 * principale : 0,5 part par enfant (1 à partir du 3e) + 0,5 parent isolé ; alternee : moitié de ces majorations.
 * Plafonnement du quotient familial (1 807 € par demi-part, 4 262 € pour la part du 1er enfant d'un parent isolé,
 * 2 131 € par demi-part des deux premiers enfants alternés d'un parent isolé). Sans décote ni réductions.
 */
export function impotParent(revenuImposable: number, enfants: number, garde: Garde, parentIsole = true): Foyer {
  const n = garde === 'aucune' ? 0 : Math.max(0, Math.round(enfants));
  const k = garde === 'alternee' ? 0.5 : 1;
  let parts = 1, cap = 0;
  for (let i = 1; i <= n; i++) {
    const p = (i <= 2 ? 0.5 : 1) * k;
    parts += p;
    cap += (p / 0.5) * F.plafond_demi_part;
  }
  if (n > 0 && parentIsole) {
    if (garde === 'principale') {
      parts += 0.5;
      cap += F.plafond_parent_isole_premier_enfant - F.plafond_demi_part; // la part du 1er enfant (0,5 + 0,5) plafonnée à 4 262 €
    } else {
      const extra = n === 1 ? 0.25 : 0.5;
      parts += extra;
      // 2 131 € par demi-part (0,25 + 0,25) de chacun des deux premiers enfants
      const premiers = Math.min(2, n);
      cap += premiers * F.plafond_parent_isole_alterne_demi_part - premiers * F.plafond_quart_part;
    }
  }
  const reel = impotBareme(revenuImposable, parts);
  const une = impotBareme(revenuImposable, 1);
  const plancher = r2(une - cap);
  const impot = n > 0 ? Math.max(reel, plancher) : reel;
  return { parts, impot: r2(Math.max(0, impot)), plafonne: n > 0 && plancher > reel, impotSansEnfant: une };
}

export interface AnneeDivorce { avant: number; apresA: number; apresB: number; apres: number; ecart: number; partsA: number; partsB: number; pensionDeduite: number }
/**
 * Impôt du couple avant la séparation (déclaration commune) comparé à la somme des deux impôts après
 * (chacun déclare seul ses revenus de toute l'année de la séparation).
 * Les enfants vivent chez B (garde principale) ou en alternance ; A verse `pensionAnnuelle` à B (déductible hors alternance).
 */
export function anneeDivorce(revA: number, revB: number, enfants: number, garde: 'principale' | 'alternee', pensionAnnuelle: number): AnneeDivorce {
  const n = Math.max(0, Math.round(enfants));
  // Avant : couple marié, 2 parts + enfants, plafonnement à 1 807 € par demi-part.
  let partsC = 2, capC = 0;
  for (let i = 1; i <= n; i++) { const p = i <= 2 ? 0.5 : 1; partsC += p; capC += (p / 0.5) * F.plafond_demi_part; }
  const tot = pos(revA) + pos(revB);
  const avant = n > 0 ? Math.max(impotBareme(tot, partsC), r2(impotBareme(tot, 2) - capC)) : impotBareme(tot, 2);
  const deduc = garde === 'alternee' ? 0 : pos(pensionAnnuelle);
  const a = impotParent(pos(revA) - deduc, n, garde === 'alternee' ? 'alternee' : 'aucune');
  const recu = garde === 'alternee' ? 0 : pensionImposable(deduc).imposable;
  const b = impotParent(pos(revB) + recu, n, garde === 'alternee' ? 'alternee' : 'principale');
  const apres = r2(a.impot + b.impot);
  return { avant: r2(avant), apresA: a.impot, apresB: b.impot, apres, ecart: r2(apres - avant), partsA: a.parts, partsB: b.parts, pensionDeduite: deduc };
}

/* ---------- Pension de réversion d'un ex-conjoint ---------- */
export interface Reversion { partRG: number; rgBrute: number; rgVersee: number; reduiteParPlafond: boolean; partAA: number; aa: number; total: number }
/**
 * Réversion mensuelle d'un ex-conjoint divorcé.
 * Régime général : 54 % de la retraite de base du défunt, partagée au prorata des durées de mariage s'il s'est remarié,
 * sous plafond de ressources (la réversion est réduite pour que ressources + réversion ne dépassent pas le plafond).
 * Agirc-Arrco : 60 % de la complémentaire ; sans conjoint survivant, au prorata durée du mariage / durée d'assurance
 * (plafonnée à 170 trimestres) ; avec conjoint survivant, au prorata des durées de mariage ; rien si l'ex s'est remarié.
 */
export function reversionExConjoint(o: { baseDefunt: number; complDefunt: number; mariageAns: number; autreMariageAns: number; trimestresDefunt: number; ressourcesAnnuelles: number; enCouple: boolean; remarie: boolean }): Reversion {
  const R = P.reversion;
  const m = pos(o.mariageAns), autre = pos(o.autreMariageAns);
  const partRG = autre > 0 ? m / (m + autre) : m > 0 ? 1 : 0;
  const rgBrute = r2(pos(o.baseDefunt) * R.rg_taux * partRG);
  const plafond = o.enCouple ? R.rg_plafond_couple : R.rg_plafond_seul;
  const marge = Math.max(0, plafond - pos(o.ressourcesAnnuelles)) / 12;
  const rgVersee = r2(Math.min(rgBrute, marge));
  let partAA = 0;
  if (!o.remarie && m > 0) {
    if (autre > 0) partAA = m / (m + autre);
    else { const t = Math.min(pos(o.trimestresDefunt) || R.aa_trimestres_plafond, R.aa_trimestres_plafond); partAA = Math.min(1, (m * 4) / t); }
  }
  const aa = r2(pos(o.complDefunt) * R.aa_taux * partAA);
  return { partRG, rgBrute, rgVersee, reduiteParPlafond: rgVersee < rgBrute, partAA, aa, total: r2(rgVersee + aa) };
}

export { tauxMarginal };

/* ---------- Crédit de rachat de soulte ---------- */
/** Mensualité d'un prêt amortissable à taux fixe (hors assurance). `tauxAnnuel` en pourcentage. */
export function mensualite(capital: number, tauxAnnuel: number, ans: number): number {
  const c = pos(capital), n = Math.round(pos(ans) * 12);
  if (c <= 0 || n <= 0) return 0;
  const i = pos(tauxAnnuel) / 100 / 12;
  return r2(i === 0 ? c / n : (c * i) / (1 - Math.pow(1 + i, -n)));
}
