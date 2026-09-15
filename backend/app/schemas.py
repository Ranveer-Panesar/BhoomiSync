"""
Pydantic v2 schemas for request/response validation in BhoomiSync API.
"""

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


# ─── Shared config ────────────────────────────────────────────────────────────

class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ─── Owner ────────────────────────────────────────────────────────────────────

class OwnerOut(OrmBase):
    id:             UUID
    owner_name:     str
    ownership_type: str
    contact_phone:  Optional[str] = None
    survey_number:  Optional[str] = None
    valid_from:     date
    valid_to:       Optional[date] = None
    deed_number:    Optional[str] = None


# ─── Tax ──────────────────────────────────────────────────────────────────────

class TaxRecordOut(OrmBase):
    id:             UUID
    financial_year: str
    amount_due:     float
    amount_paid:    float
    status:         str
    payment_date:   Optional[date] = None
    arrears:        float = 0
    penalty:        float = 0

    @field_validator("amount_due", "amount_paid", "arrears", "penalty", mode="before")
    @classmethod
    def coerce_decimal(cls, v):
        return float(v) if v is not None else 0.0


# ─── Utilities ────────────────────────────────────────────────────────────────

class UtilityOut(OrmBase):
    id:                 UUID
    utility_type:       str
    connection_status:  str
    provider:           Optional[str] = None
    connection_id:      Optional[str] = None
    avg_consumption:    Optional[float] = None
    consumption_unit:   Optional[str] = None
    meter_status:       Optional[str] = None
    recent_bill_amount: Optional[float] = None
    last_reading_date:  Optional[date] = None

    @field_validator("recent_bill_amount", mode="before")
    @classmethod
    def coerce_bill(cls, v):
        return float(v) if v is not None else None


# ─── Infrastructure ───────────────────────────────────────────────────────────

class InfraOut(OrmBase):
    sewage_connected:       bool = False
    nearest_manhole_id:     Optional[str] = None
    building_plan_approved: bool = False
    approved_floors:        Optional[str] = None
    construction_year:      Optional[int] = None
    active_violations:      int = 0
    violations_detail:      list[Any] = []


# ─── Conflict ─────────────────────────────────────────────────────────────────

class ConflictAlertOut(OrmBase):
    id:          UUID
    parcel_id:   UUID
    ulpin:       Optional[str] = None
    plot_number: Optional[str] = None
    alert_type:  str
    severity:    str
    description: str
    detected_at: datetime
    resolved:    bool = False


# ─── Parcel ───────────────────────────────────────────────────────────────────

class ParcelSummary(OrmBase):
    id:          UUID
    ulpin:       str
    plot_number: str
    area_sqm:    float
    land_use:    str
    ward_name:   Optional[str] = None
    address:     Optional[str] = None
    owner_name:  Optional[str] = None   # current owner (injected)


class ParcelDetail(OrmBase):
    id:          UUID
    ulpin:       str
    plot_number: str
    area_sqm:    float
    land_use:    str
    ward_name:   Optional[str] = None
    district:    Optional[str] = None
    state:       Optional[str] = None
    address:     Optional[str] = None
    has_conflict: bool = False
    geometry:    Optional[dict] = None


class OwnershipResponse(BaseModel):
    current_owner: Optional[OwnerOut] = None
    history:        list[OwnerOut] = []


class FiscalResponse(BaseModel):
    current_status: str
    current_fy_due: float
    total_arrears:  float
    records:        list[TaxRecordOut] = []


class UtilitiesResponse(BaseModel):
    electricity: Optional[UtilityOut] = None
    water:       Optional[UtilityOut] = None


# ─── Search ───────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    ulpin:       str
    plot_number: str
    address:     Optional[str] = None
    owner_name:  Optional[str] = None
    similarity:  float


# ─── Spatial Query ────────────────────────────────────────────────────────────

class SpatialQueryRequest(BaseModel):
    geojson_polygon: dict   # GeoJSON Polygon geometry

class SpatialQueryResult(BaseModel):
    parcel_count:        int
    total_area_sqm:      float
    total_pending_tax:   float
    defaulter_count:     int
    parcels:             list[ParcelSummary]


# ─── Analytics ────────────────────────────────────────────────────────────────

class CityOverviewResponse(BaseModel):
    total_parcels:     int
    total_area_sqkm:   float
    total_wards:       int
    total_ulpins:      int
    land_use_breakdown: dict[str, int]
    ward_distribution:  list[dict]


class RevenueMetric(BaseModel):
    category:         str
    total_due:        float
    total_collected:  float
    collection_pct:   float
    defaulter_count:  int


class RevenueResponse(BaseModel):
    financial_year: str
    metrics:        list[RevenueMetric]
    total_due:      float
    total_collected: float
    overall_pct:    float


# ─── Complaints ────────────────────────────────────────────────────────────────

class ComplaintReplyOut(OrmBase):
    id:          UUID
    message:     str
    date:        str
    sender:      str


class ComplaintListItem(OrmBase):
    id:          UUID
    ulpin:       Optional[str] = None
    complainant: str
    location:    str
    subject:     str
    date:        str
    status:      str
    department:  str


class ComplaintOut(OrmBase):
    id:          UUID
    ulpin:       Optional[str] = None
    complainant: str
    location:    str
    subject:     str
    description: str
    date:        str
    status:      str
    department:  str
    photo_url:   Optional[str] = None
    replies:     list[ComplaintReplyOut] = []


class AssignRequest(BaseModel):
    department: str


class ReplyRequest(BaseModel):
    message: str
    sender:  Optional[str] = None


# ─── Public Facilities ────────────────────────────────────────────────────────

class PublicFacilityOut(OrmBase):
    id:            UUID
    facility_type: str
    name:          str
    locality:      str
    capacity:      Optional[str] = None
    status:        str
    city:          str
