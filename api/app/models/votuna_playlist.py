"""Votuna playlist models"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.votuna_invites import VotunaPlaylistInvite
    from app.models.votuna_members import VotunaPlaylistMember
    from app.models.votuna_playlist_settings import VotunaPlaylistSettings
    from app.models.votuna_suggestions import VotunaTrackSuggestion
    from app.models.votuna_track_additions import VotunaTrackAddition
    from app.models.votuna_track_recommendation_declines import VotunaTrackRecommendationDecline


class VotunaPlaylist(BaseModel):
    """Application-level playlist overlay for provider playlists."""

    __tablename__ = "votuna_playlists"
    __table_args__ = (
        UniqueConstraint("provider", "provider_playlist_id", name="uq_votuna_playlists_provider_playlist"),
    )

    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(nullable=False)
    provider_playlist_id: Mapped[str] = mapped_column(nullable=False, index=True)
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None]
    image_url: Mapped[str | None]
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    owner: Mapped["User"] = relationship(back_populates="votuna_playlists")
    settings: Mapped["VotunaPlaylistSettings"] = relationship(
        back_populates="playlist",
        uselist=False,
        cascade="all, delete-orphan",
    )
    members: Mapped[list["VotunaPlaylistMember"]] = relationship(
        back_populates="playlist",
        cascade="all, delete-orphan",
    )
    invites: Mapped[list["VotunaPlaylistInvite"]] = relationship(
        back_populates="playlist",
        cascade="all, delete-orphan",
    )
    suggestions: Mapped[list["VotunaTrackSuggestion"]] = relationship(
        back_populates="playlist",
        cascade="all, delete-orphan",
    )
    track_additions: Mapped[list["VotunaTrackAddition"]] = relationship(
        back_populates="playlist",
        cascade="all, delete-orphan",
    )
    recommendation_declines: Mapped[list["VotunaTrackRecommendationDecline"]] = relationship(
        back_populates="playlist",
        cascade="all, delete-orphan",
    )
