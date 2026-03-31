import { create } from "zustand";
import type { Player } from "@/types";

const MAX_CREDITS = 100;
const TEAM_SIZE = 11;
const MAX_FROM_ONE_TEAM = 7;
const MAX_OVERSEAS = 4;

interface TeamBuilderStore {
  selected: number[];
  captain: number | null;
  vc: number | null;
  togglePlayer: (id: number, allPlayers: Player[]) => void;
  toggleCaptain: (id: number) => void;
  toggleVC: (id: number) => void;
  reset: () => void;
  credits: (allPlayers: Player[]) => number;
  isValid: (allPlayers: Player[]) => boolean;
}

export const useTeamBuilder = create<TeamBuilderStore>((set, get) => ({
  selected: [],
  captain: null,
  vc: null,

  togglePlayer: (id, allPlayers) => {
    const { selected, captain, vc } = get();
    const player = allPlayers.find(p => p.id === id);
    if (!player) return;

    if (selected.includes(id)) {
      set({
        selected: selected.filter(x => x !== id),
        captain: captain === id ? null : captain,
        vc: vc === id ? null : vc,
      });
      return;
    }

    if (selected.length >= TEAM_SIZE) return;
    const usedCredits = selected.reduce((s, pid) => s + (allPlayers.find(p => p.id === pid)?.cr ?? 0), 0);
    if (usedCredits + player.cr > MAX_CREDITS) return;
    const sameTeam = selected.filter(pid => allPlayers.find(p => p.id === pid)?.team === player.team).length;
    if (sameTeam >= MAX_FROM_ONE_TEAM) return;
    const overseasCount = selected.filter(pid => allPlayers.find(p => p.id === pid)?.ovr).length;
    if (player.ovr && overseasCount >= MAX_OVERSEAS) return;

    set({ selected: [...selected, id] });
  },

  toggleCaptain: (id) => {
    const { captain, vc } = get();
    set({
      captain: captain === id ? null : id,
      vc: vc === id ? null : vc,
    });
  },

  toggleVC: (id) => {
    const { vc, captain } = get();
    set({
      vc: vc === id ? null : id,
      captain: captain === id ? null : captain,
    });
  },

  reset: () => set({ selected: [], captain: null, vc: null }),

  credits: (allPlayers) => {
    const { selected } = get();
    return selected.reduce((s, id) => s + (allPlayers.find(p => p.id === id)?.cr ?? 0), 0);
  },

  isValid: (allPlayers) => {
    const { selected, captain, vc, credits } = get();
    return selected.length === TEAM_SIZE && !!captain && !!vc && credits(allPlayers) <= MAX_CREDITS;
  },
}));
