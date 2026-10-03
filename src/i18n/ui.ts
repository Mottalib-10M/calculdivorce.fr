import type { Locale } from './routes';
const fr = {
  updatedOn: 'Mis à jour le', editorialPolicy: 'Charte éditoriale', contactLabel: 'Contact', reviewedBy: 'Vérifié par',
  skipToContent: 'Aller au contenu', mainNav: 'Navigation principale', breadcrumbLabel: 'Fil d’Ariane', breadcrumbHome: 'Accueil', menuOpen: 'Ouvrir le menu',
  faqTitle: 'Questions fréquentes', relatedCalculators: 'Calculs et guides associés', sourcesTitle: 'Sources', writtenBy: 'Rédigé par',
  asOf: 'Barèmes', lastUpdated: 'mis à jour le', footerValidated: 'Table de référence du ministère de la Justice', footerBrowser: '100 % dans votre navigateur · aucune donnée transmise · gratuit',
  footerDisclaimer: 'Estimation indicative : seul le juge aux affaires familiales, ou votre accord homologué, fixe la pension.', footerPopular: 'Pension selon le revenu du parent débiteur', notFound: 'Cette page n’existe pas.',
};
const en: typeof fr = {
  updatedOn: 'Updated on', editorialPolicy: 'Editorial policy', contactLabel: 'Contact', reviewedBy: 'Checked by',
  skipToContent: 'Skip to content', mainNav: 'Main navigation', breadcrumbLabel: 'Breadcrumb', breadcrumbHome: 'Home', menuOpen: 'Open menu',
  faqTitle: 'Frequently asked questions', relatedCalculators: 'Related calculators and guides', sourcesTitle: 'Sources', writtenBy: 'Written by',
  asOf: 'Rates', lastUpdated: 'last updated', footerValidated: 'French Ministry of Justice reference table', footerBrowser: '100% in your browser · no data sent · free',
  footerDisclaimer: 'Estimate only: the family court judge (JAF), or your approved agreement, sets the actual amount.', footerPopular: 'Child support by the paying parent’s income', notFound: 'This page does not exist.',
};
export function t(lang: Locale) { return lang === 'en' ? en : fr; }
