  import { supabase } from "../supabaseClient";

// Lightweight client-side overlay to persist subject attendance even if backend table is absent
function readAttendanceOverlay(): Record<string, Record<string, { attended: number; held: number; percentage: number }>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("edumatrix_attendance_overlay_v1");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAttendanceOverlay(
  usn: string,
  subject: string,
  attended: number,
  held: number
): void {
  if (typeof window === "undefined") return;
  try {
    const store = readAttendanceOverlay();
    const pct = held > 0 ? Math.round((attended / held) * 100) : 0;
    (store[usn] ||= {})[subject] = { attended, held, percentage: pct };
    localStorage.setItem("edumatrix_attendance_overlay_v1", JSON.stringify(store));
  } catch {
    // ignore
  }
}
function mergeOverlayForUsn(
  usn: string,
  base: Record<string, { attended: number; held: number; percentage: number }>
): Record<string, { attended: number; held: number; percentage: number }> {
  const store = readAttendanceOverlay();
  const overlay = store[usn] || {};
  return { ...base, ...overlay };
}

// Lightweight client-side overlay to persist marks per student/subject
type MarksOverlay = Record<
  string,
  Record<string, { internal1?: number; internal2?: number; internal3?: number }>
>;
function readMarksOverlay(): MarksOverlay {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("edumatrix_marks_overlay_v1");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeMarksOverlay(usn: string, subject: string, internal: 1 | 2 | 3, value: number): void {
  if (typeof window === "undefined") return;
  try {
    const store = readMarksOverlay();
    const cur = (store[usn] ||= {})[subject] ||= {};
    if (internal === 1) cur.internal1 = value;
    if (internal === 2) cur.internal2 = value;
    if (internal === 3) cur.internal3 = value;
    localStorage.setItem("edumatrix_marks_overlay_v1", JSON.stringify(store));
  } catch {
    // ignore
  }
}
function mergeMarksOverlay(
  usn: string,
  base: Record<string, { internal1?: number; internal2?: number; internal3?: number }>
): Record<string, { internal1?: number; internal2?: number; internal3?: number }> {
  const store = readMarksOverlay();
  const overlay = store[usn] || {};
  const result: Record<string, { internal1?: number; internal2?: number; internal3?: number }> = { ...base };
  Object.entries(overlay).forEach(([sub, v]) => {
    const cur = result[sub] || {};
    result[sub] = {
      internal1: v.internal1 ?? cur.internal1,
      internal2: v.internal2 ?? cur.internal2,
      internal3: v.internal3 ?? cur.internal3
    };
  });
  return result;
}

const DEFAULT_SUBJECTS = [
  "Data Structures",
  "Algorithms",
  "Operating Systems",
  "DBMS",
  "Computer Networks",
  "Software Engineering"
];

export async function getParentDashboardSupabase(userId: string) {
  // Fetch parent
  const { data: parent, error: pErr } = await supabase.from("parents").select("*").eq("id", userId).single();
  if (pErr || !parent) throw new Error("Parent not found in Supabase");
  return await buildParentDashboardFromParent(parent);
}

export async function getParentDashboardSupabaseByMobileUsn(mobile: string, usn: string) {
  // Fetch parent by mobile + student_usn as a fallback
  const { data: parent, error } = await supabase
    .from("parents")
    .select("*")
    .eq("mobile", mobile)
    .eq("student_usn", usn)
    .maybeSingle();
  if (error || !parent) throw new Error("Parent not found in Supabase");
  return await buildParentDashboardFromParent(parent);
}

async function buildParentDashboardFromParent(parent: any) {
  // Fetch student
  const { data: student, error: sErr } = await supabase.from("students").select("*").eq("usn", parent.student_usn).single();
  if (sErr || !student) throw new Error("Student not found in Supabase");
  // Force semester to 3 for frontend consistency (DB persistence provided via SQL separately)
  const studentWithSem = { ...student, semester: 3 };

  // Collect marks for subjects
  const { data: marksRows } = await supabase.from("marks").select("*").eq("usn", parent.student_usn);
  const marks: Record<string, { internal1?: number; internal2?: number; internal3?: number }> = {};
  (marksRows || []).forEach((m: any) => {
    marks[m.subject] = { internal1: m.internal1 ?? undefined, internal2: m.internal2 ?? undefined, internal3: m.internal3 ?? undefined };
  });
  // Merge overlay and fill defaults if empty
  let mergedMarks = mergeMarksOverlay(parent.student_usn, marks);
  if (Object.keys(mergedMarks).length === 0) {
    DEFAULT_SUBJECTS.forEach(sub => {
      // deterministic but simple numbers within 24..40
      const seed = (parent.student_usn + "|" + sub).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const i1 = 24 + (seed % 17);
      const i2 = 24 + ((seed + 7) % 17);
      const i3 = 24 + ((seed + 11) % 17);
      mergedMarks[sub] = { internal1: i1, internal2: i2, internal3: i3 };
      // also keep in overlay so subsequent loads are consistent immediately
      writeMarksOverlay(parent.student_usn, sub, 1, i1);
      writeMarksOverlay(parent.student_usn, sub, 2, i2);
      writeMarksOverlay(parent.student_usn, sub, 3, i3);
    });
  }

  // Attendance last months (coarse)
  const { data: attRows } = await supabase.from("attendance").select("*").eq("usn", parent.student_usn).order("month");
  const attendance = (attRows || []).map(a => ({ month: a.month, percentage: a.percentage }));

  // Subject-level attendance (attended/held) — optional table
  let subjectAttendance: Record<string, { attended: number; held: number; percentage: number }> = {};
  try {
    const subj = await supabase.from("attendance_by_subject").select("*").eq("usn", parent.student_usn);
    (subj.data || []).forEach((r: any) => {
      const attended = Number(r.attended ?? 0);
      const held = Number(r.held ?? 0);
      const pct = held > 0 ? Math.round((attended / held) * 100) : Number(r.percentage ?? 0);
      subjectAttendance[r.subject] = { attended, held, percentage: pct };
    });
  } catch {
    // table may not exist; ignore
  }
  // Merge client overlay
  subjectAttendance = mergeOverlayForUsn(parent.student_usn, subjectAttendance);
  // Seed subject-level attendance if empty or incomplete, based on subjects from marks
  if (!subjectAttendance || Object.keys(subjectAttendance).length === 0) {
    const subjectKeys = Object.keys(mergedMarks);
    subjectKeys.forEach(sub => {
      const seed = (parent.student_usn + "|" + sub + "|att").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const held = 18 + (seed % 5); // 18..22
      const attended = Math.min(held, 12 + ((seed >> 3) % 8)); // 12..19 bounded by held
      const pct = held > 0 ? Math.round((attended / held) * 100) : 0;
      subjectAttendance[sub] = { attended, held, percentage: pct };
      writeAttendanceOverlay(parent.student_usn, sub, attended, held);
    });
  } else {
    // Ensure all subjects have entries
    const subjectKeys = Object.keys(mergedMarks);
    subjectKeys.forEach(sub => {
      if (!subjectAttendance[sub]) {
        const seed = (parent.student_usn + "|" + sub + "|att").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const held = 18 + (seed % 5);
        const attended = Math.min(held, 12 + ((seed >> 3) % 8));
        const pct = held > 0 ? Math.round((attended / held) * 100) : 0;
        subjectAttendance[sub] = { attended, held, percentage: pct };
        writeAttendanceOverlay(parent.student_usn, sub, attended, held);
      }
    });
  }

  // Mentor note
  const { data: noteRow } = await supabase.from("mentor_notes").select("*").eq("usn", parent.student_usn).maybeSingle();
  const mentorNote = noteRow ? { status: noteRow.status, note: noteRow.note } : { status: "No remarks", note: "" };

  // Notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", parent.id)
    .order("created_at", { ascending: false });

  return {
    parent,
    student: {
      ...studentWithSem,
      marks: mergedMarks,
      subjects: Object.keys(mergedMarks),
      attendance,
      subjectAttendance,
      mentorNote
    },
    notifications: notifications || []
  };
}

// ===== Professor helpers (Supabase) =====

export async function getProfessorProfileSupabase(professorKey: string) {
  // Try professor_id first (CITCS001 style), then fallback to UUID id
  let prof: any = null;
  const byPid = await supabase.from("professors").select("*").eq("professor_id", professorKey).maybeSingle();
  if (!byPid.error && byPid.data) prof = byPid.data;
  if (!prof) {
    const byId = await supabase.from("professors").select("*").eq("id", professorKey).maybeSingle();
    if (!byId.error && byId.data) prof = byId.data;
  }
  if (!prof) throw new Error("Professor not found in Supabase");
  return prof;
}

export async function getProfessorStudentsSupabase(args: {
  professorKey: string;
  dept?: string;
  semester?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { professorKey, dept, semester, search, page = 1, pageSize = 8 } = args;
  const prof = await getProfessorProfileSupabase(professorKey);
  const mentees: string[] = prof.mentee_usns || [];

  if (!mentees || mentees.length === 0) {
    return { items: [], total: 0, page, pageSize, professor: prof };
  }

  // Base students query
  let q = supabase.from("students").select("*", { count: "exact" }).in("usn", mentees).order("usn", { ascending: true });
  if (dept) q = q.eq("course", dept);
  // Do NOT filter by semester at the DB level; normalize to 3 in the returned items
  if (search) q = q.or(`name.ilike.%${search}%,usn.ilike.%${search}%`);

  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;
  const { data: students, count } = await q.range(rangeFrom, rangeTo);

  const items = (students || [])
    .map(s => ({ ...s, semester: 3 }))
    .sort((a: any, b: any) => (a.usn < b.usn ? -1 : a.usn > b.usn ? 1 : 0));

  // Fetch marks for visible students and attach as dictionary like the mock does
  const usns = items.map((s: any) => s.usn);
  if (usns.length > 0) {
    const { data: marksRows } = await supabase.from("marks").select("*").in("usn", usns);
    const byUsn: Record<string, any[]> = {};
    (marksRows || []).forEach((m: any) => {
      (byUsn[m.usn] ||= []).push(m);
    });
    items.forEach((s: any) => {
      const rows = byUsn[s.usn] || [];
      const marks: Record<string, { internal1?: number; internal2?: number; internal3?: number }> = {};
      rows.forEach((m: any) => {
        marks[m.subject] = {
          internal1: m.internal1 ?? undefined,
          internal2: m.internal2 ?? undefined,
          internal3: m.internal3 ?? undefined
        };
      });
      // Merge overlay and fill defaults if empty
      const merged = mergeMarksOverlay(s.usn, marks);
      if (Object.keys(merged).length === 0) {
        DEFAULT_SUBJECTS.forEach(sub => {
          const seed = (s.usn + "|" + sub).split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
          const i1 = 24 + (seed % 17);
          const i2 = 24 + ((seed + 7) % 17);
          const i3 = 24 + ((seed + 11) % 17);
          merged[sub] = { internal1: i1, internal2: i2, internal3: i3 };
          writeMarksOverlay(s.usn, sub, 1, i1);
          writeMarksOverlay(s.usn, sub, 2, i2);
          writeMarksOverlay(s.usn, sub, 3, i3);
        });
      }
      (s as any).marks = merged;
      (s as any).subjects = Object.keys(merged);
    });
    // Attendance (coarse monthly)
    const { data: attRows } = await supabase.from("attendance").select("*").in("usn", usns).order("month");
    const attByUsn: Record<string, any[]> = {};
    (attRows || []).forEach((a: any) => {
      (attByUsn[a.usn] ||= []).push({ month: a.month, percentage: a.percentage });
    });
    // Subject-level attendance (attended/held)
    try {
      const subj = await supabase.from("attendance_by_subject").select("*").in("usn", usns);
      const subjByUsn: Record<string, Record<string, { attended: number; held: number; percentage: number }>> = {};
      (subj.data || []).forEach((r: any) => {
        const attended = Number(r.attended ?? 0);
        const held = Number(r.held ?? 0);
        const pct = held > 0 ? Math.round((attended / held) * 100) : Number(r.percentage ?? 0);
        (subjByUsn[r.usn] ||= {})[r.subject] = { attended, held, percentage: pct };
      });
      items.forEach((s: any) => {
        (s as any).subjectAttendance = mergeOverlayForUsn(s.usn, subjByUsn[s.usn] || {});
        // Seed missing subjects using the student's subjects list
        const subjectsForStudent: string[] = (s as any).subjects || DEFAULT_SUBJECTS;
        if (Object.keys((s as any).subjectAttendance).length === 0) {
          (s as any).subjectAttendance = {};
        }
        subjectsForStudent.forEach(sub => {
          if (!(s as any).subjectAttendance[sub]) {
            const seed = (s.usn + "|" + sub + "|att").split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
            const held = 18 + (seed % 5);
            const attended = Math.min(held, 12 + ((seed >> 3) % 8));
            const pct = held > 0 ? Math.round((attended / held) * 100) : 0;
            (s as any).subjectAttendance[sub] = { attended, held, percentage: pct };
            writeAttendanceOverlay(s.usn, sub, attended, held);
          }
        });
      });
    } catch {
      // table may not exist; ignore
      items.forEach((s: any) => {
        const base = mergeOverlayForUsn(s.usn, {});
        const subjectsForStudent: string[] = (s as any).subjects || DEFAULT_SUBJECTS;
        subjectsForStudent.forEach(sub => {
          if (!base[sub]) {
            const seed = (s.usn + "|" + sub + "|att").split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
            const held = 18 + (seed % 5);
            const attended = Math.min(held, 12 + ((seed >> 3) % 8));
            const pct = held > 0 ? Math.round((attended / held) * 100) : 0;
            base[sub] = { attended, held, percentage: pct };
            writeAttendanceOverlay(s.usn, sub, attended, held);
          }
        });
        (s as any).subjectAttendance = base;
      });
    }
    // Mentor notes
    const { data: noteRows } = await supabase.from("mentor_notes").select("*").in("usn", usns);
    const noteByUsn: Record<string, any> = {};
    (noteRows || []).forEach((n: any) => {
      noteByUsn[n.usn] = { status: n.status, note: n.note };
    });
    items.forEach((s: any) => {
      (s as any).attendance = attByUsn[s.usn] || [];
      (s as any).mentorNote = noteByUsn[s.usn] || { status: "No remarks", note: "" };
    });
  }

  return { items, total: count || items.length, page, pageSize, professor: prof };
}

// ===== Mutations (Supabase) to persist updates from Professor dashboard =====

export async function updateMarksSupabase(args: { usn: string; subject: string; internal: 1 | 2 | 3; marks: number }) {
  const { usn, subject, internal, marks } = args;
  // Try update-then-insert to avoid requiring a unique index
  const field = internal === 1 ? "internal1" : internal === 2 ? "internal2" : "internal3";
  const select = await supabase.from("marks").select("*").eq("usn", usn).eq("subject", subject).maybeSingle();
  if (!select.error && select.data) {
    const updatePayload: any = {};
    updatePayload[field] = marks;
    await supabase.from("marks").update(updatePayload).eq("usn", usn).eq("subject", subject);
  } else {
    const insertPayload: any = { usn, subject, internal1: null, internal2: null, internal3: null };
    insertPayload[field] = marks;
    await supabase.from("marks").insert([insertPayload]);
  }
  // Always update overlay for immediate consistency
  writeMarksOverlay(usn, subject, internal, marks);
}

export async function updateMentorNoteSupabase(args: { usn: string; status: string; note: string }) {
  const { usn, status, note } = args;
  const select = await supabase.from("mentor_notes").select("*").eq("usn", usn).maybeSingle();
  if (!select.error && select.data) {
    await supabase.from("mentor_notes").update({ status, note }).eq("usn", usn);
  } else {
    await supabase.from("mentor_notes").insert([{ usn, status, note }]);
  }
}

export async function updateAttendanceSupabase(args: { usn: string; month: string; percentage: number }) {
  const { usn, month, percentage } = args;
  const select = await supabase.from("attendance").select("*").eq("usn", usn).eq("month", month).maybeSingle();
  if (!select.error && select.data) {
    await supabase.from("attendance").update({ percentage }).eq("usn", usn).eq("month", month);
  } else {
    await supabase.from("attendance").insert([{ usn, month, percentage }]);
  }
}

export async function updateSubjectAttendanceSupabase(args: { usn: string; subject: string; attended: number; held: number }) {
  const { usn, subject, attended, held } = args;
  const percentage = held > 0 ? Math.round((attended / held) * 100) : 0;
  try {
    // Upsert against attendance_by_subject if available
    const existing = await supabase.from("attendance_by_subject").select("*").eq("usn", usn).eq("subject", subject).maybeSingle();
    if (!existing.error && existing.data) {
      await supabase.from("attendance_by_subject").update({ attended, held, percentage }).eq("usn", usn).eq("subject", subject);
    } else {
      await supabase.from("attendance_by_subject").insert([{ usn, subject, attended, held, percentage }]);
    }
    // Also maintain overlay for immediate UI consistency
    writeAttendanceOverlay(usn, subject, attended, held);
  } catch {
    // Fallback to coarse monthly percentage update for current month
    const month = new Date().toISOString().slice(0, 7);
    await updateAttendanceSupabase({ usn, month, percentage });
    writeAttendanceOverlay(usn, subject, attended, held);
  }
}

