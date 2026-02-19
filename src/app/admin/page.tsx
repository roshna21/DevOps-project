"use client";

import React from "react";
import { Card } from "@components/Card";
import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { mockApi } from "@lib/mockApi";

type StudentForm = {
  name: string;
  usn: string;
  course: string;
  semester: number;
};

type MapParentForm = {
  usn: string;
  mobile: string;
  parentName: string;
};

const courses = [
  "Computer Science Engineering",
  "Electronics and Communication Engineering",
  "Cyber Security",
  "AI/ML",
  "Mechanical Engineering",
  "Data Science"
];

export default function AdminPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const [student, setStudent] = React.useState<StudentForm>({ name: "", usn: "", course: courses[0], semester: 1 });
  const [mapForm, setMapForm] = React.useState<MapParentForm>({ usn: "", mobile: "+91", parentName: "" });

  async function createStudent() {
    setError(null);
    try {
      await mockApi.createStudent(student);
      setInfo("Student created.");
      setStudent({ name: "", usn: "", course: courses[0], semester: 1 });
    } catch (e: any) {
      setError(e.message || "Failed to create student.");
    }
  }

  async function mapParent() {
    setError(null);
    try {
      await mockApi.mapParentMobile(mapForm.usn, mapForm.mobile, mapForm.parentName);
      setInfo("Parent mapped.");
      setMapForm({ usn: "", mobile: "+91", parentName: "" });
    } catch (e: any) {
      setError(e.message || "Failed to map parent.");
    }
  }

  return (
    <div className="pt-4 space-y-6">
      {info && <div className="rounded-2xl bg-pastelMint px-4 py-2 text-emerald-800 text-sm">{info}</div>}
      {error && <div className="rounded-2xl bg-pastelRose px-4 py-2 text-rose-800 text-sm">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Create student</h3>
          <div className="mt-4 space-y-3">
            <Input label="Name" value={student.name} onChange={e => setStudent(s => ({ ...s, name: e.target.value }))} />
            <Input label="USN" value={student.usn} onChange={e => setStudent(s => ({ ...s, usn: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                value={student.course}
                onChange={e => setStudent(s => ({ ...s, course: e.target.value }))}
              >
                {courses.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                value={student.semester}
                onChange={e => setStudent(s => ({ ...s, semester: Number(e.target.value) }))}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={createStudent}>Create Student</Button>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Reset mock data</h3>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">
              Clears all mock data (including professor registrations) and re-seeds defaults.
            </p>
            <Button
              variant="secondary"
              onClick={async () => {
                setError(null);
                try {
                  await mockApi.resetAll();
                  setInfo("Mock data reset. You can register professors again.");
                } catch (e: any) {
                  setError(e.message || "Failed to reset mock data.");
                }
              }}
            >
              Reset now
            </Button>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Map parent mobile</h3>
          <div className="mt-4 space-y-3">
            <Input label="USN" value={mapForm.usn} onChange={e => setMapForm(s => ({ ...s, usn: e.target.value }))} />
            <Input label="Parent Name" value={mapForm.parentName} onChange={e => setMapForm(s => ({ ...s, parentName: e.target.value }))} />
            <Input label="Parent Mobile" value={mapForm.mobile} onChange={e => setMapForm(s => ({ ...s, mobile: e.target.value }))} />
            <Button onClick={mapParent}>Map Parent</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

