"""Votuna track vote models"""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.votuna_suggestions import VotunaTrackSuggestion


class VotunaTrackVote(BaseModel):
    """Reactions for track suggestions."""

    __tablename__ = "votuna_track_votes"
    __table_args__ = (UniqueConstraint("suggestion_id", "user_id", name="uq_votuna_track_vote"),)

    suggestion_id: Mapped[int] = mapped_column(
        ForeignKey("votuna_track_suggestions.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reaction: Mapped[str] = mapped_column(default="up", nullable=False)

    suggestion: Mapped["VotunaTrackSuggestion"] = relationship("VotunaTrackSuggestion", back_populates="votes")
    user: Mapped["User"] = relationship("User", back_populates="votuna_votes")
