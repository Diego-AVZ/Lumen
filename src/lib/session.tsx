import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const AUTH_ERROR = 'lumen.authError';

const Session = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: !supabase,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setReady(true);
    });
    void (async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const exchanged = await supabase.auth.exchangeCodeForSession(code);
        if (!alive) return;
        if (exchanged.error) {
          try {
            sessionStorage.setItem(AUTH_ERROR, exchanged.error.message);
          } catch {
            /* sigue */
          }
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
          setUser(null);
          setReady(true);
          return;
        }
        setUser(exchanged.data.session?.user ?? null);
        setReady(true);
        return;
      }
      const { data: next } = await supabase.auth.getSession();
      if (!alive) return;
      setUser(next.session?.user ?? null);
      setReady(true);
    })();
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <Session.Provider value={{ user, ready }}>{children}</Session.Provider>;
}

export function useSession() {
  return useContext(Session);
}
