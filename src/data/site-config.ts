/** Configuration centrale du site (générée par new-site.py). */
export const SITE_URL = "https://calculdivorce.fr";
export const SITE_NAMES: Record<string, string> = {"fr": "Calcul Divorce", "en": "Calcul Divorce"};
export const LANG_TAGS: Record<string, string> = {"fr": "fr-FR", "en": "en-FR"};
export const OG_LOCALES: Record<string, string> = {"fr": "fr_FR", "en": "en_GB"};
export const LOCALE_TAG = 'fr-FR';
/** Une locale par langue (RECETTE §4) : « 1 234 € » en français, « €1,234 » en anglais. */
export const LOCALE_BY_LANG: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };
export const CURRENCY = 'EUR';
export const YEAR = 2026;
/** Année de création du site — signal d'ancienneté (RECETTE §8.0). */
export const SITE_FOUNDED = '2026';
export const LAST_UPDATED = '2026-10-04';
export const AUTHOR_NAME = 'Radif Partners';
export const AUTHOR_ROLE: Record<string, string> = {"fr": "Éditeur de calculateurs et de guides pratiques · argent du divorce et de la séparation, pension alimentaire, impôts et aides de la CAF", "en": "Publisher of calculators and practical guides · the money side of divorce and separation in France, child support, tax and CAF benefits"};
export const AUTHOR_DESC: Record<string, string> = {"fr": "Radif Partners édite des calculateurs gratuits et des guides pratiques. Chaque montant de ce site vient du ministère de la Justice, de la CAF, de service-public.fr, de l'administration fiscale ou des caisses de retraite, avec la source et la date de vérification sur la page.", "en": "Radif Partners publishes free calculators and practical guides. Every figure on this site comes from the French Ministry of Justice, the CAF, service-public.fr, the tax administration or the pension funds, with the source and the date it was checked on the page."};
/** Sujets sur lesquels l'editeur est competent (schema.org knowsAbout). Ce sont les
 *  themes reellement traites par le site, pas une liste de mots-cles : un sujet
 *  declare ici sans page qui le couvre est une declaration fausse. */
export const KNOWS_ABOUT: Record<string, string[]> = {"fr": ["Pension alimentaire", "Barème du ministère de la Justice", "Allocation de soutien familial", "Intermédiation financière des pensions alimentaires", "Fiscalité des pensions alimentaires", "Prestation compensatoire", "Soulte et droit de partage", "Coût et procédures de divorce", "Pension de réversion après divorce"], "en": ["Child support in France", "French Ministry of Justice child support scale", "Family support allowance (ASF)", "Child support payment service (ARIPA)", "Tax treatment of child support", "Compensatory payment (prestation compensatoire)", "Soulte and partition duty", "Divorce procedures and costs in France", "Survivor pension after divorce"]};
export const CONTACT_EMAIL = "contact@calculdivorce.fr";
export const THEME_COLOR = '#1F5F8B';
export const LOGO_SYMBOL = '€';
export const BING_VERIFY_CODE = '';
export const GOOGLE_VERIFY_CODE = '';
/** Régime de consentement : 'opt-in' = rien avant l'accord (UE, Suisse) ;
 *  'notice' = mesure d'audience active avec information préalable et retrait (CA, AU). */
export const CONSENT_MODE: 'opt-in' | 'notice' | 'none' = 'opt-in';
export const GA4_ID = '';
/** Projet Microsoft Clarity (compte amradif). Vide = aucun traceur ni bandeau. */
export const CLARITY_ID = '';
export const INDEXNOW_KEY = '7c2e9a4f1b6d3e8a5c0f2b7d9e4a1c63';

/* ------------------------------------------------------------------------- *
 * IDENTITÉ LÉGALE — À COMPLÉTER AVANT LA MISE EN LIGNE
 * Ces champs alimentent la mention légale du pays, la politique de confidentialité,
 * la page contact et le schema Organization. Un champ vide s'affiche en jaune
 * sur le site. Contrôle : `npm run check:legal`.
 * ------------------------------------------------------------------------- */
export interface LegalHosting { name: string; address: string; phone: string; url: string }
export interface LegalIdentity {
  entityName: string; legalForm: string; street: string; postalCode: string; city: string;
  country: string; phone: string; registerLabel: string; registerNumber: string;
  vatLabel: string; vatNumber: string; jurisdiction: string;
  supervisoryAuthority: string; supervisoryAuthorityUrl: string; hosting: LegalHosting;
}
export const LEGAL: LegalIdentity = {
  entityName: 'Radif Partners',  // éditeur de tous les sites du portefeuille (RECETTE §8)
  legalForm: '',  // vide : publication à titre personnel, pas de société
  street: '49 rue du Ressort',
  postalCode: '63000',
  city: 'Clermont-Ferrand',
  country: "France",
  phone: '',                 // ligne de contact publiée
  registerLabel: "SIREN",
  registerNumber: '',
  vatLabel: "TVA",
  vatNumber: '',             // laisser vide si non assujetti
  jurisdiction: "France",
  supervisoryAuthority: "Commission nationale de l'informatique et des libertés (CNIL)",
  supervisoryAuthorityUrl: "https://www.cnil.fr",
  hosting: { name: 'GitHub, Inc. (GitHub Pages)', address: '88 Colin P Kelly Jr Street, San Francisco, CA 94107, United States', phone: '', url: 'https://pages.github.com' },
};

/** Champs sans lesquels le site ne doit pas être mis en ligne. */
export const LEGAL_REQUIRED: Array<keyof LegalIdentity> = ['entityName', 'street', 'postalCode', 'city'];

/** Profils publics de l'auteur (schema.org sameAs). Laisser vide si aucun. */
export const AUTHOR_SAME_AS: string[] = [];

/** Rythme de revue éditoriale annoncé sur le site, en mois. */
export const REVIEW_CYCLE_MONTHS = 12;
