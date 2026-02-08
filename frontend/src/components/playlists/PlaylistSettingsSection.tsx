import PrimaryButton from '@/components/ui/PrimaryButton'
import SectionEyebrow from '@/components/ui/SectionEyebrow'
import SurfaceCard from '@/components/ui/SurfaceCard'

type PlaylistSettingsSectionProps = {
  requiredVotePercent: number
  canEditSettings: boolean
  isSaving: boolean
  settingsStatus: string
  onSaveSettings: () => void
  onRequiredVotePercentChange: (value: number) => void
}

export default function PlaylistSettingsSection({
  requiredVotePercent,
  canEditSettings,
  isSaving,
  settingsStatus,
  onSaveSettings,
  onRequiredVotePercentChange,
}: PlaylistSettingsSectionProps) {
  return (
    <SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <SectionEyebrow>Settings</SectionEyebrow>
          <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
            Votes required to add a track automatically.
          </p>
        </div>
        <PrimaryButton onClick={onSaveSettings} disabled={isSaving || !canEditSettings}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </PrimaryButton>
      </div>
      <div className="mt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.4)]">
            Required vote percent
          </p>
          <input
            type="number"
            min={1}
            max={100}
            value={requiredVotePercent}
            disabled={!canEditSettings}
            onChange={(event) => onRequiredVotePercentChange(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm text-[rgb(var(--votuna-ink))] disabled:opacity-60"
          />
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
    </SurfaceCard>
  )
}
