"""Votuna playlist settings CRUD helpers"""

from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import BaseCRUD
from app.models.votuna_playlist_settings import VotunaPlaylistSettings
from app.schemas import VotunaPlaylistSettingsCreate, VotunaPlaylistSettingsUpdate


class VotunaPlaylistSettingsCRUD(
    BaseCRUD[VotunaPlaylistSettings, VotunaPlaylistSettingsCreate, VotunaPlaylistSettingsUpdate]
):
    def get_by_playlist_id(self, db: Session, playlist_id: int) -> Optional[VotunaPlaylistSettings]:
        """Return settings for the given playlist."""
        return db.query(VotunaPlaylistSettings).filter(VotunaPlaylistSettings.playlist_id == playlist_id).first()


votuna_playlist_settings_crud = VotunaPlaylistSettingsCRUD(VotunaPlaylistSettings)
