import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, BigInteger, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from core.database import Base


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(
        SAEnum("draft", "released", "deprecated", name="version_status_enum"),
        default="draft"
    )
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list)
    file_count: Mapped[int] = mapped_column(Integer, default=0)
    total_size: Mapped[int] = mapped_column(BigInteger, default=0)

    # Immutable manifest — JSON with file hashes
    manifest: Mapped[dict] = mapped_column(JSONB, default=dict)
    lineage: Mapped[list] = mapped_column(JSONB, default=list)
    parent_version_id: Mapped[str | None] = mapped_column(String, ForeignKey("dataset_versions.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    released_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="versions")
