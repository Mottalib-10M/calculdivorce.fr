import { makeRouter, type RouteDef } from './routes-core';
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
/** Revenus mensuels nets du parent débiteur qui ont une page propre (chacune autour d'un seuil). */
export const AMOUNTS = [1000, 1200, 1500, 1800, 2000, 2200, 2500, 3000, 3500, 4000, 5000, 6000] as const;
const R = (id: string, fr: string, en: string, noindex = false): RouteDef<Locale> => ({ id, paths: { fr: `/fr/${fr}/`, en: `/en/${en}/` }, ...(noindex ? { noindex } : {}) });
export const ROUTES: RouteDef<Locale>[] = [
  { id: 'home', paths: { fr: '/fr/', en: '/en/' } },
  R('bareme', 'bareme-pension-alimentaire', 'child-support-table'),
  R('modes', 'droit-de-visite-et-pension', 'visiting-rights-and-child-support'),
  R('alternee', 'pension-alimentaire-garde-alternee', 'child-support-shared-custody'),
  R('enfant1', 'pension-alimentaire-1-enfant', 'child-support-one-child'),
  R('enfant2', 'pension-alimentaire-2-enfants', 'child-support-two-children'),
  R('enfant3', 'pension-alimentaire-3-enfants', 'child-support-three-children'),
  R('enfant4', 'pension-alimentaire-4-enfants-et-plus', 'child-support-four-or-more-children'),
  R('majeur', 'pension-alimentaire-enfant-majeur', 'child-support-adult-child'),
  R('unions', 'pension-alimentaire-plusieurs-familles', 'child-support-two-families'),
  R('revalo', 'revalorisation-pension-alimentaire', 'child-support-indexation'),
  R('asf', 'allocation-soutien-familial', 'family-support-allowance'),
  R('deduction', 'pension-alimentaire-deduction-impots', 'child-support-tax-deduction'),
  R('imposable', 'pension-alimentaire-imposable', 'is-child-support-taxable'),
  R('arrieres', 'arrieres-pension-alimentaire', 'child-support-arrears'),
  ...AMOUNTS.map((a) => R(`amount-${a}`, `pension-alimentaire-${a}-euros`, `child-support-${a}-euros-income`)),
  R('caf', 'pension-alimentaire-caf', 'child-support-caf-aripa'),
  R('impayee', 'pension-alimentaire-impayee', 'unpaid-child-support'),
  R('paiementdirect', 'paiement-direct-pension-alimentaire', 'direct-payment-procedure'),
  R('abandon', 'abandon-de-famille', 'family-abandonment-offence'),
  R('etranger', 'pension-alimentaire-debiteur-etranger', 'child-support-parent-abroad'),
  R('revision', 'revision-pension-alimentaire', 'changing-child-support'),
  R('chomage', 'pension-alimentaire-chomage-rsa', 'child-support-unemployed-parent'),
  R('conjoint', 'pension-alimentaire-nouveau-conjoint', 'child-support-new-partner'),
  R('amiable', 'convention-parentale-pension', 'child-support-agreement'),
  R('juge', 'comment-le-juge-fixe-la-pension', 'how-judges-set-child-support'),
  R('frais', 'frais-exceptionnels-enfant', 'extra-costs-for-children'),
  R('duree', 'pension-alimentaire-jusqua-quel-age', 'how-long-child-support-lasts'),
  R('epoux', 'pension-alimentaire-entre-epoux', 'spousal-support-france'),
  R('ascendants', 'pension-alimentaire-parents-ages', 'supporting-elderly-parents'),
  R('method', 'methodologie', 'methodology'),
  R('faq', 'faq', 'faq'),
  R('about', 'a-propos', 'about'),
  R('widget', 'widget', 'widget', true),
  R('contact', 'contact', 'contact', true),
  R('editorial', 'charte-editoriale', 'editorial-policy', true),
  R('privacy', 'confidentialite', 'privacy', true),
  R('terms', 'mentions-legales', 'legal-notice', true),
  R('cookies', 'cookies', 'cookies', true),
];
export const { NOINDEX_PATHS, route, altPaths } = makeRouter(LOCALES, ROUTES);
