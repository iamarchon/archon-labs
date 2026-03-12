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
  const [loading, setLoading] = useState(true);

  const clerkId = clerkUser?.id;

  const fetchData = useCallback(async () => {
    if (!clerkId) return;
    setLoading(true);

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
        const username = clerkUser.username
          || clerkUser.firstName?.toLowerCase()
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

        // Fetch watchlist
        const { data: w } = await supabase
          .from("watchlist")
          .select("*")
          .eq("user_id", user.id);
        setWatchlist((w || []).map(row => row.ticker));
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    }

    setLoading(false);
  }, [clerkId, clerkUser]);

  useEffect(() => {
    if (clerkLoaded && clerkId) fetchData();
  }, [clerkLoaded, clerkId, fetchData]);

  const toggleWatch = useCallback(async (ticker) => {
    if (!dbUser) return;
    const isWatched = watchlist.includes(ticker);

    if (isWatched) {
      await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", dbUser.id)
        .eq("ticker", ticker);
      setWatchlist(prev => prev.filter(t => t !== ticker));
    } else {
      await supabase
        .from("watchlist")
        .insert({ user_id: dbUser.id, ticker });
      setWatchlist(prev => [...prev, ticker]);
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
    loading: loading || !clerkLoaded,
    toggleWatch,
    refreshUser,
    refreshHoldings,
    xpToLevel,
  };
}
