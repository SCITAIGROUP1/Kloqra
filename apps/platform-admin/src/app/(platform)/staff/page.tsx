import { StaffListPage } from "@/features/staff/staff-list-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Management | Kloqra Admin",
  description: "Manage platform superadmins and support agents"
};

export default function Page() {
  return <StaffListPage />;
}
