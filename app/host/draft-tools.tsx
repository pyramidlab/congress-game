"use client";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { validateQuestions, type Question } from "@/lib/game";
import { ErrorNotice } from "../components";
export default function DraftTools({
  title,
  questions,
  onLoad,
}: {
  title: string;
  questions: Question[];
  onLoad: (title: string, questions: Question[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  function download() {
    try {
      const valid = validateQuestions(questions);
      const blob = new Blob(
        [JSON.stringify({ version: 1, title, questions: valid }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "congress-questions.json";
      link.click();
      URL.revokeObjectURL(url);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000)
        throw new Error("Choose a JSON file smaller than 100 KB.");
      const parsed = JSON.parse(await file.text());
      const questions = validateQuestions(
        Array.isArray(parsed) ? parsed : parsed.questions,
      );
      const name =
        typeof parsed.title === "string"
          ? parsed.title.trim().slice(0, 80)
          : title;
      if (
        confirm(
          `Import ${questions.length} rounds? This replaces your current draft.`,
        )
      )
        onLoad(name || "The Congress Challenge", questions);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="draft-tools">
      <div className="row">
        <button className="text-link" onClick={() => input.current?.click()}>
          <Upload size={15} /> Import questions
        </button>
        <button className="text-link" onClick={download}>
          <Download size={15} /> Download question set
        </button>
        <input
          className="sr-only"
          type="file"
          ref={input}
          accept="application/json,.json"
          aria-label="Import question JSON"
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      <ErrorNotice message={error} />
    </div>
  );
}
