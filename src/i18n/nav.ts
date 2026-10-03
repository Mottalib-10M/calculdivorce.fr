import { route, AMOUNTS, type Locale } from './routes';
export interface NavLink { href: string; label: string } export interface NavCategory { label: string; links: NavLink[] }
const L: Record<Locale, Record<string, string>> = {
  fr: { home: 'Calcul de la pension', bareme: 'Barème du ministère', modes: 'Droit de visite et pension', alternee: 'Garde alternée', enfant1: '1 enfant', enfant2: '2 enfants', enfant3: '3 enfants', enfant4: '4 enfants et plus', majeur: 'Enfant majeur', unions: 'Plusieurs familles', revalo: 'Revalorisation', asf: 'ASF (CAF)', deduction: 'Déduction d’impôts', imposable: 'Pension imposable', arrieres: 'Arriérés', caf: 'Pension et CAF (Aripa)', impayee: 'Pension impayée', paiementdirect: 'Paiement direct', abandon: 'Abandon de famille', etranger: 'Débiteur à l’étranger', revision: 'Révision', chomage: 'Chômage ou RSA', conjoint: 'Nouveau conjoint', amiable: 'Convention parentale', juge: 'Ce que regarde le juge', frais: 'Frais exceptionnels', duree: 'Jusqu’à quel âge', epoux: 'Entre époux', ascendants: 'Parents âgés', method: 'Méthodologie', faq: 'FAQ', widget: 'Intégrer le calculateur', about: 'À propos', contact: 'Contact', editorial: 'Charte éditoriale', privacy: 'Confidentialité', terms: 'Mentions légales', cookies: 'Cookies' },
  en: { home: 'Child support calculator', bareme: 'Ministry table', modes: 'Visiting rights and support', alternee: 'Shared custody', enfant1: '1 child', enfant2: '2 children', enfant3: '3 children', enfant4: '4 children or more', majeur: 'Adult child', unions: 'Two families', revalo: 'Annual indexation', asf: 'ASF (CAF)', deduction: 'Tax deduction', imposable: 'Is it taxable?', arrieres: 'Arrears', caf: 'CAF and ARIPA', impayee: 'Unpaid support', paiementdirect: 'Direct payment', abandon: 'Family abandonment', etranger: 'Parent abroad', revision: 'Changing the amount', chomage: 'Unemployed parent', conjoint: 'New partner', amiable: 'Parenting agreement', juge: 'How judges decide', frais: 'Extra costs', duree: 'How long it lasts', epoux: 'Spousal support', ascendants: 'Elderly parents', method: 'Methodology', faq: 'FAQ', widget: 'Embed the calculator', about: 'About', contact: 'Contact', editorial: 'Editorial policy', privacy: 'Privacy', terms: 'Legal notice', cookies: 'Cookies' },
};
export const label = (id: string, lang: Locale) => L[lang][id] ?? id;
const link = (id: string, lang: Locale): NavLink => ({ href: route(id, lang), label: label(id, lang) });
export const amountLabel = (a: number, lang: Locale) => lang === 'fr' ? `${a.toLocaleString('fr-FR')} € net par mois` : `€${a.toLocaleString('en-GB')} net a month`;
export function navCategories(lang: Locale): NavCategory[] {
  return [
    { label: lang === 'fr' ? 'Calculer' : 'Calculate', links: ['home', 'bareme', 'modes', 'alternee', 'enfant1', 'enfant2', 'enfant3', 'enfant4', 'majeur', 'unions'].map((i) => link(i, lang)) },
    { label: lang === 'fr' ? 'CAF, impôts, impayés' : 'CAF, tax, arrears', links: ['caf', 'asf', 'revalo', 'deduction', 'imposable', 'arrieres', 'impayee', 'paiementdirect', 'abandon', 'etranger'].map((i) => link(i, lang)) },
    { label: lang === 'fr' ? 'Guides' : 'Guides', links: ['juge', 'revision', 'chomage', 'conjoint', 'amiable', 'frais', 'duree', 'epoux', 'ascendants'].map((i) => link(i, lang)) },
    { label: lang === 'fr' ? 'Par revenu' : 'By income', links: AMOUNTS.map((a) => ({ href: route(`amount-${a}`, lang), label: amountLabel(a, lang) })) },
  ];
}
export const navDirect = (lang: Locale): NavLink[] => [link('faq', lang), link('method', lang)];
export const footerColumns = (lang: Locale): NavCategory[] => [...navCategories(lang).slice(0, 3), { label: lang === 'fr' ? 'Le site' : 'Site', links: ['about', 'method', 'faq', 'contact', 'editorial', 'widget', 'terms', 'privacy', 'cookies'].map((i) => link(i, lang)) }];
export const popularLinks = (lang: Locale): NavLink[] => AMOUNTS.map((a) => ({ href: route(`amount-${a}`, lang), label: amountLabel(a, lang) }));
