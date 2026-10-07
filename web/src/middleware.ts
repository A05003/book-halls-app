import { NextResponse, type NextRequest } from "next/server";

// بوابة أولية: من لا يحمل كوكي الجلسة يُحوَّل لصفحة الدخول.
// التحقق الفعلي من التوقيع والمستخدم يتم على الخادم في كل صفحة وإجراء.
export function middleware(req: NextRequest) {
  const has = req.cookies.has("hall_session");
  const { pathname } = req.nextUrl;
  if (!has && pathname !== "/login") return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
