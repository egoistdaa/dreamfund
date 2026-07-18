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
  isUnread: boolean;
};
export type BackerSupportConversation = {
  id: string;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  latestMessageBody: string | null;
  latestMessageType: SupportMessageTypeDB | null;
  lastMessageAt: string;
  createdAt: string;
  isUnread: boolean;
};
type BackerProjectRow = {
  id: string;
  title: string;
  slug: string;
  owner_id: string;
};

type CreatorProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};
type BackerConversationRow = {
  id: string;
  project_id: string;
  backer_id: string;
  created_at: string;
  last_message_at: string;
  backer_last_read_at: string | null;
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
  creator_last_read_at: string | null;
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
  "id, project_id, backer_id, created_at, last_message_at, creator_last_read_at"
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
  const creatorLastReadAtByConversationId = new Map(
  conversations.map((conversation) => [
    conversation.id,
    conversation.creator_last_read_at,
  ])
);

const unreadConversationIds = new Set<string>();

for (const message of messages) {
  if (message.message_type !== "support") {
    continue;
  }

  const creatorLastReadAt =
    creatorLastReadAtByConversationId.get(
      message.conversation_id
    );

  if (
    !creatorLastReadAt ||
    new Date(message.created_at).getTime() >
      new Date(creatorLastReadAt).getTime()
  ) {
    unreadConversationIds.add(message.conversation_id);
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
        isUnread: unreadConversationIds.has(conversation.id),
      },
    ];
  });
}
export async function getCreatorUnreadSupportConversationCount(
  userId: string
): Promise<number> {
  const supabase = createServerSupabase();

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", userId);

  if (projectError) {
    throw projectError;
  }

  const projectIds = (projectData ?? []).map((project) => project.id);

  if (projectIds.length === 0) {
    return 0;
  }

  const { data: conversationData, error: conversationError } =
    await supabase
      .from("support_conversations")
      .select("id, creator_last_read_at")
      .in("project_id", projectIds);

  if (conversationError) {
    throw conversationError;
  }

  const conversations = conversationData ?? [];

  if (conversations.length === 0) {
    return 0;
  }

  const conversationIds = conversations.map(
    (conversation) => conversation.id
  );

  const { data: messageData, error: messageError } = await supabase
    .from("support_messages")
    .select("conversation_id, created_at")
    .in("conversation_id", conversationIds)
    .eq("message_type", "support");

  if (messageError) {
    throw messageError;
  }

  const creatorLastReadAtByConversationId = new Map(
    conversations.map((conversation) => [
      conversation.id,
      conversation.creator_last_read_at,
    ])
  );

  const unreadConversationIds = new Set<string>();

  for (const message of messageData ?? []) {
    const creatorLastReadAt =
      creatorLastReadAtByConversationId.get(message.conversation_id);

    if (
      !creatorLastReadAt ||
      new Date(message.created_at).getTime() >
        new Date(creatorLastReadAt).getTime()
    ) {
      unreadConversationIds.add(message.conversation_id);
    }
  }

  return unreadConversationIds.size;
}
export async function getBackerUnreadSupportConversationCount(
  userId: string
): Promise<number> {
  const supabase = createServerSupabase();

  const { data: conversationData, error: conversationError } =
    await supabase
      .from("support_conversations")
      .select("id, backer_last_read_at")
      .eq("backer_id", userId);

  if (conversationError) {
    throw conversationError;
  }

  const conversations = conversationData ?? [];

  if (conversations.length === 0) {
    return 0;
  }

  const conversationIds = conversations.map(
    (conversation) => conversation.id
  );

  const { data: messageData, error: messageError } = await supabase
    .from("support_messages")
    .select("conversation_id, created_at")
    .in("conversation_id", conversationIds)
    .eq("message_type", "creator_reply");

  if (messageError) {
    throw messageError;
  }

  const backerLastReadAtByConversationId = new Map(
    conversations.map((conversation) => [
      conversation.id,
      conversation.backer_last_read_at,
    ])
  );

  const unreadConversationIds = new Set<string>();

  for (const message of messageData ?? []) {
    const backerLastReadAt =
      backerLastReadAtByConversationId.get(message.conversation_id);

    if (
      !backerLastReadAt ||
      new Date(message.created_at).getTime() >
        new Date(backerLastReadAt).getTime()
    ) {
      unreadConversationIds.add(message.conversation_id);
    }
  }

  return unreadConversationIds.size;
}
export type CreatorSupportConversationDetail = {
  id: string;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  backerId: string;
  backerName: string;
  backerAvatarUrl: string | null;
  messages: {
    id: string;
    senderId: string;
    messageType: SupportMessageTypeDB;
    body: string;
    createdAt: string;
  }[];
};
export type BackerSupportConversationDetail = {
  id: string;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  messages: {
    id: string;
    senderId: string;
    messageType: SupportMessageTypeDB;
    body: string;
    createdAt: string;
  }[];
};

type DetailMessageRow = {
  id: string;
  sender_id: string;
  message_type: SupportMessageTypeDB;
  body: string;
  created_at: string;
};

/**
 * 投稿者本人が閲覧できる応援メッセージの会話詳細を取得する。
 * RLSに加え、project.owner_idでも投稿者本人か確認する。
 */
export async function getCreatorSupportConversationById(
  userId: string,
  conversationId: string
): Promise<CreatorSupportConversationDetail | null> {
  const supabase = createServerSupabase();

  const { data: conversationData, error: conversationError } =
    await supabase
      .from("support_conversations")
      .select("id, project_id, backer_id")
      .eq("id", conversationId)
      .maybeSingle();

  if (conversationError) {
    throw conversationError;
  }

  if (!conversationData) {
    return null;
  }

  const conversation = conversationData as {
    id: string;
    project_id: string;
    backer_id: string;
  };

  const [
    { data: projectData, error: projectError },
    { data: backerData, error: backerError },
    { data: messageData, error: messageError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, slug")
      .eq("id", conversation.project_id)
      .eq("owner_id", userId)
      .maybeSingle(),

    supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .eq("id", conversation.backer_id)
      .maybeSingle(),

    supabase
      .from("support_messages")
      .select("id, sender_id, message_type, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true }),
  ]);

  if (projectError) {
    throw projectError;
  }

  if (backerError) {
    throw backerError;
  }

  if (messageError) {
    throw messageError;
  }

  if (!projectData || !backerData) {
    return null;
  }

  const project = projectData as ProjectRow;
  const backer = backerData as BackerRow;
  const messages = (messageData ?? []) as DetailMessageRow[];

  return {
    id: conversation.id,
    projectId: project.id,
    projectTitle: project.title,
    projectSlug: project.slug,
    backerId: backer.id,
    backerName: backer.display_name,
    backerAvatarUrl: backer.avatar_url,
    messages: messages.map((message) => ({
      id: message.id,
      senderId: message.sender_id,
      messageType: message.message_type,
      body: message.body,
      createdAt: message.created_at,
    })),
  };
}
export async function getBackerSupportConversations(
  userId: string
): Promise<BackerSupportConversation[]> {
  const supabase = createServerSupabase();

  const { data: conversationData, error: conversationError } =
    await supabase
      .from("support_conversations")
      .select(
        "id, project_id, backer_id, created_at, last_message_at, backer_last_read_at"
      )
      .eq("backer_id", userId)
      .order("last_message_at", { ascending: false });

  if (conversationError) {
    throw conversationError;
  }

  const conversations =
    (conversationData ?? []) as BackerConversationRow[];

  if (conversations.length === 0) {
    return [];
  }

  const projectIds = Array.from(
    new Set(
      conversations.map((conversation) => conversation.project_id)
    )
  );

  const conversationIds = conversations.map(
    (conversation) => conversation.id
  );

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("id, title, slug, owner_id")
    .in("id", projectIds);

  if (projectError) {
    throw projectError;
  }

  const projects = (projectData ?? []) as BackerProjectRow[];

  const creatorIds = Array.from(
    new Set(projects.map((project) => project.owner_id))
  );

  const [
    { data: creatorData, error: creatorError },
    { data: messageData, error: messageError },
  ] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .in("id", creatorIds),

    supabase
      .from("support_messages")
      .select(
        "conversation_id, message_type, body, created_at"
      )
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
  ]);

  if (creatorError) {
    throw creatorError;
  }

  if (messageError) {
    throw messageError;
  }

  const creators = (creatorData ?? []) as CreatorProfileRow[];
  const messages = (messageData ?? []) as MessageRow[];

  const projectsById = new Map(
    projects.map((project) => [project.id, project])
  );

  const creatorsById = new Map(
    creators.map((creator) => [creator.id, creator])
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

  const backerLastReadAtByConversationId = new Map(
    conversations.map((conversation) => [
      conversation.id,
      conversation.backer_last_read_at,
    ])
  );

  const unreadConversationIds = new Set<string>();

  for (const message of messages) {
    if (message.message_type !== "creator_reply") {
      continue;
    }

    const backerLastReadAt =
      backerLastReadAtByConversationId.get(
        message.conversation_id
      );

    if (
      !backerLastReadAt ||
      new Date(message.created_at).getTime() >
        new Date(backerLastReadAt).getTime()
    ) {
      unreadConversationIds.add(message.conversation_id);
    }
  }

  return conversations.flatMap((conversation) => {
    const project = projectsById.get(conversation.project_id);

    if (!project) {
      return [];
    }

    const creator = creatorsById.get(project.owner_id);
    const latestMessage = latestMessageByConversationId.get(
      conversation.id
    );

    if (!creator) {
      return [];
    }

    return [
      {
        id: conversation.id,
        projectId: project.id,
        projectTitle: project.title,
        projectSlug: project.slug,
        creatorId: creator.id,
        creatorName: creator.display_name,
        creatorAvatarUrl: creator.avatar_url,
        latestMessageBody: latestMessage?.body ?? null,
        latestMessageType: latestMessage?.message_type ?? null,
        lastMessageAt: conversation.last_message_at,
        createdAt: conversation.created_at,
        isUnread: unreadConversationIds.has(conversation.id),
      },
    ];
  });
}
export async function getBackerSupportConversationById(
  userId: string,
  conversationId: string
): Promise<BackerSupportConversationDetail | null> {
  const supabase = createServerSupabase();

  const { data: conversationData, error: conversationError } =
    await supabase
      .from("support_conversations")
      .select("id, project_id, backer_id")
      .eq("id", conversationId)
      .eq("backer_id", userId)
      .maybeSingle();

  if (conversationError) {
    throw conversationError;
  }

  if (!conversationData) {
    return null;
  }

  const conversation = conversationData as {
    id: string;
    project_id: string;
    backer_id: string;
  };

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("id, title, slug, owner_id")
    .eq("id", conversation.project_id)
    .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  if (!projectData) {
    return null;
  }

  const project = projectData as BackerProjectRow;

  const [
    { data: creatorData, error: creatorError },
    { data: messageData, error: messageError },
  ] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .eq("id", project.owner_id)
      .maybeSingle(),

    supabase
      .from("support_messages")
      .select("id, sender_id, message_type, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true }),
  ]);

  if (creatorError) {
    throw creatorError;
  }

  if (messageError) {
    throw messageError;
  }

  if (!creatorData) {
    return null;
  }

  const creator = creatorData as CreatorProfileRow;
  const messages = (messageData ?? []) as DetailMessageRow[];

  return {
    id: conversation.id,
    projectId: project.id,
    projectTitle: project.title,
    projectSlug: project.slug,
    creatorId: creator.id,
    creatorName: creator.display_name,
    creatorAvatarUrl: creator.avatar_url,
    messages: messages.map((message) => ({
      id: message.id,
      senderId: message.sender_id,
      messageType: message.message_type,
      body: message.body,
      createdAt: message.created_at,
    })),
  };
}