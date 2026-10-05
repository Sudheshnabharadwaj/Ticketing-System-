import { User } from '../types/user';

export const mockUsers: User[] = [
  {
    id: "TL001",
    name: "Alex Morgan",
    email: "teamlead@ticketing.com",
    phone: "9876543210",
    role: "teamlead",
    department: "IT Support",
    designation: "Senior IT Support Lead",
    team: "L2 Support & Escalations",
    avatar: "",
    location: "San Francisco HQ - Floor 4",
    status: "Active"
  },
  {
    id: "EMP001",
    name: "Rahul Sharma",
    email: "employee@ticketing.com",
    phone: "9876543211",
    role: "employee",
    department: "IT Support",
    designation: "Senior Frontend Engineer",
    team: "Frontend Guild",
    avatar: "",
    location: "Austin Office - Floor 2",
    status: "Active"
  },
  {
    id: "EMP002",
    name: "Sophia Chen",
    email: "sophia.chen@company.com",
    phone: "9876543212",
    role: "employee",
    department: "HR",
    designation: "Talent Acquisition Specialist",
    team: "Talent Acquisition",
    avatar: "",
    location: "New York HQ",
    status: "Active"
  },
  {
    id: "EMP003",
    name: "Marcus Vance",
    email: "marcus.vance@company.com",
    phone: "9876543213",
    role: "employee",
    department: "Finance",
    designation: "Payroll Operations Analyst",
    team: "Payroll & Operations",
    avatar: "",
    location: "London Regional Office",
    status: "Active"
  },
  {
    id: "EMP004",
    name: "Priya Patel",
    email: "priya.patel@company.com",
    phone: "9876543214",
    role: "employee",
    department: "Marketing",
    designation: "Growth Marketing Manager",
    team: "Digital Campaigns",
    avatar: "",
    location: "San Francisco HQ",
    status: "Active"
  },
  {
    id: "EMP005",
    name: "Daniel Rivera",
    email: "daniel.rivera@company.com",
    phone: "9876543215",
    role: "employee",
    department: "Operations",
    designation: "DevOps Engineer",
    team: "Cloud Infrastructure",
    avatar: "",
    location: "Seattle Office",
    status: "Inactive"
  }
];
