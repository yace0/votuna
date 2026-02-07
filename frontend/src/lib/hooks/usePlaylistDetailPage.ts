import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { queryKeys } from '@/lib/constants/queryKeys'
import { apiJson, type ApiError } from '@/lib/api'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import type {
  ManagementDirection,
  ManagementExecuteResponse,
  ManagementPlaylistRef,
  ManagementPreviewResponse,
  ManagementSelectionMode,
  ManagementSourceTracksResponse,
  ManagementTransferRequest,
  PlayerTrack,
  PlaylistMember,
  PlaylistSettings,
  PlaylistSettingsForm,
  ProviderTrack,
  Suggestion,
  TrackPlayRequest,
  VotunaPlaylist,
} from '@/lib/types/votuna'

type ProviderPlaylist = {
  provider: string
  provider_playlist_id: string
  title: string
  description?: string | null
}

type ManagementCounterpartyOption = {
  key: string
  label: string
  detail: string
  ref: ManagementPlaylistRef
}

const MANAGEMENT_SOURCE_TRACK_LIMIT = 50

const uniqueTrimmedValues = (value: string) => {
  const seen = new Set<string>()
  const normalizedSeen = new Set<string>()
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const normalized = item.toLowerCase()
      if (normalizedSeen.has(normalized)) return false
      normalizedSeen.add(normalized)
      if (seen.has(item)) return false
      seen.add(item)
      return true
    })
  return items
}

const toPlaylistRefKey = (ref: ManagementPlaylistRef) =>
  ref.kind === 'provider'
    ? `provider:${ref.provider}:${ref.provider_playlist_id}`
    : `votuna:${ref.votuna_playlist_id}`

export function usePlaylistDetailPage(playlistId: string | undefined) {
  const queryClient = useQueryClient()

  const [settingsForm, setSettingsForm] = useState<PlaylistSettingsForm>({
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

  const [managementDirection, setManagementDirection] = useState<ManagementDirection>('import_to_current')
  const [managementExportTargetMode, setManagementExportTargetMode] = useState<'existing' | 'create'>(
    'existing',
  )
  const [managementCounterpartyKey, setManagementCounterpartyKey] = useState('')
  const [managementDestinationCreateTitle, setManagementDestinationCreateTitle] = useState('')
  const [managementDestinationCreateDescription, setManagementDestinationCreateDescription] = useState('')
  const [managementDestinationCreateIsPublic, setManagementDestinationCreateIsPublic] = useState(false)
  const [managementSelectionMode, setManagementSelectionMode] = useState<ManagementSelectionMode>('all')
  const [managementSelectionValuesInput, setManagementSelectionValuesInput] = useState('')
  const [managementSelectedSongIds, setManagementSelectedSongIds] = useState<string[]>([])
  const [managementSourceTrackSearch, setManagementSourceTrackSearch] = useState('')
  const [managementSourceTrackOffset, setManagementSourceTrackOffset] = useState(0)
  const [managementPreview, setManagementPreview] = useState<ManagementPreviewResponse | null>(null)
  const [managementPreviewError, setManagementPreviewError] = useState('')
  const [managementExecuteResult, setManagementExecuteResult] =
    useState<ManagementExecuteResponse | null>(null)
  const [managementExecuteError, setManagementExecuteError] = useState('')

  const currentUserQuery = useCurrentUser()
  const currentUser = currentUserQuery.data ?? null

  const playlistQuery = useQuery({
    queryKey: queryKeys.votunaPlaylist(playlistId),
    queryFn: () =>
      apiJson<VotunaPlaylist>(`/api/v1/votuna/playlists/${playlistId}`, { authRequired: true }),
    enabled: !!playlistId,
    refetchInterval: 60_000,
    staleTime: 10_000,
  })

  const suggestionsQuery = useQuery({
    queryKey: queryKeys.votunaSuggestions(playlistId),
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
    queryKey: queryKeys.votunaTracks(playlistId),
    queryFn: () =>
      apiJson<ProviderTrack[]>(`/api/v1/votuna/playlists/${playlistId}/tracks`, {
        authRequired: true,
      }),
    enabled: !!playlistId,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const membersQuery = useQuery({
    queryKey: queryKeys.votunaMembers(playlistId),
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

  const providerPlaylistsQuery = useQuery({
    queryKey: queryKeys.providerPlaylistsByProvider(playlist?.provider || ''),
    queryFn: () =>
      apiJson<ProviderPlaylist[]>(`/api/v1/playlists/providers/${playlist?.provider}`, {
        authRequired: true,
      }),
    enabled: !!playlist?.provider && canEditSettings,
    staleTime: 30_000,
  })

  const votunaPlaylistsQuery = useQuery({
    queryKey: queryKeys.votunaPlaylists,
    queryFn: () => apiJson<VotunaPlaylist[]>('/api/v1/votuna/playlists', { authRequired: true }),
    enabled: canEditSettings,
    staleTime: 30_000,
  })

  const managementCounterpartyOptions = useMemo<ManagementCounterpartyOption[]>(() => {
    if (!playlist) return []

    const options: ManagementCounterpartyOption[] = []
    for (const providerPlaylist of providerPlaylistsQuery.data ?? []) {
      if (
        providerPlaylist.provider !== playlist.provider ||
        providerPlaylist.provider_playlist_id === playlist.provider_playlist_id
      ) {
        continue
      }
      options.push({
        key: `provider:${providerPlaylist.provider}:${providerPlaylist.provider_playlist_id}`,
        label: providerPlaylist.title,
        detail: 'Provider playlist',
        ref: {
          kind: 'provider',
          provider: providerPlaylist.provider,
          provider_playlist_id: providerPlaylist.provider_playlist_id,
        },
      })
    }

    for (const votunaPlaylist of votunaPlaylistsQuery.data ?? []) {
      if (
        votunaPlaylist.id === playlist.id ||
        votunaPlaylist.owner_user_id !== currentUser?.id ||
        votunaPlaylist.provider !== playlist.provider
      ) {
        continue
      }
      options.push({
        key: `votuna:${votunaPlaylist.id}`,
        label: votunaPlaylist.title,
        detail: 'Votuna playlist',
        ref: {
          kind: 'votuna',
          votuna_playlist_id: votunaPlaylist.id,
        },
      })
    }

    return options
  }, [
    playlist,
    providerPlaylistsQuery.data,
    votunaPlaylistsQuery.data,
    currentUser?.id,
  ])

  useEffect(() => {
    if (!managementCounterpartyKey) return
    const exists = managementCounterpartyOptions.some((option) => option.key === managementCounterpartyKey)
    if (!exists) {
      setManagementCounterpartyKey('')
    }
  }, [managementCounterpartyKey, managementCounterpartyOptions])

  const selectedCounterpartyRef = useMemo(() => {
    return (
      managementCounterpartyOptions.find((option) => option.key === managementCounterpartyKey)?.ref ??
      null
    )
  }, [managementCounterpartyOptions, managementCounterpartyKey])

  useEffect(() => {
    setManagementSelectedSongIds([])
    setManagementSourceTrackOffset(0)
    setManagementSourceTrackSearch('')
  }, [managementDirection, managementCounterpartyKey, managementExportTargetMode])

  useEffect(() => {
    setManagementSourceTrackOffset(0)
  }, [managementSourceTrackSearch])

  const sourceRefForPicker = useMemo<ManagementPlaylistRef | null>(() => {
    if (!playlist) return null
    if (managementDirection === 'import_to_current') {
      return selectedCounterpartyRef
    }
    return {
      kind: 'votuna',
      votuna_playlist_id: playlist.id,
    }
  }, [playlist, managementDirection, selectedCounterpartyRef])

  const sourceRefForPickerKey = sourceRefForPicker ? toPlaylistRefKey(sourceRefForPicker) : ''

  const managementSourceTracksQuery = useQuery({
    queryKey: queryKeys.votunaManagementSourceTracks(
      playlistId,
      sourceRefForPickerKey,
      managementSourceTrackSearch,
      MANAGEMENT_SOURCE_TRACK_LIMIT,
      managementSourceTrackOffset,
    ),
    queryFn: () =>
      apiJson<ManagementSourceTracksResponse>(
        `/api/v1/votuna/playlists/${playlistId}/management/source-tracks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          authRequired: true,
          body: JSON.stringify({
            source: sourceRefForPicker,
            search: managementSourceTrackSearch.trim() || null,
            limit: MANAGEMENT_SOURCE_TRACK_LIMIT,
            offset: managementSourceTrackOffset,
          }),
        },
      ),
    enabled: Boolean(
      playlistId &&
        canEditSettings &&
        managementSelectionMode === 'songs' &&
        sourceRefForPicker,
    ),
    staleTime: 10_000,
  })

  const memberNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const member of membersQuery.data ?? []) {
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
  }, [membersQuery.data, currentUser])

  useEffect(() => {
    if (!settings) return
    setSettingsForm({
      required_vote_percent: settings.required_vote_percent,
      auto_add_on_threshold: settings.auto_add_on_threshold,
    })
  }, [settings])

  const invalidatePlaylistQueries = async (includeMembers: boolean) => {
    const keys = [
      queryKeys.votunaSuggestions(playlistId),
      queryKeys.votunaTracks(playlistId),
    ] as const
    const allKeys = includeMembers ? [...keys, queryKeys.votunaMembers(playlistId)] : keys
    await Promise.all(
      allKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )
  }

  const settingsMutation = useMutation({
    mutationFn: async (payload: PlaylistSettingsForm) => {
      return apiJson<PlaylistSettings>(`/api/v1/votuna/playlists/${playlistId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        authRequired: true,
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.votunaPlaylist(playlistId), (prev: VotunaPlaylist | undefined) => {
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
      await invalidatePlaylistQueries(true)
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
      await invalidatePlaylistQueries(false)
    },
  })

  const parsedSelectionValues = useMemo(() => {
    if (managementSelectionMode === 'all') return []
    if (managementSelectionMode === 'songs') return managementSelectedSongIds
    return uniqueTrimmedValues(managementSelectionValuesInput)
  }, [
    managementSelectionMode,
    managementSelectionValuesInput,
    managementSelectedSongIds,
  ])

  const managementRequest = useMemo<ManagementTransferRequest | null>(() => {
    const baseSelectionValid =
      managementSelectionMode === 'all' || parsedSelectionValues.length > 0
    if (!baseSelectionValid) return null

    if (managementDirection === 'import_to_current') {
      if (!selectedCounterpartyRef) return null
      return {
        direction: managementDirection,
        counterparty: selectedCounterpartyRef,
        destination_create: null,
        selection_mode: managementSelectionMode,
        selection_values: parsedSelectionValues,
      }
    }

    if (managementExportTargetMode === 'create') {
      const title = managementDestinationCreateTitle.trim()
      if (!title) return null
      return {
        direction: managementDirection,
        counterparty: null,
        destination_create: {
          title,
          description: managementDestinationCreateDescription.trim() || null,
          is_public: managementDestinationCreateIsPublic,
        },
        selection_mode: managementSelectionMode,
        selection_values: parsedSelectionValues,
      }
    }

    if (!selectedCounterpartyRef) return null
    return {
      direction: managementDirection,
      counterparty: selectedCounterpartyRef,
      destination_create: null,
      selection_mode: managementSelectionMode,
      selection_values: parsedSelectionValues,
    }
  }, [
    managementDirection,
    managementExportTargetMode,
    managementSelectionMode,
    parsedSelectionValues,
    selectedCounterpartyRef,
    managementDestinationCreateTitle,
    managementDestinationCreateDescription,
    managementDestinationCreateIsPublic,
  ])

  const managementRequestKey = JSON.stringify(managementRequest)

  useEffect(() => {
    setManagementPreview(null)
    setManagementPreviewError('')
    setManagementExecuteResult(null)
    setManagementExecuteError('')
  }, [managementRequestKey])

  const managementPreviewMutation = useMutation({
    mutationFn: async (payload: ManagementTransferRequest) => {
      return apiJson<ManagementPreviewResponse>(
        `/api/v1/votuna/playlists/${playlistId}/management/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          authRequired: true,
          body: JSON.stringify(payload),
        },
      )
    },
    onMutate: () => {
      setManagementPreviewError('')
    },
    onSuccess: (data) => {
      setManagementPreview(data)
      setManagementExecuteResult(null)
      setManagementExecuteError('')
    },
    onError: (error) => {
      const apiError = error as ApiError
      const message = apiError?.detail || apiError?.message || 'Unable to preview transfer'
      setManagementPreview(null)
      setManagementPreviewError(message)
    },
  })

  const managementExecuteMutation = useMutation({
    mutationFn: async (payload: ManagementTransferRequest) => {
      return apiJson<ManagementExecuteResponse>(
        `/api/v1/votuna/playlists/${playlistId}/management/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          authRequired: true,
          body: JSON.stringify(payload),
        },
      )
    },
    onMutate: () => {
      setManagementExecuteError('')
    },
    onSuccess: async (data) => {
      setManagementExecuteResult(data)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.votunaTracks(playlistId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.providerPlaylistsRoot }),
      ])
      if (managementRequest?.counterparty?.kind === 'votuna') {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.votunaTracks(String(managementRequest.counterparty.votuna_playlist_id)),
        })
      }
    },
    onError: (error) => {
      const apiError = error as ApiError
      const message = apiError?.detail || apiError?.message || 'Unable to execute transfer'
      setManagementExecuteError(message)
    },
  })

  const sourceTracksStatus = useMemo(() => {
    if (!managementSourceTracksQuery.error) return ''
    const apiError = managementSourceTracksQuery.error as ApiError
    return apiError?.detail || apiError?.message || 'Unable to load source tracks'
  }, [managementSourceTracksQuery.error])

  const saveSettings = () => {
    if (!playlistId || !canEditSettings) return
    setSettingsStatus('')
    settingsMutation.mutate(settingsForm)
  }

  const searchTracks = async () => {
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

  const suggestFromSearch = (track: ProviderTrack) => {
    setSuggestStatus('')
    suggestMutation.mutate({
      provider_track_id: track.provider_track_id,
      track_title: track.title,
      track_artist: track.artist ?? null,
      track_artwork_url: track.artwork_url ?? null,
      track_url: track.url ?? null,
    })
  }

  const suggestFromLink = () => {
    if (!playlistId || !linkSuggestionUrl.trim()) return
    setSuggestStatus('')
    suggestMutation.mutate({
      track_url: linkSuggestionUrl.trim(),
    })
  }

  const playTrack = ({ key, title, artist, url, artworkUrl }: TrackPlayRequest) => {
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

  const vote = (suggestionId: number) => {
    voteMutation.mutate(suggestionId)
  }

  const closePlayer = () => {
    setActivePlayerTrack(null)
  }

  const applyMergePreset = () => {
    setManagementDirection('import_to_current')
    setManagementExportTargetMode('existing')
    setManagementSelectionMode('all')
    setManagementSelectionValuesInput('')
    setManagementSelectedSongIds([])
  }

  const toggleSelectedSong = (trackId: string) => {
    setManagementSelectedSongIds((prev) =>
      prev.includes(trackId) ? prev.filter((value) => value !== trackId) : [...prev, trackId],
    )
  }

  return {
    playlist,
    isPlaylistLoading: playlistQuery.isLoading,
    suggestions,
    isSuggestionsLoading: suggestionsQuery.isLoading,
    tracks,
    isTracksLoading: tracksQuery.isLoading,
    members,
    isMembersLoading: membersQuery.isLoading,
    canEditSettings,
    memberNameById,
    settingsForm,
    settingsStatus,
    isSettingsSaving: settingsMutation.isPending,
    saveSettings,
    setRequiredVotePercent: (value: number) =>
      setSettingsForm((prev) => ({ ...prev, required_vote_percent: value })),
    setAutoAddOnThreshold: (value: boolean) =>
      setSettingsForm((prev) => ({ ...prev, auto_add_on_threshold: value })),
    searchQuery,
    setSearchQuery,
    searchTracks,
    isSearching,
    searchStatus,
    searchResults,
    suggestStatus,
    suggestFromSearch,
    isSuggestPending: suggestMutation.isPending,
    linkSuggestionUrl,
    setLinkSuggestionUrl,
    suggestFromLink,
    vote,
    isVotePending: voteMutation.isPending,
    playTrack,
    activePlayerTrack,
    playerNonce,
    closePlayer,
    management: {
      canManage: canEditSettings,
      direction: managementDirection,
      setDirection: setManagementDirection,
      exportTargetMode: managementExportTargetMode,
      setExportTargetMode: setManagementExportTargetMode,
      counterpartyOptions: managementCounterpartyOptions.map(({ key, label, detail }) => ({
        key,
        label,
        detail,
      })),
      selectedCounterpartyKey: managementCounterpartyKey,
      setSelectedCounterpartyKey: setManagementCounterpartyKey,
      destinationCreateTitle: managementDestinationCreateTitle,
      setDestinationCreateTitle: setManagementDestinationCreateTitle,
      destinationCreateDescription: managementDestinationCreateDescription,
      setDestinationCreateDescription: setManagementDestinationCreateDescription,
      destinationCreateIsPublic: managementDestinationCreateIsPublic,
      setDestinationCreateIsPublic: setManagementDestinationCreateIsPublic,
      selectionMode: managementSelectionMode,
      setSelectionMode: setManagementSelectionMode,
      selectionValuesInput: managementSelectionValuesInput,
      setSelectionValuesInput: setManagementSelectionValuesInput,
      sourceTrackSearch: managementSourceTrackSearch,
      setSourceTrackSearch: setManagementSourceTrackSearch,
      sourceTrackLimit: MANAGEMENT_SOURCE_TRACK_LIMIT,
      sourceTrackOffset: managementSourceTrackOffset,
      sourceTrackTotalCount: managementSourceTracksQuery.data?.total_count ?? 0,
      setSourceTrackOffset: setManagementSourceTrackOffset,
      sourceTracks: managementSourceTracksQuery.data?.tracks ?? [],
      selectedSongIds: managementSelectedSongIds,
      toggleSelectedSong,
      isSourceTracksLoading: managementSourceTracksQuery.isLoading,
      sourceTracksStatus,
      canPreview: Boolean(managementRequest),
      isPreviewPending: managementPreviewMutation.isPending,
      preview: managementPreview,
      previewError: managementPreviewError,
      onPreview: () => {
        if (!managementRequest || !playlistId) return
        managementPreviewMutation.mutate(managementRequest)
      },
      canExecute: Boolean(managementRequest && managementPreview),
      isExecutePending: managementExecuteMutation.isPending,
      executeResult: managementExecuteResult,
      executeError: managementExecuteError,
      onExecute: () => {
        if (!managementRequest || !playlistId) return
        managementExecuteMutation.mutate(managementRequest)
      },
      applyMergePreset,
    },
  }
}
