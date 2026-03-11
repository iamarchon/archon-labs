import { useState, useCallback } from "react";
import supabase from "../lib/supabase";

export default function useTrade(userId, onComplete) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeTrade = useCallback(async (stock, action, shares) => {
    if (!userId || !stock || !shares) return;
    setLoading(true);
    setError(null);

    const price = stock.price ?? 0;
    if (price <= 0) {
      setError("No price available");
      setLoading(false);
      return;
    }

    const total = price * shares;

    try {
      // Get current user data
      const { data: user } = await supabase
        .from("users")
        .select("cash, xp")
        .eq("id", userId)
        .single();

      if (!user) throw new Error("User not found");

      if (action === "BUY") {
        if (user.cash < total) {
          setError("Not enough cash");
          setLoading(false);
          return;
        }

        // Deduct cash + add XP
        await supabase
          .from("users")
          .update({ cash: user.cash - total, xp: user.xp + 10 })
          .eq("id", userId);

        // Upsert holding
        const { data: existing } = await supabase
          .from("holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("ticker", stock.ticker)
          .single();

        if (existing) {
          const newShares = Number(existing.shares) + shares;
          const newAvgCost =
            (Number(existing.avg_cost) * Number(existing.shares) + price * shares) / newShares;
          await supabase
            .from("holdings")
            .update({ shares: newShares, avg_cost: newAvgCost })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("holdings")
            .insert({ user_id: userId, ticker: stock.ticker, shares, avg_cost: price });
        }
      } else {
        // SELL
        const { data: existing } = await supabase
          .from("holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("ticker", stock.ticker)
          .single();

        if (!existing || Number(existing.shares) < shares) {
          setError("Not enough shares");
          setLoading(false);
          return;
        }

        // Add cash + add XP
        await supabase
          .from("users")
          .update({ cash: user.cash + total, xp: user.xp + 10 })
          .eq("id", userId);

        const remainingShares = Number(existing.shares) - shares;
        if (remainingShares <= 0) {
          await supabase.from("holdings").delete().eq("id", existing.id);
        } else {
          await supabase
            .from("holdings")
            .update({ shares: remainingShares })
            .eq("id", existing.id);
        }
      }

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: userId,
        ticker: stock.ticker,
        action,
        shares,
        price,
        total,
      });

      if (onComplete) await onComplete();
    } catch (err) {
      setError(err.message || "Trade failed");
    }

    setLoading(false);
  }, [userId, onComplete]);

  return { executeTrade, loading, error };
}
