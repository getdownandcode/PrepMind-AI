"""Initial schema."""
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String, unique=True, index=True, nullable=False),
        sa.Column("password_hash", sa.String, nullable=False),
        sa.Column("full_name", sa.String),
        sa.Column("target_role", sa.String),
        sa.Column("experience_level", sa.String),
        sa.Column("target_company", sa.String),
        sa.Column("readiness_score", sa.Numeric(5, 2), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # Other tables created in subsequent migrations.


def downgrade() -> None:
    op.drop_table("users")
