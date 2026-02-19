import type {
  AdminUser,
  AppUser,
  NotificationItem,
  ParentUser,
  ProfessorRegistration,
  ProfessorUser,
  Student
} from "./types";

// Simple in-memory DB with optional localStorage persistence for dev
type MockDB = {
  students: Student[];
  parents: ParentUser[]; // created when admin maps parent mobile -> usn
  professors: ProfessorUser[]; // approved professors
  pendingRegistrations: ProfessorRegistration[];
  notifications: NotificationItem[];
  parentMappings: { usn: string; mobile: string; parentName: string }[];
};

// Bump storage key to regenerate seed (subjects and 40-mark internals, 6x10 mentees, real names)
const LOCAL_KEY = "edumatrix_mock_db_v5";

const defaultSubjectsByCourse: Record<string, string[]> = {
  "Computer Science Engineering": [
    "Data Structures",
    "Algorithms",
    "Operating Systems",
    "DBMS",
    "Computer Networks",
    "Software Engineering"
  ],
  "Electronics and Communication Engineering": [
    "Signals and Systems",
    "Analog Circuits",
    "Digital Electronics",
    "Microprocessors",
    "Communication Systems",
    "Control Systems"
  ],
  "Cyber Security": [
    "Network Security",
    "Cryptography",
    "Digital Forensics",
    "Web Security",
    "Secure Coding",
    "Risk Management"
  ],
  "AI/ML": [
    "Probability & Statistics",
    "Machine Learning",
    "Deep Learning",
    "Data Mining",
    "Natural Language Processing",
    "MLOps"
  ],
  "Mechanical Engineering": [
    "Thermodynamics",
    "Fluid Mechanics",
    "Manufacturing Processes",
    "Mechanics of Materials",
    "Machine Design",
    "Heat Transfer"
  ],
  "Data Science": [
    "Statistics",
    "Data Visualization",
    "Big Data",
    "Data Warehousing",
    "Applied Machine Learning",
    "Cloud Computing"
  ]
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function buildSeed(): MockDB {
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }

  // Real names list (60) in department blocks of 10: CS, EC, CY, AI, ME, DS
  const realNames: string[] = [
    // CSE (1-10)
    "Aarav Sharma","Neha Patel","Rohit Kumar","Sana Menon","Vikram Singh",
    "Priya Iyer","Karan Verma","Megha Rao","Anil Joshi","Ritu Gupta",
    // ECE (11-20)
    "Aditya Nair","Ishita Kapoor","Manish Sinha","Kavya Reddy","Arjun Desai",
    "Nisha Bansal","Sahil Choudhary","Aisha Khan","Deepak Yadav","Shruti Jain",
    // Cyber (21-30)
    "Tarun Malhotra","Pooja Kulkarni","Harsh Vardhan","Ananya Mishra","Sandeep Pillai",
    "Divya Shetty","Varun Bhatt","Sneha Kaur","Mohit Arora","Shreya Saxena",
    // AI/ML (31-40)
    "Nikhil Kulkarni","Isha Garg","Abhishek Pandey","Tanvi Agarwal","Rohan Mehta",
    "Kriti Kapoor","Yash Chauhan","Simran Gill","Prateek Srivastava","Aditi Krishnan",
    // Mechanical (41-50)
    "Ajay D’Souza","Rachna Shah","Naveen Menon","Bhavna Patil","Suraj Gokhale",
    "Anusha Ramesh","Akash Saluja","Priyanka Sethi","Rajat Bhatnagar","Smita Deshpande",
    // Data Science (51-60)
    "Kunal Sharma","Nandini Iyer","Parth Shah","Rhea Thomas","Siddharth Verma",
    "Dia Basu","Arnav Banerjee","Mitali Mukherjee","Devansh Goyal","Ishani Sen"
  ];

  // Generate 60 students with USN format like 1AJ23CS001, 1AJ23EC002, ...
  const courseDefs = [
    { code: "CS", name: "Computer Science Engineering" },
    { code: "EC", name: "Electronics and Communication Engineering" },
    { code: "CY", name: "Cyber Security" },
    { code: "AI", name: "AI/ML" },
    { code: "ME", name: "Mechanical Engineering" },
    { code: "DS", name: "Data Science" }
  ];

  const students: Student[] = Array.from({ length: 60 }).map((_, idx) => {
    const n = idx + 1;
    const group = Math.floor(idx / 10); // 10 students per department
    const course = courseDefs[group % courseDefs.length];
    const name = realNames[idx] || `Student ${String(n).padStart(3, "0")}`;
    const usn = `1AJ23${course.code}${String(n).padStart(3, "0")}`; // e.g., 1AJ23CS001
    const semester = (idx % 8) + 1;
    const subjects = defaultSubjectsByCourse[course.name] ?? ["Subject A", "Subject B", "Subject C"];
    // Seed full dummy marks so dashboard is not empty
    const marks: Student["marks"] = {};
    subjects.forEach(sub => {
      marks[sub] = {
        internal1: randomBetween(26, 40),
        internal2: randomBetween(24, 40),
        internal3: randomBetween(22, 40)
      };
    });
    const attendance = months.map(m => ({
      month: m,
      percentage: randomBetween(60, 95)
    }));
    const mentorNote = {
      status: (["No remarks", "Needs improvement", "Excellent"] as const)[
        randomBetween(0, 2)
      ],
      note:
        n % 3 === 0
          ? "Keep up the consistent effort."
          : n % 3 === 1
          ? "Needs to participate more in class."
          : "Shows excellent problem-solving skills."
    };
    return {
      id: crypto.randomUUID(),
      name,
      usn,
      course: course.name,
      semester,
      subjects,
      marks,
      attendance,
      mentorNote
    };
  });

  const parents: ParentUser[] = [];
  const parentMappings = students.map((s, i) => ({
    usn: s.usn,
    mobile: `+91-90000000${String(i + 1).padStart(2, "0")}`,
    parentName: `Parent ${String(i + 1).padStart(3, "0")}`
  }));
  // Create parent users as "mapped" with ids but they sign in via OTP later
  parentMappings.forEach(pm => {
    const student = students.find(st => st.usn === pm.usn)!;
    parents.push({
      id: crypto.randomUUID(),
      role: "parent",
      name: pm.parentName,
      mobile: pm.mobile,
      studentUsn: student.usn,
      token: ""
    });
  });

  // 6 professors with specific IDs per department code
  const profDefs = [
    { name: "Prof. CSE 1", dept: "Computer Science Engineering", id: "CITCS001", mobile: "+91-9886000001" },
    { name: "Prof. ECE 1", dept: "Electronics and Communication Engineering", id: "CITEC002", mobile: "+91-9886000002" },
    { name: "Prof. CY 1", dept: "Cyber Security", id: "CITCY003", mobile: "+91-9886000003" },
    { name: "Prof. AI 1", dept: "AI/ML", id: "CITAI004", mobile: "+91-9886000004" },
    { name: "Prof. ME 1", dept: "Mechanical Engineering", id: "CITME005", mobile: "+91-9886000005" },
    { name: "Prof. DS 1", dept: "Data Science", id: "CITDS006", mobile: "+91-9886000006" }
  ];
  const professors: ProfessorUser[] = profDefs.map((p, i) => {
    const start = i * 10;
    const slice = students.slice(start, start + 10).map(s => s.usn);
    return {
      id: crypto.randomUUID(),
      role: "professor",
      name: p.name,
      mobile: p.mobile,
      professorId: p.id,
      department: p.dept,
      approved: true,
      profileImage: undefined,
      menteeUsns: slice,
      token: ""
    };
  });

  const pendingRegistrations: ProfessorRegistration[] = [];
  const notifications: NotificationItem[] = [];

  return { students, parents, professors, pendingRegistrations, notifications, parentMappings };
}

function loadDB(): MockDB {
  if (typeof window === "undefined") return buildSeed();
  const raw = localStorage.getItem(LOCAL_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as MockDB;
    } catch {
      // fallthrough to seed rebuild
    }
  }
  const seeded = buildSeed();
  localStorage.setItem(LOCAL_KEY, JSON.stringify(seeded));
  return seeded;
}

let db: MockDB = loadDB();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
  }
}

function delay<T>(result: T, min = 300, max = 700): Promise<T> {
  const ms = Math.floor(min + Math.random() * (max - min));
  return new Promise(resolve => setTimeout(() => resolve(result), ms));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeMobile(mobile: string): string {
  // strip all non-digits to make comparisons robust across formats like "+91-9XXXXXXXXX" vs "+919XXXXXXXXX"
  return mobile.replace(/\D/g, "");
}

export const mockApi = {
  // Auth
  async requestOtp(mobile: string) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[mockApi] OTP for", mobile, "is 123456");
    }
    return delay({ success: true, debugOtp: "123456" as const });
  },
  async resetAll() {
    db = buildSeed();
    persist();
    return delay({ success: true });
  },

  async verifyOtp(params: {
    mobile: string;
    otp: string;
    role: "parent" | "professor" | "admin";
    usn?: string;
    name?: string;
    password?: string;
    professorId?: string;
  }): Promise<{ user: AppUser; token: string }> {
    const { mobile, otp, role, usn, name, password, professorId } = params;
    if (otp !== "123456") {
      throw new Error("Invalid OTP");
    }
    if (role === "parent") {
      assert(usn, "USN is required for parent verification");
      const mapping = db.parentMappings.find(m => m.usn === usn && normalizeMobile(m.mobile) === normalizeMobile(mobile));
      assert(
        mapping,
        "Parent mapping not found. Please register as Parent on the Register page or ask admin to map your mobile to the USN."
      );
      let user = db.parents.find(p => normalizeMobile(p.mobile) === normalizeMobile(mobile) && p.studentUsn === usn);
      if (!user) {
        // Create on demand if admin mapped but parent user missing
        user = {
          id: crypto.randomUUID(),
          role: "parent",
          name: name || mapping.parentName,
          mobile,
          studentUsn: usn,
          token: ""
        };
        db.parents.push(user);
      }
      const token = crypto.randomUUID();
      user.token = token;
      persist();
      return delay({ user, token });
    }
    if (role === "professor") {
      const prof = db.professors.find(p => normalizeMobile(p.mobile) === normalizeMobile(mobile));
      if (!prof) {
        throw new Error("Professor not found.");
      }
      if (professorId && prof.professorId !== professorId) {
        throw new Error("Professor ID does not match this mobile.");
      }
      // Password is no longer required for sign-in; OTP is sufficient in this mock.
      const token = crypto.randomUUID();
      prof.token = token;
      persist();
      return delay({ user: prof, token });
    }
    // admin: fixed credentials via form, but OTP path for consistency
    const admin: AdminUser = {
      id: "admin-1",
      role: "admin",
      name: "Campus Admin",
      email: "admin@edumatrix.local",
      token: crypto.randomUUID()
    };
    return delay({ user: admin, token: admin.token });
  },

  async signOut() {
    return delay({ success: true });
  },

  // Parent Dashboard
  async getParentDashboard(userId: string) {
    const parent = db.parents.find(p => p.id === userId);
    assert(parent, "Parent not found");
    const student = db.students.find(s => s.usn === parent.studentUsn);
    assert(student, "Student not found");

    // Ensure demo data is present so the dashboard isn't empty
    student.subjects.forEach(sub => {
      if (!student.marks[sub]) {
        student.marks[sub] = {
          internal1: randomBetween(26, 40),
          internal2: randomBetween(24, 40),
          internal3: randomBetween(22, 40)
        };
      } else {
        const m = (student.marks[sub] ||= {});
        if (m.internal1 === undefined) m.internal1 = randomBetween(26, 40);
        if (m.internal2 === undefined) m.internal2 = randomBetween(24, 40);
        if (m.internal3 === undefined) m.internal3 = randomBetween(22, 40);
      }
    });
    if (!student.attendance || student.attendance.length === 0) {
      const now = new Date();
      const months = [3, 2, 1, 0].map(d => monthKey(new Date(now.getFullYear(), now.getMonth() - d, 1)));
      student.attendance = months.map(m => ({ month: m, percentage: randomBetween(70, 95) }));
    }
    if (!student.mentorNote || !student.mentorNote.status) {
      student.mentorNote = { status: "Excellent", note: "Great start to the semester." };
    }

    // Ensure there is at least a couple of notifications
    let notifications = db.notifications.filter(n => n.userId === parent.id);
    if (notifications.length === 0) {
      const ts = new Date().toISOString();
      db.notifications.push(
        {
          id: crypto.randomUUID(),
          userId: parent.id,
          title: "Welcome to EduMatrix",
          message: "Your parent portal is set up. Explore attendance and internals.",
          createdAt: ts,
          read: false
        },
        {
          id: crypto.randomUUID(),
          userId: parent.id,
          title: "Initial records available",
          message: "We added initial demo marks and attendance for your reference.",
          createdAt: ts,
          read: false
        }
      );
      notifications = db.notifications.filter(n => n.userId === parent.id);
    }
    notifications = notifications.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    persist();
    return delay({ parent, student, notifications });
  },

  // Professor Dashboard
  async getProfessorStudents(params: {
    dept?: string;
    semester?: number;
    search?: string;
    page?: number;
    pageSize?: number;
    onlyMenteesForProfessorId?: string;
  }) {
    const { dept, semester, search = "", page = 1, pageSize = 8, onlyMenteesForProfessorId } = params;
    let list: Student[] = [];
    // 1) Start from mentees when a professor context is provided
    if (onlyMenteesForProfessorId) {
      const prof = db.professors.find(
        p => p.id === onlyMenteesForProfessorId || p.professorId === onlyMenteesForProfessorId
      );
      if (prof) {
        // If mentee list is empty (e.g., newly registered professor), auto-assign 10 students from their department
        if (!prof.menteeUsns || prof.menteeUsns.length === 0) {
          const pool = db.students.filter(s => s.course === (prof.department || ""));
          const chosen = pool.slice(0, 10).map(s => s.usn);
          prof.menteeUsns = chosen;
          persist();
        }
        const menteeSet = new Set(prof.menteeUsns);
        list = db.students.filter(s => menteeSet.has(s.usn));
      } else {
        list = [];
      }
    } else {
      // Fallback: all students
      list = db.students.slice();
    }
    // 2) Apply optional filters on top of that mentee set
    if (dept) list = list.filter(s => s.course === dept);
    if (semester) list = list.filter(s => s.semester === semester);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q));
    }
    const total = list.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = list.slice(start, end);
    return delay({ items, total, page, pageSize });
  },

  async getProfessorProfile(professorId: string) {
    const prof = db.professors.find(p => p.id === professorId || p.professorId === professorId);
    assert(prof, "Professor not found");
    const menteeSet = new Set(prof.menteeUsns ?? []);
    const mentees = db.students.filter(s => menteeSet.has(s.usn));
    return delay({ professor: prof, mentees });
  },

  async updateProfessorProfile(payload: {
    professorId: string;
    name?: string;
    department?: string;
    profileImage?: string;
    menteeUsns?: string[];
  }) {
    const prof = db.professors.find(p => p.id === payload.professorId || p.professorId === payload.professorId);
    assert(prof, "Professor not found");
    if (payload.name !== undefined) prof.name = payload.name;
    if (payload.department !== undefined) prof.department = payload.department;
    if (payload.profileImage !== undefined) prof.profileImage = payload.profileImage;
    if (payload.menteeUsns !== undefined) prof.menteeUsns = payload.menteeUsns;
    persist();
    return delay({ success: true, professor: prof });
  },

  async getAllStudents() {
    return delay({ students: db.students.slice() });
  },

  async updateMarks(payload: {
    usn: string;
    subject: string;
    internal: 1 | 2 | 3;
    marks: number;
    professorId: string;
  }) {
    const { usn, subject, internal, marks, professorId } = payload;
    const student = db.students.find(s => s.usn === usn);
    assert(student, "Student not found");
    if (!student.marks[subject]) {
      student.marks[subject] = {};
    }
    if (internal === 1) student.marks[subject].internal1 = marks;
    if (internal === 2) student.marks[subject].internal2 = marks;
    if (internal === 3) student.marks[subject].internal3 = marks;

    // Notify parent(s)
    const parent = db.parents.find(p => p.studentUsn === usn);
    if (parent) {
      db.notifications.push({
        id: crypto.randomUUID(),
        userId: parent.id,
        title: "Internal marks updated",
        message: `Marks updated for ${subject} (Internal ${internal}): ${marks}`,
        createdAt: new Date().toISOString(),
        read: false
      });
    }
    persist();
    return delay({ success: true });
  },

  async updateMentorNote(payload: {
    usn: string;
    status: Student["mentorNote"]["status"];
    note: string;
    professorId: string;
  }) {
    const { usn, status, note } = payload;
    const student = db.students.find(s => s.usn === usn);
    assert(student, "Student not found");
    student.mentorNote = { status, note };
    const parent = db.parents.find(p => p.studentUsn === usn);
    if (parent) {
      db.notifications.push({
        id: crypto.randomUUID(),
        userId: parent.id,
        title: "Mentor note updated",
        message: `Mentor note updated: ${status}${note ? " — " + note : ""}`,
        createdAt: new Date().toISOString(),
        read: false
      });
    }
    persist();
    return delay({ success: true });
  },

  async updateAttendance(payload: { usn: string; month: string; percentage: number }) {
    const { usn, month, percentage } = payload;
    const student = db.students.find(s => s.usn === usn);
    assert(student, "Student not found");
    const rec = student.attendance.find(a => a.month === month);
    if (rec) rec.percentage = percentage;
    else student.attendance.push({ month, percentage });
    const parent = db.parents.find(p => p.studentUsn === usn);
    if (parent) {
      db.notifications.push({
        id: crypto.randomUUID(),
        userId: parent.id,
        title: "Attendance updated",
        message: `Attendance for ${month} set to ${percentage}%`,
        createdAt: new Date().toISOString(),
        read: false
      });
    }
    persist();
    return delay({ success: true });
  },

  // Admin
  async createStudent(payload: {
    name: string;
    usn: string;
    course: string;
    semester: number;
  }) {
    const exists = db.students.some(s => s.usn === payload.usn);
    if (exists) throw new Error("USN already exists");
    const subjects = defaultSubjectsByCourse[payload.course] ?? ["Subject A", "Subject B", "Subject C"];
    const now = new Date();
    const months = [2, 1, 0].map(delta => monthKey(new Date(now.getFullYear(), now.getMonth() - delta, 1)));
    const student: Student = {
      id: crypto.randomUUID(),
      name: payload.name,
      usn: payload.usn,
      course: payload.course,
      semester: payload.semester,
      subjects,
      marks: {},
      attendance: months.map(m => ({ month: m, percentage: randomBetween(60, 95) })),
      mentorNote: { status: "No remarks", note: "" }
    };
    db.students.push(student);
    persist();
    return delay({ success: true, student });
  },

  async mapParentMobile(usn: string, mobile: string, parentName: string) {
    let student = db.students.find(s => s.usn === usn);
    // If student does not exist, create a minimal record so parent mapping succeeds
    if (!student) {
      const fallbackCourse = "Computer Science Engineering";
      const subjects = defaultSubjectsByCourse[fallbackCourse] ?? ["Subject A", "Subject B", "Subject C"];
      const now = new Date();
      const months = [2, 1, 0].map(delta => monthKey(new Date(now.getFullYear(), now.getMonth() - delta, 1)));
      const marks: Student["marks"] = {};
      subjects.forEach(sub => {
        marks[sub] = {
          internal1: randomBetween(26, 40),
          internal2: randomBetween(24, 40),
          internal3: randomBetween(22, 40)
        };
      });
      student = {
        id: crypto.randomUUID(),
        name: parentName || `Student ${usn}`,
        usn,
        course: fallbackCourse,
        semester: 1,
        subjects,
        marks,
        attendance: months.map(m => ({ month: m, percentage: randomBetween(60, 95) })),
        mentorNote: { status: "No remarks", note: "" }
      };
      db.students.push(student);
    } else {
      // Update the student name to match the provided name (the form label says "Student Name")
      if (parentName) {
        student.name = parentName;
      }
    }
    const mappingIdx = db.parentMappings.findIndex(m => m.usn === usn);
    if (mappingIdx >= 0) {
      db.parentMappings[mappingIdx] = { usn, mobile, parentName };
    } else {
      db.parentMappings.push({ usn, mobile, parentName });
    }
    // Ensure parent user exists or update mobile
    let parent = db.parents.find(p => p.studentUsn === usn);
    if (!parent) {
      parent = {
        id: crypto.randomUUID(),
        role: "parent",
        name: parentName,
        mobile,
        studentUsn: usn,
        token: ""
      };
      db.parents.push(parent);
    } else {
      parent.mobile = mobile;
      parent.name = parentName;
    }
    persist();
    return delay({ success: true });
  },

  async registerProfessor(payload: {
    name: string;
    professorId: string;
    department?: string;
    mobile: string;
    password?: string;
  }) {
    const exists = db.professors.some(p => normalizeMobile(p.mobile) === normalizeMobile(payload.mobile));
    if (exists) throw new Error("Professor already exists");
    // Auto-approve professor registrations in this demo
    const prof: ProfessorUser = {
      id: crypto.randomUUID(),
      role: "professor",
      name: payload.name,
      mobile: payload.mobile,
      professorId: payload.professorId,
      department: payload.department ?? "Computer Science Engineering",
      approved: true,
      menteeUsns: [],
      token: ""
    };
    // Auto-assign 10 mentees from this department
    const pool = db.students.filter(s => s.course === prof.department);
    prof.menteeUsns = pool.slice(0, 10).map(s => s.usn);
    db.professors.push(prof);
    persist();
    return delay({ success: true, professorId: prof.id });
  },

  async approveProfessor(professorId: string, approve: boolean) {
    const idx = db.pendingRegistrations.findIndex(r => r.id === professorId);
    if (idx === -1) throw new Error("Registration not found");
    const reg = db.pendingRegistrations[idx];
    if (approve) {
      const prof: ProfessorUser = {
        id: crypto.randomUUID(),
        role: "professor",
        name: reg.name,
        mobile: reg.mobile,
        department: reg.department,
        approved: true,
        token: ""
      };
      db.professors.push(prof);
      reg.status = "approved";
    } else {
      reg.status = "rejected";
    }
    // Remove from pending list after decision
    db.pendingRegistrations.splice(idx, 1);
    persist();
    return delay({ success: true });
  },

  async getPendingProfessorRegistrations() {
    // Auto-approval enabled → no pending items
    return delay({ items: [] });
  },

  async getNotifications(userId: string) {
    const items = db.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return delay({ items });
  },

  async markNotificationRead(id: string) {
    const n = db.notifications.find(n => n.id === id);
    if (n) n.read = true;
    persist();
    return delay({ success: true });
  }
};

export type MockApi = typeof mockApi;


