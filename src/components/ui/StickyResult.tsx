/**
 * Premier écran (RECETTE §5, règle du 2026-10-11) : sur téléphone, tant que le bloc du résultat est
 * sous l'écran, une barre collée en bas montre le chiffre clé ; un toucher y fait défiler. Ajoutée
 * côté client seulement : aucun texte en double dans le HTML construit.
 */
import { useEffect, useState, type RefObject } from 'react';

export function useBelow(ref: RefObject<HTMLElement | null>) {
  const [below, setBelow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setBelow(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return below;
}

export default function StickyResult({ target, items }: { target: RefObject<HTMLElement | null>; items: Array<[string, string]> }) {
  const below = useBelow(target);
  if (!below) return null;
  return (
    <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      className="fixed inset-x-0 bottom-0 z-40 flex items-baseline justify-between gap-3 border-t border-accent-200 bg-accent-50 px-4 py-3 text-left shadow-lg lg:hidden">
      {items.map(([l, v]) => <span key={l} className="flex min-w-0 flex-1 flex-col last:text-right"><span className="truncate text-xs font-medium text-navy-700">{l}</span><span className={`tabular-nums whitespace-nowrap font-bold text-navy-900 ${items.length > 2 ? 'text-base' : 'text-lg'}`}>{v}</span></span>)}
    </button>
  );
}
