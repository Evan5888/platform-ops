export function Hint({ text }: { text: string }) {
  return (
    <button type="button" className="hint" aria-label={text}>
      ?
      <span role="tooltip">{text}</span>
    </button>
  )
}
