"""Track addition provenance records."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.votuna_playlist import VotunaPlaylist
    from app.models.votuna_suggestions import VotunaTrackSuggestion


class VotunaTrackAddition(BaseModel):
    """Stores how and when a track was added to a playlist."""

    __tablename__ = "votuna_track_additions"

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("votuna_playlists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_track_id: Mapped[str] = mapped_column(nullable=False, index=True)
    source: Mapped[str] = mapped_column(nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    added_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    suggestion_id: Mapped[int | None] = mapped_column(ForeignKey("votuna_track_suggestions.id", ondelete="SET NULL"))

    playlist: Mapped["VotunaPlaylist"] = relationship(back_populates="track_additions")
    added_by_user: Mapped["User"] = relationship("User", back_populates="votuna_track_additions")
    suggestion: Mapped["VotunaTrackSuggestion"] = relationship(back_populates="track_additions")
