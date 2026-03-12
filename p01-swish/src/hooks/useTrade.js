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
      const { data: user, error: userErr } = await supabase
        .from("users")
        .select("cash, xp, total_trades")
        .eq("id", userId)
        .single();

      if (userErr) throw new Error(`Fetch user failed: ${userErr.message}`);
      if (!user) throw new Error("User not found");

      if (action === "BUY") {
        if (user.cash < total) {
          setError("Not enough cash");
          setLoading(false);
          return;
        }

        // Deduct cash + add XP + increment trades
        const { error: cashErr } = await supabase
          .from("users")
          .update({ cash: user.cash - total, xp: user.xp + 10, total_trades: (user.total_trades || 0) + 1 })
          .eq("id", userId);
        if (cashErr) throw new Error(`Update cash failed: ${cashErr.message}`);

        // Upsert holding
        const { data: existing, error: holdErr } = await supabase
          .from("holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("ticker", stock.ticker)
          .maybeSingle();

        if (holdErr) throw new Error(`Fetch holding failed: ${holdErr.message}`);

        if (existing) {
          const newShares = Number(existing.shares) + shares;
          const newAvgCost =
            (Number(existing.avg_cost) * Number(existing.shares) + price * shares) / newShares;
          const { error: upErr } = await supabase
            .from("holdings")
            .update({ shares: newShares, avg_cost: newAvgCost })
            .eq("id", existing.id);
          if (upErr) throw new Error(`Update holding failed: ${upErr.message}`);
        } else {
          const { error: insErr } = await supabase
            .from("holdings")
            .insert({ user_id: userId, ticker: stock.ticker, shares, avg_cost: price });
          if (insErr) throw new Error(`Insert holding failed: ${insErr.message}`);
        }
      } else {
        // SELL
        const { data: existing, error: sellHoldErr } = await supabase
          .from("holdings")
          .select("*")
          .eq("user_id", userId)
          .eq("ticker", stock.ticker)
          .maybeSingle();

        if (sellHoldErr) throw new Error(`Fetch holding failed: ${sellHoldErr.message}`);

        if (!existing || Number(existing.shares) < shares) {
          setError("Not enough shares");
          setLoading(false);
          return;
        }

        // Add cash + add XP + increment trades
        const { error: sellCashErr } = await supabase
          .from("users")
          .update({ cash: user.cash + total, xp: user.xp + 10, total_trades: (user.total_trades || 0) + 1 })
          .eq("id", userId);
        if (sellCashErr) throw new Error(`Update cash failed: ${sellCashErr.message}`);

        const remainingShares = Number(existing.shares) - shares;
        if (remainingShares <= 0) {
          const { error: delErr } = await supabase.from("holdings").delete().eq("id", existing.id);
          if (delErr) throw new Error(`Delete holding failed: ${delErr.message}`);
        } else {
          const { error: sellUpErr } = await supabase
            .from("holdings")
            .update({ shares: remainingShares })
            .eq("id", existing.id);
          if (sellUpErr) throw new Error(`Update holding failed: ${sellUpErr.message}`);
        }
      }

      // Record transaction
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: userId,
        ticker: stock.ticker,
        action,
        shares,
        price,
        total,
      });
      if (txErr) console.error("Transaction log failed:", txErr.message);

      if (onComplete) await onComplete();
    } catch (err) {
      setError(err.message || "Trade failed");
    }

    setLoading(false);
  }, [userId, onComplete]);

  return { executeTrade, loading, error };
}
