export type ContentReportReason =
  | "misleading"
  | "offensive"
  | "spam"
  | "other";

export type ContentReportStatus =
  | "pending"
  | "reviewed"
  | "dismissed"
  | "action_taken";

export interface AdminContentReport {
  id: string;
  created_at: string;
  status: ContentReportStatus;
  subject_type: "market" | "user";
  subject_id: string;
  subject_slug: string | null;
  subject_title: string;
  reason: ContentReportReason;
  details: string | null;
  reporter_id: string;
  reporter_display_name: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewer_display_name: string | null;
}

export function contentReportReasonLabel(reason: ContentReportReason): string {
  switch (reason) {
    case "misleading":
      return "Вводит в заблуждение";
    case "offensive":
      return "Оскорбительный контент";
    case "spam":
      return "Спам";
    case "other":
      return "Другое";
  }
}

export function contentReportStatusLabel(status: ContentReportStatus): string {
  switch (status) {
    case "pending":
      return "Ожидает";
    case "reviewed":
      return "Просмотрена";
    case "dismissed":
      return "Отклонена";
    case "action_taken":
      return "Приняты меры";
  }
}
