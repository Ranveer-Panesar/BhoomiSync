"use client";

import { useState, useEffect } from "react";
import {
  getComplaints, getComplaintDetail, assignComplaint, replyComplaint,
  ComplaintListItem, ComplaintDetail,
} from "@/lib/api";
import { MessageSquare, User, MapPin, Clock, Send, ChevronRight } from "lucide-react";

const DEPARTMENTS = [
  "Water Supply", "Electricity Department", "Drainage & Sewerage",
  "Roads & Infrastructure", "Sanitation", "Revenue Department",
];

function statusColor(s: string) {
  if (s === "Open")     return { bg: "rgba(239,68,68,0.1)",   color: "#DC2626" };
  if (s === "Assigned") return { bg: "rgba(245,158,11,0.12)", color: "#D97706" };
  return                        { bg: "rgba(16,185,129,0.12)", color: "#059669" };
}

export default function ComplaintsPage() {
  const [items, setItems]       = useState<ComplaintListItem[]>([]);
  const [selected, setSelected] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply]       = useState("");
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    getComplaints().then(data => { setItems(data); setLoading(false); });
  }, []);

  const open = async (item: ComplaintListItem) => {
    setDetailLoading(true);
    const d = await getComplaintDetail(item.id);
    setSelected(d);
    setDetailLoading(false);
  };

  const handleAssign = async (dept: string) => {
    if (!selected) return;
    const updated = await assignComplaint(selected.id, dept);
    setSelected(updated);
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, status: updated.status, department: updated.department } : i));
  };

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const updated = await replyComplaint(selected.id, reply.trim());
    setSelected(updated);
    setReply("");
    setSending(false);
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: inbox */}
      <div style={{
        width: 340, borderRight: "1px solid var(--border)",
        background: "var(--bg-sidebar)", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>Complaint Inbox</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{items.length} total</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>}
          {items.map(item => {
            const sc = statusColor(item.status);
            const active = selected?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => open(item)}
                style={{
                  padding: "14px 16px", cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                  background: active ? "var(--accent-dim)" : "transparent",
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", flex: 1, marginRight: 8 }}>{item.subject}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap", background: sc.bg, color: sc.color }}>{item.status}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  <User size={10} />{item.complainant}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, display: "flex", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} />{item.date}</span>
                  {item.ulpin && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} />{item.ulpin}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: detail */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-primary)" }}>
        {!selected ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <MessageSquare size={40} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14 }}>Select a complaint to view details</div>
          </div>
        ) : detailLoading ? (
          <div style={{ padding: 32, color: "var(--text-muted)" }}>Loading…</div>
        ) : (
          <div style={{ padding: "24px 28px", maxWidth: 800 }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{selected.subject}</h2>
                <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "3px 10px", ...statusColor(selected.status) }}>{selected.status}</span>
              </div>
              <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text-secondary)" }}>
                <span><User size={12} style={{ verticalAlign: -2 }} /> {selected.complainant}</span>
                <span><MapPin size={12} style={{ verticalAlign: -2 }} /> {selected.location}</span>
                <span><Clock size={12} style={{ verticalAlign: -2 }} /> {selected.date}</span>
              </div>
              {selected.ulpin && (
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>ULPIN: <strong>{selected.ulpin}</strong></div>
              )}
            </div>

            {/* Photo */}
            {selected.photo_url && (
              <img
                src={selected.photo_url} alt="Complaint photo"
                style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, marginBottom: 16 }}
              />
            )}

            {/* Description */}
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10,
              padding: "14px 16px", marginBottom: 16, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7,
            }}>
              {selected.description}
            </div>

            {/* Assign */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
                Assigned Department: <span style={{ color: selected.department !== "Not Assigned" ? "var(--accent)" : "var(--text-muted)" }}>{selected.department}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DEPARTMENTS.map(d => (
                  <button key={d} onClick={() => handleAssign(d)} style={{
                    fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                    background: selected.department === d ? "var(--accent-dim)" : "var(--bg-card-hover)",
                    border: `1px solid ${selected.department === d ? "var(--border-accent)" : "var(--border)"}`,
                    color: selected.department === d ? "var(--accent)" : "var(--text-secondary)",
                  }}>{d}</button>
                ))}
              </div>
            </div>

            {/* Replies */}
            {selected.replies.length > 0 && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>Official Replies</div>
                {selected.replies.map(r => (
                  <div key={r.id} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6 }}>{r.message}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{r.sender} · {r.date}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply box */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Add Reply</div>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Type official reply…"
                rows={3}
                style={{
                  width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text-primary)",
                  resize: "vertical", fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleReply}
                disabled={sending || !reply.trim()}
                style={{
                  marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  background: "var(--accent)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: sending || !reply.trim() ? "not-allowed" : "pointer",
                  opacity: sending || !reply.trim() ? 0.6 : 1,
                  border: "none",
                }}
              >
                <Send size={14} />
                {sending ? "Sending…" : "Send Reply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
