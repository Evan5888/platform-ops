export function Hint({ text }: { text: string }) {
  return (
    <button type="button" className="group relative ml-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--accent-soft)] align-middle text-xs text-[var(--accent)]" aria-label={text}>
      ?
      <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden w-56 -translate-x-1/2 rounded-xl bg-[var(--ink)] px-3 py-2 text-left text-xs font-normal leading-5 text-[var(--bg)] group-hover:block group-focus:block">
        {text}
      </span>
    </button>
  )
}
