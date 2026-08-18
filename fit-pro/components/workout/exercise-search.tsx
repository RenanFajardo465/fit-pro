"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from "@/lib/workout/vocabulary";

/**
 * Busca por nome (com debounce) + filtro por grupo muscular. Atualiza a URL
 * (?q=&grupo=) para a Server Component da página reconsultar o Supabase —
 * sem TanStack Query aqui: é uma lista simples, não vale a complexidade
 * extra ainda (Fase 0, princípio de MVP).
 */
export function ExerciseSearch({
  defaultQuery,
  defaultMuscleGroup,
}: {
  defaultQuery: string;
  defaultMuscleGroup: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: { q?: string; grupo?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { q: query, grupo: defaultMuscleGroup, ...next };

    if (merged.q) params.set("q", merged.q);
    else params.delete("q");

    if (merged.grupo) params.set("grupo", merged.grupo);
    else params.delete("grupo");

    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query !== defaultQuery) pushParams({ q: query });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome..."
          className="pl-10"
        />
      </div>
      <Select
        className="w-auto min-w-[9.5rem]"
        value={defaultMuscleGroup}
        onChange={(e) => pushParams({ grupo: e.target.value })}
      >
        <option value="">Todos os grupos</option>
        {MUSCLE_GROUPS.map((mg) => (
          <option key={mg} value={mg}>
            {MUSCLE_GROUP_LABELS[mg]}
          </option>
        ))}
      </Select>
    </div>
  );
}
