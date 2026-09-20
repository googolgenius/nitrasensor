/**
 * Browser-native Web Notification helper
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return await Notification.requestPermission();
}

export async function sendNativeNotification(title: string, options?: NotificationOptions): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
      return true;
    } catch (e) {
      console.warn("Native notification dispatch failed:", e);
      return false;
    }
  } else if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      try {
        new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  return false;
}
