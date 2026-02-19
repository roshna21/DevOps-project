"use client";

import React from "react";
import { Card } from "@components/Card";
import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { useForm } from "react-hook-form";
import { mockApi } from "@lib/mockApi";
import { RoleToggle } from "@components/RoleToggle";
import { useRouter } from "next/navigation";

type RegisterForm = {
  name: string;
  professorId: string;
  department: string;
  mobile: string;
  otp: string;
};

type ParentRegisterForm = {
  parentName: string;
  usn: string;
  countryCode: string;
  mobileNumber: string;
  otp: string;
};

const departments = [
  "Computer Science Engineering",
  "Electronics and Communication Engineering",
  "Cyber Security",
  "AI/ML",
  "Mechanical Engineering",
  "Data Science"
];

export default function RegisterPage() {
  const [role, setRole] = React.useState<"parent" | "professor">("professor");
  const router = useRouter();
  const form = useForm<RegisterForm>({
    defaultValues: {
      name: "",
      professorId: "",
      department: departments[0],
      mobile: "+91",
      otp: ""
    }
  });
  const parentForm = useForm<ParentRegisterForm>({
    defaultValues: {
      parentName: "",
      usn: "",
      countryCode: "+91",
      mobileNumber: "",
      otp: ""
    }
  });
  const [info, setInfo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [otpRequested, setOtpRequested] = React.useState(false);
  const [timer, setTimer] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let id: number | undefined;
    if (timer > 0) {
      id = window.setInterval(() => setTimer(t => (t > 0 ? t - 1 : 0)), 1000);
    }
    return () => {
      if (id) window.clearInterval(id);
    };
  }, [timer]);

  async function requestOtp() {
    setError(null);
    setInfo(null);
    const mobile =
      role === "professor"
        ? form.getValues("mobile")
        : `${parentForm.getValues("countryCode")}-${parentForm.getValues("mobileNumber")}`;
    if (!mobile || mobile.length < 6 || (mobile.includes("-") && mobile.split("-")[1].length < 6)) {
      setError("Please enter a valid mobile number.");
      return;
    }
    await mockApi.requestOtp(mobile);
    setOtpRequested(true);
    setTimer(30);
    setInfo('OTP sent — in dev mode the OTP is 123456 (also printed to console).');
  }

  async function onSubmit(values: RegisterForm) {
    setError(null);
    setInfo(null);
    try {
      setSubmitting(true);
      setInfo("Submitting registration...");
      if (role === "parent") return; // guard; handled by separate handler
      if (!otpRequested || values.otp !== "123456") {
        setError("Please enter the correct OTP.");
        return;
      }
      await mockApi.registerProfessor({
        name: values.name,
        professorId: values.professorId,
        department: values.department,
        mobile: values.mobile
      });
      setInfo("Registration successful — redirecting to dashboard...");
      window.setTimeout(() => router.replace("/dashboard/professor"), 800);
    } catch (e: any) {
      setError(e.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitParent(values: ParentRegisterForm) {
    setError(null);
    setInfo(null);
    try {
      setSubmitting(true);
      setInfo("Submitting registration...");
      if (!otpRequested || values.otp !== "123456") {
        setError("Please enter the correct OTP.");
        return;
      }
      const mobile = `${values.countryCode}-${values.mobileNumber}`;
      await mockApi.mapParentMobile(values.usn, mobile, values.parentName);
      setInfo("Parent registered and mapped successfully. You can sign in now.");
      parentForm.reset({ parentName: "", usn: "", countryCode: "+91", mobileNumber: "", otp: "" });
      setOtpRequested(false);
      // Redirect to sign-in for immediate login
      window.setTimeout(() => router.push("/signin"), 1200);
    } catch (e: any) {
      setError(e.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <Card>
        <div className="mb-6 flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900">{role === "professor" ? "Professor Registration" : "Parent Registration"}</h2>
          <RoleToggle value={role} onChange={setRole} />
        </div>
        {info && <div className="mb-4 rounded-2xl bg-pastelMint px-4 py-2 text-emerald-800 text-sm">{info}</div>}
        {error && <div className="mb-4 rounded-2xl bg-pastelRose px-4 py-2 text-rose-800 text-sm">{error}</div>}
        {role === "professor" ? (
          <>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <Input label="Professor Name" error={form.formState.errors.name?.message} {...form.register("name", { required: "Required" })} />
              <Input label="Professor ID" error={form.formState.errors.professorId?.message} {...form.register("professorId", { required: "Required" })} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                  {...form.register("department", { required: "Required" })}
                >
                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Mobile Number" placeholder="+91-9XXXXXXXXX" error={form.formState.errors.mobile?.message} {...form.register("mobile", { required: "Required" })} />
              <div className="flex items-center gap-3">
                <Button type="button" variant="pastel" onClick={requestOtp} disabled={timer > 0}>
                  {timer > 0 ? `Resend in ${timer}s` : "Request OTP"}
                </Button>
                <Input label="OTP" maxLength={6} disabled={!otpRequested} error={form.formState.errors.otp?.message} {...form.register("otp", { required: "Required" })} />
              </div>
              <Button type="submit" width="full" disabled={submitting}>Submit</Button>
            </form>

            <div className="mt-6 text-sm text-slate-600">Use OTP to sign in immediately after registering.</div>
          </>
        ) : (
          <>
            <form className="space-y-4" onSubmit={parentForm.handleSubmit(onSubmitParent)}>
              <Input label="Student Name" error={parentForm.formState.errors.parentName?.message} {...parentForm.register("parentName", { required: "Required" })} />
              <Input label="Student USN" error={parentForm.formState.errors.usn?.message} {...parentForm.register("usn", { required: "Required" })} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                <div className="flex gap-2">
                  <select
                    className="w-28 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                    {...parentForm.register("countryCode", { required: "Required" })}
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                  <input
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:pastel-focus"
                    placeholder="9XXXXXXXXX"
                    {...parentForm.register("mobileNumber", { required: "Required", minLength: { value: 6, message: "Enter a valid number" } })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="pastel" onClick={requestOtp} disabled={timer > 0}>
                  {timer > 0 ? `Resend in ${timer}s` : "Request OTP"}
                </Button>
                <Input label="OTP" maxLength={6} disabled={!otpRequested} error={parentForm.formState.errors.otp?.message} {...parentForm.register("otp", { required: "Required" })} />
              </div>
              <Button type="submit" width="full" disabled={submitting}>Submit</Button>
            </form>

            <div className="mt-6 text-sm text-slate-600">
              Parent registration maps your mobile to your ward's USN. You can sign in immediately after this.
            </div>
          </>
        )}
      </Card>
    </div>
  );
}


