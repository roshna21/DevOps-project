"use client";

import React from "react";
import { useAuth } from "@lib/auth";
import { useRouter } from "next/navigation";
import { Card } from "@components/Card";
import { PastelBadge } from "@components/PastelBadge";
import { Button } from "@components/Button";
import { mockApi } from "@lib/mockApi";
import { getParentDashboardSupabase, getParentDashboardSupabaseByMobileUsn } from "@lib/api/dashboard";
import { WeeklyBars } from "@components/charts/WeeklyBars";

export default function ParentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<{
    parent: any;
    student: any;
    notifications: any[];
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = React.useState<string>("All");

  React.useEffect(() => {
    if (!user) {
      router.replace("/signin");
      return;
    }
    if (user.role !== "parent") {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
        if (useSupabase) {
          let parentId: string | undefined = (user as any).id;
          let mobile: string | undefined = (user as any).mobile;
          let usn: string | undefined = (user as any).usn;
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("edumatrix_auth_user_v1");
              if (raw) {
                const u = JSON.parse(raw);
                parentId = parentId || u?.id;
                mobile = mobile || u?.mobile;
                usn = usn || u?.usn;
              }
            } catch { }
          }
          let res: any | null = null;
          if (parentId) {
            try {
              res = await getParentDashboardSupabase(parentId);
            } catch {
              res = null;
            }
          }
          if (!res && mobile && usn) {
            try {
              res = await getParentDashboardSupabaseByMobileUsn(mobile, usn);
            } catch {
              res = null;
            }
          }
          if (!res) {
            // Supabase tables empty — fall back to mock API
            res = await mockApi.getParentDashboard(user.id);
          }
          setData(res as any);
        } else {
          const res = await mockApi.getParentDashboard(user.id);
          setData(res);
        }
      } catch (e: any) {
        setError(e.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, router]);

  if (!user || user.role !== "parent") return null;
  if (loading) return <div className="py-16 text-center text-slate-600">Loading...</div>;
  if (error) return <div className="py-16 text-center text-rose-600">{error}</div>;
  if (!data) return null;

  const { parent, student, notifications } = data;
  const currentMonth = student.attendance[student.attendance.length - 1];

  // Deterministic pseudo-random based on USN + subject to keep bars stable
  function seededRandom(seed: string, idx: number) {
    let h = 2166136261;
    const s = `${seed}:${idx}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    // 0..1
    return (h >>> 0) / 4294967295;
  }

  function computeWeeklyData(selected: string) {
    const subjMap: Record<string, { attended: number; held: number; percentage: number }> = student.subjectAttendance || {};
    let attended = 0;
    let held = 0;
    if (selected === "All") {
      Object.values(subjMap).forEach((v: any) => {
        attended += Number(v.attended || 0);
        held += Number(v.held || 0);
      });
    } else if (subjMap[selected]) {
      attended = Number(subjMap[selected].attended || 0);
      held = Number(subjMap[selected].held || 0);
    } else {
      // Fallback to coarse monthly percentage if subject data not available
      const pct = Math.round(currentMonth?.percentage ?? 80);
      held = 16;
      attended = Math.round((pct / 100) * held);
    }
    const weeks = ["Wk 1", "Wk 2", "Wk 3", "Wk 4"];
    // Split held/attended evenly across 4 weeks, distributing remainders
    const baseHeld = Math.floor(held / 4);
    const remHeld = held % 4;
    const baseAtt = Math.floor(attended / 4);
    const remAtt = attended % 4;
    const result = weeks.map((wk, i) => {
      const h = baseHeld + (i < remHeld ? 1 : 0);
      const a = Math.min(h, baseAtt + (i < remAtt ? 1 : 0));
      return { week: wk, attended: a, held: h, percentage: h > 0 ? Math.round((a / h) * 100) : 0 };
    });
    const totals = { attended, held };
    const overallPct = totals.held > 0 ? Math.round((totals.attended / totals.held) * 100) : currentMonth?.percentage ?? 0;
    return { result, totals, overallPct };
  }

  const { result: weekly, totals: weeklyTotals, overallPct } = computeWeeklyData(subjectFilter);
  const internalsRows = student.subjects.map((sub: string) => {
    const m = student.marks[sub] || {};
    const avg =
      [m.internal1, m.internal2, m.internal3].filter((x: number | undefined) => typeof x === "number").length > 0
        ? Math.round(
          ((m.internal1 ?? 0) + (m.internal2 ?? 0) + (m.internal3 ?? 0)) /
          [m.internal1, m.internal2, m.internal3].filter((x: number | undefined) => typeof x === "number").length
        )
        : null;
    return { subject: sub, ...m, average: avg };
  });

  function onDownloadReport() {
    const rows = internalsRows.map((r: any) => `
      <tr>
        <td>${r.subject}</td>
        <td>${typeof r.internal1 === "number" ? r.internal1 : "—"}</td>
        <td>${typeof r.internal2 === "number" ? r.internal2 : "—"}</td>
        <td>${typeof r.internal3 === "number" ? r.internal3 : "—"}</td>
        <td>${typeof r.average === "number" ? r.average : "—"}</td>
      </tr>`).join("");

    const attRows = student.attendance.map((a: any) => `
      <tr><td>${a.month}</td><td>${a.percentage}%</td></tr>`).join("");

    const now = new Date().toLocaleString();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>EduMatrix Report — ${student.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 28px; }
    .logo { font-size: 24px; font-weight: 700; color: #6366f1; }
    .meta { font-size: 12px; color: #64748b; text-align: right; }
    h2 { font-size: 15px; font-weight: 600; color: #6366f1; margin: 24px 0 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border-radius: 10px; padding: 16px; }
    .info-item label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-item span { display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #6366f1; color: #fff; padding: 10px 12px; text-align: left; font-size: 13px; }
    td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge-excellent { background: #d1fae5; color: #065f46; }
    .badge-needs { background: #fef3c7; color: #92400e; }
    .badge-no { background: #f1f5f9; color: #475569; }
    .mentor-box { background: #f8fafc; border-radius: 10px; padding: 16px; display: flex; align-items: flex-start; gap: 12px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">EduMatrix</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;">Cambridge Institute of Technology North Campus</div>
    </div>
    <div class="meta">
      <div style="font-weight:600;font-size:14px;">Academic Report</div>
      <div>Generated: ${now}</div>
    </div>
  </div>

  <h2>Student Information</h2>
  <div class="info-grid">
    <div class="info-item"><label>Student Name</label><span>${student.name}</span></div>
    <div class="info-item"><label>USN</label><span>${student.usn}</span></div>
    <div class="info-item"><label>Course</label><span>${student.course}</span></div>
    <div class="info-item"><label>Semester</label><span>${student.semester}</span></div>
  </div>

  <h2>Internal Marks</h2>
  <table>
    <thead><tr><th>Subject</th><th>Internal 1</th><th>Internal 2</th><th>Internal 3</th><th>Average</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Attendance Summary</h2>
  <table>
    <thead><tr><th>Month</th><th>Attendance %</th></tr></thead>
    <tbody>${attRows}</tbody>
  </table>

  <h2>Mentor Note</h2>
  <div class="mentor-box">
    <span class="badge ${student.mentorNote.status === "Excellent" ? "badge-excellent" : student.mentorNote.status === "Needs improvement" ? "badge-needs" : "badge-no"}">${student.mentorNote.status}</span>
    <span style="color:#334155;font-size:14px;">${student.mentorNote.note || "No note provided."}</span>
  </div>

  <div class="footer">
    <span>EduMatrix — Confidential Student Report</span>
    <span>${student.usn} | ${student.course}</span>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
          <div className="mt-3 text-slate-700">
            <div className="font-medium">{parent.name}</div>
            <div className="text-sm text-slate-500">{parent.mobile}</div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">Student Summary</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-700">
            <div>
              <div className="text-sm text-slate-500">Name</div>
              <div className="font-medium">
                {student.name && student.name.startsWith("Student ") ? (parent.name || student.name) : student.name}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">USN</div>
              <div className="font-medium">{student.usn}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Course</div>
              <div className="font-medium">{student.course}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Semester</div>
              <div className="font-medium">{student.semester}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Attendance</h3>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus-visible:pastel-focus"
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                aria-label="Subject filter"
              >
                <option value="All">All subjects</option>
                {student.subjects.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <WeeklyBars data={weekly} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Overall till today</span>
              <PastelBadge color="sky">{overallPct}%</PastelBadge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Classes attended</span>
              <span className="font-medium">{weeklyTotals.attended} / {weeklyTotals.held}</span>
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Internals</h3>
            <Button variant="secondary" onClick={onDownloadReport}>Download report</Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Internal 1</th>
                  <th className="px-3 py-2">Internal 2</th>
                  <th className="px-3 py-2">Internal 3</th>
                  <th className="px-3 py-2">Average</th>
                </tr>
              </thead>
              <tbody>
                {internalsRows.map((r: any) => (
                  <tr key={r.subject} className="border-t border-slate-200/70">
                    <td className="px-3 py-2 font-medium">{r.subject}</td>
                    {([r.internal1, r.internal2, r.internal3] as Array<number | undefined>).map((v, idx) => (
                      <td key={idx} className="px-3 py-2">
                        {typeof v === "number" ? (
                          v
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            — <span className="text-xs rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">pending</span>
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2">{typeof r.average === "number" ? r.average : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Mentor Note</h3>
          <div className="mt-3 flex items-center gap-3">
            <PastelBadge color={student.mentorNote.status === "Excellent" ? "mint" : student.mentorNote.status === "Needs improvement" ? "peach" : "slate"}>
              {student.mentorNote.status}
            </PastelBadge>
            <p className="text-slate-700">{student.mentorNote.note || "No note provided."}</p>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
          <div className="mt-3 space-y-3">
            {notifications.length === 0 && <div className="text-sm text-slate-500">No notifications yet.</div>}
            {notifications.map(n => (
              <div key={n.id} className="rounded-2xl border border-slate-200 p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.title}</div>
                  {!n.read && <span className="text-xs text-indigo-700">new</span>}
                </div>
                <div className="text-sm text-slate-600">{n.message}</div>
                <div className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}


