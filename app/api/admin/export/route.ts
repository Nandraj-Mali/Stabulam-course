import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { getUserRows } from "@/lib/admin-data";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  // guard against spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows, totalModules } = await getUserRows();
  const header = [
    "Name", "Email", "Phone", "WhatsApp", "School", "Designation", "Board", "Students", "City", "State",
    "Joined", "Onboarded", "Modules completed", "Total modules", "Minutes watched", "Avg quiz %", "Certificate", "Last active", "Role",
  ];
  const body = rows.map((r) =>
    [
      r.full_name, r.email, r.phone, r.whatsapp, r.school_name, r.designation, r.school_board, r.student_count, r.city, r.state,
      r.created_at, r.onboarded_at, r.modules_completed, totalModules, Math.round(r.watched_seconds / 60), r.avg_score,
      r.has_certificate ? "Yes" : "No", r.last_active_at, r.role,
    ].map(csvCell).join(",")
  );
  const csv = "﻿" + [header.map(csvCell).join(","), ...body].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
