"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  subject: string;
  body: string;
  channel: string;
  status: string;
  createdAt: string;
  sentAt?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    post_submit_edit: "bg-amber-100 text-amber-700",
    deadline_missed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {unreadCount > 0 && <Badge className="bg-red-100 text-red-700">{unreadCount} unread</Badge>}
      </div>

      <Card>
        <CardTitle>
          Recent Alerts
          {loading && <span className="ml-2 text-sm text-muted-foreground">loading...</span>}
        </CardTitle>

        {notifications.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground mt-3">No notifications yet</p>
        ) : (
          <div className="mt-4 divide-y">
            {notifications.map((n) => (
              <div key={n.id} className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={typeColors[n.type] ?? "bg-gray-100 text-gray-700"}>
                    {n.type.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{n.channel}</span>
                  <span
                    className={`text-xs ${n.status === "sent" ? "text-green-600" : "text-amber-600"}`}
                  >
                    {n.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{n.subject}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
