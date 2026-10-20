import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const Session = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: !supabase,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    void supabase.auth.getSession().then(({ data: next }) => {
      setUser(next.session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <Session.Provider value={{ user, ready }}>{children}</Session.Provider>;
}

export function useSession() {
  return useContext(Session);
}
