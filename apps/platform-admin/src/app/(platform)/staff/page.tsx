import type { Metadata } from "next";
import { StaffListPage } from "@/features/staff/staff-list-page";

export const metadata: Metadata = {
  title: "Staff Management | Kloqra Admin",
  description: "Manage platform superadmins and support agents"
};

export default function Page() {
  return <StaffListPage />;
}
