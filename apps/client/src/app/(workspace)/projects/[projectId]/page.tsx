import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function MemberProjectIndexPage({ params }: Props) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/overview`);
}
