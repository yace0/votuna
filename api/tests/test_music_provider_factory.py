import pytest

from app.services.music_providers.factory import get_music_provider
from app.services.music_providers.soundcloud import SoundcloudProvider
from app.services.music_providers.spotify import SpotifyProvider


def test_get_music_provider_returns_soundcloud_provider():
    provider = get_music_provider("soundcloud", "token")
    assert isinstance(provider, SoundcloudProvider)


def test_get_music_provider_returns_spotify_provider():
    provider = get_music_provider("spotify", "token")
    assert isinstance(provider, SpotifyProvider)


def test_get_music_provider_rejects_unknown_provider():
    with pytest.raises(ValueError):
        get_music_provider("unknown", "token")
