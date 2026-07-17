export type SendEmailResult =
  | { success: true; id: string | null }
  | { success: false; error: string };
