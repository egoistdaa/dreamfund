import { PublishedCelebrationModal } from "@/components/PublishedCelebrationModal";
import { getUnseenPublishedCelebration } from "@/lib/data/publishedCelebration";

export async function PublishedCelebrationGate() {
  const celebration = await getUnseenPublishedCelebration();

  if (!celebration) return null;

  return (
    <PublishedCelebrationModal
      submissionId={celebration.submissionId}
      title={celebration.title}
      projectSlug={celebration.projectSlug}
    />
  );
}