"""
Conflicts router + Conflict Detection Engine.

The engine runs as a background asyncio task (every 6 hours) and writes
detected cross-department discrepancies to the conflict_alerts table.

Detection rules:
  1. Zoning=Industrial but current owner is residential area → Medium
  2. Tax=Defaulter but utilities Active → High (possible subsidy abuse)
  3. Building violations > 0 but plan status = Approved → High
  4. Consumption spike: avg_consumption > 3x ward average → Medium
"""

import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import AsyncSessionLocal, get_db
from ..models import ConflictAlert, InfrastructureRecord, Parcel, TaxRecord, UtilityConnection
from ..schemas import ConflictAlertOut

logger = logging.getLogger(__name__)
router = APIRouter()

DETECTION_INTERVAL_HOURS = 6


# ─── API Endpoints ────────────────────────────────────────────────────────────

@router.get("/conflicts/active", response_model=list[ConflictAlertOut])
async def get_active_conflicts(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get all unresolved conflict alerts, newest first."""
    result = await db.execute(
        select(ConflictAlert, Parcel.ulpin, Parcel.plot_number)
        .join(Parcel, ConflictAlert.parcel_id == Parcel.id)
        .where(ConflictAlert.resolved == False)
        .order_by(ConflictAlert.detected_at.desc())
        .limit(limit)
    )
    rows = result.all()
    alerts = []
    for conflict, ulpin, plot_number in rows:
        out = ConflictAlertOut.model_validate(conflict)
        out.ulpin = ulpin
        out.plot_number = plot_number
        alerts.append(out)
    return alerts


@router.post("/conflicts/resolve/{conflict_id}", response_model=dict)
async def resolve_conflict(conflict_id: str, db: AsyncSession = Depends(get_db)):
    """Mark a specific conflict alert as resolved."""
    result = await db.execute(
        select(ConflictAlert).where(ConflictAlert.id == conflict_id)
    )
    conflict = result.scalar_one_or_none()
    if not conflict:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Conflict not found")

    conflict.resolved = True
    conflict.resolved_at = datetime.utcnow()
    await db.commit()
    return {"status": "resolved", "id": conflict_id}


@router.post("/conflicts/run-detection", response_model=dict)
async def trigger_detection():
    """Manually trigger the conflict detection engine."""
    asyncio.create_task(_run_detection())
    return {"status": "detection_started"}


# ─── Detection Engine ─────────────────────────────────────────────────────────

async def run_conflict_detection_loop():
    """Background loop: detect conflicts every DETECTION_INTERVAL_HOURS hours."""
    logger.info("Conflict Detection Engine started.")
    # Run immediately on startup
    await asyncio.sleep(5)  # brief wait for DB to be ready
    while True:
        try:
            await _run_detection()
        except Exception as e:
            logger.error(f"Conflict detection error: {e}")
        await asyncio.sleep(DETECTION_INTERVAL_HOURS * 3600)


async def _run_detection():
    """Run all detection rules and persist new alerts."""
    logger.info("Running conflict detection scan...")
    async with AsyncSessionLocal() as db:
        new_alerts: list[ConflictAlert] = []

        # ── Rule 1: Tax Defaulter + Active Utilities ──────────────────────────
        sql_rule1 = text("""
            SELECT DISTINCT p.id AS parcel_id
            FROM parcels p
            JOIN tax_records t ON t.parcel_id = p.id
            JOIN utility_connections u ON u.parcel_id = p.id
            LEFT JOIN conflict_alerts ca ON
                ca.parcel_id = p.id
                AND ca.alert_type = 'TAX_DEFAULTER_ACTIVE_UTILITY'
                AND ca.resolved = FALSE
            WHERE
                t.financial_year = '2024-25'
                AND t.status = 'Defaulter'
                AND u.connection_status = 'Active'
                AND ca.id IS NULL
        """)
        r1 = await db.execute(sql_rule1)
        for row in r1.mappings():
            new_alerts.append(ConflictAlert(
                parcel_id=row["parcel_id"],
                alert_type="TAX_DEFAULTER_ACTIVE_UTILITY",
                severity="High",
                description=(
                    "Property is a tax defaulter (FY 2024-25) but has active utility "
                    "connections — possible subsidy abuse or unregistered occupancy."
                ),
            ))

        # ── Rule 2: Industrial Consumption but Residential Zoning ─────────────
        sql_rule2 = text("""
            SELECT DISTINCT p.id AS parcel_id, u.avg_consumption
            FROM parcels p
            JOIN utility_connections u ON u.parcel_id = p.id AND u.utility_type = 'Electricity'
            LEFT JOIN conflict_alerts ca ON
                ca.parcel_id = p.id
                AND ca.alert_type = 'ZONING_CONSUMPTION_MISMATCH'
                AND ca.resolved = FALSE
            WHERE
                p.land_use = 'Residential'
                AND u.avg_consumption > 800
                AND ca.id IS NULL
        """)
        r2 = await db.execute(sql_rule2)
        for row in r2.mappings():
            new_alerts.append(ConflictAlert(
                parcel_id=row["parcel_id"],
                alert_type="ZONING_CONSUMPTION_MISMATCH",
                severity="Medium",
                description=(
                    f"Parcel is zoned Residential but electricity consumption "
                    f"({row['avg_consumption']:.0f} kWh/month) exceeds industrial thresholds. "
                    "Possible illegal commercial activity."
                ),
            ))

        # ── Rule 3: Active Violations but Plan Approved ────────────────────────
        sql_rule3 = text("""
            SELECT DISTINCT p.id AS parcel_id, ir.active_violations
            FROM parcels p
            JOIN infrastructure_records ir ON ir.parcel_id = p.id
            LEFT JOIN conflict_alerts ca ON
                ca.parcel_id = p.id
                AND ca.alert_type = 'APPROVED_PLAN_WITH_VIOLATIONS'
                AND ca.resolved = FALSE
            WHERE
                ir.building_plan_approved = TRUE
                AND ir.active_violations > 0
                AND ca.id IS NULL
        """)
        r3 = await db.execute(sql_rule3)
        for row in r3.mappings():
            new_alerts.append(ConflictAlert(
                parcel_id=row["parcel_id"],
                alert_type="APPROVED_PLAN_WITH_VIOLATIONS",
                severity="High",
                description=(
                    f"Building plan is marked Approved but {row['active_violations']} active "
                    "violation(s) are recorded. Requires physical inspection and plan revision."
                ),
            ))

        if new_alerts:
            db.add_all(new_alerts)
            await db.commit()
            logger.info(f"Conflict detection: inserted {len(new_alerts)} new alerts.")
        else:
            logger.info("Conflict detection: no new conflicts found.")
