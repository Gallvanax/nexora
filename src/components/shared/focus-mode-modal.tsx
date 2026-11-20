"use client";

import * as React from "react";
import { Pause, Play, RotateCcw, Save, Timer } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function FocusTimerBody({
  task,
  onClose,
  onSaved,
}: {
  task: { id: string; code: string; title: string; loggedMinutes: number };
  onClose: () => void;
  onSaved?: (newLoggedMinutes: number) => void;
}) {
  const [durationMinutes, setDurationMinutes] = React.useState(25);
  const [secondsLeft, setSecondsLeft] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          toast.success("Session Focus terminée !");
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const saveSession = async () => {
    const addedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    setSaving(true);
    try {
      const nextTotal = (task.loggedMinutes ?? 0) + addedMinutes;
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loggedMinutes: nextTotal }),
      });
      if (!res.ok) throw new Error();
      toast.success(`+${addedMinutes} min enregistrées sur ${task.code}`);
      onSaved?.(nextTotal);
      onClose();
    } catch {
      toast.error("Impossible d'enregistrer le temps focus.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-2 text-center">
      <div className="rounded-xl border border-border-subtle bg-card p-4 text-left">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono text-[#22D3EE]">{task.code}</span>
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" />
            Cumulé : {task.loggedMinutes} min
          </span>
        </div>
        <p className="mt-1.5 font-semibold text-foreground">{task.title}</p>
      </div>

      <div className="flex justify-center gap-2">
        {[15, 25, 45].map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={running}
            onClick={() => {
              setDurationMinutes(preset);
              setSecondsLeft(preset * 60);
              setElapsedSeconds(0);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              durationMinutes === preset
                ? "bg-[#7C3AED] text-white"
                : "bg-elevated text-muted-foreground hover:text-foreground"
            }`}
          >
            {preset} min
          </button>
        ))}
      </div>

      <div
        className="font-mono text-5xl sm:text-6xl font-bold tracking-tight text-foreground tabular-nums"
        aria-live="polite"
      >
        {formatted}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="primary" size="lg" onClick={() => setRunning((r) => !r)}>
          {running ? (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Démarrer
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => {
            setRunning(false);
            setSecondsLeft(durationMinutes * 60);
            setElapsedSeconds(0);
          }}
          aria-label="Réinitialiser le chronomètre"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Temps mesuré : {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={saving}
          disabled={elapsedSeconds < 5}
          onClick={saveSession}
        >
          <Save className="h-3.5 w-3.5" /> Enregistrer ce bloc
        </Button>
      </div>
    </div>
  );
}

export function FocusModeModal({
  task,
  open,
  onClose,
  onSaved,
}: {
  task: { id: string; code: string; title: string; loggedMinutes: number } | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (newLoggedMinutes: number) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mode Concentration"
      description="Éliminez les distractions et enregistrez votre temps de travail sur la tâche."
    >
      {open && task ? (
        <FocusTimerBody key={task.id} task={task} onClose={onClose} onSaved={onSaved} />
      ) : null}
    </Modal>
  );
}
