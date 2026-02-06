import Image from 'next/image'

type TrackArtworkProps = {
  artworkUrl?: string | null
  title: string
}

export default function TrackArtwork({ artworkUrl, title }: TrackArtworkProps) {
  if (artworkUrl) {
    return (
      <Image
        src={artworkUrl}
        alt={`${title} artwork`}
        width={40}
        height={40}
        unoptimized
        className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
      />
    )
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-ink),0.05)] text-[9px] uppercase tracking-[0.14em] text-[color:rgb(var(--votuna-ink)/0.45)]">
      No Art
    </div>
  )
}
