'use client'

import {
  Button,
  Card,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  TextInput,
} from '@tremor/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { apiJson, apiJsonOrNull, API_URL } from '../../../lib/api'

type User = {
  id?: number
  display_name?: string | null
  first_name?: string | null
  email?: string | null
  avatar_url?: string | null
}

type PlaylistSettings = {
  id: number
  playlist_id: number
  required_vote_percent: number
  auto_add_on_threshold: boolean
}

type VotunaPlaylist = {
  id: number
  owner_user_id: number
  title: string
  description?: string | null
  provider: string
  provider_playlist_id: string
  is_active: boolean
  settings?: PlaylistSettings | null
}

type Suggestion = {
  id: number
  provider_track_id: string
  track_title?: string | null
  track_artist?: string | null
  track_artwork_url?: string | null
  track_url?: string | null
  suggested_by_user_id?: number | null
  voter_display_names?: string[]
  created_at?: string | null
  status: string
  vote_count: number
}

type ProviderTrack = {
  provider_track_id: string
  title: string
  artist?: string | null
  artwork_url?: string | null
  url?: string | null
  added_at?: string | null
  suggested_by_user_id?: number | null
  suggested_by_display_name?: string | null
}

type PlayerTrack = {
  key: string
  title: string
  artist?: string | null
  url: string
  artwork_url?: string | null
}

type PlaylistMember = {
  user_id: number
  display_name?: string | null
  avatar_url?: string | null
  role: string
  joined_at: string
  suggested_count: number
}

const buildAvatarSrc = (member: PlaylistMember) => {
  if (!member.avatar_url) return ''
  const version = encodeURIComponent(member.avatar_url)
  return `${API_URL}/api/v1/users/${member.user_id}/avatar?v=${version}`
}

const buildSoundcloudEmbedUrl = (
  trackUrl: string | null | undefined,
  autoPlay: boolean = false,
) => {
  if (!trackUrl) return ''
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&auto_play=${autoPlay ? 'true' : 'false'}&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`
}

const formatAddedDate = (addedAt: string | null | undefined) => {
  if (!addedAt) return 'Added date unavailable'
  const date = new Date(addedAt)
  if (Number.isNaN(date.getTime())) return 'Added date unavailable'
  return `Added ${date.toLocaleDateString()}`
}

function VoteCountWithTooltip({
  voteCount,
  voters,
}: {
  voteCount: number
  voters?: string[]
}) {
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

function TrackArtwork({
  artworkUrl,
  title,
}: {
  artworkUrl?: string | null
  title: string
}) {
  if (artworkUrl) {
    return (
      <img
        src={artworkUrl}
        alt={`${title} artwork`}
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

export default function PlaylistDetailPage() {
  const params = useParams()
  const playlistId = Array.isArray(params.id) ? params.id[0] : params.id
  const queryClient = useQueryClient()

  const [settingsForm, setSettingsForm] = useState({
    required_vote_percent: 60,
    auto_add_on_threshold: true,
  })
  const [settingsStatus, setSettingsStatus] = useState('')

  const [suggestStatus, setSuggestStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProviderTrack[]>([])
  const [searchStatus, setSearchStatus] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [linkSuggestionUrl, setLinkSuggestionUrl] = useState('')
  const [activePlayerTrack, setActivePlayerTrack] = useState<PlayerTrack | null>(null)
  const [playerNonce, setPlayerNonce] = useState(0)

  const currentUserQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiJsonOrNull<User>('/api/v1/users/me'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  const currentUser = currentUserQuery.data ?? null

  const playlistQuery = useQuery({
    queryKey: ['votunaPlaylist', playlistId],
    queryFn: () =>
      apiJson<VotunaPlaylist>(`/api/v1/votuna/playlists/${playlistId}`, { authRequired: true }),
    enabled: !!playlistId,
    refetchInterval: 60_000,
    staleTime: 10_000,
  })

  const suggestionsQuery = useQuery({
    queryKey: ['votunaSuggestions', playlistId],
    queryFn: () =>
      apiJson<Suggestion[]>(
        `/api/v1/votuna/playlists/${playlistId}/suggestions?status=pending`,
        { authRequired: true },
      ),
    enabled: !!playlistId,
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  const tracksQuery = useQuery({
    queryKey: ['votunaTracks', playlistId],
    queryFn: () =>
      apiJson<ProviderTrack[]>(`/api/v1/votuna/playlists/${playlistId}/tracks`, {
        authRequired: true,
      }),
    enabled: !!playlistId,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const membersQuery = useQuery({
    queryKey: ['votunaMembers', playlistId],
    queryFn: () =>
      apiJson<PlaylistMember[]>(`/api/v1/votuna/playlists/${playlistId}/members`, {
        authRequired: true,
      }),
    enabled: !!playlistId,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const playlist = playlistQuery.data ?? null
  const settings = playlist?.settings ?? null
  const suggestions = suggestionsQuery.data ?? []
  const tracks = tracksQuery.data ?? []
  const members = membersQuery.data ?? []

  const canEditSettings = useMemo(() => {
    return Boolean(playlist && currentUser?.id && playlist.owner_user_id === currentUser.id)
  }, [playlist, currentUser])

  const memberNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const member of members) {
      if (member.display_name) {
        map.set(member.user_id, member.display_name)
      }
    }
    if (currentUser?.id) {
      map.set(
        currentUser.id,
        currentUser.display_name || currentUser.first_name || currentUser.email || 'You',
      )
    }
    return map
  }, [members, currentUser])

  useEffect(() => {
    if (!settings) return
    setSettingsForm({
      required_vote_percent: settings.required_vote_percent,
      auto_add_on_threshold: settings.auto_add_on_threshold,
    })
  }, [settings?.required_vote_percent, settings?.auto_add_on_threshold])

  const settingsMutation = useMutation({
    mutationFn: async (payload: typeof settingsForm) => {
      return apiJson<PlaylistSettings>(`/api/v1/votuna/playlists/${playlistId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        authRequired: true,
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['votunaPlaylist', playlistId], (prev: VotunaPlaylist | undefined) => {
        if (!prev) return prev
        return { ...prev, settings: updated }
      })
      setSettingsStatus('Settings saved')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to save settings'
      setSettingsStatus(message)
    },
  })

  const suggestMutation = useMutation({
    mutationFn: async (payload: {
      provider_track_id?: string
      track_title?: string | null
      track_artist?: string | null
      track_artwork_url?: string | null
      track_url?: string | null
    }) => {
      return apiJson<Suggestion>(`/api/v1/votuna/playlists/${playlistId}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        authRequired: true,
        body: JSON.stringify(payload),
      })
    },
    onSuccess: async (_data, variables) => {
      if (variables.track_url && !variables.provider_track_id) {
        setLinkSuggestionUrl('')
      }
      setSuggestStatus('')
      await queryClient.invalidateQueries({ queryKey: ['votunaSuggestions', playlistId] })
      await queryClient.invalidateQueries({ queryKey: ['votunaMembers', playlistId] })
      await queryClient.invalidateQueries({ queryKey: ['votunaTracks', playlistId] })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to add suggestion'
      setSuggestStatus(message)
    },
  })

  const voteMutation = useMutation({
    mutationFn: async (suggestionId: number) => {
      return apiJson<Suggestion>(`/api/v1/votuna/suggestions/${suggestionId}/vote`, {
        method: 'POST',
        authRequired: true,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['votunaSuggestions', playlistId] })
      await queryClient.invalidateQueries({ queryKey: ['votunaTracks', playlistId] })
    },
  })

  const handleSettingsSave = async () => {
    if (!playlistId || !canEditSettings) return
    setSettingsStatus('')
    settingsMutation.mutate(settingsForm)
  }

  const handleSearchTracks = async () => {
    if (!playlistId || !searchQuery.trim()) return
    setSearchStatus('')
    setIsSearching(true)
    try {
      const results = await apiJson<ProviderTrack[]>(
        `/api/v1/votuna/playlists/${playlistId}/tracks/search?q=${encodeURIComponent(searchQuery.trim())}&limit=8`,
        { authRequired: true },
      )
      setSearchResults(results)
      if (results.length === 0) {
        setSearchStatus('No tracks found for that search.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to search tracks'
      setSearchStatus(message)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSuggestFromSearch = (track: ProviderTrack) => {
    setSuggestStatus('')
    suggestMutation.mutate({
      provider_track_id: track.provider_track_id,
      track_title: track.title,
      track_artist: track.artist ?? null,
      track_artwork_url: track.artwork_url ?? null,
      track_url: track.url ?? null,
    })
  }

  const handleSuggestFromLink = () => {
    if (!playlistId || !linkSuggestionUrl.trim()) return
    setSuggestStatus('')
    suggestMutation.mutate({
      track_url: linkSuggestionUrl.trim(),
    })
  }

  const handlePlayTrack = ({
    key,
    title,
    artist,
    url,
    artworkUrl,
  }: {
    key: string
    title: string
    artist?: string | null
    url?: string | null
    artworkUrl?: string | null
  }) => {
    if (!url) return
    setActivePlayerTrack({
      key,
      title,
      artist,
      url,
      artwork_url: artworkUrl,
    })
    setPlayerNonce((prev) => prev + 1)
  }

  const handleVote = async (suggestionId: number) => {
    voteMutation.mutate(suggestionId)
  }

  if (playlistQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <Card className="rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5">
          <p className="text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">Loading playlist...</p>
        </Card>
      </main>
    )
  }

  if (!playlist) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <Card className="rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5">
          <p className="text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">Playlist not found.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center rounded-full bg-[rgb(var(--votuna-ink))] px-4 py-2 text-xs font-semibold text-[rgb(var(--votuna-paper))]"
          >
            Back to dashboard
          </Link>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 pb-44">
      <div className="fade-up space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.4)]">
              Playlist
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[rgb(var(--votuna-ink))]">
              {playlist.title}
            </h1>
            {playlist.description ? (
              <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                {playlist.description}
              </p>
            ) : null}
          </div>
          <Link
            href="/"
            className="rounded-full border border-[color:rgb(var(--votuna-ink)/0.15)] px-4 py-2 text-xs font-semibold text-[rgb(var(--votuna-ink))] hover:bg-[rgba(var(--votuna-paper),0.7)]"
          >
            Back
          </Link>
        </div>

        <TabGroup>
          <TabList className="rounded-full bg-[rgba(var(--votuna-paper),0.85)] p-1">
            <Tab className="rounded-full px-4 py-2 text-sm">Playlist</Tab>
            <Tab className="rounded-full px-4 py-2 text-sm">Settings</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="space-y-6">
                <Card className="rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                      Find and suggest tracks
                    </p>
                    <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                      Search by track name, play the track, and suggest it to the vote queue.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <TextInput
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                      placeholder="Search SoundCloud tracks"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSearchTracks}
                      disabled={isSearching || !searchQuery.trim()}
                      className="rounded-full bg-[rgb(var(--votuna-ink))] text-[rgb(var(--votuna-paper))] hover:bg-[color:rgb(var(--votuna-ink)/0.9)]"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                  </div>

                  {searchStatus ? <p className="mt-3 text-xs text-rose-500">{searchStatus}</p> : null}

                  {searchResults.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {searchResults.map((track) => {
                        return (
                          <div
                            key={track.provider_track_id}
                            className="rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.8)] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <TrackArtwork artworkUrl={track.artwork_url} title={track.title} />
                              <div className="min-w-0">
                                  {track.url ? (
                                    <a
                                      href={track.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block truncate text-sm font-semibold text-[rgb(var(--votuna-ink))] hover:underline"
                                    >
                                      {track.title}
                                    </a>
                                  ) : (
                                    <p className="truncate text-sm font-semibold text-[rgb(var(--votuna-ink))]">
                                      {track.title}
                                    </p>
                                  )}
                                  <p className="mt-1 truncate text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">
                                    {track.artist || 'Unknown artist'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {track.url ? (
                                  <Button
                                    onClick={() =>
                                      handlePlayTrack({
                                        key: `search-${track.provider_track_id}`,
                                        title: track.title,
                                        artist: track.artist,
                                        url: track.url,
                                        artworkUrl: track.artwork_url,
                                      })
                                    }
                                    variant="secondary"
                                    className="w-24 justify-center rounded-full"
                                  >
                                    Play
                                  </Button>
                                ) : null}
                                <Button
                                  onClick={() => handleSuggestFromSearch(track)}
                                  disabled={suggestMutation.isPending}
                                  className="w-24 justify-center rounded-full bg-[rgb(var(--votuna-ink))] text-[rgb(var(--votuna-paper))] hover:bg-[color:rgb(var(--votuna-ink)/0.9)]"
                                >
                                  Suggest
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  <div className="mt-6 border-t border-[color:rgb(var(--votuna-ink)/0.08)] pt-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:rgb(var(--votuna-ink)/0.45)]">
                      Suggest directly from link
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <TextInput
                        value={linkSuggestionUrl}
                        onValueChange={setLinkSuggestionUrl}
                        placeholder="https://soundcloud.com/artist/track-name"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSuggestFromLink}
                        disabled={suggestMutation.isPending || !linkSuggestionUrl.trim()}
                        className="rounded-full bg-[rgb(var(--votuna-ink))] text-[rgb(var(--votuna-paper))] hover:bg-[color:rgb(var(--votuna-ink)/0.9)]"
                      >
                        {suggestMutation.isPending ? 'Adding...' : 'Suggest from link'}
                      </Button>
                    </div>
                  </div>
                  {suggestStatus ? <p className="mt-3 text-xs text-rose-500">{suggestStatus}</p> : null}
                </Card>

                <Card className="rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                        Active suggestions
                      </p>
                      <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                        Vote to add tracks to the playlist.
                      </p>
                    </div>
                  </div>

                  {suggestionsQuery.isLoading ? (
                    <p className="mt-4 text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">
                      Loading suggestions...
                    </p>
                  ) : suggestions.length === 0 ? (
                    <p className="mt-4 text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">
                      No active suggestions yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.8)] px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <TrackArtwork
                                artworkUrl={suggestion.track_artwork_url}
                                title={suggestion.track_title || 'Untitled track'}
                              />
                              <div className="min-w-0">
                                {suggestion.track_url ? (
                                  <a
                                    href={suggestion.track_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block truncate text-sm font-semibold text-[rgb(var(--votuna-ink))] hover:underline"
                                  >
                                    {suggestion.track_title || 'Untitled track'}
                                  </a>
                                ) : (
                                  <p className="truncate text-sm font-semibold text-[rgb(var(--votuna-ink))]">
                                    {suggestion.track_title || 'Untitled track'}
                                  </p>
                                )}
                                <p className="mt-1 truncate text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">
                                  {suggestion.track_artist || 'Unknown artist'} -{' '}
                                  <VoteCountWithTooltip
                                    voteCount={suggestion.vote_count}
                                    voters={suggestion.voter_display_names}
                                  />
                                </p>
                              </div>
                            </div>
                            <div className="flex w-full items-center justify-between gap-3 text-right sm:w-auto sm:justify-end">
                              <div className="min-w-0">
                                <p className="text-xs text-[color:rgb(var(--votuna-ink)/0.55)]">
                                  {suggestion.suggested_by_user_id
                                    ? memberNameById.get(suggestion.suggested_by_user_id)
                                      ? `Suggested by ${memberNameById.get(suggestion.suggested_by_user_id)}`
                                      : 'Suggested by a former member'
                                    : 'Suggested outside Votuna'}
                                </p>
                                <p className="text-xs text-[color:rgb(var(--votuna-ink)/0.5)] tabular-nums">
                                  {formatAddedDate(suggestion.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {suggestion.track_url ? (
                                  <Button
                                    onClick={() =>
                                      handlePlayTrack({
                                        key: `suggestion-${suggestion.id}`,
                                        title: suggestion.track_title || 'Untitled track',
                                        artist: suggestion.track_artist,
                                        url: suggestion.track_url,
                                        artworkUrl: suggestion.track_artwork_url,
                                      })
                                    }
                                    variant="secondary"
                                    className="w-24 justify-center rounded-full"
                                  >
                                    Play
                                  </Button>
                                ) : null}
                                <Button
                                  onClick={() => handleVote(suggestion.id)}
                                  disabled={voteMutation.isPending}
                                  className="w-24 justify-center rounded-full bg-[rgb(var(--votuna-ink))] text-[rgb(var(--votuna-paper))] hover:bg-[color:rgb(var(--votuna-ink)/0.9)]"
                                >
                                  Vote
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                        Current playlist songs
                      </p>
                      <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                        Tracks currently in the SoundCloud playlist.
                      </p>
                    </div>
                  </div>

                  {tracksQuery.isLoading ? (
                    <p className="mt-4 text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">
                      Loading tracks...
                    </p>
                  ) : tracks.length === 0 ? (
                    <p className="mt-4 text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">
                      No tracks found.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {tracks.map((track) => (
                        <div
                          key={track.provider_track_id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.8)] px-4 py-3"
                        >
                          <div className="flex w-full flex-wrap items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <TrackArtwork artworkUrl={track.artwork_url} title={track.title} />
                              <div className="min-w-0">
                                {track.url ? (
                                  <a
                                    href={track.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block truncate text-sm font-semibold text-[rgb(var(--votuna-ink))] hover:underline"
                                  >
                                    {track.title}
                                  </a>
                                ) : (
                                  <p className="truncate text-sm font-semibold text-[rgb(var(--votuna-ink))]">
                                    {track.title}
                                  </p>
                                )}
                                <p className="mt-1 truncate text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">
                                  {track.artist || 'Unknown artist'}
                                </p>
                              </div>
                            </div>
                            <div className="flex w-full items-center justify-between gap-3 text-right sm:w-auto sm:justify-end">
                              <div className="min-w-0">
                                <p className="mt-1 text-xs text-[color:rgb(var(--votuna-ink)/0.55)]">
                                  {track.suggested_by_display_name
                                    ? `Suggested by ${track.suggested_by_display_name}`
                                    : track.suggested_by_user_id
                                      ? 'Suggested by a former member'
                                      : 'Added outside Votuna'}
                                </p>
                                <p className="text-xs text-[color:rgb(var(--votuna-ink)/0.5)] tabular-nums">
                                  {formatAddedDate(track.added_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {track.url ? (
                                  <Button
                                    onClick={() =>
                                      handlePlayTrack({
                                        key: `track-${track.provider_track_id}`,
                                        title: track.title,
                                        artist: track.artist,
                                        url: track.url,
                                        artworkUrl: track.artwork_url,
                                      })
                                    }
                                    variant="secondary"
                                    className="w-24 justify-center rounded-full"
                                  >
                                    Play
                                  </Button>
                                ) : null}
                                {track.url ? (
                                  <a
                                    href={track.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex w-24 justify-center rounded-full bg-[rgb(var(--votuna-ink))] px-4 py-2 text-xs font-semibold text-[rgb(var(--votuna-paper))] hover:bg-[color:rgb(var(--votuna-ink)/0.9)]"
                                  >
                                    Open
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </TabPanel>
            <TabPanel>
              <div className="space-y-6">
                <Card className="rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                        Settings
                      </p>
                      <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                        Votes required to add a track automatically.
                      </p>
                    </div>
                    <Button
                      onClick={handleSettingsSave}
                      disabled={settingsMutation.isPending || !canEditSettings}
                      className="rounded-full bg-[rgb(var(--votuna-ink))] text-[rgb(var(--votuna-paper))] hover:bg-[color:rgb(var(--votuna-ink)/0.9)]"
                    >
                      {settingsMutation.isPending ? 'Saving...' : 'Save settings'}
                    </Button>
                  </div>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                        Required vote percent
                      </p>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={settingsForm.required_vote_percent}
                        disabled={!canEditSettings}
                        onChange={(event) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            required_vote_percent: Number(event.target.value),
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm text-[rgb(var(--votuna-ink))] disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                        Auto-add on threshold
                      </p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settingsForm.auto_add_on_threshold}
                        onClick={() => {
                          if (!canEditSettings) return
                          setSettingsForm((prev) => ({
                            ...prev,
                            auto_add_on_threshold: !prev.auto_add_on_threshold,
                          }))
                        }}
                        className={`mt-3 inline-flex h-7 w-12 items-center rounded-full border transition ${
                          settingsForm.auto_add_on_threshold
                            ? 'border-transparent bg-[rgb(var(--votuna-accent))]'
                            : 'border-[color:rgb(var(--votuna-ink)/0.2)] bg-[rgba(var(--votuna-paper),0.8)]'
                        } ${canEditSettings ? '' : 'opacity-60'}`}
                        disabled={!canEditSettings}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-[rgb(var(--votuna-paper))] shadow transition ${
                            settingsForm.auto_add_on_threshold ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  {settingsStatus ? (
                    <p className="mt-4 text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">{settingsStatus}</p>
                  ) : null}
                  {!canEditSettings ? (
                    <p className="mt-2 text-xs text-[color:rgb(var(--votuna-ink)/0.5)]">
                      Only the playlist owner can edit these settings.
                    </p>
                  ) : null}
                </Card>

                <Card className="rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                        Collaborators
                      </p>
                      <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                        Users who have accepted the invite.
                      </p>
                    </div>
                  </div>

                  {membersQuery.isLoading ? (
                    <p className="mt-4 text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">
                      Loading collaborators...
                    </p>
                  ) : members.length === 0 ? (
                    <p className="mt-4 text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">
                      No collaborators yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {members.map((member) => {
                        const avatarSrc = buildAvatarSrc(member)
                        return (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.8)] px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              {avatarSrc ? (
                                <img
                                  src={avatarSrc}
                                  alt={member.display_name || 'Collaborator avatar'}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(var(--votuna-ink),0.1)] text-xs font-semibold text-[rgb(var(--votuna-ink))]">
                                  {(member.display_name || 'U').slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-[rgb(var(--votuna-ink))]">
                                  {member.display_name || 'Unknown user'}
                                </p>
                                <p className="text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">
                                  Joined {new Date(member.joined_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">
                                {member.suggested_count} suggested
                              </p>
                              <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                                {member.role}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
      {activePlayerTrack ? (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(940px,calc(100%-1.5rem))] -translate-x-1/2">
          <div className="rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-paper),0.98)] p-3 shadow-2xl shadow-black/25 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <TrackArtwork
                  artworkUrl={activePlayerTrack.artwork_url}
                  title={activePlayerTrack.title}
                />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.45)]">
                    Now Playing
                  </p>
                  <p className="truncate text-sm font-semibold text-[rgb(var(--votuna-ink))]">
                    {activePlayerTrack.title}
                  </p>
                  <p className="truncate text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">
                    {activePlayerTrack.artist || 'Unknown artist'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activePlayerTrack.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-24 justify-center rounded-full border border-[color:rgb(var(--votuna-ink)/0.18)] px-4 py-2 text-xs font-semibold text-[rgb(var(--votuna-ink))] hover:bg-[rgba(var(--votuna-paper),0.7)]"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => setActivePlayerTrack(null)}
                  className="inline-flex w-24 justify-center rounded-full bg-[rgb(var(--votuna-ink))] px-4 py-2 text-xs font-semibold text-[rgb(var(--votuna-paper))] hover:bg-[color:rgb(var(--votuna-ink)/0.9)]"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              key={`${activePlayerTrack.key}-${playerNonce}`}
              title={`Now playing ${activePlayerTrack.title}`}
              src={buildSoundcloudEmbedUrl(activePlayerTrack.url, true)}
              className="mt-3 h-24 w-full rounded-xl border-0"
              loading="lazy"
              allow="autoplay"
            />
          </div>
        </div>
      ) : null}
    </main>
  )
}
