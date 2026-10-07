export type Role = "MANAGER" | "ACCOUNTANT" | "RECEPTION" | "COORDINATOR";

export const ROLE_LABEL: Record<Role, string> = {
  MANAGER: "مدير القاعة",
  ACCOUNTANT: "محاسب",
  RECEPTION: "موظف استقبال",
  COORDINATOR: "مشرفة التنسيق",
};

export type Permission =
  | "booking:view"
  | "booking:create" // العميل والحجز
  | "booking:update"
  | "booking:cancel"
  | "baseExpense:edit"
  | "extra:edit"
  | "coordination:edit" // كارت التنسيق ومصروفاته
  | "payment:create"
  | "payment:void"
  | "report:view"
  | "audit:view"
  | "user:manage";

const ALL: Permission[] = [
  "booking:view",
  "booking:create",
  "booking:update",
  "booking:cancel",
  "baseExpense:edit",
  "extra:edit",
  "coordination:edit",
  "payment:create",
  "payment:void",
  "report:view",
  "audit:view",
  "user:manage",
];

const MATRIX: Record<Role, Permission[]> = {
  MANAGER: ALL,
  ACCOUNTANT: ALL.filter((p) => p !== "user:manage"),
  RECEPTION: ["booking:view", "booking:create", "booking:update", "payment:create"],
  COORDINATOR: ["booking:view", "coordination:edit"],
};

export const can = (role: Role, p: Permission): boolean => MATRIX[role].includes(p);

export class ForbiddenError extends Error {
  constructor() {
    super("ليست لديك صلاحية لتنفيذ هذا الإجراء");
  }
}

export function assertCan(role: Role, p: Permission): void {
  if (!can(role, p)) throw new ForbiddenError();
}
