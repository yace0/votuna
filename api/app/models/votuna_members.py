"""Votuna playlist member models"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.votuna_playlist import VotunaPlaylist


class VotunaPlaylistMember(BaseModel):
    """Membership for Votuna playlists."""

    __tablename__ = "votuna_playlist_members"
    __table_args__ = (UniqueConstraint("playlist_id", "user_id", name="uq_votuna_playlist_member"),)

    playlist_id: Mapped[int] = mapped_column(
        ForeignKey("votuna_playlists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(default="member", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    playlist: Mapped["VotunaPlaylist"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="votuna_memberships")
