/**
 * Calculateur principal : table de référence du ministère de la Justice + ASF + effet fiscal.
 * Premier rendu = valeurs par défaut du build ; les paramètres d'un lien partagé ne sont lus
 * qu'après le montage (RECETTE §17.5). Tout le calcul vient de `lib/engine/pension`.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import StackedBar from '../ui/StackedBar';
import { pension, asf, deduction, pensionImposable, MODES, MV, ASF, type Mode } from '../../lib/engine/pension';
import { formatMoney, formatPercent } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang?: 'fr' | 'en'; methodHref?: string; defaultIncome?: number }

const TXT = {
  fr: {
    income: 'Revenu net mensuel du parent qui verse', incomeHelp: 'Net imposable, avant prélèvement à la source (bulletin ou avis d’impôt ÷ 12)',
    kids: 'Nombre d’enfants concernés', mode: 'Amplitude du droit de visite et d’hébergement',
    modes: { reduit: 'Réduit', classique: 'Classique', alterne: 'Alterné' } as Record<Mode, string>,
    modeHelp: { reduit: 'Visites courtes, une journée, ou en lieu médiatisé', classique: 'Un week-end sur deux et la moitié des vacances', alterne: 'Résidence alternée, à parts égales' } as Record<Mode, string>,
    single: 'Le parent qui reçoit vit seul', yes: 'Oui', no: 'Non',
    result: 'Pension alimentaire indicative', perMonth: 'par mois', perChild: 'Par enfant', base: 'Revenu au-dessus du minimum vital', rate: 'Taux de la table, par enfant',
    year: 'Sur un an', asf: 'ASF de la CAF en complément', asfNone: 'aucune (pension au-dessus de l’ASF)', asfSmall: 'aucune (écart inférieur à 15 €)',
    deduc: 'Économie d’impôt du parent qui verse (estimation)', deducAlt: 'non déductible en résidence alternée', taxable: 'Imposable chez le parent qui reçoit',
    under: 'Revenu inférieur ou égal au minimum vital de la table : la table ne propose aucune pension. Le juge peut fixer un montant symbolique ou constater l’impossibilité de payer.',
    bar: 'Répartition du revenu du parent qui verse', kept: 'Reste au parent', paid: 'Pension', mv: 'Minimum vital',
    trust: '100 % dans votre navigateur · aucune donnée transmise · gratuit', copy: 'Copier', copied: 'Copié', share: 'Lien partageable', print: 'Imprimer', method: 'Méthode et limites',
    hyp: 'Hypothèses : table de référence du ministère de la Justice, minimum vital de', hyp2: 'Le juge reste libre du montant : il tient compte des besoins de l’enfant et des charges réelles de chacun.',
  },
  en: {
    income: 'Paying parent’s net monthly income', incomeHelp: 'Net taxable pay before withholding tax (payslip or tax notice ÷ 12)',
    kids: 'Number of children', mode: 'Amount of visiting and staying time',
    modes: { reduit: 'Reduced', classique: 'Standard', alterne: 'Shared' } as Record<Mode, string>,
    modeHelp: { reduit: 'Short visits, single days, or supervised contact', classique: 'Every other weekend and half the school holidays', alterne: 'Shared residence, equal time' } as Record<Mode, string>,
    single: 'Receiving parent lives alone', yes: 'Yes', no: 'No',
    result: 'Indicative child support', perMonth: 'per month', perChild: 'Per child', base: 'Income above the subsistence amount', rate: 'Table rate per child',
    year: 'Over a year', asf: 'CAF family support allowance on top', asfNone: 'none (support above the ASF)', asfSmall: 'none (gap below €15)',
    deduc: 'Tax saving for the paying parent (estimate)', deducAlt: 'not deductible with shared residence', taxable: 'Taxable for the receiving parent',
    under: 'Income at or below the table’s subsistence amount: the table gives no support. The judge may set a token amount or record that the parent cannot pay.',
    bar: 'How the paying parent’s income splits', kept: 'Left to the parent', paid: 'Support', mv: 'Subsistence amount',
    trust: '100% in your browser · no data sent · free', copy: 'Copy', copied: 'Copied', share: 'Shareable link', print: 'Print', method: 'Method and limits',
    hyp: 'Assumptions: French Ministry of Justice reference table, subsistence amount of', hyp2: 'The judge is free to set another amount, taking the child’s needs and each parent’s actual costs into account.',
  },
};

export default function PensionCalculator({ lang = 'fr', methodHref, defaultIncome = 2000 }: Props) {
  const t = TXT[lang];
  const sp = new URLSearchParams();
  const [income, setIncome] = useState(num(sp, 'r', defaultIncome));
  const [kids, setKids] = useState(num(sp, 'n', 1));
  const [mode, setMode] = useState<Mode>(str(sp, 'm', 'classique') as Mode);
  const [single, setSingle] = useState(str(sp, 's', '1'));
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const u = readParams(window.location.search);
    setIncome(num(u, 'r', defaultIncome)); setKids(Math.min(6, Math.max(1, num(u, 'n', 1))));
    const m = str(u, 'm', 'classique'); setMode((MODES as string[]).includes(m) ? (m as Mode) : 'classique'); setSingle(str(u, 's', '1'));
  }, [defaultIncome]);
  useEffect(() => { updateURL({ r: income, n: kids, m: mode, s: single }); }, [income, kids, mode, single]);

  const p = useMemo(() => pension(income, kids, mode), [income, kids, mode]);
  const a = useMemo(() => asf(p.parEnfant, kids), [p, kids]);
  const d = useMemo(() => deduction(p.total * 12, mode === 'alterne' ? 'alterne' : 'mineur', income * 12, 1), [p, mode, income]);
  const imp = useMemo(() => pensionImposable(p.total * 12), [p]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  const copy = () => { const txt = `${t.result} : ${$(p.total)} ${t.perMonth}`; navigator.clipboard?.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };
  const share = () => { navigator.clipboard?.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };

  return (
    <div className="not-prose rounded-xl border border-navy-200 bg-white p-4 sm:p-6">
      <form className="grid gap-x-4 gap-y-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <NumberField id="pa-revenu" label={t.income} value={income} onChange={setIncome} unit="€" max={100000} help={t.incomeHelp} lang={lang} />
        <SelectField id="pa-enfants" label={t.kids} value={String(kids)} onChange={(v) => setKids(Number(v))} options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))} />
        <SelectField id="pa-mode" label={t.mode} value={mode} onChange={(v) => setMode(v as Mode)} options={MODES.map((m) => ({ value: m, label: t.modes[m] }))} help={t.modeHelp[mode]} />
        <Toggle id="pa-seul" label={t.single} value={single} onChange={setSingle} options={[{ value: '1', label: t.yes }, { value: '0', label: t.no }]} />
      </form>
      <div aria-live="polite" className="mt-6 rounded-xl bg-accent-50 p-4 sm:p-5">
        <p className="text-sm font-medium text-navy-700">{t.result}</p>
        <p className="tabular-nums mt-1 text-4xl font-bold text-navy-900">{$(p.total)} <span className="text-lg font-medium text-navy-600">{t.perMonth}</span></p>
        {p.sousMinimum && <p className="mt-2 text-sm text-amber-800">{t.under}</p>}
        <table className="mt-4 w-full text-sm"><tbody className="divide-y divide-navy-200">
          <tr><td className="py-2 pr-3 text-navy-700">{t.perChild}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(p.parEnfant)}</td></tr>
          <tr><td className="py-2 pr-3 text-navy-700">{t.base}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(p.base)}</td></tr>
          <tr><td className="py-2 pr-3 text-navy-700">{t.rate}</td><td className="tabular-nums py-2 text-right text-navy-900">{formatPercent(p.tauxEnfant, 1, lang)}</td></tr>
          <tr><td className="py-2 pr-3 text-navy-700">{t.year}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(p.total * 12)}</td></tr>
          {single === '1' && <tr><td className="py-2 pr-3 text-navy-700">{t.asf}</td><td className="tabular-nums py-2 text-right text-navy-900">{a.total > 0 ? $(a.total) : a.nonVerse ? t.asfSmall : t.asfNone}</td></tr>}
          <tr><td className="py-2 pr-3 text-navy-700">{t.deduc}</td><td className="tabular-nums py-2 text-right text-navy-900">{mode === 'alterne' ? t.deducAlt : $(d.economie)}</td></tr>
          <tr><td className="py-2 pr-3 text-navy-700">{t.taxable}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(imp.imposable)}</td></tr>
        </tbody></table>
        {income > 0 && <div className="mt-4"><p className="mb-2 text-xs font-medium text-navy-600">{t.bar}</p>
          <StackedBar ariaPrefix={t.bar} total={income} segments={[{ label: t.mv, value: Math.min(income, MV), color: '#94a3b8' }, { label: t.paid, value: p.total, color: '#1F5F8B' }, { label: t.kept, value: Math.max(0, income - MV - p.total), color: '#cbd5e1' }]} /></div>}
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <button type="button" onClick={copy} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 font-medium text-navy-800 hover:bg-navy-50">{copied ? t.copied : t.copy}</button>
          <button type="button" onClick={share} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 font-medium text-navy-800 hover:bg-navy-50">{t.share}</button>
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 font-medium text-navy-800 hover:bg-navy-50">{t.print}</button>
          {methodHref && <a href={methodHref} className="px-1 py-1.5 font-medium text-accent-700 hover:underline">{t.method}</a>}
        </div>
        <details className="mt-3 text-xs text-navy-600"><summary className="cursor-pointer">{lang === 'fr' ? 'Hypothèses retenues' : 'Assumptions used'}</summary><p className="mt-1">{t.hyp} {$(MV)} ; ASF {formatMoney(ASF, 2, lang)}. {t.hyp2}</p></details>
      </div>
      <p className="mt-3 text-center text-xs text-navy-500">{t.trust}</p>
    </div>
  );
}
