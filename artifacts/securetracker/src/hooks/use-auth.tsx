import React, { createContext, useContext } from "react";
import { useGetCurrentUser, getGetCurrentUserQueryKey, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      retry: false,
    },
  });

  React.useEffect(() => {
    if (!isLoading && error && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, error, location, setLocation]);

  if (isLoading && location !== "/login") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-primary">
          <ShieldAlert className="w-12 h-12 animate-pulse" />
          <p className="font-mono text-sm tracking-widest uppercase">ЗАГРУЗКА СИСТЕМЫ...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, error: error as Error | null }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
