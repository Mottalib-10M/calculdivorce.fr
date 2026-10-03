import { describe, it, expect } from 'vitest';
import { pension, ligneBareme, asf, revaloriser, arrieres, deduction, pensionImposable, impotBareme, deuxFamilles, reductionPrestationCompensatoire, taux, MV } from './pension';

// Cas de référence : table publiée par le ministère de la Justice (justice.fr, relevée le 2026-10-03).
describe('table de référence du ministère de la Justice', () => {
  it('minimum vital de la table : 652 €', () => expect(MV).toBe(652));
  it('2 000 € : ligne officielle complète (1 à 6 enfants × réduit, classique, alterné)', () => {
    expect(ligneBareme(2000)).toEqual([242.64, 181.98, 121.32, 208.94, 155.02, 105.14, 179.28, 134.8, 90.32, 157.72, 118.62, 79.53, 142.89, 107.84, 71.44, 128.06, 97.06, 64.7]);
  });
  it('700 € : ligne officielle', () => {
    expect(ligneBareme(700)).toEqual([8.64, 6.48, 4.32, 7.44, 5.52, 3.74, 6.38, 4.8, 3.22, 5.62, 4.22, 2.83, 5.09, 3.84, 2.54, 4.56, 3.46, 2.3]);
  });
  it('1 500 € : ligne officielle', () => {
    expect(ligneBareme(1500)).toEqual([152.64, 114.48, 76.32, 131.44, 97.52, 66.14, 112.78, 84.8, 56.82, 99.22, 74.62, 50.03, 89.89, 67.84, 44.94, 80.56, 61.06, 40.7]);
  });
  it('2 300 € : ligne officielle', () => {
    expect(ligneBareme(2300)).toEqual([296.64, 222.48, 148.32, 255.44, 189.52, 128.54, 219.18, 164.8, 110.42, 192.82, 145.02, 97.23, 174.69, 131.84, 87.34, 156.56, 118.66, 79.1]);
  });
  it('le total se multiplie par le nombre d’enfants', () => {
    const p = pension(2000, 2, 'classique');
    expect(p.parEnfant).toBe(155.02); expect(p.total).toBe(310.04);
  });
  it('sous le minimum vital : zéro, signalé', () => {
    const p = pension(600, 1, 'classique'); expect(p.total).toBe(0); expect(p.sousMinimum).toBe(true);
  });
  it('au-delà de 6 enfants, la table s’arrête au taux de 6', () => expect(taux(8, 'reduit')).toBe(taux(6, 'reduit')));
});

describe('ASF au 1er avril 2026 (service-public F815)', () => {
  it('aucune pension : ASF pleine 200,78 € par enfant', () => expect(asf(0, 2)).toMatchObject({ parEnfant: 200.78, total: 401.56 }));
  it('pension de 47 € : ASF différentielle 153,78 €', () => expect(asf(46.98, 1).parEnfant).toBe(153.8));
  it('écart sous 15 € : rien n’est versé', () => expect(asf(190, 1)).toMatchObject({ parEnfant: 0, nonVerse: true }));
  it('pension au-dessus de l’ASF : rien', () => expect(asf(250, 1).parEnfant).toBe(0));
});

describe('revalorisation (exemple service-public F2010)', () => {
  it('300 € × 100,03 / 87,07 = 344,65 €', () => expect(revaloriser(300, 87.07, 100.03)).toBe(344.65));
});

describe('impayés (F1249, F998)', () => {
  it('5 ans au plus récupérables', () => { const a = arrieres(200, 72); expect(a.moisRecuperables).toBe(60); expect(a.perdu).toBe(2400); });
  it('paiement direct : 6 mois d’arriérés étalés sur 12 mois', () => { const a = arrieres(300, 10); expect(a.paiementDirectArrieres).toBe(1800); expect(a.paiementDirectMensuel).toBe(450); expect(a.plainte).toBe(true); });
  it('2 mois : pas encore d’abandon de famille', () => expect(arrieres(300, 2).plainte).toBe(false));
});

describe('fiscalité, revenus 2025 (F2, F35777, F1419)', () => {
  it('barème : 30 000 € pour 1 part = 2 103,99 € (exemple F1419)', () => expect(impotBareme(30000, 1)).toBe(2103.99));
  it('enfant mineur : toute la pension est déductible', () => expect(deduction(3600, 'mineur', 30000).deductible).toBe(3600));
  it('enfant majeur : plafond 6 855 €', () => { const d = deduction(9000, 'majeur', 40000); expect(d.deductible).toBe(6855); expect(d.plafonne).toBe(true); });
  it('garde alternée : rien à déduire', () => expect(deduction(3000, 'alterne', 40000).deductible).toBe(0));
  it('pension reçue : abattement 10 % avec minimum 454 €', () => { expect(pensionImposable(2400)).toEqual({ abattement: 454, imposable: 1946 }); expect(pensionImposable(12000)).toEqual({ abattement: 1200, imposable: 10800 }); });
  it('abattement plafonné à 4 439 €', () => expect(pensionImposable(60000).abattement).toBe(4439));
});

describe('deux familles, prestation compensatoire', () => {
  it('lecture séparée ≥ lecture d’ensemble', () => { const d = deuxFamilles(3000, 1, 'classique', 1, 'classique'); expect(d.separe).toBe(633.96); expect(d.ensemble).toBe(540.04); });
  it('réduction d’impôt 25 % plafonnée à 7 625 € (exemple F446 : 40 000 €)', () => expect(reductionPrestationCompensatoire(40000)).toBe(7625));
});
