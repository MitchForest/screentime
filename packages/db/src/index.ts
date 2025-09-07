export { createDb, dbNow } from "./client";
export type { Database, SummariesTable, ActivitiesTable } from "./types";
export {
  upsertSession,
  ensureStudent,
  insertActivities,
  insertSummary,
  listRecentSummaries,
  getSummaryAndActivities,
  mintDeviceToken,
  revokeDeviceToken,
  listDeviceTokens,
  createUser,
  findUserByEmail,
} from "./dao";
