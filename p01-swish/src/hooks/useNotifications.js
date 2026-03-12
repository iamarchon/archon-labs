import { useState, useCallback, useEffect, useRef } from "react";

const STORAGE_PREFIX = "swish_notifications_";
const STREAK_MILESTONES = [3, 7, 14, 30];
const LEVEL_THRESHOLDS = [
  [2000, "Legend"], [750, "Platinum"], [300, "Gold"], [100, "Silver"], [0, "Bronze"],
];

function xpToLevel(xp) {
  for (const [t, l] of LEVEL_THRESHOLDS) if (xp >= t) return l;
  return "Bronze";
}

function storageKey(userId) { return STORAGE_PREFIX + userId; }

function loadStored(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStored(userId, items) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(items)); } catch { /* ignore */ }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export { timeAgo };

export default function useNotifications(dbUser, xp, streak) {
  const [notifications, setNotifications] = useState([]);
  const userId = dbUser?.id;
  const prevXpRef = useRef(null);
  const initialRef = useRef(false);

  // Load from storage on mount
  useEffect(() => {
    if (!userId) return;
    setNotifications(loadStored(userId));
  }, [userId]);

  // Helper: add notification if id doesn't already exist
  const addNotification = useCallback((notif) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === notif.id)) return prev;
      const next = [{ ...notif, read: false, createdAt: new Date().toISOString() }, ...prev].slice(0, 50);
      if (userId) saveStored(userId, next);
      return next;
    });
  }, [userId]);

  // Generate challenge notifications
  const generateChallengeNotifications = useCallback((challenges) => {
    if (!challenges?.length) return;
    for (const ch of challenges) {
      if (ch.percent >= 100 && !ch.completedAt) {
        addNotification({
          id: `challenge_claimable_${ch.id}`,
          type: "challenge",
          icon: "🏆",
          text: `You can claim "${ch.title}"! Earn +${ch.xpReward} XP`,
          link: "/challenges",
        });
      }
    }
  }, [addNotification]);

  // Detect level up
  useEffect(() => {
    if (!userId) return;
    if (!initialRef.current) {
      prevXpRef.current = xp;
      initialRef.current = true;
      return;
    }
    const prevLevel = xpToLevel(prevXpRef.current ?? 0);
    const newLevel = xpToLevel(xp);
    if (prevLevel !== newLevel && prevXpRef.current !== null) {
      addNotification({
        id: `levelup_${newLevel}_${Date.now()}`,
        type: "levelup",
        icon: "⭐",
        text: `You levelled up to ${newLevel}! Keep going`,
        link: "/",
      });
    }
    prevXpRef.current = xp;
  }, [xp, userId, addNotification]);

  // Detect streak milestones
  useEffect(() => {
    if (!userId || !streak) return;
    if (STREAK_MILESTONES.includes(streak)) {
      addNotification({
        id: `streak_${streak}`,
        type: "streak",
        icon: "🔥",
        text: `${streak} day streak! You're on fire!`,
        link: null,
      });
    }
  }, [streak, userId, addNotification]);

  // Check weekly reset (Monday)
  useEffect(() => {
    if (!userId) return;
    const now = new Date();
    if (now.getDay() === 1) {
      const weekKey = `${now.getFullYear()}-W${Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + 1) / 7)}`;
      addNotification({
        id: `weekly_reset_${weekKey}`,
        type: "weekly",
        icon: "🗓️",
        text: "New weekly challenges are available!",
        link: "/challenges",
      });
    }
  }, [userId, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      if (userId) saveStored(userId, next);
      return next;
    });
  }, [userId]);

  // Remove claimed challenge notifications
  const dismissChallengeNotification = useCallback((challengeId) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== `challenge_claimable_${challengeId}`);
      if (userId) saveStored(userId, next);
      return next;
    });
  }, [userId]);

  return {
    notifications,
    unreadCount,
    markAllRead,
    generateChallengeNotifications,
    dismissChallengeNotification,
  };
}
