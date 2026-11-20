"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";

export interface CalendarEventItem {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string;
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  color: string;
  location: string | null;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
}

export interface CalendarDueTask {
  id: string;
  code: string;
  title: string;
  status: string;
  dueDate: string;
  project: { id: string; name: string; color: string };
}

type CalendarView = "month" | "week" | "day" | "agenda";

const TIMEZONES = [
  "Europe/Paris",
  "UTC",
  "America/Montreal",
  "America/New_York",
  "Africa/Casablanca",
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function expandRecurringEvents(
  events: CalendarEventItem[],
  rangeStart: Date,
  rangeEnd: Date
): Array<CalendarEventItem & { occurrenceDate: Date }> {
  const expanded: Array<CalendarEventItem & { occurrenceDate: Date }> = [];
  for (const ev of events) {
    const start = new Date(ev.startAt);
    if (ev.recurrence === "NONE") {
      if (start >= rangeStart && start <= rangeEnd) {
        expanded.push({ ...ev, occurrenceDate: start });
      }
      continue;
    }

    const cursor = new Date(start);
    let safety = 0;
    while (cursor <= rangeEnd && safety < 90) {
      safety++;
      if (cursor >= rangeStart) {
        expanded.push({ ...ev, occurrenceDate: new Date(cursor) });
      }
      if (ev.recurrence === "DAILY") cursor.setDate(cursor.getDate() + 1);
      else if (ev.recurrence === "WEEKLY") cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return expanded;
}

export function CalendarClient({
  initialEvents,
  initialDueTasks,
  projects,
  defaultTimezone,
}: {
  initialEvents: CalendarEventItem[];
  initialDueTasks: CalendarDueTask[];
  projects: Array<{ id: string; name: string; color: string }>;
  defaultTimezone: string;
}) {
  const [events, setEvents] = React.useState(initialEvents);
  const [dueTasks] = React.useState(initialDueTasks);
  const [view, setView] = React.useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = React.useState(() => new Date());
  const [projectFilter, setProjectFilter] = React.useState("ALL");
  const [timezone, setTimezone] = React.useState(defaultTimezone || "Europe/Paris");
  const [dragEventId, setDragEventId] = React.useState<string | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEventItem | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startStr, setStartStr] = React.useState("");
  const [endStr, setEndStr] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [recurrence, setRecurrence] = React.useState<"NONE" | "DAILY" | "WEEKLY" | "MONTHLY">(
    "NONE"
  );
  const [color, setColor] = React.useState("#7C3AED");
  const [location, setLocation] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reloadEvents = async () => {
    const res = await fetch("/api/events");
    if (res.ok) {
      const json = await res.json();
      setEvents(json.events);
    }
  };

  const openCreateModal = (day?: Date) => {
    const base = day ?? anchorDate;
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    setEditingEvent(null);
    setTitle("");
    setDescription("");
    setStartStr(`${yyyy}-${mm}-${dd}T09:00`);
    setEndStr(`${yyyy}-${mm}-${dd}T10:00`);
    setProjectId("");
    setRecurrence("NONE");
    setColor("#7C3AED");
    setLocation("");
    setModalOpen(true);
  };

  const openEditModal = (ev: CalendarEventItem) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setDescription(ev.description ?? "");
    setStartStr(ev.startAt.slice(0, 16));
    setEndStr(ev.endAt.slice(0, 16));
    setProjectId(ev.projectId ?? "");
    setRecurrence(ev.recurrence);
    setColor(ev.color);
    setLocation(ev.location ?? "");
    setModalOpen(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        projectId: projectId || null,
        startAt: new Date(startStr).toISOString(),
        endAt: new Date(endStr).toISOString(),
        timezone,
        recurrence,
        color,
        location: location.trim() || null,
      };
      const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
      const method = editingEvent ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur.");
      toast.success(editingEvent ? "Événement modifié." : "Événement ajouté.");
      setModalOpen(false);
      await reloadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!editingEvent) return;
    const res = await fetch(`/api/events/${editingEvent.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Événement supprimé.");
      setModalOpen(false);
      await reloadEvents();
    }
  };

  const moveEventToDay = async (eventId: string, targetDay: Date) => {
    const ev = events.find((item) => item.id === eventId);
    if (!ev) return;
    const oldStart = new Date(ev.startAt);
    const oldEnd = new Date(ev.endAt);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const newStart = new Date(targetDay);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      }),
    });
    if (res.ok) {
      toast.success("Événement déplacé.");
      await reloadEvents();
    }
  };

  const filteredEvents = events.filter(
    (ev) => projectFilter === "ALL" || ev.projectId === projectFilter
  );
  const filteredTasks = dueTasks.filter(
    (t) => projectFilter === "ALL" || t.project.id === projectFilter
  );

  const shiftDate = (delta: number) => {
    const next = new Date(anchorDate);
    if (view === "month") next.setMonth(next.getMonth() + delta);
    else if (view === "week") next.setDate(next.getDate() + delta * 7);
    else next.setDate(next.getDate() + delta);
    setAnchorDate(next);
  };

  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startGridOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startGridOffset);
  const monthCells = Array.from({ length: 42 }, (_, idx) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + idx);
    return d;
  });

  // Week cells
  const weekOffset = (anchorDate.getDay() + 6) % 7;
  const weekStart = new Date(anchorDate);
  weekStart.setDate(anchorDate.getDate() - weekOffset);
  const weekCells = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    return d;
  });

  const visibleStart =
    view === "month"
      ? monthCells[0]
      : view === "week"
        ? weekCells[0]
        : new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
  const visibleEnd =
    view === "month"
      ? monthCells[41]
      : view === "week"
        ? new Date(weekCells[6].getTime() + 86_399_000)
        : new Date(anchorDate.getTime() + 30 * 86_400_000);

  const expandedEvents = expandRecurringEvents(filteredEvents, visibleStart, visibleEnd);

  const headerTitle = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    ...(view === "day" ? { day: "numeric" } : {}),
    timeZone: timezone,
  }).format(anchorDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Calendrier</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planifiez vos événements et visualisez les échéances de vos tâches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-40"
            aria-label="Filtrer par projet"
          >
            <option value="ALL">Tous projets</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <Select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-44"
            aria-label="Fuseau horaire"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>

          <Button onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4" /> Nouvel événement
          </Button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => shiftDate(-1)}
            aria-label="Période précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAnchorDate(new Date())}>
            Aujourd&apos;hui
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => shiftDate(1)}
            aria-label="Période suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold capitalize">{headerTitle}</h2>
        </div>

        <div className="inline-flex rounded-xl border border-border-subtle bg-secondary-surface p-1">
          {(
            [
              { id: "month", label: "Mois" },
              { id: "week", label: "Semaine" },
              { id: "day", label: "Jour" },
              { id: "agenda", label: "Agenda" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                view === v.id ? "bg-[#7C3AED] text-white" : "text-muted-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <Card className="p-3 sm:p-4 overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-7 gap-2 pb-2 text-center text-xs font-semibold text-muted-foreground">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthCells.map((cell) => {
                const isCurrentMonth = cell.getMonth() === month;
                const isToday = isSameDay(cell, new Date());
                const dayEvents = expandedEvents.filter((e) => isSameDay(e.occurrenceDate, cell));
                const dayTasks = filteredTasks.filter((t) => isSameDay(new Date(t.dueDate), cell));

                return (
                  <div
                    key={cell.toISOString()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragEventId) {
                        moveEventToDay(dragEventId, cell);
                        setDragEventId(null);
                      }
                    }}
                    className={`min-h-[104px] rounded-xl border p-2 transition ${
                      isToday
                        ? "border-[#22D3EE] bg-[#22D3EE]/5"
                        : "border-border-subtle bg-secondary-surface/40"
                    } ${!isCurrentMonth ? "opacity-45" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{cell.getDate()}</span>
                      <button
                        type="button"
                        onClick={() => openCreateModal(cell)}
                        aria-label={`Ajouter un événement le ${cell.toLocaleDateString("fr-FR")}`}
                        className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((ev, idx) => (
                        <button
                          key={`${ev.id}-${idx}`}
                          type="button"
                          draggable
                          onDragStart={() => setDragEventId(ev.id)}
                          onClick={() => openEditModal(ev)}
                          className="w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-white cursor-pointer"
                          style={{ backgroundColor: ev.color }}
                        >
                          {ev.title}
                        </button>
                      ))}
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="truncate rounded-md border border-border-strong bg-card px-1.5 py-0.5 text-[10px] text-foreground"
                          title={`Échéance : ${t.title}`}
                        >
                          ⏰ {t.code} {t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      {view === "week" ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekCells.map((cell) => {
            const dayEvents = expandedEvents.filter((e) => isSameDay(e.occurrenceDate, cell));
            const dayTasks = filteredTasks.filter((t) => isSameDay(new Date(t.dueDate), cell));
            return (
              <Card key={cell.toISOString()} className="p-3 min-h-[260px] space-y-2">
                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                  <span className="text-xs font-semibold capitalize">
                    {new Intl.DateTimeFormat("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                    }).format(cell)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openCreateModal(cell)}
                    className="text-xs text-[#22D3EE] cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {dayEvents.map((ev, i) => (
                  <button
                    key={`${ev.id}-${i}`}
                    type="button"
                    onClick={() => openEditModal(ev)}
                    className="w-full rounded-lg p-2 text-left text-xs text-white cursor-pointer"
                    style={{ backgroundColor: ev.color }}
                  >
                    <p className="font-semibold truncate">{ev.title}</p>
                    <p className="opacity-85 text-[10px]">
                      {new Intl.DateTimeFormat("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: timezone,
                      }).format(new Date(ev.startAt))}
                    </p>
                  </button>
                ))}
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-border-subtle bg-secondary-surface p-2 text-xs"
                  >
                    <span className="font-mono text-[10px] text-[#22D3EE]">{t.code}</span> {t.title}
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      ) : null}

      {view === "day" || view === "agenda" ? (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-[#22D3EE]" />
            {view === "day" ? "Programme du jour" : "Agenda des prochains événements et échéances"}
          </h3>
          {(() => {
            const listEvents =
              view === "day"
                ? expandedEvents.filter((e) => isSameDay(e.occurrenceDate, anchorDate))
                : expandedEvents.sort(
                    (a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
                  );
            const listTasks =
              view === "day"
                ? filteredTasks.filter((t) => isSameDay(new Date(t.dueDate), anchorDate))
                : filteredTasks;

            if (listEvents.length === 0 && listTasks.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  Aucun événement ni échéance sur cette vue.
                </p>
              );
            }

            return (
              <div className="space-y-2.5">
                {listEvents.map((ev, i) => (
                  <button
                    key={`${ev.id}-${i}`}
                    type="button"
                    onClick={() => openEditModal(ev)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-border-subtle bg-secondary-surface p-4 text-left hover:border-[#7C3AED]/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-9 w-1.5 rounded-full"
                        style={{ backgroundColor: ev.color }}
                      />
                      <div>
                        <p className="font-semibold text-sm">{ev.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: timezone,
                          }).format(ev.occurrenceDate)}
                          {ev.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {ev.location}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    {ev.recurrence !== "NONE" ? (
                      <Badge variant="cyan">{ev.recurrence}</Badge>
                    ) : null}
                  </button>
                ))}
                {listTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-border-subtle bg-card p-3.5 text-sm"
                  >
                    <span>
                      <Badge variant="warning" className="mr-2">
                        Échéance
                      </Badge>
                      <span className="font-mono text-xs text-[#22D3EE] mr-1.5">{t.code}</span>
                      {t.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeZone: timezone,
                      }).format(new Date(t.dueDate))}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? "Modifier l'événement" : "Nouvel événement"}
      >
        <form onSubmit={saveEvent} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="ev-title" className="text-xs text-muted-foreground">
              Titre
            </label>
            <Input
              id="ev-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Revue hebdomadaire"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ev-desc" className="text-xs text-muted-foreground">
              Description
            </label>
            <Textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="ev-start" className="text-xs text-muted-foreground">
                Début
              </label>
              <Input
                id="ev-start"
                type="datetime-local"
                required
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ev-end" className="text-xs text-muted-foreground">
                Fin
              </label>
              <Input
                id="ev-end"
                type="datetime-local"
                required
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ev-proj" className="text-xs text-muted-foreground">
                Projet associé
              </label>
              <Select id="ev-proj" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Aucun projet</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="ev-rec" className="text-xs text-muted-foreground">
                Récurrence
              </label>
              <Select
                id="ev-rec"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
              >
                <option value="NONE">Aucune</option>
                <option value="DAILY">Quotidienne</option>
                <option value="WEEKLY">Hebdomadaire</option>
                <option value="MONTHLY">Mensuelle</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="ev-loc" className="text-xs text-muted-foreground">
                Lieu / Lien
              </label>
              <Input
                id="ev-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Visio / Salle B"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ev-color" className="text-xs text-muted-foreground">
                Couleur
              </label>
              <Input
                id="ev-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 p-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {editingEvent ? (
              <Button type="button" variant="danger" size="sm" onClick={deleteEvent}>
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" isLoading={saving}>
                Enregistrer
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
