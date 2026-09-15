"""
Complaints router — citizen complaint CRUD for SUTRA.

Seeds demo Mohali complaints on first request if the table is empty.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Complaint, ComplaintReply
from ..schemas import (
    ComplaintOut, ComplaintListItem, AssignRequest, ReplyRequest
)

router = APIRouter()

# ─── Demo seed data ────────────────────────────────────────────────────────────
DEMO_COMPLAINTS = [
    {
        "ulpin": "PB-MHL-000005",
        "complainant": "Simran Kaur",
        "location": "Near Sector 67 Market Road, Mohali",
        "subject": "Sewer leakage near residential plot",
        "description": "Continuous sewer leakage has been observed near the property boundary. The road surface remains wet and sewage is entering the roadside drain.",
        "date": "10/09/2026",
        "status": "Open",
        "department": "Not Assigned",
        "photo_url": "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1000&q=80",
    },
    {
        "ulpin": "PB-MHL-000009",
        "complainant": "Balwinder Singh",
        "location": "Sector 65 agricultural access road",
        "subject": "Water supply connection problem",
        "description": "Water supply pressure has reduced significantly during the morning supply period.",
        "date": "09/09/2026",
        "status": "Assigned",
        "department": "Water Supply",
        "photo_url": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1000&q=80",
    },
    {
        "ulpin": "PB-MHL-000007",
        "complainant": "Rajinder Sharma",
        "location": "Sector 71 residential lane",
        "subject": "Street drainage blockage",
        "description": "Rainwater is accumulating near the property due to a blocked roadside drain.",
        "date": "08/09/2026",
        "status": "Open",
        "department": "Not Assigned",
        "photo_url": "https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=1000&q=80",
    },
    {
        "ulpin": "PB-MHL-000002",
        "complainant": "Gurpreet Singh",
        "location": "Sector 70 main road junction",
        "subject": "Street light not working",
        "description": "Three consecutive street lights on the main road near the residential colony are non-functional. This creates safety concerns at night.",
        "date": "07/09/2026",
        "status": "Resolved",
        "department": "Electricity Department",
        "photo_url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1000&q=80",
    },
]


async def seed_complaints(db: AsyncSession):
    """Seed demo complaints if table is empty."""
    result = await db.execute(select(Complaint).limit(1))
    if result.scalar_one_or_none():
        return
    for data in DEMO_COMPLAINTS:
        c = Complaint(id=uuid.uuid4(), **data)
        db.add(c)
    await db.commit()


# ─── List Complaints ───────────────────────────────────────────────────────────
@router.get("/complaints", response_model=list[ComplaintListItem])
async def list_complaints(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all complaints, optionally filtered by status."""
    await seed_complaints(db)
    stmt = select(Complaint).order_by(Complaint.created_at.desc())
    if status:
        stmt = stmt.where(Complaint.status == status)
    result = await db.execute(stmt)
    complaints = result.scalars().all()
    return [ComplaintListItem.model_validate(c) for c in complaints]


# ─── Complaint Detail ──────────────────────────────────────────────────────────
@router.get("/complaints/{complaint_id}", response_model=ComplaintOut)
async def get_complaint(complaint_id: str, db: AsyncSession = Depends(get_db)):
    """Get single complaint with full reply thread."""
    result = await db.execute(
        select(Complaint)
        .options(selectinload(Complaint.replies))
        .where(Complaint.id == uuid.UUID(complaint_id))
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return ComplaintOut.model_validate(complaint)


# ─── Assign to Department ──────────────────────────────────────────────────────
@router.post("/complaints/{complaint_id}/assign", response_model=ComplaintOut)
async def assign_complaint(
    complaint_id: str,
    body: AssignRequest,
    db: AsyncSession = Depends(get_db),
):
    """Assign complaint to a department."""
    result = await db.execute(
        select(Complaint)
        .options(selectinload(Complaint.replies))
        .where(Complaint.id == uuid.UUID(complaint_id))
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint.department = body.department
    complaint.status = "Assigned"
    await db.commit()
    await db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)


# ─── Add Reply ─────────────────────────────────────────────────────────────────
@router.post("/complaints/{complaint_id}/reply", response_model=ComplaintOut)
async def reply_complaint(
    complaint_id: str,
    body: ReplyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Add an official reply to a complaint."""
    result = await db.execute(
        select(Complaint)
        .options(selectinload(Complaint.replies))
        .where(Complaint.id == uuid.UUID(complaint_id))
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    today = datetime.now().strftime("%d/%m/%Y")
    reply = ComplaintReply(
        id=uuid.uuid4(),
        complaint_id=complaint.id,
        message=body.message,
        date=today,
        sender=body.sender or "SUTRA Municipal Administration",
    )
    db.add(reply)
    await db.commit()
    result2 = await db.execute(
        select(Complaint)
        .options(selectinload(Complaint.replies))
        .where(Complaint.id == complaint.id)
    )
    return ComplaintOut.model_validate(result2.scalar_one())
