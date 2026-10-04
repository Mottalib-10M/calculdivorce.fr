/**
 * Calculateur pilier « l'argent du divorce » : pension alimentaire (table Justice), prestation compensatoire
 * (trois méthodes indicatives), soulte et droit de partage, frais réglementés et réduction d'impôt.
 * Premier rendu = valeurs par défaut du build ; le lien partagé n'est lu qu'après le montage (RECETTE §17.5).
 * Tous les montants viennent de `lib/engine/pension` et `lib/engine/divorce`.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import { pension, type Mode } from '../../lib/engine/pension';
import { methodesPC, fiscalPC, soulte, coutDivorce } from '../../lib/engine/divorce';
import { formatMoney } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang?: 'fr' | 'en'; methodHref?: string; links?: Record<string, string> }

const TXT = {
  fr: {
    a: 'Revenu net mensuel de l’époux A', aHelp: 'Net imposable, avant prélèvement à la source', b: 'Revenu net mensuel de l’époux B', bHelp: 'Zéro si B ne travaille pas',
    d: 'Durée du mariage', yrs: 'ans', n: 'Enfants mineurs', g: 'Résidence des enfants',
    gOpt: { B: 'Chez B (A a un droit de visite classique)', A: 'Chez A (B a un droit de visite classique)', alt: 'Résidence alternée' },
    v: 'Valeur du logement commun', vHelp: 'Zéro si vous êtes locataires', c: 'Capital restant dû sur le prêt', k: 'Qui garde le logement ?',
    kOpt: { vente: 'Personne : il est vendu', A: 'L’époux A', B: 'L’époux B' }, p: 'Procédure', pOpt: { notaire: 'Consentement mutuel sans juge', juge: 'Divorce devant le juge' },
    monthly: 'Chaque mois', pension: 'Pension alimentaire', payer: (x: string) => `versée par ${x} pour les enfants`, noKids: 'pas d’enfant mineur',
    once: 'Une fois, au divorce', pc: 'Prestation compensatoire indicative', pcRange: 'fourchette des trois méthodes', pcFrom: (x: string) => `due par ${x}, si elle est demandée`,
    soulte: 'Soulte', soulteBy: (x: string) => `versée par ${x} pour garder le logement`, soulteNone: 'logement vendu ou absent : pas de soulte',
    fees: 'Frais réglementés', dp: 'Droit de partage (1,10 %)', depot: 'Dépôt de la convention chez le notaire', reduc: 'Réduction d’impôt si la prestation est versée en capital sous 12 mois',
    lawyer: 'Honoraires d’avocat : libres, à ajouter selon vos devis.', A: 'A', B: 'B',
    copy: 'Copier', copied: 'Copié', share: 'Lien partageable', print: 'Imprimer', method: 'Méthode et limites', trust: '100 % dans votre navigateur · aucune donnée transmise · gratuit',
    hyp: 'Hypothèses retenues', hypTxt: 'Pension : table de référence du ministère de la Justice, revenu du parent chez qui les enfants ne résident pas (en alternance, celui de l’époux le plus aisé). Prestation compensatoire : méthodes de la pratique sans valeur légale, médiane retenue pour la réduction d’impôt. Soulte : moitié de la valeur nette (communauté ou indivision par moitié). Émoluments du notaire non inclus.',
    more: 'Le détail de chaque calcul', toPension: 'Pension alimentaire', toPc: 'Prestation compensatoire', toSoulte: 'Soulte', toCout: 'Coût du divorce',
  },
  en: {
    a: 'Spouse A’s net monthly income', aHelp: 'Net taxable pay, before withholding tax', b: 'Spouse B’s net monthly income', bHelp: 'Zero if B does not work',
    d: 'Length of the marriage', yrs: 'yrs', n: 'Children under 18', g: 'Where the children live',
    gOpt: { B: 'With B (A has standard visiting rights)', A: 'With A (B has standard visiting rights)', alt: 'Shared residence' },
    v: 'Value of the shared home', vHelp: 'Zero if you rent', c: 'Capital still owed on the loan', k: 'Who keeps the home?',
    kOpt: { vente: 'Nobody: it is sold', A: 'Spouse A', B: 'Spouse B' }, p: 'Procedure', pOpt: { notaire: 'Mutual consent, no court', juge: 'Divorce in court' },
    monthly: 'Every month', pension: 'Child support', payer: (x: string) => `paid by ${x} for the children`, noKids: 'no child under 18',
    once: 'Once, at the divorce', pc: 'Indicative compensatory payment', pcRange: 'range of the three methods', pcFrom: (x: string) => `owed by ${x}, if claimed`,
    soulte: 'Soulte', soulteBy: (x: string) => `paid by ${x} to keep the home`, soulteNone: 'home sold or none: no soulte',
    fees: 'Regulated fees', dp: 'Partition duty (1.10%)', depot: 'Filing the agreement with a notary', reduc: 'Tax reduction if the payment is a lump sum within 12 months',
    lawyer: 'Lawyers’ fees: unregulated, add them from your quotes.', A: 'A', B: 'B',
    copy: 'Copy', copied: 'Copied', share: 'Shareable link', print: 'Print', method: 'Method and limits', trust: '100% in your browser · no data sent · free',
    hyp: 'Assumptions used', hypTxt: 'Support: French Ministry of Justice reference table, on the income of the parent the children do not live with (with shared residence, the better-off spouse). Compensatory payment: practitioners’ methods with no legal force; the median is used for the tax reduction. Soulte: half the net value (community or 50/50 joint ownership). Notary’s fee not included.',
    more: 'Each calculation in detail', toPension: 'Child support', toPc: 'Compensatory payment', toSoulte: 'Soulte', toCout: 'Cost of divorce',
  },
};

export default function DivorceCalculator({ lang = 'fr', methodHref, links = {} }: Props) {
  const t = TXT[lang];
  const sp = new URLSearchParams();
  const [a, setA] = useState(num(sp, 'a', 3600));
  const [b, setB] = useState(num(sp, 'b', 1700));
  const [d, setD] = useState(num(sp, 'd', 15));
  const [n, setN] = useState(num(sp, 'n', 2));
  const [g, setG] = useState(str(sp, 'g', 'B'));
  const [v, setV] = useState(num(sp, 'v', 280000));
  const [c, setC] = useState(num(sp, 'c', 120000));
  const [k, setK] = useState(str(sp, 'k', 'B'));
  const [p, setP] = useState(str(sp, 'p', 'notaire'));
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const u = readParams(window.location.search);
    setA(num(u, 'a', 3600)); setB(num(u, 'b', 1700)); setD(num(u, 'd', 15)); setN(Math.min(6, Math.max(0, num(u, 'n', 2))));
    setG(str(u, 'g', 'B')); setV(num(u, 'v', 280000)); setC(num(u, 'c', 120000)); setK(str(u, 'k', 'B')); setP(str(u, 'p', 'notaire'));
  }, []);
  useEffect(() => { updateURL({ a, b, d, n, g, v, c, k, p }); }, [a, b, d, n, g, v, c, k, p]);

  const r = useMemo(() => {
    const kidsOn = n > 0;
    const mode: Mode = g === 'alt' ? 'alterne' : 'classique';
    const payeur = g === 'alt' ? (a >= b ? 'A' : 'B') : g === 'A' ? 'B' : 'A';
    const pa = kidsOn ? pension(payeur === 'A' ? a : b, n, mode) : null;
    const m = methodesPC(a, b, d);
    const debiteurPC = a >= b ? 'A' : 'B';
    const s = soulte(v, c, 0.5);
    const garde = k !== 'vente' && v > 0;
    const cout = coutDivorce(p === 'juge' ? 'juge' : 'notaire', 0, 0, Math.max(0, s.valeurNette));
    const revDebiteur = (debiteurPC === 'A' ? a : b) * 12;
    const fisc = fiscalPC(m.mediane, 'capital12', revDebiteur);
    return { pa, payeur, m, debiteurPC, s, garde, cout, fisc };
  }, [a, b, d, n, g, v, c, k, p]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  const summary = `${t.pension} : ${r.pa ? $(r.pa.total) : '0'} · ${t.pc} : ${$(r.m.min)} – ${$(r.m.max)} · ${t.soulte} : ${r.garde ? $(r.s.soulte) : '0'}`;
  const flash = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const copy = () => { navigator.clipboard?.writeText(summary).then(flash); };
  const share = () => { navigator.clipboard?.writeText(window.location.href).then(flash); };
  const tile = 'rounded-xl bg-accent-50 p-4';

  return (
    <div className="not-prose rounded-xl border border-navy-200 bg-white p-4 sm:p-6">
      <form className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        <NumberField id="dv-a" label={t.a} value={a} onChange={setA} unit="€" max={1000000} help={t.aHelp} lang={lang} />
        <NumberField id="dv-b" label={t.b} value={b} onChange={setB} unit="€" max={1000000} help={t.bHelp} lang={lang} />
        <NumberField id="dv-d" label={t.d} value={d} onChange={setD} unit={t.yrs} max={80} lang={lang} />
        <SelectField id="dv-n" label={t.n} value={String(n)} onChange={(x) => setN(Number(x))} options={[0, 1, 2, 3, 4, 5, 6].map((x) => ({ value: String(x), label: String(x) }))} />
        <SelectField id="dv-g" label={t.g} value={g} onChange={setG} options={(['B', 'A', 'alt'] as const).map((x) => ({ value: x, label: t.gOpt[x] }))} />
        <SelectField id="dv-p" label={t.p} value={p} onChange={setP} options={(['notaire', 'juge'] as const).map((x) => ({ value: x, label: t.pOpt[x] }))} />
        <NumberField id="dv-v" label={t.v} value={v} onChange={setV} unit="€" max={50000000} help={t.vHelp} lang={lang} />
        <NumberField id="dv-c" label={t.c} value={c} onChange={setC} unit="€" max={50000000} lang={lang} />
        <SelectField id="dv-k" label={t.k} value={k} onChange={setK} options={(['vente', 'A', 'B'] as const).map((x) => ({ value: x, label: t.kOpt[x] }))} />
      </form>
      <div aria-live="polite" className="mt-6 grid gap-4 md:grid-cols-3">
        <div className={tile}>
          <p className="text-sm font-medium text-navy-700">{t.monthly} · {t.pension}</p>
          <p className="tabular-nums mt-1 text-4xl font-bold text-navy-900">{$(r.pa ? r.pa.total : 0)}</p>
          <p className="mt-1 text-sm text-navy-600">{r.pa ? t.payer(r.payeur) : t.noKids}</p>
        </div>
        <div className={tile}>
          <p className="text-sm font-medium text-navy-700">{t.once} · {t.pc}</p>
          <p className="tabular-nums mt-1 text-4xl font-bold text-navy-900">{$(r.m.mediane)}</p>
          <p className="mt-1 text-sm text-navy-600">{t.pcRange} : {$(r.m.min)} – {$(r.m.max)}, {t.pcFrom(r.debiteurPC)}</p>
        </div>
        <div className={tile}>
          <p className="text-sm font-medium text-navy-700">{t.once} · {t.soulte}</p>
          <p className="tabular-nums mt-1 text-4xl font-bold text-navy-900">{$(r.garde ? r.s.soulte : 0)}</p>
          <p className="mt-1 text-sm text-navy-600">{r.garde ? t.soulteBy(k) : t.soulteNone}</p>
        </div>
      </div>
      <table className="mt-4 w-full text-sm"><caption className="sr-only">{t.fees}</caption><tbody className="divide-y divide-navy-200">
        <tr><td className="py-2 pr-3 text-navy-700">{t.dp}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(r.cout.droitPartage)}</td></tr>
        <tr><td className="py-2 pr-3 text-navy-700">{t.depot}</td><td className="tabular-nums py-2 text-right text-navy-900">{formatMoney(r.cout.depotNotaire, 2, lang)}</td></tr>
        <tr><td className="py-2 pr-3 text-navy-700">{t.reduc}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(r.fisc.economie)}</td></tr>
      </tbody></table>
      <p className="mt-2 text-xs text-navy-600">{t.lawyer}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={copy} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 font-medium text-navy-800 hover:bg-navy-50">{copied ? t.copied : t.copy}</button>
        <button type="button" onClick={share} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 font-medium text-navy-800 hover:bg-navy-50">{t.share}</button>
        <button type="button" onClick={() => window.print()} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 font-medium text-navy-800 hover:bg-navy-50">{t.print}</button>
        {methodHref && <a href={methodHref} className="px-1 py-1.5 font-medium text-accent-700 hover:underline">{t.method}</a>}
      </div>
      {Object.keys(links).length > 0 && <p className="mt-3 text-sm text-navy-700">{t.more} : {Object.entries(links).map(([label, href], i) => <span key={href}>{i > 0 && ' · '}<a href={href} className="font-medium text-accent-700 hover:underline">{label}</a></span>)}</p>}
      <details className="mt-3 text-xs text-navy-600"><summary className="cursor-pointer">{t.hyp}</summary><p className="mt-1">{t.hypTxt}</p></details>
      <p className="mt-3 text-center text-xs text-navy-500">{t.trust}</p>
    </div>
  );
}
