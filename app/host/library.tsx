"use client";
import { useEffect, useState } from "react";
import { BookOpen, RefreshCw, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/firebase";
import { validateQuestions, type Question } from "@/lib/game";
import { ErrorNotice } from "../components";
type Draft = { title: string; questions: Question[] };
type Room = {
  code: string;
  title: string;
  createdAt: number;
  status: string;
  total: number;
};
type Template = Draft & { id: string };
export default function HostLibrary({
  draft,
  onLoad,
  onOpen,
}: {
  draft: Draft;
  onLoad: (draft: Draft) => void;
  onOpen: (code: string) => void;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const [r, t] = await Promise.all([
        api<{ rooms: Room[] }>("/api/host", { action: "list" }),
        api<{ templates: Template[] }>("/api/host", { action: "templates" }),
      ]);
      setRooms(r.rooms);
      setTemplates(t.templates);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const questions = validateQuestions(draft.questions);
      await api("/api/host", {
        action: "save-template",
        title: draft.title,
        questions,
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reuse(code: string) {
    setBusy(true);
    setError("");
    try {
      const result = await api<Draft>("/api/host", { action: "load", code });
      if (confirm("Replace the current draft with these rounds?"))
        onLoad(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this saved question set? Existing games are kept."))
      return;
    setBusy(true);
    setError("");
    try {
      await api("/api/host", { action: "delete-template", id });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel host-library">
      <div className="library-heading">
        <div>
          <span className="section-label">
            <BookOpen size={16} /> YOUR GAME LIBRARY
          </span>
          <p className="small muted">
            Reuse your rounds and reopen your rooms on any device.
          </p>
        </div>
        <button
          className="icon-button"
          onClick={refresh}
          disabled={busy}
          aria-label="Refresh game library"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <ErrorNotice message={error} />
      <div className="library-heading">
        <h3>Saved question sets</h3>
        <button className="text-link" disabled={busy} onClick={save}>
          <Save size={15} /> Save current draft
        </button>
      </div>
      {!templates.length && (
        <p className="small muted">
          Save this draft to keep its questions with your host account.
        </p>
      )}
      <div className="library-list">
        {templates.map((t) => (
          <div className="library-item" key={t.id}>
            <div>
              <strong>{t.title}</strong>
              <span>{t.questions.length} rounds</span>
            </div>
            <div className="row">
              <button
                className="text-link"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Replace your current draft with this question set?",
                    )
                  )
                    onLoad(t);
                }}
              >
                Use rounds
              </button>
              <button
                className="icon-button"
                disabled={busy}
                onClick={() => remove(t.id)}
                aria-label={`Delete ${t.title}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <h3>Recent rooms</h3>
      {!rooms.length && (
        <p className="small muted">
          Your games will appear here after you open a room.
        </p>
      )}
      <div className="library-list">
        {rooms.map((r) => (
          <div className="library-item" key={r.code}>
            <div>
              <strong>{r.title}</strong>
              <span>
                {r.code} · {r.status} ·{" "}
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="row">
              <button
                className="text-link"
                disabled={busy}
                onClick={() => reuse(r.code)}
              >
                Reuse
              </button>
              <button
                className="button subtle"
                disabled={busy}
                onClick={() => onOpen(r.code)}
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
