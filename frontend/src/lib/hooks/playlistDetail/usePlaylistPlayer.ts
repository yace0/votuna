import { useState } from 'react'

import type { PlayerTrack, TrackPlayRequest } from '@/lib/types/votuna'

export function usePlaylistPlayer() {
  const [activePlayerTrack, setActivePlayerTrack] = useState<PlayerTrack | null>(null)

  const playTrack = ({ key, title, artist, url, artworkUrl }: TrackPlayRequest) => {
    if (!url) return
    setActivePlayerTrack({
      key,
      title,
      artist,
      url,
      artwork_url: artworkUrl,
    })
  }

  const closePlayer = () => {
    setActivePlayerTrack(null)
  }

  return {
    playTrack,
    activePlayerTrack,
    closePlayer,
  }
}
