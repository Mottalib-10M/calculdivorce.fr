import { describe, it, expect } from 'vitest';
import { mensualite, methodesPC, fiscalPC, droitPartage, soulte, liquidation, coutDivorce, aideJuridictionnelle, delaiMinimalConsentement, moisAvantAlteration, moisAvantConversion, allocationsFamiliales, impotParent, anneeDivorce, reversionExConjoint } from './divorce';
import { impotBareme } from './pension';

describe('prestation compensatoire : méthodes indicatives', () => {
  // Couple type : 6 000 € et 2 000 € par mois, 23 ans de mariage.
  const m = methodesPC(6000, 2000, 23);
  it('tiers de l’écart annuel × moitié de la durée : 48 000 ÷ 3 × 11,5 = 184 000 €', () => expect(m.tiers).toBeCloseTo(184000, 0));
  it('20 % de l’écart annuel × 8 ans = 76 800 €', () => expect(m.vingt).toBe(76800));
  it('moitié de l’écart mensuel × années = 46 000 €', () => expect(m.demi).toBe(46000));
  it('fourchette ordonnée', () => { expect(m.min).toBe(46000); expect(m.mediane).toBe(76800); expect(m.max).toBeCloseTo(184000, 0); });
  it('l’écart se lit dans les deux sens', () => expect(methodesPC(2000, 6000, 23).demi).toBe(46000));
  it('revenus égaux : rien', () => expect(methodesPC(3000, 3000, 20).max).toBe(0));
  it('durée nulle : rien', () => expect(methodesPC(5000, 1000, 0).max).toBe(0));
});

describe('prestation compensatoire : fiscalité (service-public F446)', () => {
  it('capital de 40 000 € en une fois : réduction de 7 625 € (assiette plafonnée à 30 500 €)', () => expect(fiscalPC(40000, 'capital12', 200000).reduction).toBe(7625));
  it('capital de 20 000 € : réduction de 25 %', () => expect(fiscalPC(20000, 'capital12', 200000).reduction).toBe(5000));
  it('la réduction ne dépasse pas l’impôt dû', () => { const f = fiscalPC(20000, 'capital12', 15000); expect(f.economie).toBe(impotBareme(15000, 1)); });
  it('versements sur plus de 12 mois : déductibles, imposables chez le bénéficiaire après 10 %', () => {
    const f = fiscalPC(12000, 'etale', 60000);
    expect(f.deduction).toBe(12000);
    expect(f.economie).toBe(impotBareme(60000, 1) - impotBareme(48000, 1));
    expect(f.imposableBeneficiaire).toBe(10800);
  });
});

describe('droit de partage et soulte (service-public F903, BOFiP ENR-PTG)', () => {
  it('1,10 % de l’actif net', () => expect(droitPartage(200000)).toBe(2200));
  it('minimum de perception de 25 €', () => expect(droitPartage(1000)).toBe(25));
  it('rien à partager : rien à payer', () => expect(droitPartage(0)).toBe(0));
  it('maison de 300 000 €, 120 000 € restant dus, part de moitié : soulte de 90 000 €', () => {
    const s = soulte(300000, 120000, 0.5);
    expect(s.valeurNette).toBe(180000); expect(s.soulte).toBe(90000); expect(s.droitPartage).toBe(1980);
    expect(s.aFinancer).toBe(90000 + 120000 + 1980);
  });
  it('bien en indivision 60/40 : celui qui sort détient 40 %', () => expect(soulte(250000, 50000, 0.4).soulte).toBe(80000));
  it('bien sous l’eau (dette > valeur) : pas de soulte, pas de droit', () => { const s = soulte(150000, 170000); expect(s.soulte).toBe(0); expect(s.droitPartage).toBe(0); });
  it('communauté : récompense due à A', () => {
    const l = liquidation(400000, 100000, 20000);
    expect(l.actifNet).toBe(300000); expect(l.partA).toBe(160000); expect(l.partB).toBe(140000); expect(l.droitPartage).toBe(3300);
  });
});

describe('coût du divorce et aide juridictionnelle', () => {
  it('consentement mutuel : dépôt chez le notaire 49,44 € TTC', () => expect(coutDivorce('notaire', 0, 0, 0).depotNotaire).toBe(49.44));
  it('divorce judiciaire : pas de dépôt chez le notaire', () => expect(coutDivorce('juge', 0, 0, 0).depotNotaire).toBe(0));
  it('frais réglementés + honoraires', () => {
    const c = coutDivorce('notaire', 1000, 1200, 100000);
    expect(c.reglemente).toBe(49.44 + 1100); expect(c.total).toBe(49.44 + 1100 + 2200); expect(c.parEpoux).toBe(c.total / 2);
  });
  it('AJ, personne seule : 100 % jusqu’à 12 957 €', () => expect(aideJuridictionnelle(12957, 1)).toBe(1));
  it('AJ, personne seule : 55 % à 15 000 €', () => expect(aideJuridictionnelle(15000, 1)).toBe(0.55));
  it('AJ, personne seule : 25 % à 19 433 €', () => expect(aideJuridictionnelle(19433, 1)).toBe(0.25));
  it('AJ, personne seule : rien au-delà', () => expect(aideJuridictionnelle(19434, 1)).toBe(0));
  it('AJ, 3 personnes : 100 % à 17 621 €', () => expect(aideJuridictionnelle(17621, 3)).toBe(1));
});

describe('délais', () => {
  it('consentement mutuel : 15 + 7 + 15 jours au plus serré', () => expect(delaiMinimalConsentement()).toBe(37));
  it('altération définitive : un an de séparation', () => { expect(moisAvantAlteration(4)).toBe(8); expect(moisAvantAlteration(15)).toBe(0); });
  it('conversion d’une séparation de corps : deux ans', () => { expect(moisAvantConversion(6)).toBe(18); expect(moisAvantConversion(30)).toBe(0); });
});

describe('allocations familiales (service-public F13213, 2026)', () => {
  it('1 enfant : rien', () => expect(allocationsFamiliales(1, 30000)).toBe(0));
  it('2 enfants, ressources ≤ 79 980 € : 152,25 €', () => expect(allocationsFamiliales(2, 79980)).toBe(152.25));
  it('2 enfants, tranche intermédiaire : 76,13 €', () => expect(allocationsFamiliales(2, 90000)).toBe(76.13));
  it('3 enfants, tranche haute : 86,83 €', () => expect(allocationsFamiliales(3, 120000)).toBe(86.83));
  it('2 enfants, majoration d’âge pour le seul 2e enfant', () => expect(allocationsFamiliales(2, 50000, 2)).toBe(152.25 + 76.13));
});

describe('impôt d’un parent séparé : quotient familial et plafonnement', () => {
  it('couple, 1 enfant, 80 000 € : plafonnement à 1 807 € → 8 401 € (exemple service-public F2705)', () => expect(anneeDivorce(80000, 0, 1, 'principale', 0).avant).toBeCloseTo(8401, 0));
  it('couple, 1 enfant, 63 000 € : 3 740 € sans plafonnement (exemple F2705)', () => expect(Math.round(anneeDivorce(63000, 0, 1, 'principale', 0).avant)).toBe(3740));
  it('parent isolé, 2 enfants en garde principale : 2,5 parts (exemple F2633)', () => expect(impotParent(30000, 2, 'principale').parts).toBe(2.5));
  it('parent isolé, 2 enfants en alternance : 2 parts (exemple F2633)', () => expect(impotParent(30000, 2, 'alternee').parts).toBe(2));
  it('parent isolé, 3 enfants en garde principale : 3,5 parts (exemple F35120)', () => expect(impotParent(30000, 3, 'principale').parts).toBe(3.5));
  it('parent isolé, 3 enfants en alternance : 2,5 parts (exemple F35120)', () => expect(impotParent(30000, 3, 'alternee').parts).toBe(2.5));
  it('sans enfant : 1 part', () => expect(impotParent(30000, 2, 'aucune').parts).toBe(1));
  it('haut revenu : l’avantage du 1er enfant est plafonné à 4 262 €', () => {
    const f = impotParent(150000, 1, 'principale');
    expect(f.plafonne).toBe(true); expect(f.impot).toBe(Math.round((impotBareme(150000, 1) - 4262) * 100) / 100);
  });
  it('année du divorce : la pension déduite chez A, imposée après 10 % chez B', () => {
    const a = anneeDivorce(48000, 22000, 2, 'principale', 4800);
    expect(a.pensionDeduite).toBe(4800); expect(a.partsA).toBe(1); expect(a.partsB).toBe(2.5);
    expect(a.apres).toBe(Math.round((a.apresA + a.apresB) * 100) / 100);
  });
  it('alternance : pas de déduction, parts partagées', () => { const a = anneeDivorce(48000, 22000, 2, 'alternee', 4800); expect(a.pensionDeduite).toBe(0); expect(a.partsA).toBe(2); });
});

describe('pension de réversion d’un ex-conjoint (F13104, agirc-arrco.fr)', () => {
  const base = { baseDefunt: 1200, complDefunt: 800, mariageAns: 20, autreMariageAns: 0, trimestresDefunt: 172, ressourcesAnnuelles: 15000, enCouple: false, remarie: false };
  it('régime général sans remariage du défunt : 54 % entiers', () => expect(reversionExConjoint(base).rgVersee).toBe(648));
  it('défunt remarié 10 ans : prorata 20 / 30', () => expect(reversionExConjoint({ ...base, autreMariageAns: 10 }).rgBrute).toBe(432));
  it('plafond de ressources : réduction de la réversion', () => {
    const r = reversionExConjoint({ ...base, ressourcesAnnuelles: 20000 });
    expect(r.reduiteParPlafond).toBe(true); expect(r.rgVersee).toBeCloseTo((25001.6 - 20000) / 12, 2);
  });
  it('Agirc-Arrco seul ex-conjoint : 80 trimestres de mariage ÷ 170 plafonnés', () => expect(reversionExConjoint(base).aa).toBeCloseTo(800 * 0.6 * 80 / 170, 2));
  it('Agirc-Arrco : rien en cas de remariage de l’ex-conjoint', () => expect(reversionExConjoint({ ...base, remarie: true }).aa).toBe(0));
  it('Agirc-Arrco avec conjoint survivant : prorata des mariages', () => expect(reversionExConjoint({ ...base, autreMariageAns: 20 }).aa).toBe(240));
});

describe('mensualité de crédit', () => {
  it('100 000 € à 0 % sur 10 ans : 833,33 €', () => expect(mensualite(100000, 0, 10)).toBe(833.33));
  it('200 000 € à 3,6 % sur 20 ans : 1 170,22 €', () => expect(mensualite(200000, 3.6, 20)).toBeCloseTo(1170.22, 1));
  it('capital nul : 0', () => expect(mensualite(0, 3, 20)).toBe(0));
});
