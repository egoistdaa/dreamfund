import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getBackerSupportConversationById } from "@/lib/data/supportMessages";
import BackerSupportConversationView from "./BackerSupportConversationView";

export const metadata = {
  title: "送った応援メッセージ",
  robots: { index: false },
};

type BackerSupportConversationPageProps = {
  params: {
    id: string;
  };
};

export default async function BackerSupportConversationPage({
  params,
}: BackerSupportConversationPageProps) {
  const user = await requireAuth(
    `/mypage/support-messages/sent/${params.id}`
  );

  const conversation = await getBackerSupportConversationById(
    user.id,
    params.id
  );

  if (!conversation) {
    notFound();
  }

  return (
    <BackerSupportConversationView
      conversationId={conversation.id}
      projectTitle={conversation.projectTitle}
      projectSlug={conversation.projectSlug}
      creatorName={conversation.creatorName}
      creatorAvatarUrl={conversation.creatorAvatarUrl}
      messages={conversation.messages}
    />
  );
}