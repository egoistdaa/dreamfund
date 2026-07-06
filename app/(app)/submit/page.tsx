import { requireAuth } from "@/lib/auth/requireAuth";
import { SubmitProjectForm } from "@/components/submit/SubmitProjectForm";

export const metadata = {
  title: "夢を投稿",
  robots: { index: false },
};

export default async function SubmitPage() {
  await requireAuth("/submit");

  return <SubmitProjectForm />;
}