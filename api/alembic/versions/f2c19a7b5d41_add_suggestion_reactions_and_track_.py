"""add suggestion reactions and track addition provenance

Revision ID: f2c19a7b5d41
Revises: e41b7f2a9c6d
Create Date: 2026-02-08 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2c19a7b5d41"
down_revision: Union[str, None] = "e41b7f2a9c6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply schema changes for suggestion lifecycle and provenance."""
    op.add_column(
        "votuna_track_votes",
        sa.Column("reaction", sa.String(), server_default="up", nullable=False),
    )

    op.add_column(
        "votuna_track_suggestions",
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "votuna_track_suggestions",
        sa.Column("resolved_by_user_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "votuna_track_suggestions",
        sa.Column("resolution_reason", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_votuna_track_suggestions_resolved_by_user_id_users",
        "votuna_track_suggestions",
        "users",
        ["resolved_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "votuna_playlist_settings",
        sa.Column("tie_break_mode", sa.String(), server_default="add", nullable=False),
    )

    op.create_table(
        "votuna_track_additions",
        sa.Column("playlist_id", sa.Integer(), nullable=False),
        sa.Column("provider_track_id", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("added_by_user_id", sa.Integer(), nullable=True),
        sa.Column("suggestion_id", sa.Integer(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["playlist_id"], ["votuna_playlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["added_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["suggestion_id"], ["votuna_track_suggestions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_votuna_track_additions_id"), "votuna_track_additions", ["id"], unique=False)
    op.create_index(
        op.f("ix_votuna_track_additions_playlist_id"),
        "votuna_track_additions",
        ["playlist_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_votuna_track_additions_provider_track_id"),
        "votuna_track_additions",
        ["provider_track_id"],
        unique=False,
    )


def downgrade() -> None:
    """Revert suggestion lifecycle and provenance schema changes."""
    op.drop_index(op.f("ix_votuna_track_additions_provider_track_id"), table_name="votuna_track_additions")
    op.drop_index(op.f("ix_votuna_track_additions_playlist_id"), table_name="votuna_track_additions")
    op.drop_index(op.f("ix_votuna_track_additions_id"), table_name="votuna_track_additions")
    op.drop_table("votuna_track_additions")

    op.drop_column("votuna_playlist_settings", "tie_break_mode")

    op.drop_constraint(
        "fk_votuna_track_suggestions_resolved_by_user_id_users",
        "votuna_track_suggestions",
        type_="foreignkey",
    )
    op.drop_column("votuna_track_suggestions", "resolution_reason")
    op.drop_column("votuna_track_suggestions", "resolved_by_user_id")
    op.drop_column("votuna_track_suggestions", "resolved_at")

    op.drop_column("votuna_track_votes", "reaction")
