"use client";

import { create } from "zustand";

type ConstantsState = {
  C: number;
  H: number;
  O: number;
  loaded: boolean;
  setConstants: (c: { C: number; H: number; O: number }) => void;
};

export const useConstants = create<ConstantsState>((set) => ({
  C: 12.0,
  H: 1.01,
  O: 15.99,
  loaded: false,
  setConstants: ({ C, H, O }) => set({ C, H, O, loaded: true }),
}));
