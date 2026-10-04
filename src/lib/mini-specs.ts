/** Mini-simulateurs des pages (RECETTE §9.3), en français et en anglais, calculés par le moteur `engine/pension`. */
import { pension, asf, revaloriser, arrieres, deduction, pensionImposable, deuxFamilles, deductionAscendant, reductionPrestationCompensatoire, impotBareme, MODES, MV, ASF, P, type Mode } from './engine/pension';
import { formatMoney, formatPercent, formatNumber } from './format';
import type { MiniSpec } from './mini-types';
import { SPECS_DIVORCE } from './mini-specs-divorce';

type L = 'fr' | 'en';
const T = <A>(l: L, fr: A, en: A) => (l === 'en' ? en : fr);
const $ = (x: number, l: L) => formatMoney(x, 0, l);
const pct = (x: number, l: L) => formatPercent(x, 1, l);
const CTA = (l: L) => T(l, 'Calculateur complet de la pension', 'Full child support calculator');
const modeLabel = (m: Mode, l: L) => ({ reduit: T(l, 'Droit de visite réduit', 'Reduced visiting rights'), classique: T(l, 'Droit de visite classique', 'Standard visiting rights'), alterne: T(l, 'Résidence alternée', 'Shared residence') }[m]);
const modeInput = (l: L, def = 1) => ({ id: 'm', label: T(l, 'Amplitude du droit de visite', 'Amount of visiting time'), def, options: MODES.map((m, i) => ({ value: String(i), label: modeLabel(m, l) })) });
const rev = (l: L, def = 2000) => ({ id: 'r', label: T(l, 'Revenu net mensuel du parent qui verse', 'Paying parent’s net monthly income'), def, unit: '€', max: 100000 });
const kids = (l: L, def = 1) => ({ id: 'n', label: T(l, 'Nombre d’enfants', 'Number of children'), def, options: [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) })) });
const M = (i: number) => MODES[i] ?? 'classique';

const SPECS: Record<string, (l: L) => MiniSpec> = {
  pension: (l) => ({ title: T(l, 'Estimez la pension en deux saisies', 'Estimate child support in two inputs'), cta: CTA(l), inputs: [rev(l), kids(l)], run: ({ r, n }) => {
    const p = pension(r, n, 'classique');
    return { head: [T(l, 'Pension totale par mois (droit de visite classique)', 'Total support per month (standard visiting rights)'), $(p.total, l)], rows: [[T(l, 'Par enfant', 'Per child'), $(p.parEnfant, l)], [T(l, 'Revenu après minimum vital', 'Income after the subsistence allowance'), $(p.base, l)], [T(l, 'Taux de la table par enfant', 'Table rate per child'), pct(p.tauxEnfant, l)]] };
  } }),
  bareme: (l) => ({ title: T(l, 'Votre ligne de la table de référence', 'Your row of the reference table'), cta: CTA(l), inputs: [rev(l), kids(l, 2)], run: ({ r, n }) => {
    const [a, b, c] = MODES.map((m) => pension(r, n, m));
    return { head: [T(l, 'Par enfant, droit de visite classique', 'Per child, standard visiting rights'), $(b.parEnfant, l)], rows: [[modeLabel('reduit', l), $(a.parEnfant, l)], [modeLabel('alterne', l), $(c.parEnfant, l)], [T(l, 'Total classique pour la fratrie', 'Standard total for all the children'), $(b.total, l)]] };
  } }),
  modes: (l) => ({ title: T(l, 'Ce que change l’amplitude du droit de visite', 'What the amount of visiting time changes'), cta: CTA(l), inputs: [rev(l, 2500), kids(l)], run: ({ r, n }) => {
    const [a, b, c] = MODES.map((m) => pension(r, n, m));
    return { head: [T(l, 'Écart entre réduit et alterné, par mois', 'Gap between reduced and shared, per month'), $(a.total - c.total, l)], rows: [[modeLabel('reduit', l), $(a.total, l)], [modeLabel('classique', l), $(b.total, l)], [modeLabel('alterne', l), $(c.total, l)]] };
  } }),
  alternee: (l) => ({ title: T(l, 'Pension en résidence alternée', 'Support with shared residence'), cta: CTA(l), inputs: [{ id: 'r', label: T(l, 'Revenu net du parent le plus aisé', 'Net income of the better-off parent'), def: 3000, unit: '€', max: 100000 }, kids(l)], run: ({ r, n }) => {
    const c = pension(r, n, 'alterne'), b = pension(r, n, 'classique');
    return { head: [T(l, 'Pension indicative en alternance', 'Indicative support, shared residence'), $(c.total, l)], rows: [[T(l, 'Par enfant', 'Per child'), $(c.parEnfant, l)], [T(l, 'Si la résidence était classique', 'With standard residence instead'), $(b.total, l)], [T(l, 'Déduction fiscale possible', 'Tax deduction available'), T(l, 'non (parts partagées)', 'no (shared tax shares)')]] };
  } }),
  majeur: (l) => ({ title: T(l, 'Enfant majeur : pension et impôt', 'Adult child: support and tax'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension versée par mois', 'Support paid per month'), def: 400, unit: '€', max: 20000 }, { id: 'i', label: T(l, 'Revenu imposable annuel du parent qui verse', 'Paying parent’s annual taxable income'), def: 40000, unit: '€', max: 2000000 }], run: ({ p, i }) => {
    const d = deduction(p * 12, 'majeur', i); const imp = pensionImposable(Math.min(p * 12, P.fiscalite.plafond_majeur));
    return { head: [T(l, 'Montant déductible sur l’année', 'Deductible over the year'), $(d.deductible, l)], rows: [[T(l, 'Économie d’impôt estimée (1 part)', 'Estimated tax saving (1 share)'), $(d.economie, l)], [T(l, 'Plafond par enfant majeur', 'Cap per adult child'), $(P.fiscalite.plafond_majeur, l)], [T(l, 'Imposable chez l’enfant après abattement', 'Taxable for the child after allowance'), $(imp.imposable, l)]] };
  } }),
  unions: (l) => ({ title: T(l, 'Deux familles : deux lectures de la table', 'Two families: two readings of the table'), cta: CTA(l), inputs: [rev(l, 3000), { id: 'a', label: T(l, 'Enfants de la première union', 'Children from the first relationship'), def: 1, options: [1, 2, 3].map((n) => ({ value: String(n), label: String(n) })) }, { id: 'b', label: T(l, 'Enfants de la seconde union', 'Children from the second relationship'), def: 1, options: [0, 1, 2, 3].map((n) => ({ value: String(n), label: String(n) })) }], run: ({ r, a, b }) => {
    const d = deuxFamilles(r, a, 'classique', b, 'classique');
    return { head: [T(l, 'Total, chaque famille calculée à part', 'Total, each family worked out on its own'), $(d.separe, l)], rows: [[T(l, 'Total, tous les enfants comptés ensemble', 'Total, all children counted together'), $(d.ensemble, l)], [T(l, 'Écart entre les deux lectures', 'Gap between the two readings'), $(d.ecart, l)], [T(l, 'Première union, lecture d’ensemble', 'First family, combined reading'), $(d.aEnsemble, l)]] };
  } }),
  revalo: (l) => ({ title: T(l, 'Revaloriser la pension avec l’indice INSEE', 'Index the support with the INSEE figure'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Montant fixé dans le jugement', 'Amount set in the judgment'), def: P.revalorisation.exemple.montant, unit: '€', max: 20000 }, { id: 'b', label: T(l, 'Indice de base (jugement)', 'Base index (judgment)'), def: P.revalorisation.exemple.indice_base, max: 1000, decimals: 2 }, { id: 'x', label: T(l, 'Nouvel indice', 'New index'), def: P.revalorisation.indice_urbains_nov_2025, max: 1000, decimals: 2 }], run: ({ p, b, x }) => {
    const n = revaloriser(p, b, x);
    return { head: [T(l, 'Nouvelle pension mensuelle', 'New monthly amount'), formatMoney(n, 2, l)], rows: [[T(l, 'Hausse par mois', 'Increase per month'), formatMoney(n - p, 2, l)], [T(l, 'Hausse sur un an', 'Increase over a year'), $((n - p) * 12, l)], [T(l, 'Variation', 'Change'), pct(b > 0 ? x / b - 1 : 0, l)]] };
  } }),
  asf: (l) => ({ title: T(l, 'Votre allocation de soutien familial', 'Your family support allowance (ASF)'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension reçue par enfant et par mois', 'Support received per child per month'), def: 0, unit: '€', max: 5000 }, kids(l)], run: ({ p, n }) => {
    const a = asf(p, n);
    return { head: [T(l, 'ASF versée par mois', 'ASF paid per month'), $(a.total, l)], rows: [[T(l, 'Par enfant', 'Per child'), formatMoney(a.parEnfant, 2, l)], [T(l, 'Montant plein au 1er avril 2026', 'Full rate from 1 April 2026'), formatMoney(ASF, 2, l)], [T(l, 'Type', 'Type'), a.nonVerse ? T(l, 'écart sous 15 € : rien', 'gap under €15: nothing') : a.differentielle ? T(l, 'différentielle', 'top-up') : a.parEnfant ? T(l, 'pleine', 'full') : T(l, 'aucune', 'none')]] };
  } }),
  deduction: (l) => ({ title: T(l, 'Ce que la pension vous fait économiser d’impôt', 'How much tax the support saves you'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension versée par mois', 'Support paid per month'), def: 300, unit: '€', max: 20000 }, { id: 'i', label: T(l, 'Revenu imposable annuel', 'Annual taxable income'), def: 36000, unit: '€', max: 2000000 }, { id: 'k', label: T(l, 'Situation de l’enfant', 'Child’s situation'), def: 0, options: [{ value: '0', label: T(l, 'Mineur, résidence chez l’autre parent', 'Minor, lives with the other parent') }, { value: '1', label: T(l, 'Majeur, vit à part', 'Adult, lives elsewhere') }, { value: '2', label: T(l, 'Résidence alternée', 'Shared residence') }] }], run: ({ p, i, k }) => {
    const d = deduction(p * 12, (['mineur', 'majeur', 'alterne'] as const)[k] ?? 'mineur', i);
    return { head: [T(l, 'Économie d’impôt estimée sur l’année', 'Estimated tax saving for the year'), $(d.economie, l)], rows: [[T(l, 'Montant déductible', 'Deductible amount'), $(d.deductible, l)], [T(l, 'Votre tranche marginale', 'Your marginal rate'), pct(d.tmi, l)], [T(l, 'Coût réel de la pension sur l’année', 'Real annual cost of the support'), $(p * 12 - d.economie, l)]], note: T(l, 'Une part de quotient familial, sans décote ni plafonnement : ordre de grandeur.', 'One tax share, no décote or cap: an order of magnitude.') };
  } }),
  imposable: (l) => ({ title: T(l, 'Combien de la pension reçue est imposable ?', 'How much of the support received is taxable?'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension reçue par mois', 'Support received per month'), def: 300, unit: '€', max: 20000 }, { id: 'i', label: T(l, 'Autres revenus imposables du foyer (an)', 'Other taxable household income (year)'), def: 24000, unit: '€', max: 2000000 }, { id: 's', label: T(l, 'Parts de quotient familial', 'Tax shares'), def: 2, max: 10, decimals: 1 }], run: ({ p, i, s }) => {
    const x = pensionImposable(p * 12); const sup = impotBareme(i + x.imposable, s) - impotBareme(i, s);
    return { head: [T(l, 'Montant ajouté au revenu imposable', 'Amount added to taxable income'), $(x.imposable, l)], rows: [[T(l, 'Pension reçue sur l’année', 'Support received over the year'), $(p * 12, l)], [T(l, 'Abattement de 10 %', '10% allowance'), $(x.abattement, l)], [T(l, 'Impôt supplémentaire estimé', 'Estimated extra tax'), $(sup, l)]] };
  } }),
  arrieres: (l) => ({ title: T(l, 'Combien pouvez-vous encore réclamer ?', 'How much can you still claim?'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension mensuelle due', 'Monthly support due'), def: 250, unit: '€', max: 20000 }, { id: 'm', label: T(l, 'Mois impayés', 'Months unpaid'), def: 14, unit: T(l, 'mois', 'months'), max: 600 }], run: ({ p, m }) => {
    const a = arrieres(p, m);
    return { head: [T(l, 'Arriéré récupérable', 'Recoverable arrears'), $(a.montantRecuperable, l)], rows: [[T(l, 'Mois récupérables (5 ans au plus)', 'Recoverable months (5 years at most)'), String(a.moisRecuperables)], [T(l, 'Perdu par prescription', 'Lost to the time limit'), $(a.perdu, l)], [T(l, 'Paiement direct : prélèvement mensuel', 'Direct payment: monthly deduction'), $(a.paiementDirectMensuel, l)]] };
  } }),
  caf: (l) => ({ title: T(l, 'Pension impayée : ce que verse la CAF en attendant', 'Unpaid support: what the CAF pays meanwhile'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension due par enfant', 'Support due per child'), def: 180, unit: '€', max: 5000 }, kids(l)], run: ({ p, n }) => {
    const a = asf(0, n);
    return { head: [T(l, 'ASF d’avance dès le 1er mois d’impayé', 'ASF advance from the first unpaid month'), $(a.total, l)], rows: [[T(l, 'Pension due chaque mois', 'Support due each month'), $(p * n, l)], [T(l, 'Reste à recouvrer par l’Aripa', 'Left for ARIPA to recover'), $(Math.max(0, p * n - a.total), l)], [T(l, 'Arriérés repris par l’Aripa', 'Arrears ARIPA can pursue'), T(l, '5 ans', '5 years')]], note: T(l, 'ASF réservée au parent qui vit seul avec un enfant de moins de 20 ans.', 'ASF is only for a parent living alone with a child under 20.') };
  } }),
  impayee: (l) => ({ title: T(l, 'Votre dette de pension, mois par mois', 'The support owed, month by month'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension mensuelle', 'Monthly support'), def: 300, unit: '€', max: 20000 }, { id: 'm', label: T(l, 'Mois sans paiement', 'Months without payment'), def: 3, unit: T(l, 'mois', 'months'), max: 600 }], run: ({ p, m }) => {
    const a = arrieres(p, m);
    return { head: [T(l, 'Somme due', 'Amount owed'), $(p * m, l)], rows: [[T(l, 'Plainte pour abandon de famille possible', 'Family abandonment complaint possible'), a.plainte ? T(l, 'oui (plus de 2 mois)', 'yes (more than 2 months)') : T(l, 'pas encore', 'not yet')], [T(l, 'Repris par le paiement direct', 'Covered by direct payment'), $(a.paiementDirectArrieres, l)], [T(l, 'Hors paiement direct, à saisir autrement', 'Outside direct payment, to recover otherwise'), $(Math.max(0, a.montantRecuperable - a.paiementDirectArrieres), l)]] };
  } }),
  paiementdirect: (l) => ({ title: T(l, 'Ce que l’employeur retiendra chaque mois', 'What the employer will withhold each month'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension mensuelle', 'Monthly support'), def: 300, unit: '€', max: 20000 }, { id: 'm', label: T(l, 'Mois impayés', 'Months unpaid'), def: 4, unit: T(l, 'mois', 'months'), max: 600 }], run: ({ p, m }) => {
    const a = arrieres(p, m);
    return { head: [T(l, 'Retenue mensuelle pendant 12 mois', 'Monthly deduction for 12 months'), $(a.paiementDirectMensuel, l)], rows: [[T(l, 'Arriérés couverts (6 mois au plus)', 'Arrears covered (6 months at most)'), $(a.paiementDirectArrieres, l)], [T(l, 'Pension courante', 'Current support'), $(p, l)], [T(l, 'Puis, chaque mois', 'Afterwards, each month'), $(p, l)]] };
  } }),
  abandon: (l) => ({ title: T(l, 'Le délit est-il constitué ?', 'Has the offence been committed?'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension mensuelle', 'Monthly support'), def: 250, unit: '€', max: 20000 }, { id: 'm', label: T(l, 'Mois sans paiement intégral', 'Months without full payment'), def: 3, unit: T(l, 'mois', 'months'), max: 600 }], run: ({ p, m }) => {
    const a = arrieres(p, m); const R = P.recouvrement;
    return { head: [T(l, 'Plainte possible', 'Complaint possible'), a.plainte ? T(l, 'oui', 'yes') : T(l, 'non', 'no')], rows: [[T(l, 'Somme impayée', 'Unpaid amount'), $(p * m, l)], [T(l, 'Seuil légal', 'Legal threshold'), T(l, `plus de ${R.abandon_famille_mois} mois`, `more than ${R.abandon_famille_mois} months`)], [T(l, 'Peine encourue', 'Maximum penalty'), T(l, `${R.abandon_famille_prison_ans} ans et ${formatNumber(R.abandon_famille_amende, 0, l)} €`, `${R.abandon_famille_prison_ans} years and €${formatNumber(R.abandon_famille_amende, 0, l)}`)]] };
  } }),
  etranger: (l) => ({ title: T(l, 'Votre créance à transmettre au bureau RCA', 'Your claim for the RCA office'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension mensuelle fixée', 'Monthly support set'), def: 350, unit: '€', max: 20000 }, { id: 'm', label: T(l, 'Mois impayés', 'Months unpaid'), def: 18, unit: T(l, 'mois', 'months'), max: 600 }], run: ({ p, m }) => {
    const a = arrieres(p, m);
    return { head: [T(l, 'Décompte à joindre au dossier', 'Statement to attach to the file'), $(a.montantRecuperable, l)], rows: [[T(l, 'Mois comptés', 'Months counted'), String(a.moisRecuperables)], [T(l, 'Au-delà de 5 ans', 'Beyond 5 years'), $(a.perdu, l)], [T(l, 'Sur un an de pension courante', 'One year of current support'), $(p * 12, l)]] };
  } }),
  revision: (l) => ({ title: T(l, 'Ce que la table donnerait après le changement', 'What the table gives after the change'), cta: CTA(l), inputs: [{ id: 'a', label: T(l, 'Revenu au jugement', 'Income at the time of the judgment'), def: 2400, unit: '€', max: 100000 }, { id: 'b', label: T(l, 'Revenu aujourd’hui', 'Income today'), def: 1700, unit: '€', max: 100000 }, kids(l)], run: ({ a, b, n }) => {
    const x = pension(a, n, 'classique'), y = pension(b, n, 'classique');
    return { head: [T(l, 'Pension indicative aujourd’hui', 'Indicative support today'), $(y.total, l)], rows: [[T(l, 'Pension indicative au jugement', 'Indicative support at the judgment'), $(x.total, l)], [T(l, 'Écart par mois', 'Difference per month'), $(y.total - x.total, l)], [T(l, 'Variation', 'Change'), pct(x.total > 0 ? y.total / x.total - 1 : 0, l)]] };
  } }),
  chomage: (l) => ({ title: T(l, 'Pension avec une allocation chômage ou le RSA', 'Support on unemployment benefit or RSA'), cta: CTA(l), inputs: [{ id: 'r', label: T(l, 'Allocation ou revenu net du mois', 'Benefit or net income for the month'), def: 1100, unit: '€', max: 100000 }, kids(l)], run: ({ r, n }) => {
    const p = pension(r, n, 'classique');
    return { head: [T(l, 'Pension indicative', 'Indicative support'), $(p.total, l)], rows: [[T(l, 'Minimum vital laissé au débiteur', 'Subsistence amount left to the payer'), $(MV, l)], [T(l, 'Revenu au-dessus du minimum vital', 'Income above the subsistence amount'), $(p.base, l)], [T(l, 'Reste au débiteur après pension', 'Left to the payer after support'), $(Math.max(0, r - p.total), l)]] };
  } }),
  conjoint: (l) => ({ title: T(l, 'Nouveau conjoint : la pension et votre reste à vivre', 'New partner: support and what you have left'), cta: CTA(l), inputs: [rev(l, 2200), { id: 'c', label: T(l, 'Charges du foyer par mois (loyer, énergie)', 'Household costs per month (rent, energy)'), def: 1000, unit: '€', max: 50000 }, { id: 's', label: T(l, 'Part payée par le conjoint', 'Share paid by the partner'), def: 50, unit: '%', max: 100 }], run: ({ r, c, s }) => {
    const p = pension(r, 1, 'classique'); const vous = c * (1 - Math.min(100, s) / 100);
    return { head: [T(l, 'Pension indicative (1 enfant, classique)', 'Indicative support (1 child, standard)'), $(p.total, l)], rows: [[T(l, 'Revenu du conjoint dans le calcul', 'Partner’s income in the calculation'), T(l, 'aucun', 'none')], [T(l, 'Charges restant à votre charge', 'Costs left for you'), $(vous, l)], [T(l, 'Reste à vivre après pension et charges', 'Left after support and costs'), $(r - p.total - vous, l)]] };
  } }),
  amiable: (l) => ({ title: T(l, 'Le montant à inscrire dans la convention', 'The amount to write into the agreement'), cta: CTA(l), inputs: [rev(l, 2300), kids(l), modeInput(l)], run: ({ r, n, m }) => {
    const p = pension(r, n, M(m));
    return { head: [T(l, 'Repère de la table, par mois', 'Table benchmark, per month'), $(p.total, l)], rows: [[T(l, 'Par enfant', 'Per child'), $(p.parEnfant, l)], [T(l, 'Sur un an', 'Over a year'), $(p.total * 12, l)], [T(l, 'Arrondi conseillé à l’euro', 'Rounded to the euro'), $(Math.round(p.total), l)]] };
  } }),
  juge: (l) => ({ title: T(l, 'Le reste à vivre que le juge regarde', 'The remaining income the judge looks at'), cta: CTA(l), inputs: [rev(l, 1900), { id: 'c', label: T(l, 'Loyer ou crédit du débiteur', 'Payer’s rent or mortgage'), def: 650, unit: '€', max: 50000 }, kids(l, 2)], run: ({ r, c, n }) => {
    const p = pension(r, n, 'classique'); const reste = r - p.total - c;
    return { head: [T(l, 'Reste après pension et logement', 'Left after support and housing'), $(reste, l)], rows: [[T(l, 'Pension de la table', 'Table support'), $(p.total, l)], [T(l, 'Part du revenu versée', 'Share of income paid'), pct(r > 0 ? p.total / r : 0, l)], [T(l, 'Comparé au RSA personne seule', 'Compared with single-person RSA'), reste < P.rsa.personne_seule ? T(l, 'en dessous', 'below') : T(l, 'au-dessus', 'above')]] };
  } }),
  frais: (l) => ({ title: T(l, 'Partager une dépense exceptionnelle', 'Split an extra expense'), cta: CTA(l), inputs: [{ id: 'f', label: T(l, 'Montant de la dépense', 'Amount of the expense'), def: 900, unit: '€', max: 1000000 }, { id: 'a', label: T(l, 'Revenu net du parent A', 'Parent A net income'), def: 2600, unit: '€', max: 100000 }, { id: 'b', label: T(l, 'Revenu net du parent B', 'Parent B net income'), def: 1600, unit: '€', max: 100000 }], run: ({ f, a, b }) => {
    const s = a + b > 0 ? a / (a + b) : 0.5;
    return { head: [T(l, 'Part du parent A, au prorata des revenus', 'Parent A share, pro rata to income'), $(f * s, l)], rows: [[T(l, 'Part du parent B', 'Parent B share'), $(f * (1 - s), l)], [T(l, 'Clé de répartition A / B', 'Split A / B'), `${pct(s, l)} / ${pct(1 - s, l)}`], [T(l, 'Partage par moitié, pour comparer', 'Half each, for comparison'), $(f / 2, l)]] };
  } }),
  duree: (l) => ({ title: T(l, 'Ce qu’il reste à verser jusqu’à l’autonomie', 'What is left to pay until independence'), cta: CTA(l), inputs: [{ id: 'p', label: T(l, 'Pension mensuelle', 'Monthly support'), def: 250, unit: '€', max: 20000 }, { id: 'a', label: T(l, 'Âge de l’enfant', 'Child’s age'), def: 12, unit: T(l, 'ans', 'yrs'), max: 30 }, { id: 'f', label: T(l, 'Âge prévu de l’autonomie', 'Expected age of independence'), def: 23, unit: T(l, 'ans', 'yrs'), max: 35 }], run: ({ p, a, f }) => {
    const ans = Math.max(0, f - a);
    return { head: [T(l, 'Total restant à verser (montant constant)', 'Total left to pay (flat amount)'), $(p * 12 * ans, l)], rows: [[T(l, 'Années restantes', 'Years left'), String(ans)], [T(l, 'Dont après 18 ans', 'Of which after 18'), $(p * 12 * Math.max(0, f - Math.max(a, 18)), l)], [T(l, 'Par an', 'Per year'), $(p * 12, l)]], note: T(l, 'Hors revalorisation annuelle : la pension suit en pratique l’indice des prix.', 'Before annual indexation: in practice the amount follows the price index.') };
  } }),
  epoux: (l) => ({ title: T(l, 'Prestation compensatoire en capital : la réduction d’impôt', 'Lump-sum compensatory payment: the tax reduction'), cta: CTA(l), inputs: [{ id: 'c', label: T(l, 'Capital versé dans les 12 mois', 'Capital paid within 12 months'), def: 40000, unit: '€', max: 5000000 }], run: ({ c }) => {
    const r = reductionPrestationCompensatoire(c); const C = P.prestation_compensatoire;
    return { head: [T(l, 'Réduction d’impôt', 'Tax reduction'), $(r, l)], rows: [[T(l, 'Capital retenu', 'Capital taken into account'), $(Math.min(c, C.reduction_assiette_max), l)], [T(l, 'Taux', 'Rate'), pct(C.reduction_taux, l)], [T(l, 'Coût net du capital', 'Net cost of the capital'), $(c - r, l)]] };
  } }),
  ascendants: (l) => ({ title: T(l, 'Aider un parent âgé : la déduction', 'Helping an elderly parent: the deduction'), cta: CTA(l), inputs: [{ id: 'v', label: T(l, 'Versements par mois', 'Payments per month'), def: 400, unit: '€', max: 20000 }, { id: 'h', label: T(l, 'Le parent vit chez vous ?', 'Does the parent live with you?'), def: 0, options: [{ value: '0', label: T(l, 'Non', 'No') }, { value: '1', label: T(l, 'Oui', 'Yes') }] }, { id: 'i', label: T(l, 'Votre revenu imposable annuel', 'Your annual taxable income'), def: 38000, unit: '€', max: 2000000 }], run: ({ v, h, i }) => {
    const d = deductionAscendant(v * 12, h === 1); const eco = impotBareme(i, 1) - impotBareme(i - d, 1);
    return { head: [T(l, 'Montant déductible', 'Deductible amount'), $(d, l)], rows: [[T(l, 'Économie d’impôt estimée (1 part)', 'Estimated tax saving (1 share)'), $(eco, l)], [T(l, 'Règle appliquée', 'Rule applied'), h === 1 ? T(l, 'forfait d’hébergement', 'flat housing allowance') : T(l, 'versements justifiés, sans plafond', 'documented payments, no cap')]] };
  } }),
};

/** Pages par revenu : même calcul, valeur par défaut = le revenu de la page. */
function montant(l: L, a: number): MiniSpec {
  return { title: T(l, `Pension avec ${formatNumber(a, 0, l)} € net par mois`, `Support on €${formatNumber(a, 0, l)} net a month`), cta: CTA(l), inputs: [rev(l, a), kids(l), modeInput(l)], run: ({ r, n, m }) => {
    const p = pension(r, n, M(m)); const s = asf(p.parEnfant, n);
    return { head: [T(l, 'Pension totale par mois', 'Total support per month'), $(p.total, l)], rows: [[T(l, 'Par enfant', 'Per child'), $(p.parEnfant, l)], [T(l, 'Part du revenu', 'Share of income'), pct(r > 0 ? p.total / r : 0, l)], [T(l, 'ASF possible pour le parent seul', 'ASF possible for a single parent'), s.total > 0 ? $(s.total, l) : T(l, 'non', 'no')]] };
  } };
}
/** Pages par nombre d'enfants. */
function enfants(l: L, n: number): MiniSpec {
  return { title: T(l, `Pension pour ${n} enfant${n > 1 ? 's' : ''}`, `Support for ${n} child${n > 1 ? 'ren' : ''}`), cta: CTA(l), inputs: [rev(l, 2200), modeInput(l)], run: ({ r, m }) => {
    const p = pension(r, n, M(m));
    return { head: [T(l, `Total pour ${n} enfant${n > 1 ? 's' : ''}`, `Total for ${n} child${n > 1 ? 'ren' : ''}`), $(p.total, l)], rows: [[T(l, 'Par enfant', 'Per child'), $(p.parEnfant, l)], [T(l, 'Taux par enfant', 'Rate per child'), pct(p.tauxEnfant, l)], [T(l, 'Sur un an', 'Over a year'), $(p.total * 12, l)]] };
  } };
}

export function getSpec(kind: string, lang = 'fr'): MiniSpec {
  const l: L = lang === 'en' ? 'en' : 'fr';
  const mm = /^montant-(\d+)$/.exec(kind); if (mm) return montant(l, Number(mm[1]));
  const me = /^enfants-(\d)$/.exec(kind); if (me) return enfants(l, Number(me[1]));
  const s = SPECS[kind] ?? SPECS_DIVORCE[kind]; if (!s) throw new Error(`Mini-simulateur inconnu : ${kind}`); return s(l);
}
