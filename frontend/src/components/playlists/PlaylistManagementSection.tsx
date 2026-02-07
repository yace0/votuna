import type {
  ManagementDirection,
  ManagementExecuteResponse,
  ManagementPreviewResponse,
  ManagementSelectionMode,
  ProviderTrack,
} from '@/lib/types/votuna'
import PrimaryButton from '@/components/ui/PrimaryButton'
import SectionEyebrow from '@/components/ui/SectionEyebrow'
import SurfaceCard from '@/components/ui/SurfaceCard'

type ManagementCounterpartyOption = {
  key: string
  label: string
  detail: string
}

type PlaylistManagementSectionProps = {
  canManage: boolean
  direction: ManagementDirection
  onDirectionChange: (value: ManagementDirection) => void
  exportTargetMode: 'existing' | 'create'
  onExportTargetModeChange: (value: 'existing' | 'create') => void
  counterpartyOptions: ManagementCounterpartyOption[]
  selectedCounterpartyKey: string
  onSelectedCounterpartyKeyChange: (value: string) => void
  destinationCreateTitle: string
  onDestinationCreateTitleChange: (value: string) => void
  destinationCreateDescription: string
  onDestinationCreateDescriptionChange: (value: string) => void
  destinationCreateIsPublic: boolean
  onDestinationCreateIsPublicChange: (value: boolean) => void
  selectionMode: ManagementSelectionMode
  onSelectionModeChange: (value: ManagementSelectionMode) => void
  selectionValuesInput: string
  onSelectionValuesInputChange: (value: string) => void
  onApplyMergePreset: () => void
  sourceTrackSearch: string
  onSourceTrackSearchChange: (value: string) => void
  sourceTrackLimit: number
  sourceTrackOffset: number
  sourceTrackTotalCount: number
  onSourceTrackPageChange: (offset: number) => void
  sourceTracks: ProviderTrack[]
  selectedSongIds: string[]
  onToggleSelectedSong: (trackId: string) => void
  isSourceTracksLoading: boolean
  sourceTracksStatus: string
  canPreview: boolean
  isPreviewPending: boolean
  onPreview: () => void
  preview: ManagementPreviewResponse | null
  previewError: string
  canExecute: boolean
  isExecutePending: boolean
  onExecute: () => void
  executeResult: ManagementExecuteResponse | null
  executeError: string
}

const SAMPLE_LIMIT = 5

export default function PlaylistManagementSection({
  canManage,
  direction,
  onDirectionChange,
  exportTargetMode,
  onExportTargetModeChange,
  counterpartyOptions,
  selectedCounterpartyKey,
  onSelectedCounterpartyKeyChange,
  destinationCreateTitle,
  onDestinationCreateTitleChange,
  destinationCreateDescription,
  onDestinationCreateDescriptionChange,
  destinationCreateIsPublic,
  onDestinationCreateIsPublicChange,
  selectionMode,
  onSelectionModeChange,
  selectionValuesInput,
  onSelectionValuesInputChange,
  onApplyMergePreset,
  sourceTrackSearch,
  onSourceTrackSearchChange,
  sourceTrackLimit,
  sourceTrackOffset,
  sourceTrackTotalCount,
  onSourceTrackPageChange,
  sourceTracks,
  selectedSongIds,
  onToggleSelectedSong,
  isSourceTracksLoading,
  sourceTracksStatus,
  canPreview,
  isPreviewPending,
  onPreview,
  preview,
  previewError,
  canExecute,
  isExecutePending,
  onExecute,
  executeResult,
  executeError,
}: PlaylistManagementSectionProps) {
  const selectedSongIdSet = new Set(selectedSongIds)
  const canPageBack = sourceTrackOffset > 0
  const nextOffset = sourceTrackOffset + sourceTrackLimit
  const canPageForward = nextOffset < sourceTrackTotalCount
  const isCreatingDestination = direction === 'export_from_current' && exportTargetMode === 'create'

  if (!canManage) {
    return (
      <SurfaceCard>
        <SectionEyebrow>Manage</SectionEyebrow>
        <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
          Playlist management actions are owner-only. Ask the owner to run import/export operations.
        </p>
      </SurfaceCard>
    )
  }

  return (
    <div className="space-y-6">
      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <SectionEyebrow>Manage</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold text-[rgb(var(--votuna-ink))]">
              Playlist management
            </h2>
            <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
              Copy tracks between playlists with preview-first execution.
            </p>
          </div>
          <PrimaryButton onClick={onApplyMergePreset}>Merge into current</PrimaryButton>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.45)]">
              Direction
            </p>
            <select
              value={direction}
              onChange={(event) => onDirectionChange(event.target.value as ManagementDirection)}
              className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm"
            >
              <option value="import_to_current">Import into current playlist</option>
              <option value="export_from_current">Export from current playlist</option>
            </select>
          </div>

          {direction === 'export_from_current' ? (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.45)]">
                Destination mode
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onExportTargetModeChange('existing')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    exportTargetMode === 'existing'
                      ? 'bg-[rgb(var(--votuna-ink))] text-[rgb(var(--votuna-paper))]'
                      : 'border border-[color:rgb(var(--votuna-ink)/0.14)]'
                  }`}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => onExportTargetModeChange('create')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    exportTargetMode === 'create'
                      ? 'bg-[rgb(var(--votuna-ink))] text-[rgb(var(--votuna-paper))]'
                      : 'border border-[color:rgb(var(--votuna-ink)/0.14)]'
                  }`}
                >
                  Create new
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {!isCreatingDestination ? (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.45)]">
              Counterparty playlist
            </p>
            <select
              value={selectedCounterpartyKey}
              onChange={(event) => onSelectedCounterpartyKeyChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm"
            >
              <option value="">Select a playlist</option>
              {counterpartyOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label} - {option.detail}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.45)]">
                New playlist title
              </p>
              <input
                value={destinationCreateTitle}
                onChange={(event) => onDestinationCreateTitleChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm"
                placeholder="Playlist title"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.45)]">
                Description
              </p>
              <input
                value={destinationCreateDescription}
                onChange={(event) => onDestinationCreateDescriptionChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm"
                placeholder="Optional description"
              />
            </div>
            <label className="flex items-center gap-3 text-sm text-[color:rgb(var(--votuna-ink)/0.75)] sm:col-span-2">
              <input
                type="checkbox"
                checked={destinationCreateIsPublic}
                onChange={(event) => onDestinationCreateIsPublicChange(event.target.checked)}
              />
              Create as public playlist
            </label>
          </div>
        )}

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:rgb(var(--votuna-ink)/0.45)]">
            Selection mode
          </p>
          <select
            value={selectionMode}
            onChange={(event) => onSelectionModeChange(event.target.value as ManagementSelectionMode)}
            className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm"
          >
            <option value="all">All tracks</option>
            <option value="genre">By genre</option>
            <option value="artist">By artist</option>
            <option value="songs">Specific songs</option>
          </select>
        </div>

        {selectionMode === 'genre' || selectionMode === 'artist' ? (
          <div className="mt-4">
            <p className="text-xs text-[color:rgb(var(--votuna-ink)/0.55)]">
              Enter comma-separated values (case-insensitive exact matching).
            </p>
            <input
              value={selectionValuesInput}
              onChange={(event) => onSelectionValuesInputChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm"
              placeholder={selectionMode === 'genre' ? 'house, ukg' : 'artist one, artist two'}
            />
          </div>
        ) : null}
      </SurfaceCard>

      {selectionMode === 'songs' ? (
        <SurfaceCard>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionEyebrow>Source songs</SectionEyebrow>
              <p className="mt-2 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                Select one or more tracks to transfer.
              </p>
            </div>
            <div className="w-full max-w-sm">
              <input
                value={sourceTrackSearch}
                onChange={(event) => onSourceTrackSearchChange(event.target.value)}
                className="w-full rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.12)] bg-[rgba(var(--votuna-paper),0.9)] px-4 py-2 text-sm"
                placeholder="Search source tracks"
              />
            </div>
          </div>

          {sourceTracksStatus ? (
            <p className="mt-3 text-xs text-rose-500">{sourceTracksStatus}</p>
          ) : null}

          {isSourceTracksLoading ? (
            <p className="mt-4 text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">Loading source tracks...</p>
          ) : sourceTracks.length === 0 ? (
            <p className="mt-4 text-sm text-[color:rgb(var(--votuna-ink)/0.6)]">
              No source tracks found for this selection.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {sourceTracks.map((track) => (
                <label
                  key={track.provider_track_id}
                  className="flex items-center gap-3 rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.08)] px-4 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedSongIdSet.has(track.provider_track_id)}
                    onChange={() => onToggleSelectedSong(track.provider_track_id)}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[rgb(var(--votuna-ink))]">{track.title}</p>
                    <p className="truncate text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">
                      {track.artist || 'Unknown artist'}
                      {track.genre ? ` - ${track.genre}` : ''}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-[color:rgb(var(--votuna-ink)/0.55)]">
              Showing {sourceTrackOffset + 1}-
              {Math.min(sourceTrackOffset + sourceTrackLimit, sourceTrackTotalCount)} of{' '}
              {sourceTrackTotalCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPageBack}
                onClick={() => onSourceTrackPageChange(Math.max(0, sourceTrackOffset - sourceTrackLimit))}
                className="rounded-full border border-[color:rgb(var(--votuna-ink)/0.14)] px-3 py-1 text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canPageForward}
                onClick={() => onSourceTrackPageChange(nextOffset)}
                className="rounded-full border border-[color:rgb(var(--votuna-ink)/0.14)] px-3 py-1 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={onPreview} disabled={!canPreview || isPreviewPending}>
            {isPreviewPending ? 'Previewing...' : 'Preview transfer'}
          </PrimaryButton>
          <PrimaryButton onClick={onExecute} disabled={!canExecute || isExecutePending}>
            {isExecutePending ? 'Executing...' : 'Execute transfer'}
          </PrimaryButton>
        </div>

        {previewError ? <p className="mt-3 text-xs text-rose-500">{previewError}</p> : null}
        {executeError ? <p className="mt-3 text-xs text-rose-500">{executeError}</p> : null}

        {preview ? (
          <div className="mt-4 rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.85)] p-4">
            <p className="text-sm font-semibold text-[rgb(var(--votuna-ink))]">Preview summary</p>
            <div className="mt-2 grid gap-2 text-xs text-[color:rgb(var(--votuna-ink)/0.65)] sm:grid-cols-3">
              <p>Matched: {preview.matched_count}</p>
              <p>To add: {preview.to_add_count}</p>
              <p>Duplicates: {preview.duplicate_count}</p>
            </div>
            <p className="mt-2 text-xs text-[color:rgb(var(--votuna-ink)/0.6)]">
              {preview.source.title} {'->'} {preview.destination.title}
            </p>
            {preview.matched_sample.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-[color:rgb(var(--votuna-ink)/0.7)]">
                  Matched sample
                </p>
                <ul className="mt-1 space-y-1 text-xs text-[color:rgb(var(--votuna-ink)/0.65)]">
                  {preview.matched_sample.slice(0, SAMPLE_LIMIT).map((track) => (
                    <li key={`matched-${track.provider_track_id}`}>
                      {track.title} ({track.provider_track_id})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {executeResult ? (
          <div className="mt-4 rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.85)] p-4">
            <p className="text-sm font-semibold text-[rgb(var(--votuna-ink))]">Execution result</p>
            <div className="mt-2 grid gap-2 text-xs text-[color:rgb(var(--votuna-ink)/0.65)] sm:grid-cols-4">
              <p>Matched: {executeResult.matched_count}</p>
              <p>Added: {executeResult.added_count}</p>
              <p>Skipped: {executeResult.skipped_duplicate_count}</p>
              <p>Failed: {executeResult.failed_count}</p>
            </div>
            {executeResult.failed_items.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-rose-500">
                {executeResult.failed_items.slice(0, SAMPLE_LIMIT).map((item) => (
                  <li key={`failed-${item.provider_track_id}`}>
                    {item.provider_track_id}: {item.error}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
