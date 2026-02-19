"use client";

import React from "react";
import { RoleToggle } from "@components/RoleToggle";
import { Card } from "@components/Card";
import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { useForm, useWatch } from "react-hook-form";
import { useAuth } from "@lib/auth";
import { useRouter } from "next/navigation";
import { findParentByMobile, saveParentToken, updateStudentName } from "@lib/api/parent";
import { supabase } from "@lib/supabaseClient";

type ParentForm = {
  name: string;
  usn: string;
  countryCode: string;
  mobileNumber: string;
  otp: string;
};

type ProfForm = {
  professorId: string;
  countryCode: string;
  mobileNumber: string;
  otp: string;
};

export default function SignInPage() {
  const [role, setRole] = React.useState<"parent" | "professor">("parent");
  const { requestOtp, signInWithOtp } = useAuth();
  const router = useRouter();
  const [info, setInfo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [otpRequested, setOtpRequested] = React.useState(false);
  const [timer, setTimer] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);

  const parentForm = useForm<ParentForm>({ defaultValues: { name: "", usn: "", countryCode: "+91", mobileNumber: "", otp: "" } });
  const profForm = useForm<ProfForm>({ defaultValues: { professorId: "", countryCode: "+91", mobileNumber: "", otp: "" } });
  const parentOtp = (useWatch({ control: parentForm.control, name: "otp" }) ?? "") as string;
  const profOtp = (useWatch({ control: profForm.control, name: "otp" }) ?? "") as string;

  React.useEffect(() => {
    let id: number | undefined;
    if (timer > 0) {
      id = window.setInterval(() => setTimer(t => (t > 0 ? t - 1 : 0)), 1000);
    }
    return () => {
      if (id) window.clearInterval(id);
    };
  }, [timer]);

  async function onRequestOtp() {
    setError(null);
    setInfo(null);
    try {
      const mobile =
        role === "parent"
          ? `${parentForm.getValues("countryCode")}-${parentForm.getValues("mobileNumber")}`
          : `${profForm.getValues("countryCode")}-${profForm.getValues("mobileNumber")}`;
      if (!mobile || mobile.length < 6 || mobile.includes("-") && mobile.split("-")[1].length < 6) {
        setError("Please enter a valid mobile number.");
        return;
      }
      const res = await requestOtp(mobile);
      setOtpRequested(true);
      setTimer(30);
      const msg = 'OTP sent — in dev mode the OTP is 123456 (also printed to console).';
      setInfo(msg);
      if (process.env.NODE_ENV !== "production") {
        // Already printed by API, keep for UX
        console.log("[dev] Debug OTP:", res.debugOtp);
      }
    } catch (e: any) {
      setError(e.message || "Failed to request OTP.");
    }
  }

  async function onSubmitParent(values: ParentForm) {
    setError(null);
    setInfo(null);
    try {
      setSubmitting(true);
      setInfo("Signing in...");
      const mobile = `${values.countryCode}-${values.mobileNumber}`;
      const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

      if (useSupabase) {
        const parent = await findParentByMobile(mobile, values.usn);
        if (parent) {
          // Found in Supabase — use Supabase auth path
          if (values.otp !== "123456") {
            setError("Invalid OTP");
            return;
          }
          await saveParentToken(parent.id, "parent-session-token");
          if (values.usn && values.name) {
            await updateStudentName(values.usn, values.name);
          }
          await signInWithOtp({
            role: "parent",
            mobile,
            otp: values.otp,
            id: parent.id,
            usn: values.usn,
            name: values.name
          } as any);
          const stored = localStorage.getItem("edumatrix_auth_user_v1");
          if (stored) {
            const u = JSON.parse(stored);
            u.id = parent.id;
            u.role = "parent";
            u.mobile = mobile;
            u.usn = values.usn;
            localStorage.setItem("edumatrix_auth_user_v1", JSON.stringify(u));
          }
          router.replace("/dashboard/parent");
        } else {
          // Not found in Supabase — fall back to mock API
          await signInWithOtp({
            role: "parent",
            mobile,
            otp: values.otp,
            usn: values.usn,
            name: values.name
          });
          router.replace("/dashboard/parent");
        }
      } else {
        await signInWithOtp({
          role: "parent",
          mobile,
          otp: values.otp,
          usn: values.usn,
          name: values.name
        });
        router.replace("/dashboard/parent");
      }
    } catch (e: any) {
      setError(e.message || "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitProf(values: ProfForm) {
    setError(null);
    setInfo(null);
    try {
      setSubmitting(true);
      setInfo("Signing in...");
      const mobile = `${values.countryCode}-${values.mobileNumber}`;
      const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

      if (useSupabase) {
        // Find professor by ID first, then by mobile
        let prof: any = null;
        if (values.professorId) {
          const byId = await supabase.from("professors").select("*").eq("professor_id", values.professorId).maybeSingle();
          if (!byId.error && byId.data) prof = byId.data;
        }
        if (!prof) {
          const byMobile = await supabase.from("professors").select("*").eq("mobile", mobile).maybeSingle();
          if (!byMobile.error && byMobile.data) prof = byMobile.data;
        }
        if (prof) {
          // Found in Supabase
          if (values.otp !== "123456") {
            setError("Invalid OTP");
            return;
          }
          await signInWithOtp({
            role: "professor",
            mobile,
            otp: values.otp,
            name: prof.name
          } as any);
          const stored = localStorage.getItem("edumatrix_auth_user_v1");
          if (stored) {
            const u = JSON.parse(stored);
            u.id = prof.id;
            u.professorId = prof.professor_id || values.professorId;
            u.department = prof.department;
            localStorage.setItem("edumatrix_auth_user_v1", JSON.stringify(u));
          }
          router.replace("/dashboard/professor");
        } else {
          // Not found in Supabase — fall back to mock API
          await signInWithOtp({
            role: "professor",
            mobile,
            otp: values.otp,
            professorId: values.professorId
          } as any);
          router.replace("/dashboard/professor");
        }
      } else {
        await signInWithOtp({
          role: "professor",
          mobile,
          otp: values.otp,
          professorId: values.professorId
        } as any);
        router.replace("/dashboard/professor");
      }
    } catch (e: any) {
      setError(e.message || "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <Card>
        <div className="flex flex-col items-center gap-6">
          <RoleToggle value={role} onChange={setRole} />
          {info && <div className="w-full rounded-2xl bg-pastelMint px-4 py-2 text-emerald-800 text-sm">{info}</div>}
          {error && <div className="w-full rounded-2xl bg-pastelRose px-4 py-2 text-rose-800 text-sm">{error}</div>}

          {role === "parent" ? (
            <form className="w-full space-y-4" onSubmit={parentForm.handleSubmit(onSubmitParent)}>
              <Input label="Student Name" error={parentForm.formState.errors.name?.message} {...parentForm.register("name", { required: "Required" })} />
              <Input label="University Seat Number (USN)" error={parentForm.formState.errors.usn?.message} {...parentForm.register("usn", { required: "Required" })} />
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
                <div className="mt-1 text-sm text-slate-500">Country code select defaults to +91</div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="pastel" onClick={onRequestOtp} disabled={timer > 0}>
                  {timer > 0 ? `Resend in ${timer}s` : "Request OTP"}
                </Button>
              </div>
              <Input
                label="OTP (6-digit)"
                disabled={!otpRequested}
                maxLength={6}
                error={parentForm.formState.errors.otp?.message}
                {...parentForm.register("otp", {
                  required: "Required",
                  minLength: { value: 6, message: "Enter 6 digits" },
                  maxLength: { value: 6, message: "Enter 6 digits" }
                })}
              />
              <Button type="submit" width="full" disabled={submitting}>
                Sign In
              </Button>
            </form>
          ) : (
            <form className="w-full space-y-4" onSubmit={profForm.handleSubmit(onSubmitProf)}>
              <Input label="Professor ID" error={profForm.formState.errors.professorId?.message} {...profForm.register("professorId", { required: "Required" })} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                <div className="flex gap-2">
                  <select
                    className="w-28 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus-visible:pastel-focus"
                    {...profForm.register("countryCode", { required: "Required" })}
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                  <input
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:pastel-focus"
                    placeholder="9XXXXXXXXX"
                    {...profForm.register("mobileNumber", { required: "Required", minLength: { value: 6, message: "Enter a valid number" } })}
                  />
                </div>
                <div className="mt-1 text-sm text-slate-500">Country code select defaults to +91</div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="pastel" onClick={onRequestOtp} disabled={timer > 0}>
                  {timer > 0 ? `Resend in ${timer}s` : "Request OTP"}
                </Button>
              </div>
              <Input
                label="OTP (6-digit)"
                disabled={!otpRequested}
                maxLength={6}
                error={profForm.formState.errors.otp?.message}
                {...profForm.register("otp", {
                  required: "Required",
                  minLength: { value: 6, message: "Enter 6 digits" },
                  maxLength: { value: 6, message: "Enter 6 digits" }
                })}
              />
              <Button type="submit" width="full" disabled={submitting}>
                Sign In
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}


