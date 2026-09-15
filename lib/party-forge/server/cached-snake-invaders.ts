// Retained output from the real model call verified in the local mesh probe.
export const cachedSnakeInvaders = {
  "buildId": "px-0763b3283ae525dcf3bb391d065a132f5c8b867b8808da5229ce78a9fc04fcf3",
  "contentHash": "sha256:0763b3283ae525dcf3bb391d065a132f5c8b867b8808da5229ce78a9fc04fcf3",
  "origin": {
    "kind": "generated",
    "jobId": "resp_0f3e85ea9a091678016aa655c219dc87d0ad0522dfff422a99",
    "service": "OpenAI Responses",
    "model": "gpt-6-astra",
    "modelVersion": "gpt-6-astra"
  },
  "runtime": {
    "key": "party-forge/pixel-arcade-v1/engine.js",
    "version": "pixel-arcade-v1",
    "hash": "sha256:7a9647bd86ce0eca906b46884dddd57d525bd273cf0669aa9d704dfb88d52a6e",
    "mediaType": "text/javascript"
  },
  "pixelRules": {
    "title": "Snake Invaders: Eat 10, Blast 25",
    "summary": "Steer a growing snake, collect food for 10 points, and auto-fire in your travel direction at descending invaders for 25 points each.",
    "mode": "snake",
    "wrapWalls": false,
    "shooting": true,
    "ricochet": false,
    "invaders": true,
    "growTail": true,
    "foodCount": 3,
    "moveTicks": 10,
    "fireTicks": 30,
    "alienStepTicks": 90,
    "foodPoints": 10,
    "alienPoints": 25,
    "survivalPoints": 0,
    "hitPenalty": 0,
    "palette": "green",
    "interpretations": [
      {
        "instructionIndex": 0,
        "interpretation": "Use arrow-steered snake movement; collecting food grows the tail and earns 10 points.",
        "ruleFields": [
          "mode",
          "growTail",
          "foodCount",
          "foodPoints"
        ]
      },
      {
        "instructionIndex": 1,
        "interpretation": "Add descending invaders worth 25 points each and auto-fire along the snake's current travel direction.",
        "ruleFields": [
          "invaders",
          "shooting",
          "fireTicks",
          "alienStepTicks",
          "alienPoints"
        ]
      }
    ]
  }
} as const;
