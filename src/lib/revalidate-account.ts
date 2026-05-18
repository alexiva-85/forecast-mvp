import { revalidatePath } from "next/cache";

const ACCOUNT_PATHS = [
  "/portfolio",
  "/portfolio/positions",
  "/portfolio/orders",
  "/portfolio/activity",
  "/profile",
] as const;

export function revalidateAccountPaths() {
  for (const path of ACCOUNT_PATHS) {
    revalidatePath(path);
  }
}
