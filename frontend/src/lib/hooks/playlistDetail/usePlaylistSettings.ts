import { useMutation, type QueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { queryKeys } from '@/lib/constants/queryKeys'
import { apiJson } from '@/lib/api'
import type {
  PersonalizePlaylistResponse,
  PlaylistSettings,
  PlaylistSettingsForm,
  VotunaPlaylist,
} from '@/lib/types/votuna'

type UsePlaylistSettingsArgs = {
  playlistId: string | undefined
  settings: PlaylistSettings | null | undefined
  canEditSettings: boolean
  isCollaborative: boolean
  queryClient: QueryClient
}

export function usePlaylistSettings({
  playlistId,
  settings,
  canEditSettings,
  isCollaborative,
  queryClient,
}: UsePlaylistSettingsArgs) {
  const [settingsForm, setSettingsForm] = useState<PlaylistSettingsForm>({
    required_vote_percent: 60,
    tie_break_mode: 'add',
  })
  const [settingsStatus, setSettingsStatus] = useState('')

  useEffect(() => {
    if (!settings) return
    setSettingsForm({
      required_vote_percent: settings.required_vote_percent,
      tie_break_mode: settings.tie_break_mode,
    })
  }, [settings])

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

  const personalizeMutation = useMutation({
    mutationFn: async () =>
      apiJson<PersonalizePlaylistResponse>(`/api/v1/votuna/playlists/${playlistId}/personalize`, {
        method: 'POST',
        authRequired: true,
      }),
    onSuccess: async (result) => {
      setSettingsStatus(
        `Switched to personal playlist. Removed ${result.removed_collaborators} collaborators, revoked ${result.revoked_invites} invites, canceled ${result.canceled_suggestions} suggestions.`,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.votunaPlaylist(playlistId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.votunaMembers(playlistId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.votunaInvites(playlistId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.votunaSuggestions(playlistId) }),
      ])
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to switch playlist type'
      setSettingsStatus(message)
    },
  })

  const saveSettings = () => {
    if (!playlistId || !canEditSettings || !isCollaborative) return
    setSettingsStatus('')
    settingsMutation.mutate(settingsForm)
  }

  const switchToPersonal = () => {
    if (!playlistId || !canEditSettings || !isCollaborative) return
    setSettingsStatus('')
    personalizeMutation.mutate()
  }

  return {
    settingsForm,
    settingsStatus,
    isSettingsSaving: settingsMutation.isPending,
    isSwitchingToPersonal: personalizeMutation.isPending,
    saveSettings,
    switchToPersonal,
    setRequiredVotePercent: (value: number) =>
      setSettingsForm((prev) => ({ ...prev, required_vote_percent: value })),
    setTieBreakMode: (value: 'add' | 'reject') =>
      setSettingsForm((prev) => ({ ...prev, tie_break_mode: value })),
  }
}
