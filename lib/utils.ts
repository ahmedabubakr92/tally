import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Activity = {
  actionType: string;
  metadata: unknown;
  user: { name: string };
};

export function formatActivity(activity: Activity): string {
  const meta = activity.metadata as Record<string, string | number>;
  switch (activity.actionType) {
    case "GROUP_CREATED":
      return `${activity.user.name} created this group`;
    case "MEMBER_ADDED":
      return `${activity.user.name} added ${meta.addedEmail} to the group`;
    case "EXPENSE_ADDED":
      return `${activity.user.name} added "${meta.title}" for AED ${Number(meta.amount).toLocaleString("en-AE")}`;
    case "SETTLEMENT_RECORDED":
      return `${meta.paidByName} settled AED ${Number(meta.amount).toLocaleString("en-AE")} with ${meta.paidToName}`;
    default:
      return `${activity.user.name} performed an action`;
  }
}
