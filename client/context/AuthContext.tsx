import { createContext, useContext } from "react";

export interface AuthContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  vip: boolean;
  loading:boolean;
  setUser: (user: IUser | null) => void;
  setVip: (vip: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>(({
  user: null,
  vip: false,
  isAuthenticated: false,
  loading: false,
  setVip: () => false,
  setLoading: () => false,
  setUser: () => null,
  logout: () => { },
}));
export const useAuthContext = () => useContext(AuthContext);