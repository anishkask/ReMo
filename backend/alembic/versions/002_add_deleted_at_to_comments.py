"""add deleted_at to comments

Revision ID: 002_add_deleted_at
Revises: 001_initial
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_add_deleted_at'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add deleted_at column to comments table (nullable for soft deletes)
    op.add_column('comments', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    
    # Create index on deleted_at for efficient filtering
    op.create_index('ix_comments_deleted_at', 'comments', ['deleted_at'])


def downgrade() -> None:
    op.drop_index('ix_comments_deleted_at', table_name='comments')
    op.drop_column('comments', 'deleted_at')
