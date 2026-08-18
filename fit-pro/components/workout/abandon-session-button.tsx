"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { abandonWorkoutSession } from "@/lib/actions/session";

export function AbandonSessionButton({
  sessionId,
  className,
}: {
  sessionId: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await abandonWorkoutSession(sessionId);
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className={className ?? "w-full"}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Abandonando..." : "Abandonar"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
