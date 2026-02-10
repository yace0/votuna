"""Votuna playlist invite models"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.votuna_playlist import VotunaPlaylist


class VotunaPlaylistInvite(BaseModel):
    """Invite links for joining a Votuna playlist."""

    __tablename__ = "votuna_playlist_invites"

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("votuna_playlists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    invite_type: Mapped[str] = mapped_column(nullable=False, default="link")
    token: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    max_uses: Mapped[int | None]
    uses_count: Mapped[int] = mapped_column(default=0, nullable=False)
    is_revoked: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    target_auth_provider: Mapped[str | None] = mapped_column(index=True)
    target_provider_user_id: Mapped[str | None] = mapped_column(index=True)
    target_username_snapshot: Mapped[str | None]
    target_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    accepted_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    playlist: Mapped["VotunaPlaylist"] = relationship(back_populates="invites")
