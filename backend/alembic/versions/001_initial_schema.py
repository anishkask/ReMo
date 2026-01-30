"""initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create videos table
    op.create_table(
        'videos',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('owner_id', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('storage_provider', sa.String(), nullable=True),
        sa.Column('object_key', sa.String(), nullable=True),
        sa.Column('video_url', sa.String(), nullable=False),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create comments table
    op.create_table(
        'comments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('video_id', sa.String(), nullable=False),
        sa.Column('author_name', sa.String(), nullable=True),
        sa.Column('author_id', sa.String(), nullable=True),
        sa.Column('timestamp_seconds', sa.Float(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='CASCADE')
    )
    
    # Create indexes for better query performance
    op.create_index('ix_comments_video_id', 'comments', ['video_id'])
    op.create_index('ix_comments_created_at', 'comments', ['created_at'])
    op.create_index('ix_comments_timestamp_seconds', 'comments', ['timestamp_seconds'])


def downgrade() -> None:
    op.drop_index('ix_comments_timestamp_seconds', table_name='comments')
    op.drop_index('ix_comments_created_at', table_name='comments')
    op.drop_index('ix_comments_video_id', table_name='comments')
    op.drop_table('comments')
    op.drop_table('videos')
