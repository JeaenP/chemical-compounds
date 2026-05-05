"use client";

import { create } from "zustand";
import type { AtomicConstants } from "@/lib/chemistry";

type ConstantsState = AtomicConstants & {
  loaded: boolean;
  setConstants: (c: AtomicConstants) => void;
};

export const useConstants = create<ConstantsState>((set) => ({
  C: 0,
  H: 0,
  O: 0,
  N: 0,
  S: 0,
  loaded: false,
  setConstants: ({ C, H, O, N, S }) =>
    set({ C, H, O, N, S, loaded: true }),
}));
