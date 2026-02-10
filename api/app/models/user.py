"""User model"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user_settings import UserSettings
    from app.models.votuna_members import VotunaPlaylistMember
    from app.models.votuna_playlist import VotunaPlaylist
    from app.models.votuna_track_additions import VotunaTrackAddition
    from app.models.votuna_track_recommendation_declines import VotunaTrackRecommendationDecline
    from app.models.votuna_votes import VotunaTrackVote


class User(BaseModel):
    """Application user authenticated via SSO providers"""

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("auth_provider", "provider_user_id", name="uq_users_provider_user_id"),)

    auth_provider: Mapped[str] = mapped_column(index=True, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(index=True, nullable=False)
    email: Mapped[str | None]
    first_name: Mapped[str | None]
    last_name: Mapped[str | None]
    display_name: Mapped[str | None]
    avatar_url: Mapped[str | None]
    permalink_url: Mapped[str | None]

    access_token: Mapped[str | None]
    refresh_token: Mapped[str | None]
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    settings: Mapped["UserSettings"] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    votuna_playlists: Mapped[list["VotunaPlaylist"]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    votuna_memberships: Mapped[list["VotunaPlaylistMember"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    votuna_votes: Mapped[list["VotunaTrackVote"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    votuna_track_additions: Mapped[list["VotunaTrackAddition"]] = relationship(
        back_populates="added_by_user",
    )
    votuna_recommendation_declines: Mapped[list["VotunaTrackRecommendationDecline"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
