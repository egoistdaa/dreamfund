import { createServerSupabase } from "@/lib/supabase/server-auth";
import type { SupportMessageTypeDB } from "@/types/database";

export type CreatorSupportConversation = {
  id: string;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  backerId: string;
  backerName: string;
  backerAvatarUrl: string | null;
  latestMessageBody: string | null;
  latestMessageType: SupportMessageTypeDB | null;
  lastMessageAt: string;
  createdAt: string;
};

type ProjectRow = {
  id: string;
  title: string;
  slug: string;
};

type ConversationRow = {
  id: string;
  project_id: string;
  backer_id: string;
  created_at: string;
  last_message_at: string;
};

type BackerRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type MessageRow = {
  conversation_id: string;
  message_type: SupportMessageTypeDB;
  body: string;
  created_at: string;
};

/**
 * 投稿者本人のプロジェクトに届いた応援メッセージ一覧を取得する。
 *
 * support_conversations / support_messagesのRLSでも
 * 対象プロジェクトの投稿者だけに制限される。
 * さらにprojects.owner_idでも本人の企画へ明示的に絞る。
 */
export async function getCreatorSupportConversations(
  userId: string
): Promise<CreatorSupportConversation[]> {
  const supabase = createServerSupabase();

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("id, title, slug")
    .eq("owner_id", userId);

  if (projectError) {
    throw projectError;
  }

  const projects = (projectData ?? []) as ProjectRow[];

  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);

  const { data: conversationData, error: conversationError } =
    await supabase
      .from("support_conversations")
      .select(
        "id, project_id, backer_id, created_at, last_message_at"
      )
      .in("project_id", projectIds)
      .order("last_message_at", { ascending: false });

  if (conversationError) {
    throw conversationError;
  }

  const conversations =
    (conversationData ?? []) as ConversationRow[];

  if (conversations.length === 0) {
    return [];
  }

  const backerIds = Array.from(
    new Set(conversations.map((conversation) => conversation.backer_id))
  );

  const conversationIds = conversations.map(
    (conversation) => conversation.id
  );

  const [
    { data: backerData, error: backerError },
    { data: messageData, error: messageError },
  ] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .in("id", backerIds),

    supabase
      .from("support_messages")
      .select(
        "conversation_id, message_type, body, created_at"
      )
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
  ]);

  if (backerError) {
    throw backerError;
  }

  if (messageError) {
    throw messageError;
  }

  const backers = (backerData ?? []) as BackerRow[];
  const messages = (messageData ?? []) as MessageRow[];

  const projectsById = new Map(
    projects.map((project) => [project.id, project])
  );

  const backersById = new Map(
    backers.map((backer) => [backer.id, backer])
  );

  const latestMessageByConversationId = new Map<
    string,
    MessageRow
  >();

  for (const message of messages) {
    if (!latestMessageByConversationId.has(message.conversation_id)) {
      latestMessageByConversationId.set(
        message.conversation_id,
        message
      );
    }
  }

  return conversations.flatMap((conversation) => {
    const project = projectsById.get(conversation.project_id);
    const backer = backersById.get(conversation.backer_id);
    const latestMessage = latestMessageByConversationId.get(
      conversation.id
    );

    if (!project || !backer) {
      return [];
    }

    return [
      {
        id: conversation.id,
        projectId: project.id,
        projectTitle: project.title,
        projectSlug: project.slug,
        backerId: backer.id,
        backerName: backer.display_name,
        backerAvatarUrl: backer.avatar_url,
        latestMessageBody: latestMessage?.body ?? null,
        latestMessageType: latestMessage?.message_type ?? null,
        lastMessageAt: conversation.last_message_at,
        createdAt: conversation.created_at,
      },
    ];
  });
}