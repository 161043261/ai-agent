import { atom } from "jotai";

// Token atom
export const tokenAtom = atom<string | null>(localStorage.getItem("token"));

// Derived atom for checking if user is authenticated
export const isAuthenticatedAtom = atom((get) => Boolean(get(tokenAtom)));

// Action atom for setting token
export const setTokenAtom = atom(
  null /** initialValue */,
  (_get, set, newToken: string | null) => {
    set(tokenAtom, newToken);
    if (newToken) {
      localStorage.setItem("token", newToken);
    } else {
      localStorage.removeItem("token");
    }
  },
);
