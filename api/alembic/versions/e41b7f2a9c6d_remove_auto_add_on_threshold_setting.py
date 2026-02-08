"""remove auto add on threshold setting

Revision ID: e41b7f2a9c6d
Revises: d3a9f7b1c2e4
Create Date: 2026-02-08 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e41b7f2a9c6d"
down_revision: Union[str, None] = "d3a9f7b1c2e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove deprecated auto-add toggle from playlist settings."""
    op.drop_column("votuna_playlist_settings", "auto_add_on_threshold")


def downgrade() -> None:
    """Restore deprecated auto-add toggle for rollback."""
    op.add_column(
        "votuna_playlist_settings",
        sa.Column(
            "auto_add_on_threshold",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
