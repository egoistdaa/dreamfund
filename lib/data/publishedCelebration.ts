import { createServerSupabase } from "@/lib/supabase/server-auth";

export type PublishedCelebration = {
  submissionId: string;
  title: string;
  projectSlug: string;
};

type SubmissionRow = {
  id: string;
  title: string;
  published_project_id: string | null;
};

type ProjectRow = {
  slug: string;
};

export async function getUnseenPublishedCelebration(): Promise<PublishedCelebration | null> {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: submissionData, error: submissionError } = await supabase
    .from("project_submissions")
    .select("id, title, published_project_id")
    .eq("user_id", user.id)
    .eq("status", "published")
    .is("published_seen_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (submissionError || !submissionData) return null;

  const submission = submissionData as SubmissionRow;

  if (!submission.published_project_id) return null;

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", submission.published_project_id)
    .maybeSingle();

  if (projectError || !projectData) return null;

  const project = projectData as ProjectRow;

  return {
    submissionId: submission.id,
    title: submission.title,
    projectSlug: project.slug,
  };
}