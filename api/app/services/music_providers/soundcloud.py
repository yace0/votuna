"""SoundCloud provider integration."""
from typing import Any, Sequence
import httpx

from app.config.settings import settings
from app.services.music_providers.base import (
    MusicProviderClient,
    ProviderPlaylist,
    ProviderTrack,
    ProviderAuthError,
    ProviderAPIError,
)


class SoundcloudProvider(MusicProviderClient):
    provider = "soundcloud"

    def __init__(self, access_token: str):
        super().__init__(access_token)
        self.base_url = settings.SOUNDCLOUD_API_BASE_URL or "https://api.soundcloud.com"

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
        }

    def _params(self) -> dict[str, str]:
        return {}

    def _raise_for_status(self, response: httpx.Response) -> None:
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in {401, 403}:
                raise ProviderAuthError("SoundCloud authorization expired or invalid") from exc
            raise ProviderAPIError(
                f"SoundCloud API error ({status_code})",
                status_code=status_code,
            ) from exc

    def _to_provider_track(self, payload: Any) -> ProviderTrack | None:
        if not isinstance(payload, dict):
            return None
        track_id = payload.get("id")
        if track_id is None:
            return None
        user_payload = payload.get("user")
        user = user_payload if isinstance(user_payload, dict) else {}
        return ProviderTrack(
            provider_track_id=str(track_id),
            title=payload.get("title") or "Untitled",
            artist=user.get("username"),
            artwork_url=payload.get("artwork_url") or user.get("avatar_url"),
            url=payload.get("permalink_url"),
        )

    async def list_playlists(self) -> Sequence[ProviderPlaylist]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=15) as client:
            response = await client.get(
                "/me/playlists",
                headers=self._headers(),
                params=self._params(),
            )
            self._raise_for_status(response)
            data = response.json()
        playlists = []
        for item in data or []:
            sharing = item.get("sharing")
            is_public = None
            if isinstance(sharing, str):
                is_public = sharing.lower() == "public"
            playlists.append(
                ProviderPlaylist(
                    provider=self.provider,
                    provider_playlist_id=str(item.get("id")),
                    title=item.get("title") or "Untitled",
                    description=item.get("description"),
                    image_url=item.get("artwork_url") or item.get("user", {}).get("avatar_url"),
                    track_count=item.get("track_count"),
                    is_public=is_public,
                )
            )
        return playlists

    async def get_playlist(self, provider_playlist_id: str) -> ProviderPlaylist:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=15) as client:
            response = await client.get(
                f"/playlists/{provider_playlist_id}",
                headers=self._headers(),
                params=self._params(),
            )
            self._raise_for_status(response)
            item = response.json()
        return ProviderPlaylist(
            provider=self.provider,
            provider_playlist_id=str(item.get("id")),
            title=item.get("title") or "Untitled",
            description=item.get("description"),
            image_url=item.get("artwork_url") or item.get("user", {}).get("avatar_url"),
            track_count=item.get("track_count"),
            is_public=(item.get("sharing") or "").lower() == "public"
            if isinstance(item.get("sharing"), str)
            else None,
        )

    async def create_playlist(
        self,
        title: str,
        description: str | None = None,
        is_public: bool | None = None,
    ) -> ProviderPlaylist:
        payload = {
            "playlist": {
                "title": title,
                "description": description or "",
                "sharing": "public" if is_public else "private",
            }
        }
        async with httpx.AsyncClient(base_url=self.base_url, timeout=15) as client:
            response = await client.post(
                "/playlists",
                headers=self._headers(),
                params=self._params(),
                json=payload,
            )
            self._raise_for_status(response)
            item = response.json()
        return ProviderPlaylist(
            provider=self.provider,
            provider_playlist_id=str(item.get("id")),
            title=item.get("title") or title,
            description=item.get("description") or description,
            image_url=item.get("artwork_url") or item.get("user", {}).get("avatar_url"),
            track_count=item.get("track_count"),
            is_public=(item.get("sharing") or "").lower() == "public"
            if isinstance(item.get("sharing"), str)
            else None,
        )

    async def list_tracks(self, provider_playlist_id: str) -> Sequence[ProviderTrack]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=15) as client:
            response = await client.get(
                f"/playlists/{provider_playlist_id}",
                headers=self._headers(),
                params=self._params(),
            )
            self._raise_for_status(response)
            payload = response.json()
        tracks = []
        for track in payload.get("tracks", []) or []:
            mapped_track = self._to_provider_track(track)
            if mapped_track:
                tracks.append(mapped_track)
        return tracks

    async def search_tracks(self, query: str, limit: int = 10) -> Sequence[ProviderTrack]:
        search_query = query.strip()
        if not search_query:
            return []
        safe_limit = max(1, min(limit, 25))
        async with httpx.AsyncClient(base_url=self.base_url, timeout=15) as client:
            response = await client.get(
                "/tracks",
                headers=self._headers(),
                params={
                    **self._params(),
                    "q": search_query,
                    "limit": safe_limit,
                },
            )
            self._raise_for_status(response)
            payload = response.json()
        results: list[ProviderTrack] = []
        if not isinstance(payload, list):
            return results
        for item in payload:
            mapped_track = self._to_provider_track(item)
            if mapped_track:
                results.append(mapped_track)
        return results

    async def resolve_track_url(self, url: str) -> ProviderTrack:
        track_url = url.strip()
        if not track_url:
            raise ProviderAPIError("Track URL is required", status_code=400)
        async with httpx.AsyncClient(base_url=self.base_url, timeout=15) as client:
            response = await client.get(
                "/resolve",
                headers=self._headers(),
                params={
                    **self._params(),
                    "url": track_url,
                },
            )
            self._raise_for_status(response)
            payload = response.json()
        if not isinstance(payload, dict):
            raise ProviderAPIError("Unable to resolve track URL", status_code=404)
        kind = payload.get("kind")
        if kind and kind != "track":
            raise ProviderAPIError("Resolved URL is not a track", status_code=400)
        mapped_track = self._to_provider_track(payload)
        if not mapped_track:
            raise ProviderAPIError("Unable to resolve track URL", status_code=404)
        return mapped_track

    async def add_tracks(self, provider_playlist_id: str, track_ids: Sequence[str]) -> None:
        if not track_ids:
            return
        # SoundCloud requires sending the full track list when updating playlists.
        async with httpx.AsyncClient(base_url=self.base_url, timeout=20) as client:
            response = await client.get(
                f"/playlists/{provider_playlist_id}",
                headers=self._headers(),
                params=self._params(),
            )
            self._raise_for_status(response)
            payload = response.json()
            existing_tracks = payload.get("tracks", []) or []
            existing_ids = {str(track.get("id")) for track in existing_tracks if track.get("id") is not None}
            for track_id in track_ids:
                track_id_str = str(track_id)
                if track_id_str in existing_ids:
                    continue
                existing_tracks.append({"id": int(track_id) if track_id_str.isdigit() else track_id})
                existing_ids.add(track_id_str)
            update_payload = {
                "playlist": {
                    "title": payload.get("title") or "Untitled",
                    "tracks": [{"id": track.get("id")} for track in existing_tracks if track.get("id") is not None],
                }
            }
            update_response = await client.put(
                f"/playlists/{provider_playlist_id}",
                headers=self._headers(),
                params=self._params(),
                json=update_payload,
            )
            self._raise_for_status(update_response)
