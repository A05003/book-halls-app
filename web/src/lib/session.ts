import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { can, ForbiddenError, type Permission, type Role } from "./rbac";

const COOKIE = "hall_session";
const MAX_AGE = 60 * 60 * 12; // 12 ساعة

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET مطلوب (32 حرفاً على الأقل)");
  return new TextEncoder().encode(s);
}

export type SessionUser = { id: number; name: string; username: string; role: Role };

export async function createSession(userId: number): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

// يقرأ المستخدم من قاعدة البيانات في كل طلب، فيسري إيقاف الحساب أو تغيير الدور فوراً
export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = await prisma.user.findUnique({ where: { id: Number(payload.uid) } });
    if (!u || !u.active) return null;
    return { id: u.id, name: u.name, username: u.username, role: u.role };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requirePermission(p: Permission): Promise<SessionUser> {
  const u = await requireUser();
  if (!can(u.role, p)) throw new ForbiddenError();
  return u;
}
