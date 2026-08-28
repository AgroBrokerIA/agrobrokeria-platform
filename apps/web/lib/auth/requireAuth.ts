import { getCurrentUser } from "./getCurrentUser";

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return user;
}