"use client";

import { create } from "zustand";
import type { AtomicConstants } from "@/lib/chemistry";

type ConstantsState = AtomicConstants & {
  loaded: boolean;
  setConstants: (c: AtomicConstants) => void;
};

export const useConstants = create<ConstantsState>((set) => ({
  C: 12.0,
  H: 1.01,
  O: 15.99,
  N: 14.01,
  S: 32.06,
  loaded: false,
  setConstants: ({ C, H, O, N, S }) =>
    set({ C, H, O, N, S, loaded: true }),
}));
