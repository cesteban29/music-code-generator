import { NextRequest } from "next/server";
import OSC from "osc-js";
import OpenAI from "openai";
import { initLogger, wrapOpenAI, currentSpan, wrapTraced } from "braintrust";

// ── constants ────────────────────────────────────────────────────────────────
const TOKEN = parseInt(process.env.SONIC_PI_TOKEN || '0', 10);
const SONIC_PI_PORT = parseInt(process.env.SONIC_PI_SERVER_PORT || '0', 10);

// ── Braintrust + OpenAI setup ────────────────────────────────────────────────
const logger = initLogger({
  projectName: "MusicCodeGenerator",
  apiKey: process.env.BRAINTRUST_API_KEY,
});

const openai = wrapOpenAI(
  new OpenAI({
    baseURL: "https://braintrustproxy.com/v1",
    apiKey: process.env.BRAINTRUST_API_KEY,
  }),
);

// ── OSC helper ───────────────────────────────────────────────────────────────
function sendOSCMessage(address: string, payload: string | number) {
  return new Promise<void>((resolve, reject) => {
    const plugin = new OSC.DatagramPlugin({ send: { port: SONIC_PI_PORT } } as any);
    const osc = new OSC({ plugin });

    osc.open();
    osc.on("open", () => {
      osc.send(new OSC.Message(address, TOKEN, payload));
      setTimeout(() => {
        osc.close();
        resolve();
      }, 100);
    });
    osc.on("error", (err) => {
      osc.close();
      reject(err);
    });
  });
}

// ── system prompt ────────────────────────────────────────────────────────────
const SYSTEM = `
    You are a Sonic Pi music generation assistant and a collaborative sound designer. Your role is to transform user prompts into expressive, playable Sonic Pi code that captures the mood, genre, and intent described.
    
    Guidelines for your response:
    
    - Provide Sonic Pi code only, ready for direct copy-pasting into the Sonic Pi editor (no code block formatting).
    - When generating Sonic Pi code, always use symbols (e.g., :7, :maj7, :m7) for chord types
    - Always use Ruby symbols (e.g., :m7, :dom7, :maj7) for chord types — never strings like '7'
    - When using chord, the root note must not include the chord type. Use:
        ✅ chord(:C, :m7)
        ❌ chord(:Cm7, :minor)
    - Valid examples:
        ✅ chord(:C, :major7)  → Cmaj7
        ✅ chord(:D, :m7)      → D minor 7
        ✅ chord(:G, :dom7)    → G7
    Your goal is to enhance the user's musical journey, matching their creative energy and guiding them thoughtfully through their sonic exploration.
    `;

// ── streaming generator wrapped in Braintrust span ───────────────────────────
const generateStreaming = wrapTraced(async (prompt: string) => {
  const encoder = new TextEncoder();
  let full = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 5000,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt },
    ],
  });

  const span = currentSpan();
  span.setAttributes({ name: "sonic-pi-beat" , type: "llm" });
  span.log({ input: { prompt } });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream as AsyncIterable<any>) {
          const token = chunk.choices?.[0]?.delta?.content ?? "";
          if (token) {
            full += token;
            controller.enqueue(encoder.encode(token));
          }
        }
      } catch (err) {
        controller.error(err);
        throw err;
      } finally {
        controller.close();
        span.log({ output: full });
        await sendOSCMessage("/run-code", full);
        span.end();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Span-Id": span.id,
    },
  });
}, logger);

// ── POST route ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { prompt, action, code: editedCode, feedback, spanId } = await req.json();

  // feedback
  if (action === "feedback" && spanId) {
    await logger.logFeedback({ id: spanId, scores: { helpful: feedback === "thumbs_up" ? 1 : 0 } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // stop
  if (action === "stop") {
    try {
      await sendOSCMessage("/stop-all-jobs", 0);
    } catch (error) {
      console.error("Error sending stop command:", error);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // play edited
  if (editedCode && !prompt) {
    await sendOSCMessage("/run-code", editedCode);
    return new Response(JSON.stringify({ code: editedCode }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // generate streaming path
  if (prompt) {
    return generateStreaming(prompt);
  }

  return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400, headers: { "Content-Type": "application/json" } });
}
