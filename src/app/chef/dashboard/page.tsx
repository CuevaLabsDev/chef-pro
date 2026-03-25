"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, statusColor } from "@/lib/utils";
import { ClipboardCheck, UtensilsCrossed, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface ChecklistTask {
  type: "checklist";
  packetId: string;
  locationName: string;
  meal: string;
  completed: boolean;
  items: { menuPackage: boolean; digitalSignage: boolean; foodCards: boolean };
}

interface TastingTask {
  type: "tasting";
  sessionId: string;
  locationName: string;
  meal: string;
  status: string;
  itemCount: number;
  filledBy: string | null;
}

type Task = ChecklistTask | TastingTask;

interface DailyTasksResponse {
  tasks: Task[];
  metrics: { total: number; completed: number; pending: number };
}

function isTaskCompleted(task: Task): boolean {
  if (task.type === "checklist") return task.completed;
  return task.status !== "draft";
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const completed = isTaskCompleted(task);

  if (task.type === "checklist") {
    const checkedCount = [
      task.items.menuPackage,
      task.items.digitalSignage,
      task.items.foodCards,
    ].filter(Boolean).length;
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <div className="flex items-center gap-4">
          <div
            className={`flex-shrink-0 rounded-full p-2 ${completed ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}
          >
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">Pre-Service Checklist</p>
            <p className="text-sm text-muted-foreground truncate">
              {task.locationName} &middot; {task.meal}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            {completed ? (
              <Badge className="bg-green-100 text-green-700">Done</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700">{checkedCount}/3</Badge>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="flex items-center gap-4">
        <div
          className={`flex-shrink-0 rounded-full p-2 ${completed ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}
        >
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">Tasting</p>
          <p className="text-sm text-muted-foreground truncate">
            {task.locationName} &middot; {task.meal}
          </p>
          {task.filledBy && (
            <p className="text-xs text-muted-foreground">Started by {task.filledBy}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <Badge className={statusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {task.itemCount} dish{task.itemCount !== 1 ? "es" : ""}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function ChefDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DailyTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/chef/tasks?date=${today}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tasks = data?.tasks ?? [];
  const metrics = data?.metrics ?? { total: 0, completed: 0, pending: 0 };
  const completionPct =
    metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0;

  function handleTaskClick(task: Task) {
    if (task.type === "checklist") {
      router.push(`/chef/checklist/${task.packetId}`);
    } else {
      router.push(`/chef/tastings/${task.sessionId}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Today&apos;s Tasks</h1>
        <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
      </div>

      {metrics.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              {metrics.completed}/{metrics.total} completed
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      )}

      {metrics.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center py-3 px-2">
            <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="text-center py-3 px-2">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{metrics.completed}</p>
            </div>
            <p className="text-xs text-muted-foreground">Done</p>
          </Card>
          <Card className="text-center py-3 px-2">
            <div className="flex items-center justify-center gap-1">
              <Circle className="w-4 h-4 text-amber-500" />
              <p className="text-2xl font-bold text-amber-500">{metrics.pending}</p>
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </Card>
        </div>
      )}

      {tasks.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-muted-foreground">No tasks for today</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tasks will appear when menu signage packets are published for your locations.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.type === "checklist" ? `cl-${task.packetId}` : `ts-${task.sessionId}`}
              task={task}
              onClick={() => handleTaskClick(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
