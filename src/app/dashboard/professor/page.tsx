"use client";

import React from "react";
import { useAuth } from "@lib/auth";
import { useRouter } from "next/navigation";
import { Card } from "@components/Card";
import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { Modal } from "@components/Modal";
import { mockApi } from "@lib/mockApi";
import type { Student } from "@lib/types";
import { UserCircle } from "lucide-react";
import {
  getProfessorProfileSupabase,
  getProfessorStudentsSupabase,
  updateMarksSupabase,
  updateMentorNoteSupabase,
  updateAttendanceSupabase
} from "@lib/api/dashboard";

type ListResponse = {
  items: Student[];
  total: number;
  page: number;
  pageSize: number;
};

const departments = [
  "Computer Science Engineering",
  "Electronics and Communication Engineering",
  "Cyber Security",
  "AI/ML",
  "Mechanical Engineering",
  "Data Science"
];

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<{ dept?: string; semester?: number; search?: string }>({ semester: 3 });
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<ListResponse | null>(null);
  const [profile, setProfile] = React.useState<{ name: string; department?: string; profileImage?: string; menteeUsns: string[] }>({
    name: "",
    department: "",
    profileImage: "",
    menteeUsns: []
  });
  const initializedDeptRef = React.useRef(false);
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [newMenteeUsn, setNewMenteeUsn] = React.useState("");
  const [previewStudents, setPreviewStudents] = React.useState<Student[]>([]);

  // Modals
  const [editMarksOpen, setEditMarksOpen] = React.useState(false);
  const [editNoteOpen, setEditNoteOpen] = React.useState(false);
  const [activeStudent, setActiveStudent] = React.useState<Student | null>(null);
  const [marksForm, setMarksForm] = React.useState<{ subject: string; internal: 1 | 2 | 3; marks: number }>({
    subject: "",
    internal: 1,
    marks: 0
  });
  const [noteForm, setNoteForm] = React.useState<{ status: Student["mentorNote"]["status"]; note: string }>({
    status: "No remarks",
    note: ""
  });
  const [editAttendanceOpen, setEditAttendanceOpen] = React.useState(false);
  const [attendanceForm, setAttendanceForm] = React.useState<{ subject: string; attended: string; held: string }>({
    subject: "",
    attended: "",
    held: ""
  });
  const [pendingAttendance, setPendingAttendance] = React.useState<Record<string, { attended: number; held: number }>>({});

  React.useEffect(() => {
    if (!user) {
      router.replace("/signin");
      return;
    }
    if (user.role !== "professor") {
      router.replace("/");
      return;
    }
    // Set default department filter to the professor's department (only once)
    if (!initializedDeptRef.current && (user as any).department) {
      setFilters(f => (f.dept ? f : { ...f, dept: (user as any).department }));
      initializedDeptRef.current = true;
    }
    (async () => {
      try {
        await load();
      } catch (e: any) {
        setError(e.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, page, filters.dept, filters.search, filters.semester]);

  async function load() {
    const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (useSupabase && user?.role === "professor") {
      // Be robust: read from auth state OR persisted localStorage (post-login augmentation)
      let profKey: string | undefined = (user as any).professorId || (user as any).id;
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("edumatrix_auth_user_v1");
          if (raw) {
            const u = JSON.parse(raw);
            profKey = u?.professorId || profKey || u?.id;
          }
        } catch {}
      }
      if (!profKey) {
        throw new Error("Professor not found in Supabase");
      }
      const list = await getProfessorStudentsSupabase({
        professorKey: profKey,
        dept: filters.dept,
        semester: filters.semester,
        search: filters.search,
        page,
        pageSize: 8
      });
      setData({ items: list.items as any, total: list.total, page: list.page, pageSize: list.pageSize });
      const pr = await getProfessorProfileSupabase(profKey);
      setProfile({
        name: pr.name,
        department: pr.department,
        profileImage: pr.profile_image,
        menteeUsns: pr.mentee_usns || []
      });
    } else {
      const res = await mockApi.getProfessorStudents({
        dept: filters.dept,
        semester: filters.semester,
        search: filters.search,
        page,
        pageSize: 8,
        // by default, show only students mentored by the logged-in professor
        onlyMenteesForProfessorId: (user && user.role === "professor" ? (user as any).id : undefined)
      });
      setData(res);
      if (user?.role === "professor") {
        const pr = await mockApi.getProfessorProfile(user.id);
        setProfile({
          name: pr.professor.name,
          department: pr.professor.department,
          profileImage: pr.professor.profileImage,
          menteeUsns: pr.professor.menteeUsns ?? []
        });
      }
    }
  }

  function openEditAttendance(stu: Student) {
    setActiveStudent(stu);
    const first =
      (Array.isArray((stu as any).subjects) && (stu as any).subjects[0]) ||
      Object.keys(((stu as any).marks ?? {}))[0] ||
      "";
    const saInit: Record<string, { attended: number; held: number }> = {};
    const saAny: any = (stu as any).subjectAttendance || {};
    Object.keys(saAny).forEach(k => {
      saInit[k] = { attended: Number(saAny[k]?.attended || 0), held: Number(saAny[k]?.held || 0) };
    });
    setPendingAttendance(saInit);
    setAttendanceForm({
      subject: first,
      attended: String(((stu as any).subjectAttendance?.[first]?.attended as number) || ""),
      held: String(((stu as any).subjectAttendance?.[first]?.held as number) || "")
    });
    setEditAttendanceOpen(true);
  }

  async function submitAttendance() {
    if (!activeStudent || user?.role !== "professor") return;
    const attendedNum = Math.max(0, parseInt(attendanceForm.attended || "0", 10) || 0);
    const heldNum = Math.max(0, parseInt(attendanceForm.held || "0", 10) || 0);
    if (heldNum === 0) {
      // avoid NaN/Infinity; allow zero held which implies 0%
    }
    const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (useSupabase) {
      await updateSubjectAttendanceSupabase({
        usn: activeStudent.usn,
        subject: attendanceForm.subject,
        attended: attendedNum,
        held: heldNum
      });
    } else {
      // mock path keeps existing behavior as percentage only
      const month = new Date().toISOString().slice(0, 7);
      await mockApi.updateAttendance({
        usn: activeStudent.usn,
        month,
        percentage: heldNum > 0 ? Math.round((attendedNum / heldNum) * 100) : 0
      });
    }
    // Update local pending map and activeStudent snapshot so switching subjects shows saved values immediately
    setPendingAttendance(prev => ({
      ...prev,
      [attendanceForm.subject]: { attended: attendedNum, held: heldNum }
    }));
    setActiveStudent(prev => {
      if (!prev) return prev;
      const next: any = { ...prev };
      const cur = (next.subjectAttendance ||= {});
      const pct = heldNum > 0 ? Math.round((attendedNum / heldNum) * 100) : 0;
      cur[attendanceForm.subject] = { attended: attendedNum, held: heldNum, percentage: pct };
      return next;
    });
    // Keep the form showing the saved numbers
    setAttendanceForm(f => ({ ...f, attended: String(attendedNum), held: String(heldNum) }));
  }

  function openEditMarks(stu: Student) {
    setActiveStudent(stu);
    const firstSubject =
      (Array.isArray(stu.subjects) && stu.subjects[0]) ||
      Object.keys((stu as any).marks ?? {})[0] ||
      "";
    const firstInternal: 1 | 2 | 3 = 1;
    const currentValue =
      ((stu as any).marks?.[firstSubject]?.[
        firstInternal === 1 ? "internal1" : firstInternal === 2 ? "internal2" : "internal3"
      ] as number | undefined) ?? 0;
    setMarksForm({ subject: firstSubject, internal: firstInternal, marks: currentValue });
    setEditMarksOpen(true);
  }

  async function submitMarks() {
    if (!activeStudent || user?.role !== "professor") return;
    const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (useSupabase) {
      await updateMarksSupabase({
        usn: activeStudent.usn,
        subject: marksForm.subject,
        internal: marksForm.internal,
        marks: marksForm.marks
      });
    } else {
      await mockApi.updateMarks({
        usn: activeStudent.usn,
        subject: marksForm.subject,
        internal: marksForm.internal,
        marks: marksForm.marks,
        professorId: user.id
      });
    }
    setEditMarksOpen(false);
    await load();
  }

  function openEditNote(stu: Student) {
    setActiveStudent(stu);
    setNoteForm({
      status: stu.mentorNote.status,
      note: stu.mentorNote.note
    });
    setEditNoteOpen(true);
  }

  async function submitNote() {
    if (!activeStudent || user?.role !== "professor") return;
    const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (useSupabase) {
      await updateMentorNoteSupabase({
        usn: activeStudent.usn,
        status: noteForm.status,
        note: noteForm.note
      });
    } else {
      await mockApi.updateMentorNote({
        usn: activeStudent.usn,
        status: noteForm.status,
        note: noteForm.note,
        professorId: user.id
      });
    }
    setEditNoteOpen(false);
    await load();
  }

  async function updateAttendance(stu: Student, percentage: number) {
    const last = Array.isArray(stu.attendance) && stu.attendance.length > 0 ? stu.attendance[stu.attendance.length - 1] : null;
    const month = last?.month ?? new Date().toISOString().slice(0, 7);
    const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (useSupabase) {
      await updateAttendanceSupabase({ usn: stu.usn, month, percentage });
    } else {
      await mockApi.updateAttendance({ usn: stu.usn, month, percentage });
    }
    await load();
  }

  if (!user || user.role !== "professor") return null;
  if (loading) return <div className="py-16 text-center text-slate-600">Loading...</div>;
  if (error) return <div className="py-16 text-center text-rose-600">{error}</div>;
  if (!data) return null;

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="pt-4 space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <UserCircle className="h-10 w-10 text-slate-500" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{profile.name || "Professor"}</div>
              <div className="text-sm text-slate-600">{profile.department || "Department not set"}</div>
              <div className="text-sm text-slate-600 mt-1">
                Students under mentorship:{" "}
                <span className="font-medium">{(profile.menteeUsns && profile.menteeUsns.length) || 10}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={async () => {
              setEditProfileOpen(true);
              const all = await mockApi.getAllStudents();
              setAllStudents(all.students);
              const dash = await mockApi.getProfessorStudents({ page: 1, pageSize: 10 });
              setPreviewStudents(dash.items);
            }}
          >
            Edit
          </Button>
        </div>
      </Card>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
              value={filters.dept ?? ""}
              onChange={e => setFilters(f => ({ ...f, dept: e.target.value || undefined }))}
            >
              <option value="">All</option>
              {departments.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
              value={filters.semester ?? ""}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  semester: e.target.value ? Number(e.target.value) : undefined
                }))
              }
            >
              <option value="">All</option>
              {Array.from({ length: 8 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Input
              label="Search (Name/USN)"
              placeholder="Type to search..."
              value={filters.search ?? ""}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="px-3 py-2">Student Name</th>
                <th className="px-3 py-2">USN</th>
                <th className="px-3 py-2">Course/Sem</th>
                <th className="px-3 py-2">Subjects</th>
                <th className="px-3 py-2">Internal1</th>
                <th className="px-3 py-2">Internal2</th>
                <th className="px-3 py-2">Internal3</th>
                <th className="px-3 py-2">Mentor remark</th>
                <th className="px-3 py-2">Attendance%</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(stu => {
                const firstSub = Array.isArray(stu.subjects) && stu.subjects.length > 0 ? stu.subjects[0] : undefined;
                const m = firstSub && stu.marks ? (stu.marks[firstSub] || {}) : {};
                const last = Array.isArray(stu.attendance) && stu.attendance.length > 0 ? stu.attendance[stu.attendance.length - 1] : null;
                return (
                  <tr key={stu.id} className="border-t border-slate-200/70 align-top">
                    <td className="px-3 py-2 font-medium">{stu.name}</td>
                    <td className="px-3 py-2">{stu.usn}</td>
                    <td className="px-3 py-2">{stu.course} / {stu.semester}</td>
                    <td className="px-3 py-2">
                      <div className="max-w-[220px] truncate">{Array.isArray(stu.subjects) ? stu.subjects.join(", ") : "—"}</div>
                    </td>
                    <td className="px-3 py-2">{m.internal1 ?? "—"}</td>
                    <td className="px-3 py-2">{m.internal2 ?? "—"}</td>
                    <td className="px-3 py-2">{m.internal3 ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="max-w-[220px] truncate">
                        {(stu.mentorNote?.status ?? "No remarks")}
                        {stu.mentorNote?.note ? ` — ${stu.mentorNote.note}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">{((stu as any).subjectAttendance &&
                      Object.values((stu as any).subjectAttendance).length > 0
                      ? Math.round(
                          (Object.values((stu as any).subjectAttendance).reduce(
                            (acc: any, v: any) => acc + (v.attended || 0),
                            0
                          ) /
                            Math.max(
                              1,
                              Object.values((stu as any).subjectAttendance).reduce(
                                (acc: any, v: any) => acc + (v.held || 0),
                                0
                              )
                            )) *
                          100
                        )
                      : last?.percentage ?? "—")}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditMarks(stu)}>
                          Edit Marks
                        </Button>
                        <Button variant="pastel" size="sm" onClick={() => openEditNote(stu)}>
                          Edit Note
                        </Button>
                        <Button size="sm" onClick={() => openEditAttendance(stu)}>
                          Edit Attendance
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page {data.page} of {totalPages} — {data.total} students
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Modal open={editMarksOpen} onClose={() => setEditMarksOpen(false)} title={`Edit Marks — ${activeStudent?.name}`}>
        {activeStudent && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                value={marksForm.subject}
                onChange={e => {
                  const sub = e.target.value;
                  const key = marksForm.internal === 1 ? "internal1" : marksForm.internal === 2 ? "internal2" : "internal3";
                  const current = ((activeStudent as any).marks?.[sub]?.[key] as number | undefined) ?? 0;
                  setMarksForm(m => ({ ...m, subject: sub, marks: current }));
                }}
              >
                {activeStudent.subjects.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                  value={marksForm.internal}
                onChange={e => {
                  const intVal = Number(e.target.value) as 1 | 2 | 3;
                  const key = intVal === 1 ? "internal1" : intVal === 2 ? "internal2" : "internal3";
                  const current = ((activeStudent as any).marks?.[marksForm.subject]?.[key] as number | undefined) ?? 0;
                  setMarksForm(m => ({ ...m, internal: intVal, marks: current }));
                }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div>
                <Input
                  label="Marks"
                  type="number"
                  min={0}
                  max={40}
                  value={marksForm.marks}
                  onChange={e => setMarksForm(m => ({ ...m, marks: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditMarksOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitMarks}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={editAttendanceOpen} onClose={() => setEditAttendanceOpen(false)} title={`Edit Attendance — ${activeStudent?.name}`}>
        {activeStudent && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                value={attendanceForm.subject}
                onChange={e => {
                  const sub = e.target.value;
                  const sa: any = (activeStudent as any).subjectAttendance || {};
                  const pend = pendingAttendance[sub];
                  setAttendanceForm(f => ({
                    subject: sub,
                    attended:
                      pend != null
                        ? String(pend.attended)
                        : sa[sub]?.attended != null
                        ? String(sa[sub]?.attended)
                        : "",
                    held:
                      pend != null
                        ? String(pend.held)
                        : sa[sub]?.held != null
                        ? String(sa[sub]?.held)
                        : ""
                  }));
                }}
              >
                {(activeStudent.subjects.length ? activeStudent.subjects : Object.keys((activeStudent as any).marks || {})).map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Classes attended"
                type="number"
                min={0}
                step={1}
                value={attendanceForm.attended}
                onChange={e => {
                  const v = e.target.value;
                  // allow empty string for editing, else keep numeric string
                  if (v === "" || /^\d+$/.test(v)) setAttendanceForm(f => ({ ...f, attended: v }));
                }}
              />
              <Input
                label="Classes held"
                type="number"
                min={0}
                step={1}
                value={attendanceForm.held}
                onChange={e => {
                  const v = e.target.value;
                  if (v === "" || /^\d+$/.test(v)) setAttendanceForm(f => ({ ...f, held: v }));
                }}
              />
            </div>
            <div className="text-sm text-slate-600">
              Calculated percentage:{" "}
              <span className="font-medium">
                {parseInt(attendanceForm.held || "0", 10) > 0
                  ? Math.round(
                      ((parseInt(attendanceForm.attended || "0", 10) || 0) /
                        (parseInt(attendanceForm.held || "0", 10) || 0)) * 100
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditAttendanceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitAttendance}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={editNoteOpen} onClose={() => setEditNoteOpen(false)} title={`Edit Note — ${activeStudent?.name}`}>
        {activeStudent && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                value={noteForm.status}
                onChange={e =>
                  setNoteForm(n => ({
                    ...n,
                    status: e.target.value as Student["mentorNote"]["status"]
                  }))
                }
              >
                <option>No remarks</option>
                <option>Needs improvement</option>
                <option>Excellent</option>
                <option>Custom</option>
              </select>
            </div>
            <Input label="Note" value={noteForm.note} onChange={e => setNoteForm(n => ({ ...n, note: e.target.value }))} />
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditNoteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitNote}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input label="Professor Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          <Input label="Department" value={profile.department || ""} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} />
          <Input label="Profile image URL" value={profile.profileImage || ""} onChange={e => setProfile(p => ({ ...p, profileImage: e.target.value }))} />

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Students under mentorship ({previewStudents.length})</div>
            <div className="flex items-center gap-2 mb-2">
              <Input label="Add by USN" value={newMenteeUsn} onChange={e => setNewMenteeUsn(e.target.value)} />
              <Button
                variant="pastel"
                onClick={() => {
                  const usn = newMenteeUsn.trim();
                  if (!usn) return;
                  const s = allStudents.find(st => st.usn === usn);
                  if (!s) return;
                  setPreviewStudents(prev => (prev.some(ps => ps.usn === usn) ? prev : [...prev, s]).slice(0, 10));
                  setNewMenteeUsn("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="max-h-40 overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2">USN</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {previewStudents.map(s => (
                    <tr key={s.usn} className="border-t border-slate-200/70">
                      <td className="px-3 py-2">{s.usn}</td>
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setPreviewStudents(prev => prev.filter(ps => ps.usn !== s.usn))
                          }
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditProfileOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (user?.role !== "professor") return;
                await mockApi.updateProfessorProfile({
                  professorId: (user as any).id,
                  name: profile.name,
                  department: profile.department,
                  profileImage: profile.profileImage,
                  menteeUsns: previewStudents.map(s => s.usn)
                });
                setEditProfileOpen(false);
                await load();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


