import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchUser } from "@/utils/auth";

export const useAuth = ({ redirectToLogin = true }: { redirectToLogin?: boolean } = {}) => {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUser().then((res) => {
      if (!res && redirectToLogin) {
        router.push("/login");
      } else {
        setUser(res);
      }
    });
  }, []);

  return { user, isAuthenticated: !!user };
};
