"""
Analytics router — city-wide aggregated data for the Analytics Dashboard.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Owner, Parcel, TaxRecord, PublicFacility
from ..schemas import CityOverviewResponse, RevenueMetric, RevenueResponse, PublicFacilityOut

router = APIRouter()

CURRENT_FY = "2024-25"


@router.get("/analytics/city-overview", response_model=CityOverviewResponse)
async def city_overview(db: AsyncSession = Depends(get_db)):
    """Aggregated city-level statistics: parcel count, area, ward distribution."""

    # Total parcels and area
    totals = await db.execute(
        select(func.count(Parcel.id), func.sum(Parcel.area_sqm))
    )
    parcel_count, total_area = totals.one()
    total_area = float(total_area or 0)

    # Land use breakdown
    lu_result = await db.execute(
        select(Parcel.land_use, func.count(Parcel.id)).group_by(Parcel.land_use)
    )
    land_use_breakdown = {row[0]: row[1] for row in lu_result}

    # Ward distribution
    ward_result = await db.execute(
        select(Parcel.ward_name, func.count(Parcel.id).label("count"))
        .group_by(Parcel.ward_name)
        .order_by(func.count(Parcel.id).desc())
    )
    ward_distribution = [
        {"ward": row.ward_name or "Unknown", "count": row.count}
        for row in ward_result
    ]

    # Total unique wards
    total_wards = len(ward_distribution)

    return CityOverviewResponse(
        total_parcels=parcel_count or 0,
        total_area_sqkm=round(total_area / 1_000_000, 4),
        total_wards=total_wards,
        total_ulpins=parcel_count or 0,
        land_use_breakdown=land_use_breakdown,
        ward_distribution=ward_distribution[:10],
    )


@router.get("/analytics/revenue", response_model=RevenueResponse)
async def revenue_metrics(
    fy: str = CURRENT_FY,
    db: AsyncSession = Depends(get_db),
):
    """Revenue and collection metrics for property tax."""

    tax_result = await db.execute(
        select(
            TaxRecord.status,
            func.count(TaxRecord.id).label("count"),
            func.sum(TaxRecord.amount_due).label("due"),
            func.sum(TaxRecord.amount_paid).label("paid"),
            func.sum(TaxRecord.arrears).label("arrears"),
        )
        .where(TaxRecord.financial_year == fy)
        .group_by(TaxRecord.status)
    )
    rows = tax_result.all()

    total_due = sum(float(r.due or 0) for r in rows)
    total_paid = sum(float(r.paid or 0) for r in rows)
    defaulter_count = sum(r.count for r in rows if r.status == "Defaulter")

    metrics = [
        RevenueMetric(
            category="Property Tax",
            total_due=total_due,
            total_collected=total_paid,
            collection_pct=round((total_paid / total_due * 100) if total_due else 0, 1),
            defaulter_count=defaulter_count,
        ),
        # Synthetic utility metrics for demo
        RevenueMetric(
            category="Water Charges",
            total_due=total_due * 0.3,
            total_collected=total_paid * 0.35,
            collection_pct=78.2,
            defaulter_count=int(defaulter_count * 0.4),
        ),
        RevenueMetric(
            category="Electricity",
            total_due=total_due * 0.8,
            total_collected=total_paid * 0.9,
            collection_pct=91.5,
            defaulter_count=int(defaulter_count * 0.1),
        ),
        RevenueMetric(
            category="Sewer/SWM",
            total_due=total_due * 0.15,
            total_collected=total_paid * 0.12,
            collection_pct=61.3,
            defaulter_count=int(defaulter_count * 0.6),
        ),
        RevenueMetric(
            category="Garbage Collection",
            total_due=total_due * 0.1,
            total_collected=total_paid * 0.08,
            collection_pct=55.7,
            defaulter_count=int(defaulter_count * 0.7),
        ),
    ]

    overall_pct = round((total_paid / total_due * 100) if total_due else 0, 1)

    return RevenueResponse(
        financial_year=fy,
        metrics=metrics,
        total_due=total_due,
        total_collected=total_paid,
        overall_pct=overall_pct,
    )


@router.get("/analytics/defaulters")
async def get_defaulters(
    fy: str = CURRENT_FY,
    category: str = "Property Tax",
    db: AsyncSession = Depends(get_db),
):
    """
    Return all tax-defaulter parcels with centroid coordinates for map pins.
    Uses ST_Centroid so the pin lands inside the building, not at a corner vertex.
    """
    sql = text("""
        SELECT
            p.ulpin,
            p.plot_number,
            p.address,
            o.owner_name,
            t.arrears,
            t.amount_due - t.amount_paid AS pending,
            ST_X(ST_Centroid(p.geometry)) AS lng,
            ST_Y(ST_Centroid(p.geometry)) AS lat
        FROM parcels p
        JOIN tax_records t ON t.parcel_id = p.id
        LEFT JOIN owners o ON o.parcel_id = p.id AND o.valid_to IS NULL
        WHERE
            t.financial_year = :fy
            AND t.status = 'Defaulter'
        ORDER BY t.arrears DESC
        LIMIT 200
    """)
    rows = await db.execute(sql, {"fy": fy})
    result = []
    for r in rows.mappings():
        result.append({
            "ulpin": r["ulpin"],
            "plot_number": r["plot_number"],
            "address": r["address"],
            "owner_name": r["owner_name"],
            "amount_due": float(r["pending"] or 0),
            "coordinates": [float(r["lng"]), float(r["lat"])],
        })
    return result


# ─── Public Facilities ────────────────────────────────────────────────────────

DEMO_FACILITIES = [
    {"facility_type": "School", "name": "Government Senior Secondary School", "locality": "Sector 68", "capacity": "1,240 students", "city": "Mohali"},
    {"facility_type": "School", "name": "Government Model School", "locality": "Sector 70", "capacity": "980 students", "city": "Mohali"},
    {"facility_type": "School", "name": "Primary School Phase 5", "locality": "Phase 5", "capacity": "620 students", "city": "Mohali"},
    {"facility_type": "Hospital", "name": "Civil Hospital Mohali", "locality": "Phase 6", "capacity": "350 beds", "city": "Mohali"},
    {"facility_type": "Hospital", "name": "Community Health Centre", "locality": "Sector 69", "capacity": "120 beds", "city": "Mohali"},
    {"facility_type": "Hospital", "name": "Urban Primary Health Centre", "locality": "Sector 67", "capacity": "50 beds", "city": "Mohali"},
]


async def seed_facilities(db: AsyncSession):
    result = await db.execute(select(PublicFacility).limit(1))
    if result.scalar_one_or_none():
        return
    import uuid as _uuid
    for data in DEMO_FACILITIES:
        db.add(PublicFacility(id=_uuid.uuid4(), **data))
    await db.commit()


@router.get("/analytics/facilities", response_model=list[PublicFacilityOut])
async def get_facilities(
    facility_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Return public service buildings (schools, hospitals) seeded for Mohali."""
    await seed_facilities(db)
    stmt = select(PublicFacility)
    if facility_type:
        stmt = stmt.where(PublicFacility.facility_type == facility_type)
    result = await db.execute(stmt)
    return [PublicFacilityOut.model_validate(f) for f in result.scalars().all()]
