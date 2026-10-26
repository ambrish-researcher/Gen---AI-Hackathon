import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, JSON, Boolean
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


class Record(Base):
    __tablename__ = "records"
    id = Column(String, primary_key=True)
    kind = Column(String, index=True)
    created_at = Column(String)
    valid = Column(Boolean, default=True)
    payload = Column(JSON)


class Database:
    def __init__(self, url=None):
        self.engine = create_engine(
            url
            or os.getenv("DATABASE_URL", "sqlite:////workspace/praxis-data/praxis.db"),
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(self.engine)

    def put(self, id, kind, payload):
        with self.session.begin() as s:
            row = s.get(Record, id)
            if row:
                row.payload = payload
            else:
                s.add(
                    Record(
                        id=id,
                        kind=kind,
                        payload=payload,
                        created_at=datetime.now(timezone.utc).isoformat(),
                        valid=True,
                    )
                )

    def list(self, kind):
        with self.session() as s:
            return [
                {"id": r.id, "created_at": r.created_at, "valid": r.valid, **r.payload}
                for r in s.query(Record)
                .filter_by(kind=kind)
                .order_by(Record.created_at.desc())
                .limit(100)
            ]

    def invalidate(self, id):
        with self.session.begin() as s:
            r = s.get(Record, id)
            if r:
                r.valid = False
            return r is not None
