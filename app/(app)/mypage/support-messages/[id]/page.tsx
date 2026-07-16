import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getCreatorSupportConversationById } from "@/lib/data/supportMessages";
import SupportConversationView from "./SupportConversationView";

export const metadata = {
  title: "応援メッセージ",
  robots: { index: false },
};

type SupportConversationPageProps = {
  params: {
    id: string;
  };
};

export default async function SupportConversationPage({
  params,
}: SupportConversationPageProps) {
  const user = await requireAuth(
    `/mypage/support-messages/${params.id}`
  );

  const conversation =
    await getCreatorSupportConversationById(
      user.id,
      params.id
    );

  if (!conversation) {
    notFound();
  }

  return (
    <SupportConversationView
      conversationId={conversation.id}
      projectTitle={conversation.projectTitle}
      projectSlug={conversation.projectSlug}
      backerName={conversation.backerName}
      backerAvatarUrl={conversation.backerAvatarUrl}
      messages={conversation.messages}
    />
  );
}