import { Dialog, DialogPanel } from '@tremor/react'
import { useState } from 'react'

import PrimaryButton from '@/components/ui/PrimaryButton'
import SectionEyebrow from '@/components/ui/SectionEyebrow'
import SurfaceCard from '@/components/ui/SurfaceCard'

type PlaylistSettingsSectionProps = {
  requiredVotePercent: number
  tieBreakMode: 'add' | 'reject'
  playlistType: 'personal' | 'collaborative'
  collaboratorCount: number
  canEditSettings: boolean
  isSaving: boolean
  isSwitchingToPersonal: boolean
  settingsStatus: string
  onSaveSettings: () => void
  onSwitchToPersonal: () => void
  onRequiredVotePercentChange: (value: number) => void
  onTieBreakModeChange: (value: 'add' | 'reject') => void
}

export default function PlaylistSettingsSection({
  requiredVotePercent,
  tieBreakMode,
  playlistType,
  collaboratorCount,
  canEditSettings,
  isSaving,
  isSwitchingToPersonal,
  settingsStatus,
  onSaveSettings,
  onSwitchToPersonal,
  onRequiredVotePercentChange,
  onTieBreakModeChange,
}: PlaylistSettingsSectionProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const isCollaborative = playlistType === 'collaborative'
  const isAddOnTie = tieBreakMode === 'add'
  const canEditVoting = canEditSettings && isCollaborative

  return (
    <SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <SectionEyebrow>Settings</SectionEyebrow>
          <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
            Configure playlist type and song addition behavior.
          </p>
        </div>
        <PrimaryButton onClick={onSaveSettings} disabled={isSaving || !canEditVoting}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </PrimaryButton>
      </div>
      <div className="mt-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.4)]">
              Playlist type
            </p>
            <p className="mt-2 text-xs text-[color:rgb(var(--votuna-ink)/0.55)]">
              Current: <span className="font-medium">{isCollaborative ? 'Collaborative' : 'Personal'}</span>
              {isCollaborative ? ` (${collaboratorCount} collaborator${collaboratorCount === 1 ? '' : 's'})` : ''}
            </p>
            <p className="mt-1 text-xs text-[color:rgb(var(--votuna-ink)/0.55)]">
              Collaborative mode turns on automatically when someone joins.
            </p>
            {isCollaborative ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  One-way action
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Switching to personal will remove all collaborators, revoke outstanding invites, and delete pending
                  suggestions.
                </p>
                <button
                  type="button"
                  disabled={!canEditSettings || isSwitchingToPersonal}
                  onClick={() => setIsConfirmOpen(true)}
                  className="mt-3 inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSwitchingToPersonal ? 'Switching...' : 'Switch to personal'}
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.75)] px-4 py-3">
                <p className="text-sm text-[color:rgb(var(--votuna-ink)/0.65)]">
                  This playlist is already personal.
                </p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.7)] px-4 py-4">
            <p className="text-xs text-[color:rgb(var(--votuna-ink)/0.55)]">
              <span className="font-semibold text-rose-600">Note:</span> Voting settings are only used for
              collaborative playlists.
            </p>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                Tie-break mode
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-[color:rgb(var(--votuna-ink)/0.65)]">Reject on tie</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAddOnTie}
                  aria-label="Toggle tie-break mode"
                  disabled={!canEditVoting}
                  onClick={() => onTieBreakModeChange(isAddOnTie ? 'reject' : 'add')}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                    isAddOnTie
                      ? 'border-emerald-300 bg-emerald-100/80'
                      : 'border-[color:rgb(var(--votuna-ink)/0.2)] bg-[rgba(var(--votuna-paper),0.9)]'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      isAddOnTie ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-[color:rgb(var(--votuna-ink)/0.65)]">Add on tie</span>
              </div>
              <p className="mt-2 text-xs text-[color:rgb(var(--votuna-ink)/0.55)]">
                Current mode: <span className="font-medium">{isAddOnTie ? 'Add on tie' : 'Reject on tie'}</span>
              </p>
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                Required vote percent
              </p>
              <input
                type="number"
                min={1}
                max={100}
                value={requiredVotePercent}
                disabled={!canEditVoting}
                onChange={(event) => onRequiredVotePercentChange(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm text-[rgb(var(--votuna-ink))] disabled:opacity-60"
              />
            </div>
          </div>
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
      <Dialog
        open={isConfirmOpen}
        onClose={() => {
          if (isSwitchingToPersonal) return
          setIsConfirmOpen(false)
        }}
      >
        <DialogPanel className="w-full max-w-lg rounded-3xl border border-amber-200 bg-[rgb(var(--votuna-paper))] p-6 shadow-2xl shadow-black/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Are you sure?
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[rgb(var(--votuna-ink))]">
            Switch to personal playlist
          </h3>
          <p className="mt-3 text-sm text-[color:rgb(var(--votuna-ink)/0.72)]">
            This action will:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:rgb(var(--votuna-ink)/0.72)]">
            <li>Remove all collaborators</li>
            <li>Revoke outstanding invites</li>
            <li>Delete all pending suggestions</li>
          </ul>
          <p className="mt-3 text-sm text-amber-700">
            Collaborative mode turns back on automatically when someone joins again.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSwitchingToPersonal}
              className="inline-flex items-center rounded-full border border-[color:rgb(var(--votuna-ink)/0.15)] px-4 py-2 text-xs font-semibold text-[rgb(var(--votuna-ink))] transition hover:bg-[rgba(var(--votuna-paper),0.75)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchToPersonal()
                setIsConfirmOpen(false)
              }}
              disabled={isSwitchingToPersonal}
              className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSwitchingToPersonal ? 'Switching...' : 'Yes, switch to personal'}
            </button>
          </div>
        </DialogPanel>
      </Dialog>
    </SurfaceCard>
  )
}
