import braintrust from "braintrust";
import { z } from "zod";

const project = braintrust.projects.create({ name: "MusicCodeGenerator" });

//--------------------------------
// ScorersHelpers
//--------------------------------

const extractCode = (val: any): string => {
  if (!val) return "";

  if (typeof val === "string") return val.trim();

  if (typeof val === "object") {
    if (typeof val.code === "string")       return val.code.trim();
    if (typeof val.completion === "string") return val.completion.trim();
    if (typeof val.output === "string")     return val.output.trim();

    // fallback: first string property
    for (const v of Object.values(val)) {
      if (typeof v === "string") return v.trim();
    }
  }
  return "";
};

function handler({ output }: { output: any; expected: any }): number | null {
  if (output == null) return null;

  const code = extractCode(output);
  if (!code) return 0;

  const opens = (code.match(/\bdo\b/g) || []).length;
  const ends  = (code.match(/^ *end\b/gm) || []).length;
  if (opens !== ends) return 0;

  return /\buse_bpm\b/.test(code) ? 1 : 0;
}

//--------------------------------
// Scorers
//--------------------------------

// Sonic Pi Syntax Checker
project.scorers.create({
    name: "Sonic Pi Syntax Checker",
    slug: "sonic-pi-syntax-checker",
    description: "Checks if the output is valid Sonic Pi code with proper do/end blocks and BPM setting",
    parameters: z.object({
        output: z.string(),
        expected: z.string(),
      }) as unknown as z.ZodType<never>,
    handler,
  });

// Musical Judge
project.scorers.create({
    name: "Musical Judge",
    slug: "musical-judge",
    description: "A musical judge",
    messages: [
      {
        role: "system",
        content: `You are "The Session Producer," a Grammy-winning music producer and Sonic Pi expert.  
Your job is to act as an impartial judge and score how faithfully a piece of Sonic Pi code realizes a creative brief.

INPUTS
------
• creative_brief: a one-sentence prompt describing the desired music  
• code: a Sonic Pi script that claims to implement the brief

EVALUATION DIMENSIONS
-------------------------------------
1. mood: does the emotional feel match?  
2. genre: does the stylistic palette fit?  
3. instrumentation: are the chosen synths/samples appropriate?  
4. tempo: is the BPM/rhythmic feel on target?

Creative Brief:
{{input}}

Code:
{{output}}`
      },
    ],
    model: "gpt-4o",
    useCot: true,
    choiceScores: {
      "spot-on": 1,
      "strong-match": 0.8,
      "good-attempt": 0.6,
      "needs-improvement": 0.4,
      "far-off": 0.2,
      "completely-off": 0,
    },
  });
