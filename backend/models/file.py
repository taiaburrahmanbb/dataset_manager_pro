import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, BigInteger, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from core.database import Base


class DataFile(Base):
    __tablename__ = "data_files"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    path: Mapped[str] = mapped_column(Text, nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, default=0)
    modality: Mapped[str] = mapped_column(
        SAEnum("vision", "video", "nlp", "mixed", "unknown", name="modality_enum"),
        default="unknown"
    )
    mime_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
    status: Mapped[str] = mapped_column(
        SAEnum("raw", "in_progress", "validated", "rejected", name="labeling_status_enum"),
        default="raw",
        index=True
    )
    checksum: Mapped[str] = mapped_column(String(100), nullable=False)
    wasabi_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    labels: Mapped[list] = mapped_column(JSONB, default=list)

    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="files")
