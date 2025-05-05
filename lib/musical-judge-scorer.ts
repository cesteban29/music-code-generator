import braintrust from "braintrust";

const project = braintrust.projects.create({ name: "MusicCodeGenerator" });


project.scorers.create({
    name: "Musical Judge",
    slug: "musical-judge-2ds",
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
  4. tempo: is the BPM/rhythmic feel on target?`
      },
      {
        role: "user",
        content: `
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
