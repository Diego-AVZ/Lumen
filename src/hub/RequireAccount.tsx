import { useEffect, useState, type ReactNode } from 'react';
import { HubShell } from '@/hub/HubShell';
import { migrateLocalDrafts } from '@/lib/drafts';
import { AccountBar, useSession } from '@/studio/AccountBar';

export function RequireAccount({ children }: { children: ReactNode }) {
  const { user, ready } = useSession();
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    if (!user) {
      setMigrated(false);
      return;
    }
    let cancel = false;
    void migrateLocalDrafts().finally(() => {
      if (!cancel) setMigrated(true);
    });
    return () => {
      cancel = true;
    };
  }, [user]);

  if (!ready || (user && !migrated)) {
    return (
      <div className="grid h-dvh place-items-center bg-linen">
        <span className="h-2 w-2 rounded-full bg-brass" />
      </div>
    );
  }

  if (!user) {
    return (
      <HubShell>
        <main className="mx-auto max-w-xl px-5 py-16">
          <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Cuenta</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,6vw,4rem)] italic leading-[0.92]">Entra para crear</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-inkwell/60">
            Los proyectos viven en tu cuenta, no en este ordenador. Google o el correo bastan.
          </p>
          <AccountBar onOpen={() => undefined} />
        </main>
      </HubShell>
    );
  }

  return <>{children}</>;
}
