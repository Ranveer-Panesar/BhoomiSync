"""
SQLAlchemy ORM models for SUTRA / Land Stack.
All spatial columns use GeoAlchemy2 Geometry type with SRID=4326.
"""

import uuid
from datetime import datetime
from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, Float, ForeignKey,
    Integer, Numeric, String, Text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from .database import Base


class Parcel(Base):
    """Core land parcel — the root entity linked by ULPIN."""
    __tablename__ = "parcels"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ulpin       = Column(String(14), unique=True, nullable=False, index=True)
    plot_number = Column(String(50), nullable=False)
    geometry    = Column(Geometry("POLYGON", srid=4326), nullable=False)
    area_sqm    = Column(Float, nullable=False)
    land_use    = Column(String(50), nullable=False, default="Residential")
    ward_name   = Column(String(100))
    district    = Column(String(100), default="Bengaluru Urban")
    state       = Column(String(100), default="Karnataka")
    address     = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owners          = relationship("Owner", back_populates="parcel", cascade="all, delete-orphan")
    tax_records     = relationship("TaxRecord", back_populates="parcel", cascade="all, delete-orphan")
    utilities       = relationship("UtilityConnection", back_populates="parcel", cascade="all, delete-orphan")
    infrastructure  = relationship("InfrastructureRecord", back_populates="parcel", uselist=False, cascade="all, delete-orphan")
    conflict_alerts = relationship("ConflictAlert", back_populates="parcel", cascade="all, delete-orphan")


class Owner(Base):
    """Record of Rights — ownership history (valid_to=None means current owner)."""
    __tablename__ = "owners"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_id      = Column(UUID(as_uuid=True), ForeignKey("parcels.id"), nullable=False, index=True)
    owner_name     = Column(String(200), nullable=False)
    ownership_type = Column(String(50), nullable=False, default="Freehold")
    owner_aadhar   = Column(String(12))   # last 4 digits only
    contact_phone  = Column(String(15))
    survey_number  = Column(String(50))
    valid_from     = Column(Date, nullable=False)
    valid_to       = Column(Date, nullable=True)  # NULL = current
    deed_number    = Column(String(50))
    created_at     = Column(DateTime, default=datetime.utcnow)

    parcel = relationship("Parcel", back_populates="owners")


class TaxRecord(Base):
    """Property tax records per financial year."""
    __tablename__ = "tax_records"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_id      = Column(UUID(as_uuid=True), ForeignKey("parcels.id"), nullable=False, index=True)
    financial_year = Column(String(9), nullable=False)  # e.g. '2024-25'
    amount_due     = Column(Numeric(12, 2), nullable=False, default=0)
    amount_paid    = Column(Numeric(12, 2), nullable=False, default=0)
    status         = Column(String(20), nullable=False, default="Defaulter")
    payment_date   = Column(Date, nullable=True)
    arrears        = Column(Numeric(12, 2), default=0)
    penalty        = Column(Numeric(12, 2), default=0)
    created_at     = Column(DateTime, default=datetime.utcnow)

    parcel = relationship("Parcel", back_populates="tax_records")


class UtilityConnection(Base):
    """Electricity and Water utility connections per parcel."""
    __tablename__ = "utility_connections"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_id          = Column(UUID(as_uuid=True), ForeignKey("parcels.id"), nullable=False, index=True)
    utility_type       = Column(String(20), nullable=False)   # 'Electricity' | 'Water'
    connection_status  = Column(String(20), nullable=False, default="Active")
    provider           = Column(String(100))
    connection_id      = Column(String(50), unique=True)
    avg_consumption    = Column(Float)
    consumption_unit   = Column(String(10))   # 'kWh' | 'KL'
    meter_status       = Column(String(20), default="Working")
    recent_bill_amount = Column(Numeric(10, 2))
    last_reading_date  = Column(Date)
    created_at         = Column(DateTime, default=datetime.utcnow)

    parcel = relationship("Parcel", back_populates="utilities")


class InfrastructureRecord(Base):
    """Physical assets and infrastructure linked to a parcel."""
    __tablename__ = "infrastructure_records"

    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_id              = Column(UUID(as_uuid=True), ForeignKey("parcels.id"), nullable=False, unique=True)
    sewage_connected       = Column(Boolean, default=False)
    nearest_manhole_id     = Column(String(30))
    building_plan_approved = Column(Boolean, default=False)
    approved_floors        = Column(String(20))
    construction_year      = Column(Integer)
    active_violations      = Column(Integer, default=0)
    violations_detail      = Column(JSONB, default=list)
    created_at             = Column(DateTime, default=datetime.utcnow)

    parcel = relationship("Parcel", back_populates="infrastructure")


class ConflictAlert(Base):
    """Cross-department discrepancy alerts generated by the Conflict Engine."""
    __tablename__ = "conflict_alerts"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_id   = Column(UUID(as_uuid=True), ForeignKey("parcels.id"), nullable=False, index=True)
    alert_type  = Column(String(100), nullable=False)
    severity    = Column(Enum('High', 'Medium', 'Low', name='conflict_severity_enum'), nullable=False, default="Medium")
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved    = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

    parcel = relationship("Parcel", back_populates="conflict_alerts")


class Complaint(Base):
    """Citizen complaints submitted through the SUTRA service network."""
    __tablename__ = "complaints"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ulpin        = Column(String(14), nullable=True, index=True)  # linked parcel (optional)
    complainant  = Column(String(200), nullable=False)
    location     = Column(String(300), nullable=False)
    subject      = Column(String(300), nullable=False)
    description  = Column(Text, nullable=False)
    date         = Column(String(20), nullable=False)  # display format dd/mm/yyyy
    status       = Column(String(30), nullable=False, default="Open")  # Open | Assigned | Resolved
    department   = Column(String(100), default="Not Assigned")
    photo_url    = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    replies = relationship("ComplaintReply", back_populates="complaint", cascade="all, delete-orphan")


class ComplaintReply(Base):
    """Official replies to a citizen complaint."""
    __tablename__ = "complaint_replies"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=False, index=True)
    message      = Column(Text, nullable=False)
    date         = Column(String(20), nullable=False)
    sender       = Column(String(200), nullable=False, default="SUTRA Municipal Administration")
    created_at   = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="replies")


class PublicFacility(Base):
    """Public service buildings: schools, hospitals, etc."""
    __tablename__ = "public_facilities"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_type = Column(String(50), nullable=False, index=True)  # 'School' | 'Hospital'
    name         = Column(String(300), nullable=False)
    locality     = Column(String(200), nullable=False)
    capacity     = Column(String(100))       # e.g. '1,240 students' or '350 beds'
    status       = Column(String(50), default="Operational")
    city         = Column(String(100), default="Mohali")
    created_at   = Column(DateTime, default=datetime.utcnow)
