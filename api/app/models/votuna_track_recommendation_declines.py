"""Per-user declined recommendation records for Votuna playlists."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.votuna_playlist import VotunaPlaylist


class VotunaTrackRecommendationDecline(BaseModel):
    """Tracks recommendations a user declined for a specific playlist."""

    __tablename__ = "votuna_track_recommendation_declines"
    __table_args__ = (
        UniqueConstraint(
            "playlist_id",
            "user_id",
            "provider_track_id",
            name="uq_votuna_track_recommendation_decline",
        ),
    )

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("votuna_playlists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_track_id: Mapped[str] = mapped_column(nullable=False, index=True)
    declined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    playlist: Mapped["VotunaPlaylist"] = relationship(back_populates="recommendation_declines")
    user: Mapped["User"] = relationship("User", back_populates="votuna_recommendation_declines")
