import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import supabase from "../lib/supabase";

const LEVEL_THRESHOLDS = [
  [10000, "Legend"],
  [5000, "Diamond"],
  [1500, "Gold"],
  [500, "Silver"],
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
      let { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("clerk_id", clerkId)
        .single();

      if (!user) {
        // First sign in — create user row
        const username = clerkUser.username
          || clerkUser.firstName?.toLowerCase()
          || `trader_${clerkId.slice(-6)}`;

        const { data: newUser } = await supabase
          .from("users")
          .insert({ clerk_id: clerkId, username })
          .select()
          .single();

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

  const refreshUser = useCallback(async () => {
    if (!dbUser) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", dbUser.id)
      .single();
    if (data) setDbUser(data);
  }, [dbUser]);

  const refreshHoldings = useCallback(async () => {
    if (!dbUser) return;
    const { data } = await supabase
      .from("holdings")
      .select("*")
      .eq("user_id", dbUser.id);
    setHoldings(data || []);
  }, [dbUser]);

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
