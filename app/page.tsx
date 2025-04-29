"use client";
import React from "react";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [editedCode, setEditedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [spanId, setSpanId]       = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);


  // Update line numbers when code changes
  useEffect(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      const lineCount = editedCode.split("\n").length;
      lineNumbersRef.current.innerHTML = Array.from(
        { length: lineCount },
        (_, i) => i + 1,
      ).join("<br>");
    }
  }, [editedCode]);

  // Generate Sonic-Pi code from the prompt
  const generate = async () => {
    if (!prompt.trim()) return;

    setFeedback(null);
    setCode("");
    setEditedCode("");
    setSpanId(null);
    setLoading(true);

    try {
      await stopMusic(); // ensure a clean slate

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      // Span ID comes back in a response header for later feedback
      const sid = res.headers.get("x-span-id");
      if (sid) setSpanId(sid);

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let completeCode = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        completeCode += chunk;
        setCode(completeCode);
        setEditedCode(completeCode);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stopMusic = async () => {
    try {
      await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "stop" }),
      });
    } catch (error) {
      console.error("Error stopping music:", error);
    }
  };

  const playEditedCode = async () => {
    try {
      await stopMusic();  

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: editedCode }),
      });
      const data = await response.json();
      if (data.error) {
        console.error("Error playing code:", data.error);
      }
    } catch (error) {
      console.error("Error playing code:", error);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(editedCode);
    } catch (error) {
      console.error("Error copying code:", error);
    }
  };

  const submitFeedback = async (isPositive: boolean) => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          action: "feedback",
          spanId,
          feedback: isPositive ? "thumbs_up" : "thumbs_down",
          prompt,
          code
        }),
      });
      if (!response.ok) throw new Error('Failed to submit feedback');
      setFeedback(isPositive ? "Thanks for the positive feedback!" : "Thanks for the feedback, we'll try to improve!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setFeedback("Failed to submit feedback. Please try again.");
    }
  };

  // JSX 
  return (
    <main className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-[1200px] mx-auto px-8 py-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 animate-pulse"></div>
            <h1 className="text-xl tracking-widest">SONIC PI GENERATOR</h1>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-8 py-12">
        {/* Input Section */}
        <section className="mb-12">
          <div className="text-gray-500 text-sm tracking-widest mb-3">01 // PROMPT</div>
          <div className="border border-gray-800 bg-gray-900 p-6">
            <textarea
              ref={textareaRef}
              className="w-full bg-transparent border-none text-white text-sm resize-none focus:outline-none placeholder:text-gray-600"
              placeholder="describe your song..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
            <div className="flex gap-4 mt-4">
              <button
                onClick={generate}
                disabled={loading}
                className="border border-gray-800 px-6 py-2 text-sm hover:bg-orange-500 hover:border-orange-500 transition-colors disabled:opacity-50 tracking-widest"
              >
                {loading ? "GENERATING..." : "GENERATE"}
              </button>
            </div>
          </div>
        </section>

        {loading && !code && (
          <section>
            <div className="text-gray-500 text-sm tracking-widest mb-3">02 // CODE</div>
            <div className="border border-gray-800 bg-gray-900 p-6 italic text-gray-500">generating…</div>
          </section>
        )}

        {code && (
          <section>
            <div className="text-gray-500 text-sm tracking-widest mb-3">02 // CODE</div>
            <div className="border border-gray-800 bg-gray-900 p-6">
              <div className="flex">
                <div
                  ref={lineNumbersRef}
                  className="text-gray-500 text-sm font-mono pr-4 select-none"
                  style={{ lineHeight: "1.5" }}
                />
                <textarea
                  className="w-full bg-transparent border-none text-white text-sm font-mono resize-none focus:outline-none min-h-[300px]"
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                  spellCheck="false"
                  style={{ lineHeight: "1.5" }}
                />
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={playEditedCode}
                  className="border border-gray-800 px-6 py-2 text-sm hover:bg-orange-500 hover:border-orange-500 transition-colors tracking-widest"
                >
                  PLAY
                </button>
                <button
                  onClick={stopMusic}
                  className="border border-gray-800 px-6 py-2 text-sm hover:bg-red-500 hover:border-red-500 transition-colors tracking-widest"
                >
                  STOP
                </button>
                <button
                  onClick={copyCode}
                  className="border border-gray-800 px-6 py-2 text-sm hover:bg-blue-500 hover:border-blue-500 transition-colors tracking-widest"
                >
                  COPY
                </button>
              </div>
              <div className="flex gap-4 mt-4 justify-start">
                <button
                  onClick={() => submitFeedback(true)}
                  className="border border-gray-800 px-4 py-2 text-sm hover:bg-green-500 hover:border-green-500 transition-colors"
                  title="This code is good!"
                >
                  👍
                </button>
                <button
                  onClick={() => submitFeedback(false)}
                  className="border border-gray-800 px-4 py-2 text-sm hover:bg-red-500 hover:border-red-500 transition-colors"
                  title="This code needs improvement"
                >
                  👎
                </button>
              </div>
              {feedback && <div className="mt-2 text-sm text-gray-400">{feedback}</div>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
