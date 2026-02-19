import { Card } from "@components/Card";
import Link from "next/link";
import { BookOpen, ClipboardList, NotebookPen } from "lucide-react";

export default function Page() {
  return (
    <div className="pt-16">
      <section className="relative text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
            EduMatrix
          </h1>
          <div className="mt-2 flex justify-center">
            <span className="text-slate-600 italic font-semibold">Cambridge Institute of Technology North Campus</span>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-700">
          EduMatrix provides transparent, timely communication between professors and parents. Parents can track attendance, internal marks, and mentor notes for their ward.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center rounded-2xl font-medium transition-colors bg-slate-900 text-white hover:bg-slate-800 shadow-soft px-5 py-2.5 text-base"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-2xl font-medium transition-colors bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 px-5 py-2.5 text-base"
          >
            Register Now
          </Link>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 bg-pastelSky/60">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-soft">
              <ClipboardList className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Attendance</h3>
              <p className="text-sm text-slate-600">Track monthly attendance at a glance.</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-pastelLavender/60">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-soft">
              <BookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Internal Marks</h3>
              <p className="text-sm text-slate-600">View Internal 1–3 and averages per subject.</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-pastelMint/60">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-soft">
              <NotebookPen className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Mentor Notes</h3>
              <p className="text-sm text-slate-600">Stay in sync with mentor feedback.</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}


