import { createServerSupabase } from "@/lib/supabase/server-auth";
import type {
  PledgeStatusDB,
  ProjectStatusDB,
} from "@/types/database";

export type BackedProjectItem = {
  pledgeId: string;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  projectThumbnailUrl: string | null;
  projectStatus: ProjectStatusDB;
  currentAmount: number;
  goalAmount: number;
  returnTitle: string | null;
  amount: number;
  pledgeStatus: PledgeStatusDB;
  backedAt: string;
};

type PledgeRow = {
  id: string;
  project_id: string;
  return_id: string | null;
  amount: number;
  status: PledgeStatusDB;
  created_at: string;
};

type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  status: ProjectStatusDB;
  current_amount: number;
  goal_amount: number;
};

type ReturnRow = {
  id: string;
  title: string;
};

export async function getBackedProjects(
  userId: string
): Promise<BackedProjectItem[]> {
  const supabase = createServerSupabase();

  const { data: pledgeData, error: pledgeError } =
    await supabase
      .from("pledges")
      .select(
        "id, project_id, return_id, amount, status, created_at"
      )
      .eq("backer_id", userId)
      .order("created_at", { ascending: false });

  if (pledgeError) {
    throw pledgeError;
  }

  const pledges = (pledgeData ?? []) as PledgeRow[];

  if (pledges.length === 0) {
    return [];
  }

  const projectIds = Array.from(
    new Set(pledges.map((pledge) => pledge.project_id))
  );

  const returnIds = Array.from(
    new Set(
      pledges
        .map((pledge) => pledge.return_id)
        .filter((returnId): returnId is string =>
          returnId !== null
        )
    )
  );

  const [
    { data: projectData, error: projectError },
    { data: returnData, error: returnError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, title, slug, thumbnail_url, status, current_amount, goal_amount"
      )
      .in("id", projectIds),

    returnIds.length > 0
      ? supabase
          .from("returns")
          .select("id, title")
          .in("id", returnIds)
      : Promise.resolve({
          data: [] as ReturnRow[],
          error: null,
        }),
  ]);

  if (projectError) {
    throw projectError;
  }

  if (returnError) {
    throw returnError;
  }

  const projects = (projectData ?? []) as ProjectRow[];
  const returns = (returnData ?? []) as ReturnRow[];

  const projectsById = new Map(
    projects.map((project) => [project.id, project])
  );

  const returnsById = new Map(
    returns.map((returnItem) => [
      returnItem.id,
      returnItem,
    ])
  );

  return pledges.flatMap((pledge) => {
    const project = projectsById.get(pledge.project_id);

    if (!project) {
      return [];
    }

    const returnItem = pledge.return_id
      ? returnsById.get(pledge.return_id)
      : null;

    return [
      {
        pledgeId: pledge.id,
        projectId: project.id,
        projectTitle: project.title,
        projectSlug: project.slug,
        projectThumbnailUrl: project.thumbnail_url,
        projectStatus: project.status,
        currentAmount: project.current_amount,
        goalAmount: project.goal_amount,
        returnTitle: returnItem?.title ?? null,
        amount: pledge.amount,
        pledgeStatus: pledge.status,
        backedAt: pledge.created_at,
      },
    ];
  });
}
export type BackedProjectDetail = BackedProjectItem & {
  returnDescription: string | null;
  returnPrice: number | null;
  estimatedDelivery: string | null;
  feeAmount: number;
  stripePaymentIntentId: string | null;
  updatedAt: string;
  conversationId: string | null;
};

type PledgeDetailRow = PledgeRow & {
  fee_amount: number;
  stripe_payment_intent_id: string | null;
  updated_at: string;
};

type ReturnDetailRow = ReturnRow & {
  description: string | null;
  price: number;
  estimated_delivery: string | null;
};

export async function getBackedProjectByPledgeId(
  userId: string,
  pledgeId: string
): Promise<BackedProjectDetail | null> {
  const supabase = createServerSupabase();

  const { data: pledgeData, error: pledgeError } =
    await supabase
      .from("pledges")
      .select(
        "id, project_id, return_id, amount, fee_amount, status, stripe_payment_intent_id, created_at, updated_at"
      )
      .eq("id", pledgeId)
      .eq("backer_id", userId)
      .maybeSingle();

  if (pledgeError) {
    throw pledgeError;
  }

  if (!pledgeData) {
    return null;
  }

  const pledge = pledgeData as PledgeDetailRow;

  const { data: projectData, error: projectError } =
    await supabase
      .from("projects")
      .select(
        "id, title, slug, thumbnail_url, status, current_amount, goal_amount"
      )
      .eq("id", pledge.project_id)
      .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  if (!projectData) {
    return null;
  }

  const project = projectData as ProjectRow;

  let returnItem: ReturnDetailRow | null = null;

  if (pledge.return_id) {
    const { data: returnData, error: returnError } =
      await supabase
        .from("returns")
        .select(
          "id, title, description, price, estimated_delivery"
        )
        .eq("id", pledge.return_id)
        .eq("project_id", pledge.project_id)
        .maybeSingle();

    if (returnError) {
      throw returnError;
    }

    returnItem = returnData as ReturnDetailRow | null;
  }

  const { data: conversationData, error: conversationError } =
    await supabase
      .from("support_conversations")
      .select("id")
      .eq("project_id", pledge.project_id)
      .eq("backer_id", userId)
      .limit(1)
      .maybeSingle();

  if (conversationError) {
    throw conversationError;
  }

  return {
    pledgeId: pledge.id,
    projectId: project.id,
    projectTitle: project.title,
    projectSlug: project.slug,
    projectThumbnailUrl: project.thumbnail_url,
    projectStatus: project.status,
    currentAmount: project.current_amount,
    goalAmount: project.goal_amount,
    returnTitle: returnItem?.title ?? null,
    returnDescription: returnItem?.description ?? null,
    returnPrice: returnItem?.price ?? null,
    estimatedDelivery:
      returnItem?.estimated_delivery ?? null,
    amount: pledge.amount,
    feeAmount: pledge.fee_amount,
    pledgeStatus: pledge.status,
    stripePaymentIntentId:
      pledge.stripe_payment_intent_id,
    backedAt: pledge.created_at,
    updatedAt: pledge.updated_at,
    conversationId: conversationData?.id ?? null,
  };
}