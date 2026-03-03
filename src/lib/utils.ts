import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isDeadlinePassed(deadlineTime: string, date: Date): boolean {
  const [hours, minutes] = deadlineTime.split(":").map(Number);
  const deadline = new Date(date);
  deadline.setHours(hours, minutes, 0, 0);
  return new Date() > deadline;
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    reviewed: "bg-green-100 text-green-700",
    locked: "bg-purple-100 text-purple-700",
    compliant: "bg-green-100 text-green-700",
    non_compliant: "bg-red-100 text-red-700",
    not_checked: "bg-yellow-100 text-yellow-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}
