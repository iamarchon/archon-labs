import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/react";
import supabase from "../lib/supabase";

const LEVEL_THRESHOLDS = [
  [2000, "Legend"],
  [750, "Platinum"],
  [300, "Gold"],
  [100, "Silver"],
  [0, "Bronze"],
];

function xpToLevel(xp) {
  for (const [threshold, level] of LEVEL_THRESHOLDS) {
    if (xp >= threshold) return level;
  }
  return "Bronze";
}

export default function useUserData() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [dbUser, setDbUser] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const clerkId = clerkUser?.id;
  const clerkUserRef = useRef(clerkUser);
  clerkUserRef.current = clerkUser;
  const hasFetched = useRef(false);

  const fetchData = useCallback(async () => {
    if (!clerkId) return;
    // Only show loading spinner on initial fetch — not on re-fetches
    if (!hasFetched.current) setLoading(true);

    try {
      // Fetch or create user
      let { data: user, error: fetchErr } = await supabase
        .from("users")
        .select("*")
        .eq("clerk_id", clerkId)
        .maybeSingle();

      if (fetchErr) console.error("Fetch user failed:", fetchErr.message);

      if (!user) {
        // First sign in — create user row
        const cu = clerkUserRef.current;
        const username = cu?.username
          || cu?.firstName?.toLowerCase()
          || `trader_${clerkId.slice(-6)}`;

        const { data: newUser, error: insertErr } = await supabase
          .from("users")
          .insert({ clerk_id: clerkId, username })
          .select()
          .single();

        if (insertErr) console.error("Insert user failed:", insertErr.message);

        user = newUser;
      }

      if (user) {
        setDbUser(user);

        // Fetch holdings
        const { data: h } = await supabase
          .from("holdings")
          .select("*")
          .eq("user_id", user.id);
        setHoldings(h || []);

        // Fetch watchlist via API (uses supabaseAdmin on server)
        try {
          const base = import.meta.env.DEV ? "http://localhost:3001" : "";
          const wRes = await fetch(`${base}/api/watchlist?userId=${user.id}`);
          const wData = await wRes.json();
          const items = wData.items || [];
          setWatchlistItems(items);
          setWatchlist(items.map(row => row.symbol));
        } catch {
          setWatchlistItems([]);
          setWatchlist([]);
        }
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    }

    hasFetched.current = true;
    setLoading(false);
  }, [clerkId]);

  useEffect(() => {
    if (clerkLoaded && clerkId) fetchData();
  }, [clerkLoaded, clerkId, fetchData]);

  const toggleWatch = useCallback(async (ticker) => {
    if (!dbUser) return;
    const isWatched = watchlist.includes(ticker);
    const base = import.meta.env.DEV ? "http://localhost:3001" : "";

    if (isWatched) {
      const res = await fetch(`${base}/api/watchlist/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: dbUser.id, symbol: ticker }),
      });
      const result = await res.json();
      if (result.success) {
        setWatchlist(prev => prev.filter(t => t !== ticker));
        setWatchlistItems(prev => prev.filter(w => w.symbol !== ticker));
      } else {
        console.error("Watchlist remove failed:", result.error);
      }
    } else {
      const res = await fetch(`${base}/api/watchlist/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: dbUser.id, symbol: ticker }),
      });
      const result = await res.json();
      if (result.success) {
        setWatchlist(prev => [...prev, ticker]);
        setWatchlistItems(prev => [...prev, { symbol: ticker, created_at: new Date().toISOString() }]);
      } else {
        console.error("Watchlist add failed:", result.error);
      }
    }
  }, [dbUser, watchlist]);

  // Use refs to avoid stale closures in callbacks passed to useTrade
  const dbUserRef = useRef(null);
  dbUserRef.current = dbUser;

  const refreshUser = useCallback(async () => {
    const u = dbUserRef.current;
    if (!u) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", u.id)
      .single();
    if (data) setDbUser(data);
  }, []);

  const refreshHoldings = useCallback(async () => {
    const u = dbUserRef.current;
    if (!u) return;
    const { data } = await supabase
      .from("holdings")
      .select("*")
      .eq("user_id", u.id);
    setHoldings(data || []);
  }, []);

  return {
    user: dbUser,
    holdings,
    watchlist,
    watchlistItems,
    loading: loading || !clerkLoaded,
    toggleWatch,
    refreshUser,
    refreshHoldings,
    xpToLevel,
  };
}
