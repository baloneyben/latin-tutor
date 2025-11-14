// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";

type VocabItem = {
  latin: string;
  german: string;
};

type Chapter = {
  id: string;
  name: string;
  vocab: VocabItem[];
  grammarNotes: string[];
};

type TutorLogEntry = {
  id: string;
  chapterId: string;
  chapterName: string;
  question: string;
  answerPreview: string;
  timestamp: string;
};

type Mode = "flashcards" | "quiz" | "tutor";

export default function HomePage() {
  // --- App-level login state (password gate) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Existing state ---
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [mode, setMode] = useState<Mode>("flashcards");
  const [creating, setCreating] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterFiles, setNewChapterFiles] = useState<File[]>([]);
  const [creatingStatus, setCreatingStatus] = useState<string | null>(null);

  const [studyTimeMinutes, setStudyTimeMinutes] = useState(0);
  const [tutorLogs, setTutorLogs] = useState<TutorLogEntry[]>([]);
  const [parentMode, setParentMode] = useState(false);
  const [parentPinInput, setParentPinInput] = useState("");
  const [parentPinError, setParentPinError] = useState<string | null>(null);
  const [parentPinLoading, setParentPinLoading] = useState(false);

  // On mount: check if user already authenticated in this browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("lt-access");
      if (stored === "granted") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Very naive "study timer" – increments while a chapter is selected
  useEffect(() => {
    if (!selectedChapterId) return;
    const id = setInterval(() => {
      setStudyTimeMinutes((m) => m + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, [selectedChapterId]);

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);

  // Handle app login (password)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || "Falsches Passwort.");
        setLoginLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("lt-access", "granted");
      }
      setIsAuthenticated(true);
      setLoginPassword("");
    } catch (err) {
      console.error(err);
      setLoginError(
        "Es ist ein Fehler aufgetreten. Bitte versuche es später noch einmal."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // If not logged in yet, show password screen instead of the app
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-md border border-slate-200">
          <h1 className="text-xl font-semibold mb-2 text-center">
            Latein-Trainer – Zugang
          </h1>
          <p className="text-xs text-slate-600 mb-4 text-center">
            Bitte gib das Passwort ein, um den Trainer zu verwenden.
          </p>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Passwort
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <p className="text-xs text-red-600">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {loginLoading ? "Prüfe Passwort…" : "Anmelden"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Main app logic ---

  async function handleCreateChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!newChapterName || newChapterFiles.length === 0) {
      setCreatingStatus("Bitte gib einen Kapitelnamen ein und wähle Fotos aus.");
      return;
    }
    setCreating(true);
    setCreatingStatus("Kapitel wird erstellt…");

    try {
      const formData = new FormData();
      formData.append("name", newChapterName);
      newChapterFiles.slice(0, 4).forEach((file) => {
        formData.append("images", file);
      });

      const res = await fetch("/api/chapters", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Fehler beim Erstellen des Kapitels");
      }

      const data = (await res.json()) as { chapter: Chapter };
      setChapters((prev) => [...prev, data.chapter]);
      setNewChapterName("");
      setNewChapterFiles([]);
      (document.getElementById("chapter-images") as HTMLInputElement | null) &&
        ((document.getElementById("chapter-images") as HTMLInputElement).value =
          "");
      setCreatingStatus("Kapitel wurde erstellt!");
    } catch (err: any) {
      console.error(err);
      setCreatingStatus("Es ist ein Fehler aufgetreten. Bitte versuche es später noch einmal.");
    } finally {
      setCreating(false);
      setTimeout(() => setCreatingStatus(null), 3000);
    }
  }

  function handleTutorLog(entry: TutorLogEntry) {
    setTutorLogs((prev) => [entry, ...prev]);
  }

  // Toggle parent mode, verifying PIN via API
  async function handleParentModeToggle() {
    if (parentMode) {
      // turn off
      setParentMode(false);
      setParentPinInput("");
      setParentPinError(null);
      return;
    }

    if (!parentPinInput.trim()) {
      setParentPinError("Bitte gib eine PIN ein.");
      return;
    }

    setParentPinLoading(true);
    setParentPinError(null);

    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: parentPinInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setParentPinError(data.error || "Falsche PIN.");
        return;
      }

      const data = await res.json().catch(() => ({ success: false }));
      if (!data.success) {
        setParentPinError("Falsche PIN.");
        return;
      }

      setParentMode(true);
      setParentPinInput("");
      setParentPinError(null);
    } catch (err) {
      console.error(err);
      setParentPinError(
        "Es ist ein Fehler aufgetreten. Bitte versuche es später noch einmal."
      );
    } finally {
      setParentPinLoading(false);
    }
  }

  // Delete chapter (parent-only action)
  function handleDeleteChapter(chapterId: string) {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const ok = window.confirm(
      `Kapitel "${chapter.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );
    if (!ok) return;

    setChapters((prev) => prev.filter((c) => c.id !== chapterId));

    if (selectedChapterId === chapterId) {
      setSelectedChapterId(null);
      setMode("flashcards");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Willkommen bei deinem Latein-Trainer</h1>
          <p className="text-sm text-slate-600">
            Übe Vokabeln und Grammatik aus deinen eigenen Kapiteln.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          {!parentMode && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={parentPinInput}
                  onChange={(e) => setParentPinInput(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="Eltern-PIN"
                />
                <button
                  onClick={handleParentModeToggle}
                  disabled={parentPinLoading}
                  className="rounded-md bg-slate-800 px-3 py-1 text-sm font-medium text-white"
                >
                  {parentPinLoading ? "Prüfe…" : "Elternansicht"}
                </button>
              </div>
              {parentPinError && (
                <p className="text-xs text-red-600">{parentPinError}</p>
              )}
            </>
          )}
          {parentMode && (
            <button
              onClick={handleParentModeToggle}
              className="rounded-md bg-slate-200 px-3 py-1 text-sm font-medium text-slate-800"
            >
              Elternansicht verlassen
            </button>
          )}
        </div>
      </header>

      {parentMode ? (
        <ParentView
          studyTimeMinutes={studyTimeMinutes}
          chapters={chapters}
          tutorLogs={tutorLogs}
          onDeleteChapter={handleDeleteChapter}
        />
      ) : (
        <>
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Neues Kapitel erstellen</h2>
            <p className="mb-3 text-sm text-slate-600">
              Lade 1–4 Fotos aus deinem Lateinbuch hoch (Vokabeln und Grammatik).
            </p>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={handleCreateChapter}
            >
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700">
                  Kapiteltitel
                </label>
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="z. B. Kapitel 5"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700">
                  Fotos (1–4)
                </label>
                <input
                  id="chapter-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    setNewChapterFiles((prev) => {
                      const current = [...prev];
                      for (const file of Array.from(files)) {
                        if (current.length < 4) {
                          current.push(file);
                        }
                      }
                      return current;
                    });
                  }}
                  className="mt-1 w-full text-xs"
                />
                {newChapterFiles.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {newChapterFiles.length} Bild(er) ausgewählt
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={creating}
                className="mt-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white sm:mt-0"
              >
                {creating ? "Erstelle…" : "Kapitel speichern"}
              </button>
            </form>
            {creatingStatus && (
              <p className="mt-2 text-xs text-slate-700">{creatingStatus}</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Deine Kapitel</h2>
            {chapters.length === 0 && (
              <p className="text-sm text-slate-600">
                Du hast noch keine Kapitel angelegt. Erstelle oben dein erstes Kapitel.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => {
                    setSelectedChapterId(chapter.id);
                    setMode("flashcards");
                  }}
                  className={`rounded-xl border px-4 py-3 text-left shadow-sm transition ${
                    selectedChapterId === chapter.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{chapter.name}</span>
                    <span className="text-xs text-slate-500">
                      {chapter.vocab.length} Vokabeln
                    </span>
                  </div>
                  {chapter.grammarNotes.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Enthält Grammatiknotizen
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>

          {selectedChapter && (
            <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedChapter.name}
                  </h2>
                  <p className="text-xs text-slate-600">
                    {selectedChapter.vocab.length} Vokabeln ·{" "}
                    {selectedChapter.grammarNotes.length} Grammatikpunkte
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {(["flashcards", "quiz", "tutor"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-1 text-xs font-medium rounded-md ${
                        mode === m
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600"
                      }`}
                    >
                      {m === "flashcards"
                        ? "Vokabelkarten"
                        : m === "quiz"
                        ? "Quiz"
                        : "Frage den Tutor"}
                    </button>
                  ))}
                </div>
              </header>

              {mode === "flashcards" && (
                <Flashcards chapter={selectedChapter} />
              )}
              {mode === "quiz" && <Quiz chapter={selectedChapter} />}
              {mode === "tutor" && (
                <TutorChat chapter={selectedChapter} onLog={handleTutorLog} />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Flashcards({ chapter }: { chapter: Chapter }) {
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const vocab = chapter.vocab;
  if (vocab.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Für dieses Kapitel wurden noch keine Vokabeln erkannt.
      </p>
    );
  }

  const current = vocab[index];

  function nextCard() {
    setShowBack(false);
    setIndex((i) => (i + 1) % vocab.length);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="mt-2 w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Karte {index + 1} von {vocab.length}
        </p>
        <p className="mt-4 text-2xl font-semibold">
          {showBack ? current.german : current.latin}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setShowBack((s) => !s)}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white"
        >
          Umdrehen
        </button>
        <button
          onClick={nextCard}
          className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

function Quiz({ chapter }: { chapter: Chapter }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const vocab = chapter.vocab;

  useEffect(() => {
    if (vocab.length > 0) {
      createQuestion(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id]);

  function createQuestion(index: number) {
    if (vocab.length === 0) return;
    const correct = vocab[index];
    const others = vocab.filter((_, i) => i !== index);
    const distractors = shuffleArray(others)
      .slice(0, 3)
      .map((v) => v.german);
    const all = shuffleArray([correct.german, ...distractors]);
    setOptions(all);
    setSelected(null);
    setFeedback(null);
  }

  function handleSelect(option: string) {
    if (!vocab[currentIndex]) return;
    const correct = vocab[currentIndex].german;
    setSelected(option);
    if (option === correct) {
      setFeedback("Richtig! Super gemacht.");
    } else {
      setFeedback(`Fast – richtig wäre: ${correct}.`);
    }
  }

  function next() {
    if (vocab.length === 0) return;
    const nextIndex = (currentIndex + 1) % vocab.length;
    setCurrentIndex(nextIndex);
    createQuestion(nextIndex);
  }

  if (vocab.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Für dieses Kapitel wurden noch keine Vokabeln erkannt.
      </p>
    );
  }

  const current = vocab[currentIndex];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        Was bedeutet <span className="font-semibold italic">{current.latin}</span>?
      </p>
      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            className={`rounded-md border px-3 py-2 text-left text-sm ${
              selected === opt
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 bg-white hover:border-emerald-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {feedback && (
        <p className="text-sm text-slate-800">
          {feedback}
        </p>
      )}
      <button
        onClick={next}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white"
      >
        Nächste Frage
      </button>
    </div>
  );
}

function TutorChat({
  chapter,
  onLog,
}: {
  chapter: Chapter;
  onLog: (entry: TutorLogEntry) => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  async function handleAsk(e: React.FormEvent) {
  e.preventDefault();
  const question = input.trim();
  if (!question) return;
  setInput("");
  setMessages((prev) => [...prev, { role: "user", text: question }]);
  setLoading(true);

  try {
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapterId: chapter.id,
        chapterName: chapter.name,
        question,
      }),
    });

    if (!res.ok) {
      // ⬇️ NEW: show real error message coming from backend
      let msg =
        "Es ist ein Fehler mit dem Tutor aufgetreten. Bitte versuche es später noch einmal.";
      try {
        const data = await res.json();
        if (data?.error) {
          msg = data.error;
        }
      } catch {
        // ignore JSON parse errors
      }
      setMessages((prev) => [...prev, { role: "assistant", text: msg }]);
      return;
    }

    const data = (await res.json()) as { answer: string };
    const answer = data.answer;
    setMessages((prev) => [...prev, { role: "assistant", text: answer }]);

    onLog({
      id: `${Date.now()}`,
      chapterId: chapter.id,
      chapterName: chapter.name,
      question,
      answerPreview: answer.slice(0, 120),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text:
          "Es ist ein technischer Fehler aufgetreten. Bitte versuche es später noch einmal.",
      },
    ]);
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
        {messages.length === 0 && (
          <p className="text-slate-600">
            Stelle eine Frage zu den Vokabeln oder zur Grammatik dieses Kapitels …
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-900 border border-slate-200"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Stelle deine Frage …"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          {loading ? "Antwort kommt…" : "Fragen"}
        </button>
      </form>
    </div>
  );
}

function ParentView({
  studyTimeMinutes,
  chapters,
  tutorLogs,
  onDeleteChapter,
}: {
  studyTimeMinutes: number;
  chapters: Chapter[];
  tutorLogs: TutorLogEntry[];
  onDeleteChapter: (id: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Elternübersicht</h2>
      <p className="text-sm text-slate-700">
        Geschätzte Lernzeit:{" "}
        <span className="font-semibold">{studyTimeMinutes} Minuten</span>
      </p>
      <div>
        <h3 className="mb-1 text-sm font-semibold">Kapitel</h3>
        <ul className="text-sm text-slate-700">
          {chapters.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <span>
                {c.name}: {c.vocab.length} Vokabeln, {c.grammarNotes.length} Grammatikpunkte
              </span>
              <button
                onClick={() => onDeleteChapter(c.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Kapitel löschen
              </button>
            </li>
          ))}
          {chapters.length === 0 && (
            <li className="text-slate-500">
              Es wurden noch keine Kapitel erstellt.
            </li>
          )}
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold">Fragen an den Tutor</h3>
        <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
          {tutorLogs.length === 0 && (
            <p className="text-slate-500">
              Bisher wurden keine Fragen an den Tutor gestellt.
            </p>
          )}
          {tutorLogs.map((log) => (
            <div key={log.id} className="mb-2 border-b border-slate-200 pb-1">
              <p className="font-semibold">{log.chapterName}</p>
              <p>
                <span className="font-medium">Frage:</span> {log.question}
              </p>
              <p>
                <span className="font-medium">Antwort (Auszug):</span>{" "}
                {log.answerPreview}
                {log.answerPreview.length >= 120 ? "…" : ""}
              </p>
              <p className="text-[10px] text-slate-500">
                {new Date(log.timestamp).toLocaleString("de-DE")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
