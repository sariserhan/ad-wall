import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export async function fetchIsAdmin(token: string | null | undefined): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url || !token) return false;

  try {
    const client = new ConvexHttpClient(url);
    client.setAuth(token);
    const access = await client.query(api.admin.getAccess, {});
    return Boolean(access?.isAdmin);
  } catch {
    return false;
  }
}
