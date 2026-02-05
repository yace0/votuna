"""Votuna track vote CRUD helpers"""
from sqlalchemy.orm import Session

from app.crud.base import BaseCRUD
from app.models.user import User
from app.models.votuna_votes import VotunaTrackVote


class VotunaTrackVoteCRUD(BaseCRUD[VotunaTrackVote, dict, dict]):
    def has_vote(self, db: Session, suggestion_id: int, user_id: int) -> bool:
        """Return whether the user already voted for the suggestion."""
        return (
            db.query(VotunaTrackVote)
            .filter(
                VotunaTrackVote.suggestion_id == suggestion_id,
                VotunaTrackVote.user_id == user_id,
            )
            .first()
            is not None
        )

    def count_votes(self, db: Session, suggestion_id: int) -> int:
        """Return the number of votes for the suggestion."""
        return (
            db.query(VotunaTrackVote)
            .filter(VotunaTrackVote.suggestion_id == suggestion_id)
            .count()
        )

    def list_voter_display_names(self, db: Session, suggestion_id: int) -> list[str]:
        """Return display names for users who voted on the suggestion."""
        voters = (
            db.query(User, VotunaTrackVote)
            .join(VotunaTrackVote, VotunaTrackVote.user_id == User.id)
            .filter(VotunaTrackVote.suggestion_id == suggestion_id)
            .order_by(VotunaTrackVote.created_at.asc())
            .all()
        )
        names: list[str] = []
        for user, _vote in voters:
            display_name = (
                user.display_name
                or user.first_name
                or user.email
                or user.provider_user_id
                or f"User {user.id}"
            )
            names.append(display_name)
        return names


votuna_track_vote_crud = VotunaTrackVoteCRUD(VotunaTrackVote)
