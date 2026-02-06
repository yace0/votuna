type VoteCountWithTooltipProps = {
  voteCount: number
  voters?: string[]
}

export default function VoteCountWithTooltip({ voteCount, voters }: VoteCountWithTooltipProps) {
  return (
    <span className="group relative inline-flex items-center">
      <span
        tabIndex={0}
        className="cursor-help rounded-sm underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--votuna-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--votuna-paper))]"
      >
        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max min-w-[170px] max-w-[240px] -translate-x-1/2 rounded-xl border border-[color:rgb(var(--votuna-ink)/0.2)] bg-[rgb(var(--votuna-paper))] px-3 py-2 text-left opacity-0 shadow-lg shadow-black/30 transition duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <span className="block text-[10px] uppercase tracking-[0.18em] text-[color:rgb(var(--votuna-ink)/0.45)]">
          Voters
        </span>
        {voters && voters.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-xs text-[color:rgb(var(--votuna-ink)/0.8)]">
            {voters.map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
          </ul>
        ) : (
          <span className="mt-1 block text-xs text-[color:rgb(var(--votuna-ink)/0.65)]">
            No votes yet
          </span>
        )}
      </span>
    </span>
  )
}
