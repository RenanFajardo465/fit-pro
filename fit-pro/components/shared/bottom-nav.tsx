"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Apple, TrendingUp, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/hoje", label: "Hoje", icon: Home },
  { href: "/treino", label: "Treino", icon: Dumbbell },
  { href: "/nutricao", label: "Nutrição", icon: Apple },
  { href: "/evolucao", label: "Evolução", icon: TrendingUp },
  { href: "/mais", label: "Mais", icon: Menu },
] as const;

/**
 * Navegação inferior fixa, mobile-first. Ver Fase 0, seção 5 (Mapa de
 * Páginas e Navegação). Respeita a safe-area inferior de iOS/Android.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
