"""Votuna track suggestion models"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.votuna_playlist import VotunaPlaylist
    from app.models.votuna_track_additions import VotunaTrackAddition
    from app.models.votuna_votes import VotunaTrackVote


class VotunaTrackSuggestion(BaseModel):
    """Track suggestions for Votuna playlists."""

    __tablename__ = "votuna_track_suggestions"

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("votuna_playlists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_track_id: Mapped[str] = mapped_column(nullable=False, index=True)
    track_title: Mapped[str | None]
    track_artist: Mapped[str | None]
    track_artwork_url: Mapped[str | None]
    track_url: Mapped[str | None]
    suggested_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(default="pending", nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    resolution_reason: Mapped[str | None]

    playlist: Mapped["VotunaPlaylist"] = relationship(back_populates="suggestions")
    votes: Mapped[list["VotunaTrackVote"]] = relationship(
        back_populates="suggestion",
        cascade="all, delete-orphan",
    )
    track_additions: Mapped[list["VotunaTrackAddition"]] = relationship(
        back_populates="suggestion",
    )
