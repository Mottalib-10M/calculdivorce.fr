/** Mini-simulateurs des pages « argent du divorce » (RECETTE §9.3), calculés par `engine/divorce`. */
import { methodesPC, fiscalPC, soulte, liquidation, coutDivorce, aideJuridictionnelle, delaiMinimalConsentement, moisAvantAlteration, moisAvantConversion, allocationsFamiliales, impotParent, anneeDivorce, reversionExConjoint, mensualite, droitPartage, type FormePC } from './engine/divorce';
import { P } from './engine/pension';
import { formatMoney, formatPercent, formatNumber, formatDecimal } from './format';
import type { MiniSpec } from './mini-types';

type L = 'fr' | 'en';
const T = <A>(l: L, fr: A, en: A) => (l === 'en' ? en : fr);
const $ = (x: number, l: L) => formatMoney(x, 0, l);
const pct = (x: number, l: L) => formatPercent(x, 1, l);
const CTA = (l: L) => T(l, 'Calculer tout le budget du divorce', 'Work out the whole divorce budget');
const money = (id: string, label: string, def: number, max = 10000000) => ({ id, label, def, unit: '€', max });
const yrs = (l: L) => T(l, 'ans', 'yrs');
const months = (l: L) => T(l, 'mois', 'months');
const yesNo = (l: L, id: string, label: string, def = 0) => ({ id, label, def, options: [{ value: '0', label: T(l, 'Non', 'No') }, { value: '1', label: T(l, 'Oui', 'Yes') }] });
const kids = (l: L, def = 2, min = 0) => ({ id: 'n', label: T(l, 'Enfants mineurs', 'Children under 18'), def, options: [0, 1, 2, 3, 4].filter((n) => n >= min).map((n) => ({ value: String(n), label: String(n) })) });
const D = P.divorce;

export const SPECS_DIVORCE: Record<string, (l: L) => MiniSpec> = {
  pc: (l) => ({ title: T(l, 'Prestation compensatoire : trois méthodes indicatives', 'Compensatory payment: three rule-of-thumb methods'), cta: CTA(l), inputs: [
    money('a', T(l, 'Revenu mensuel de l’époux le plus aisé', 'Monthly income of the better-off spouse'), 4500, 1000000),
    money('b', T(l, 'Revenu mensuel de l’autre époux', 'Monthly income of the other spouse'), 1800, 1000000),
    { id: 'd', label: T(l, 'Durée du mariage', 'Length of the marriage'), def: 18, unit: yrs(l), max: 80 }], run: ({ a, b, d }) => {
    const m = methodesPC(a, b, d);
    return { head: [T(l, 'Fourchette indicative (capital)', 'Indicative range (lump sum)'), m.max > 0 ? `${$(m.min, l)} – ${$(m.max, l)}` : $(0, l)], rows: [
      [T(l, 'Moitié de l’écart mensuel × années', 'Half the monthly gap × years'), $(m.demi, l)],
      [T(l, '20 % de l’écart annuel × 8 ans', '20% of the yearly gap × 8 years'), $(m.vingt, l)],
      [T(l, 'Tiers de l’écart annuel × moitié de la durée', 'A third of the yearly gap × half the length'), $(m.tiers, l)],
      [T(l, 'Écart de revenus par mois', 'Income gap per month'), $(m.ecartMensuel, l)]], note: T(l, 'Aucune méthode n’a de valeur légale : le juge apprécie les critères de l’article 271 du Code civil.', 'No method has legal force: the judge weighs the criteria of article 271 of the Civil Code.') };
  } }),
  pcfisc: (l) => ({ title: T(l, 'Capital en un an, versements étalés ou rente : l’impôt', 'Lump sum within a year, instalments or annuity: the tax'), cta: CTA(l), inputs: [
    money('m', T(l, 'Sommes versées dans l’année', 'Amount paid in the year'), 30000),
    { id: 'f', label: T(l, 'Forme du versement', 'How it is paid'), def: 0, options: [{ value: '0', label: T(l, 'Capital sur 12 mois au plus', 'Lump sum within 12 months') }, { value: '1', label: T(l, 'Capital étalé sur plus de 12 mois', 'Lump sum over more than 12 months') }, { value: '2', label: T(l, 'Rente', 'Annuity') }] },
    money('i', T(l, 'Revenu imposable annuel de celui qui verse', 'Payer’s annual taxable income'), 60000)], run: ({ m, f, i }) => {
    const forme = (['capital12', 'etale', 'rente'] as FormePC[])[f] ?? 'capital12'; const x = fiscalPC(m, forme, i);
    return { head: [T(l, 'Impôt économisé par celui qui verse', 'Tax saved by the payer'), $(x.economie, l)], rows: [
      [forme === 'capital12' ? T(l, 'Réduction d’impôt (25 %, assiette 30 500 € au plus)', 'Tax reduction (25%, on €30,500 at most)') : T(l, 'Montant déduit du revenu', 'Amount deducted from income'), $(forme === 'capital12' ? x.reduction : x.deduction, l)],
      [T(l, 'Coût net pour celui qui verse', 'Net cost to the payer'), $(x.coutNet, l)],
      [T(l, 'Imposable chez celui qui reçoit', 'Taxable for the recipient'), $(x.imposableBeneficiaire, l)]], note: T(l, 'Une part de quotient familial, sans décote : ordre de grandeur.', 'One tax share, no décote: an order of magnitude.') };
  } }),
  soulte: (l) => ({ title: T(l, 'Calcul de la soulte et du droit de partage', 'Soulte and partition duty'), cta: CTA(l), inputs: [
    money('v', T(l, 'Valeur du logement aujourd’hui', 'Value of the home today'), 320000),
    money('c', T(l, 'Capital restant dû sur le prêt', 'Capital still owed on the loan'), 140000),
    { id: 'q', label: T(l, 'Part de celui qui s’en va', 'Share of the spouse leaving'), def: 50, unit: '%', max: 100 }], run: ({ v, c, q }) => {
    const s = soulte(v, c, q / 100);
    return { head: [T(l, 'Soulte à verser', 'Soulte to pay'), $(s.soulte, l)], rows: [
      [T(l, 'Valeur nette du bien', 'Net value of the home'), $(s.valeurNette, l)],
      [T(l, 'Droit de partage (1,10 %)', 'Partition duty (1.10%)'), $(s.droitPartage, l)],
      [T(l, 'Total à financer, prêt repris compris', 'Total to fund, loan taken over included'), $(s.aFinancer, l)]], note: T(l, 'Hors émoluments du notaire, proportionnels et réglementés : demandez son décompte.', 'Excluding the notary’s regulated proportional fee: ask for the notary’s statement.') };
  } }),
  rachat: (l) => ({ title: T(l, 'Rachat de soulte : la mensualité du nouveau prêt', 'Buying out your ex: the new monthly payment'), cta: CTA(l), inputs: [
    money('v', T(l, 'Valeur du logement', 'Value of the home'), 280000),
    money('c', T(l, 'Capital restant dû', 'Capital still owed'), 110000),
    { id: 't', label: T(l, 'Taux du nouveau prêt', 'Rate of the new loan'), def: 3.4, unit: '%', max: 20, decimals: 2 },
    { id: 'd', label: T(l, 'Durée', 'Term'), def: 20, unit: yrs(l), max: 30 }], run: ({ v, c, t, d }) => {
    const s = soulte(v, c, 0.5); const emprunt = s.aFinancer; const mens = mensualite(emprunt, t, d);
    return { head: [T(l, 'Mensualité hors assurance', 'Monthly payment, before insurance'), $(mens, l)], rows: [
      [T(l, 'Soulte (moitié de la valeur nette)', 'Soulte (half the net value)'), $(s.soulte, l)],
      [T(l, 'Montant à emprunter (soulte + prêt + droit)', 'Amount to borrow (soulte + loan + duty)'), $(emprunt, l)],
      [T(l, 'Coût total des intérêts', 'Total interest'), $(Math.max(0, mens * Math.round(d * 12) - emprunt), l)]], note: T(l, 'Le taux saisi est le vôtre : aucun taux de banque n’est intégré au calcul.', 'The rate is the one you enter: no bank rate is built in.') };
  } }),
  partage: (l) => ({ title: T(l, 'Liquidation de la communauté : la part de chacun', 'Winding up the community: each spouse’s share'), cta: CTA(l), inputs: [
    money('a', T(l, 'Biens communs (valeur totale)', 'Community assets (total value)'), 380000),
    money('d', T(l, 'Dettes communes', 'Community debts'), 120000),
    { id: 'r', label: T(l, 'Récompense due par la communauté à l’époux A', 'Reimbursement the community owes spouse A'), def: 15000, unit: '€', max: 10000000 }], run: ({ a, d, r }) => {
    const x = liquidation(a, d, r);
    return { head: [T(l, 'Part de l’époux A', 'Spouse A’s share'), $(x.partA, l)], rows: [
      [T(l, 'Part de l’époux B', 'Spouse B’s share'), $(x.partB, l)],
      [T(l, 'Actif net de la communauté', 'Net community assets'), $(x.actifNet, l)],
      [T(l, 'Droit de partage (1,10 %)', 'Partition duty (1.10%)'), $(x.droitPartage, l)]] };
  } }),
  cout: (l) => ({ title: T(l, 'Prix du divorce : frais réglementés et honoraires', 'Price of a divorce: regulated fees and lawyers'), cta: CTA(l), inputs: [
    { id: 'p', label: T(l, 'Procédure', 'Procedure'), def: 0, options: [{ value: '0', label: T(l, 'Consentement mutuel sans juge', 'Mutual consent, no court') }, { value: '1', label: T(l, 'Divorce devant le juge', 'Divorce in court') }] },
    money('a', T(l, 'Honoraires de l’avocat de l’époux A (devis)', 'Spouse A’s lawyer fee (quote)'), 1500, 1000000),
    money('b', T(l, 'Honoraires de l’avocat de l’époux B (devis)', 'Spouse B’s lawyer fee (quote)'), 1500, 1000000),
    money('n', T(l, 'Biens à partager (valeur nette)', 'Property to divide (net value)'), 0)], run: ({ p, a, b, n }) => {
    const c = coutDivorce(p === 1 ? 'juge' : 'notaire', a, b, n);
    return { head: [T(l, 'Coût total du divorce', 'Total cost of the divorce'), $(c.total, l)], rows: [
      [T(l, 'Dépôt de la convention chez le notaire', 'Filing the agreement with a notary'), formatMoney(c.depotNotaire, 2, l)],
      [T(l, 'Droit de partage', 'Partition duty'), $(c.droitPartage, l)],
      [T(l, 'Honoraires des deux avocats', 'Both lawyers’ fees'), $(c.honoraires, l)],
      [T(l, 'Par époux, partage par moitié', 'Per spouse, split in half'), $(c.parEpoux, l)]], note: T(l, 'Les honoraires sont libres : remplacez les valeurs par vos devis.', 'Lawyers’ fees are not regulated: replace the figures with your quotes.') };
  } }),
  aj: (l) => ({ title: T(l, 'Aide juridictionnelle : quelle prise en charge ?', 'Legal aid: how much is covered?'), cta: CTA(l), inputs: [
    money('r', T(l, 'Votre revenu fiscal de référence', 'Your reference taxable income'), 14000, 10000000),
    { id: 'p', label: T(l, 'Personnes dans votre foyer', 'People in your household'), def: 1, options: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })) }], run: ({ r, p }) => {
    const t = aideJuridictionnelle(r, p); const pl = (P.aide_juridictionnelle.plafonds as Record<string, number[]>)[String(p)] ?? [0, 0, 0];
    return { head: [T(l, 'Part des frais prise en charge par l’État', 'Share of costs paid by the State'), formatPercent(t, 0, l)], rows: [
      [T(l, 'Plafond de l’aide totale', 'Ceiling for full aid'), $(pl[0], l)], [T(l, 'Plafond à 55 %', 'Ceiling at 55%'), $(pl[1], l)], [T(l, 'Plafond à 25 %', 'Ceiling at 25%'), $(pl[2], l)]], note: T(l, 'Le patrimoine compte aussi : au-delà de ses plafonds, aucune aide.', 'Assets count too: above their ceilings, no aid at all.') };
  } }),
  cm: (l) => ({ title: T(l, 'Divorce par consentement mutuel : délai et frais minimaux', 'Mutual consent divorce: minimum time and fees'), cta: CTA(l), inputs: [
    { id: 'j', label: T(l, 'Jours pour préparer la convention', 'Days to prepare the agreement'), def: 45, unit: T(l, 'jours', 'days'), max: 3650 },
    money('n', T(l, 'Biens à partager (valeur nette)', 'Property to divide (net value)'), 150000)], run: ({ j, n }) => {
    const min = delaiMinimalConsentement();
    return { head: [T(l, 'Divorce effectif au plus tôt après', 'Divorce effective at the earliest after'), T(l, `${formatNumber(j + min, 0, l)} jours`, `${formatNumber(j + min, 0, l)} days`)], rows: [
      [T(l, 'Délai de réflexion après réception du projet', 'Cooling-off period after receiving the draft'), T(l, `${D.reflexion_jours} jours`, `${D.reflexion_jours} days`)],
      [T(l, 'Transmission au notaire, puis dépôt', 'Sending to the notary, then filing'), T(l, `${D.transmission_notaire_jours} + ${D.depot_notaire_delai_jours} jours au plus`, `${D.transmission_notaire_jours} + ${D.depot_notaire_delai_jours} days at most`)],
      [T(l, 'Frais réglementés (dépôt + droit de partage)', 'Regulated fees (filing + partition duty)'), $(D.depot_notaire_ttc + droitPartage(n), l)]] };
  } }),
  faute: (l) => ({ title: T(l, 'Ce que coûte le contentieux par rapport à l’amiable', 'What a contested divorce costs compared with an amicable one'), cta: CTA(l), inputs: [
    money('a', T(l, 'Honoraires par époux, divorce amiable (devis)', 'Fee per spouse, amicable divorce (quote)'), 1500, 1000000),
    money('c', T(l, 'Honoraires par époux, divorce pour faute (devis)', 'Fee per spouse, fault-based divorce (quote)'), 4000, 1000000),
    money('n', T(l, 'Biens à partager (valeur nette)', 'Property to divide (net value)'), 100000)], run: ({ a, c, n }) => {
    const x = coutDivorce('notaire', a, a, n), y = coutDivorce('juge', c, c, n);
    return { head: [T(l, 'Surcoût du contentieux pour le couple', 'Extra cost of going to court, for the couple'), $(y.total - x.total, l)], rows: [
      [T(l, 'Divorce amiable, total', 'Amicable divorce, total'), $(x.total, l)], [T(l, 'Divorce pour faute, total', 'Fault-based divorce, total'), $(y.total, l)], [T(l, 'Droit de partage, dans les deux cas', 'Partition duty, in both cases'), $(x.droitPartage, l)]], note: T(l, 'Hors expertise, commissaire de justice et appel, qui s’ajoutent souvent au contentieux.', 'Excluding expert reports, bailiff and appeal, often added in contested cases.') };
  } }),
  enligne: (l) => ({ title: T(l, 'Divorce « en ligne » : le vrai total', '“Online” divorce: the real total'), cta: CTA(l), inputs: [
    money('f', T(l, 'Forfait annoncé, par époux', 'Advertised fixed fee, per spouse'), 600, 100000),
    money('o', T(l, 'Options ou suppléments, par époux', 'Extras or add-ons, per spouse'), 150, 100000),
    money('n', T(l, 'Biens à partager (valeur nette)', 'Property to divide (net value)'), 0)], run: ({ f, o, n }) => {
    const c = coutDivorce('notaire', f + o, f + o, n);
    return { head: [T(l, 'Total pour le couple', 'Total for the couple'), $(c.total, l)], rows: [
      [T(l, 'Deux avocats, forfaits et options', 'Two lawyers, fees and extras'), $(c.honoraires, l)], [T(l, 'Dépôt chez le notaire', 'Notary filing'), formatMoney(c.depotNotaire, 2, l)], [T(l, 'Droit de partage', 'Partition duty'), $(c.droitPartage, l)]], note: T(l, 'Un bien immobilier impose un acte notarié, facturé en plus.', 'A property requires a notarial deed, charged on top.') };
  } }),
  delais: (l) => ({ title: T(l, 'Où en êtes-vous des délais légaux ?', 'Where are you in the legal time limits?'), cta: CTA(l), inputs: [
    { id: 'm', label: T(l, 'Mois depuis la fin de la vie commune', 'Months since you stopped living together'), def: 5, unit: months(l), max: 600 },
    { id: 's', label: T(l, 'Mois depuis un jugement de séparation de corps (0 si aucun)', 'Months since a legal separation judgment (0 if none)'), def: 0, unit: months(l), max: 600 }], run: ({ m, s }) => {
    const a = moisAvantAlteration(m), c = moisAvantConversion(s);
    return { head: [T(l, 'Avant l’altération définitive du lien conjugal', 'Before “definitive breakdown” can be claimed'), a === 0 ? T(l, 'délai atteint', 'reached') : T(l, `${a} mois`, `${a} months`)], rows: [
      [T(l, 'Consentement mutuel, au plus serré', 'Mutual consent, tightest timetable'), T(l, `${delaiMinimalConsentement()} jours après le projet`, `${delaiMinimalConsentement()} days after the draft`)],
      [T(l, 'Conversion d’une séparation de corps', 'Converting a legal separation'), s <= 0 ? T(l, 'sans objet', 'not applicable') : c === 0 ? T(l, 'possible', 'possible') : T(l, `dans ${c} mois`, `in ${c} months`)],
      [T(l, 'Divorce accepté ou pour faute', 'Accepted or fault-based divorce'), T(l, 'aucun délai préalable', 'no prior waiting time')]] };
  } }),
  impots: (l) => ({ title: T(l, 'Impôt l’année du divorce : avant, après', 'Tax in the year of divorce: before and after'), cta: CTA(l), inputs: [
    money('a', T(l, 'Revenu imposable annuel de A (qui verse la pension)', 'A’s annual taxable income (pays support)'), 42000),
    money('b', T(l, 'Revenu imposable annuel de B', 'B’s annual taxable income'), 24000),
    kids(l, 2),
    { id: 'g', label: T(l, 'Garde des enfants', 'Custody'), def: 0, options: [{ value: '0', label: T(l, 'Chez B, A verse une pension', 'With B, A pays support') }, { value: '1', label: T(l, 'Résidence alternée', 'Shared residence') }] },
    money('p', T(l, 'Pension versée par mois (tous enfants)', 'Support paid per month (all children)'), 350, 100000)], run: ({ a, b, n, g, p }) => {
    const x = anneeDivorce(a, b, n, g === 1 ? 'alternee' : 'principale', p * 12);
    return { head: [T(l, 'Écart d’impôt pour les deux foyers réunis', 'Change in tax for both households together'), `${x.ecart > 0 ? '+' : ''}${$(x.ecart, l)}`], rows: [
      [T(l, 'Impôt du couple avant (déclaration commune)', 'Couple’s tax before (joint return)'), $(x.avant, l)],
      [T(l, `Impôt de A après (${formatDecimal(x.partsA, 2, l)} part)`, `A’s tax after (${formatDecimal(x.partsA, 2, l)} shares)`), $(x.apresA, l)],
      [T(l, `Impôt de B après (${formatDecimal(x.partsB, 2, l)} parts)`, `B’s tax after (${formatDecimal(x.partsB, 2, l)} shares)`), $(x.apresB, l)]], note: T(l, 'Barème et plafonnement du quotient familial ; décote et réductions non modélisées.', 'Tax scale and the cap on tax shares; décote and credits not modelled.') };
  } }),
  cafalt: (l) => ({ title: T(l, 'Garde alternée : allocations et parts fiscales de chaque parent', 'Shared custody: each parent’s benefits and tax shares'), cta: CTA(l), inputs: [
    kids(l, 2, 1),
    money('a', T(l, 'Ressources annuelles du parent A', 'Parent A’s annual income'), 38000),
    money('b', T(l, 'Ressources annuelles du parent B', 'Parent B’s annual income'), 26000)], run: ({ n, a, b }) => {
    const afA = allocationsFamiliales(n, a) / 2, afB = allocationsFamiliales(n, b) / 2; const parts = impotParent(a, n, 'alternee').parts;
    return { head: [T(l, 'Allocations familiales du parent A, par mois', 'Parent A’s family allowance, per month'), formatMoney(afA, 2, l)], rows: [
      [T(l, 'Allocations familiales du parent B', 'Parent B’s family allowance'), formatMoney(afB, 2, l)],
      [T(l, 'Parts fiscales de chaque parent (isolé)', 'Tax shares of each parent (living alone)'), formatDecimal(parts, 2, l)],
      [T(l, 'Si un seul parent était allocataire (A)', 'If only parent A claimed'), formatMoney(allocationsFamiliales(n, a), 2, l)]], note: T(l, 'Partage choisi : chaque parent reçoit la moitié, selon ses propres ressources. Aucune allocation pour un seul enfant.', 'Sharing chosen: each parent gets half, based on their own income. No allowance for an only child.') };
  } }),
  reversion: (l) => ({ title: T(l, 'Votre réversion d’ex-conjoint, par mois', 'Your survivor pension as a former spouse, per month'), cta: CTA(l), inputs: [
    money('b', T(l, 'Retraite de base du défunt, par mois', 'Deceased’s basic pension, per month'), 1300, 100000),
    money('c', T(l, 'Retraite complémentaire Agirc-Arrco du défunt', 'Deceased’s Agirc-Arrco pension'), 700, 100000),
    { id: 'm', label: T(l, 'Durée de votre mariage', 'Length of your marriage'), def: 18, unit: yrs(l), max: 80 },
    { id: 'o', label: T(l, 'Durée de son mariage suivant (0 si aucun)', 'Length of their later marriage (0 if none)'), def: 0, unit: yrs(l), max: 80 },
    money('r', T(l, 'Vos ressources annuelles brutes', 'Your gross annual resources'), 16000, 10000000),
    yesNo(l, 'x', T(l, 'Vous êtes-vous remarié(e) ?', 'Have you remarried?'))], run: ({ b, c, m, o, r, x }) => {
    const v = reversionExConjoint({ baseDefunt: b, complDefunt: c, mariageAns: m, autreMariageAns: o, trimestresDefunt: 0, ressourcesAnnuelles: r, enCouple: false, remarie: x === 1 });
    return { head: [T(l, 'Réversion totale estimée, brute', 'Estimated total, gross'), $(v.total, l)], rows: [
      [T(l, `Régime général (54 %, part ${pct(v.partRG, l)})`, `General scheme (54%, share ${pct(v.partRG, l)})`), $(v.rgVersee, l)],
      [T(l, `Agirc-Arrco (60 %, part ${pct(v.partAA, l)})`, `Agirc-Arrco (60%, share ${pct(v.partAA, l)})`), $(v.aa, l)],
      [T(l, 'Réduite par le plafond de ressources', 'Reduced by the income ceiling'), v.reduiteParPlafond ? T(l, 'oui', 'yes') : T(l, 'non', 'no')]], note: T(l, 'Sans conjoint survivant, la part Agirc-Arrco se rapporte à 170 trimestres d’assurance du défunt (maximum retenu).', 'With no surviving spouse, the Agirc-Arrco share is measured against 170 quarters of the deceased’s insurance (the maximum used).') };
  } }),
  pacs: (l) => ({ title: T(l, 'Rupture de Pacs : racheter la part du logement indivis', 'Ending a PACS: buying the other partner’s share of the home'), cta: CTA(l), inputs: [
    money('v', T(l, 'Valeur du logement acheté à deux', 'Value of the home bought together'), 240000),
    money('c', T(l, 'Capital restant dû', 'Capital still owed'), 150000),
    { id: 'q', label: T(l, 'Quote-part du partenaire qui part (acte d’achat)', 'Leaving partner’s share (purchase deed)'), def: 50, unit: '%', max: 100 }], run: ({ v, c, q }) => {
    const s = soulte(v, c, q / 100);
    return { head: [T(l, 'Somme à verser au partenaire qui part', 'Amount to pay the leaving partner'), $(s.soulte, l)], rows: [
      [T(l, 'Valeur nette du bien', 'Net value of the home'), $(s.valeurNette, l)],
      [T(l, 'Droit de partage après rupture de Pacs (1,10 %)', 'Partition duty after a PACS ends (1.10%)'), $(s.droitPartage, l)],
      [T(l, 'Ce que conserve celui qui reste (net)', 'Net share kept by the partner who stays'), $(s.partConserve, l)]] };
  } }),
  sepcorps: (l) => ({ title: T(l, 'Séparation de corps : partage et passerelle vers le divorce', 'Legal separation: dividing assets and the route to divorce'), cta: CTA(l), inputs: [
    money('n', T(l, 'Actif net de la communauté', 'Net community assets'), 200000),
    { id: 's', label: T(l, 'Mois depuis le jugement de séparation', 'Months since the separation judgment'), def: 8, unit: months(l), max: 600 }], run: ({ n, s }) => {
    const x = liquidation(n, 0, 0); const c = moisAvantConversion(s);
    return { head: [T(l, 'Droit de partage à prévoir', 'Partition duty to budget for'), $(x.droitPartage, l)], rows: [
      [T(l, 'Part de chaque époux', 'Each spouse’s share'), $(x.partA, l)],
      [T(l, 'Conversion en divorce à la demande d’un seul', 'Conversion to divorce by one spouse alone'), c === 0 ? T(l, 'possible dès maintenant', 'possible now') : T(l, `dans ${c} mois`, `in ${c} months`)],
      [T(l, 'Conversion d’un commun accord', 'Conversion by joint request'), T(l, 'à tout moment', 'at any time')]] };
  } }),
  impotsparent: (l) => ({ title: T(l, 'Votre impôt une fois seul, selon la garde', 'Your tax once on your own, by custody'), cta: CTA(l), inputs: [
    money('r', T(l, 'Votre revenu imposable annuel', 'Your annual taxable income'), 36000),
    kids(l, 2),
    { id: 'g', label: T(l, 'Garde', 'Custody'), def: 0, options: [{ value: '0', label: T(l, 'Les enfants vivent chez vous', 'The children live with you') }, { value: '1', label: T(l, 'Résidence alternée', 'Shared residence') }, { value: '2', label: T(l, 'Chez l’autre parent', 'With the other parent') }] }], run: ({ r, n, g }) => {
    const f = impotParent(r, n, (['principale', 'alternee', 'aucune'] as const)[g] ?? 'principale');
    return { head: [T(l, 'Impôt estimé sur l’année', 'Estimated tax for the year'), $(f.impot, l)], rows: [
      [T(l, 'Parts de quotient familial', 'Tax shares'), formatDecimal(f.parts, 2, l)], [T(l, 'Sans enfant à charge, pour comparer', 'With no child, for comparison'), $(f.impotSansEnfant, l)], [T(l, 'Plafonnement du quotient appliqué', 'Cap on tax shares applied'), f.plafonne ? T(l, 'oui', 'yes') : T(l, 'non', 'no')]] };
  } }),
};
