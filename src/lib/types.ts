export type Role = "parent" | "professor" | "admin";

export type Student = {
  id: string;
  name: string;
  usn: string;
  course: string;
  semester: number;
  subjects: string[];
  marks: {
    [subject: string]: {
      internal1?: number;
      internal2?: number;
      internal3?: number;
    };
  };
  attendance: Array<{
    month: string; // e.g. "2025-06"
    percentage: number; // 0-100
  }>;
  mentorNote: {
    status: "No remarks" | "Needs improvement" | "Excellent" | "Custom";
    note: string;
  };
};

export type ParentUser = {
  id: string;
  role: "parent";
  name: string;
  mobile: string;
  studentUsn: string;
  token: string;
};

export type ProfessorUser = {
  id: string;
  role: "professor";
  name: string;
  mobile: string;
  professorId: string;
  department?: string;
  approved: boolean;
  profileImage?: string;
  menteeUsns?: string[];
  token: string;
};

export type AdminUser = {
  id: string;
  role: "admin";
  name: string;
  email: string;
  token: string;
};

export type AppUser = ParentUser | ProfessorUser | AdminUser | null;

export type NotificationItem = {
  id: string;
  userId: string; // parent user id
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type ProfessorRegistration = {
  id: string;
  name: string;
  professorId: string;
  department: string;
  mobile: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};


