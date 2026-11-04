import { createContext, useContext } from "react";
import type { Account } from "./api";

export type AuthSession = {
  user: Account;
  updateUser: (user: Account) => void;
  logout: () => Promise<void>;
};
export const AuthContext = createContext<AuthSession | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Authentication is not initialized.");
  return value;
}
