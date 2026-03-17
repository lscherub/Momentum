export interface NotificationPayload {
  id: string;
  title: string;
  body?: string;
  intervalMinutes: number;
}

const scheduledNotifications = new Map<string, number>();

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
}

export function scheduleNotification(payload: NotificationPayload) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (scheduledNotifications.has(payload.id)) return;

  const intervalMs = payload.intervalMinutes * 60 * 1000;
  const handle = window.setInterval(() => {
    new Notification(payload.title, {
      body: payload.body,
    });
  }, intervalMs);

  scheduledNotifications.set(payload.id, handle);
}

export function clearScheduledNotification(id: string) {
  const handle = scheduledNotifications.get(id);
  if (handle) {
    window.clearInterval(handle);
    scheduledNotifications.delete(id);
  }
}

export function resetAllScheduledNotifications() {
  scheduledNotifications.forEach((handle) => {
    window.clearInterval(handle);
  });
  scheduledNotifications.clear();
}