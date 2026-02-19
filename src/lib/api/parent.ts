import { supabase } from "../supabaseClient";

// STEP 1 — Check if parent exists by mobile
export async function findParentByMobile(mobile: string, usn?: string) {
  let q = supabase.from("parents").select("*");
  if (usn) {
    q = q.eq("mobile", mobile).eq("student_usn", usn);
  } else {
    q = q.eq("mobile", mobile);
  }
  const { data, error } = await q.maybeSingle();
  if (error) return null;
  return data;
}

// STEP 2 — Save OTP token
export async function saveParentToken(userId: string, token: string) {
  await supabase
    .from("parents")
    .update({ token })
    .eq("id", userId);
}

// Optional helper — ensure student's display name is up to date
export async function updateStudentName(usn: string, name: string) {
  if (!usn || !name) return;
  await supabase
    .from("students")
    .update({ name })
    .eq("usn", usn);
}

// ===== Professor auth helpers (Supabase) =====
export async function findProfessorByIdOrMobile(professorId: string, mobile: string) {
  // Try professor_id first, then mobile fallback
  const byId = await supabase.from("professors").select("*").eq("professor_id", professorId).maybeSingle();
  if (byId.data) return byId.data;
  const byMobile = await supabase.from("professors").select("*").eq("mobile", mobile).maybeSingle();
  return byMobile.data;
}


