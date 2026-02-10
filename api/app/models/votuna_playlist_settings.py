"""Votuna playlist settings model"""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.votuna_playlist import VotunaPlaylist


class VotunaPlaylistSettings(BaseModel):
    """Voting and collaboration settings per Votuna playlist."""

    __tablename__ = "votuna_playlist_settings"

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("votuna_playlists.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    required_vote_percent: Mapped[int] = mapped_column(default=60, nullable=False)
    tie_break_mode: Mapped[str] = mapped_column(default="add", nullable=False)

    playlist: Mapped["VotunaPlaylist"] = relationship(back_populates="settings")
