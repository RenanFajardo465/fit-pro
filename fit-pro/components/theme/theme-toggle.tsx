"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";

const THEME_KEY = "fit-pro-theme";

type Theme = "dark" | "light";

/**
 * Lê/escreve o tema direto no DOM (classe `.dark` no <html>, já aplicada
 * sem flash pelo `ThemeScript`) em vez de guardar em `useState` + `useEffect`
 * — evita o anti-padrão de setState síncrono dentro de efeito e mantém o
 * DOM como única fonte de verdade.
 */
const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Escuro é o padrão/definido do Fit-Pro — é o que o servidor sempre assume antes de hidratar. */
function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage indisponível (ex.: navegação privada) — tema some ao
    // recarregar, mas não quebra a troca na sessão atual.
  }
  listeners.forEach((notify) => notify());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="font-medium">Aparência</span>
        <span className="text-xs text-muted-foreground">Escuro é o padrão do app</span>
      </div>
      <div className="flex gap-1 rounded-xl border border-border p-1">
        <button
          type="button"
          onClick={() => applyTheme("dark")}
          aria-pressed={theme === "dark"}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          Escuro
        </button>
        <button
          type="button"
          onClick={() => applyTheme("light")}
          aria-pressed={theme === "light"}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
          Claro
        </button>
      </div>
    </Card>
  );
}
