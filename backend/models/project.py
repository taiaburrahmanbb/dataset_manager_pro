import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, BigInteger, Float, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    modality: Mapped[str] = mapped_column(
        SAEnum("vision", "video", "nlp", "mixed", "unknown", name="modality_enum"),
        default="unknown"
    )
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list)
    color: Mapped[str] = mapped_column(String(100), default="from-violet-600 to-violet-800")

    # Wasabi integration
    wasabi_bucket: Mapped[str | None] = mapped_column(String(255), nullable=True)
    wasabi_prefix: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Stats (denormalized for performance)
    file_count: Mapped[int] = mapped_column(Integer, default=0)
    total_size: Mapped[int] = mapped_column(BigInteger, default=0)
    versions_count: Mapped[int] = mapped_column(Integer, default=0)
    labeling_progress: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    files: Mapped[list["DataFile"]] = relationship("DataFile", back_populates="project", lazy="selectin")
    versions: Mapped[list["DatasetVersion"]] = relationship("DatasetVersion", back_populates="project")
    jobs: Mapped[list["ProcessingJob"]] = relationship("ProcessingJob", back_populates="project")
