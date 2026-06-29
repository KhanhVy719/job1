import { createContext, useContext } from "react";

export interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  Shop: any;
  settings: Record<string, string>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  isAuthenticated: false,
  Shop: null,
  settings: {},
  logout: () => {},
});

export const useAuthContext = () => useContext(AuthContext);
