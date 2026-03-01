# Les Mystères de Paris — Frontend

The game client for **Les Mystères de Paris: AI Chronicles** — a mystery-RPG set in Belle Époque Paris (1889–1911), powered by fine-tuned Mistral AI NPCs.

> Hackathon project (24h) — Built with React, Vite, Phaser 3, and Mistral AI.

## Related Repositories

| Project | Repo |
|---------|------|
| Backend (FastAPI + Mistral) | [github.com/divait/mh-back](https://github.com/divait/mh-back) |
| Fine-tuning (W&B + Mistral) | [github.com/divait/mh-fine-tuning](https://github.com/divait/mh-fine-tuning) |

## Overview

- **React 18 + TypeScript** — UI shell, dialogue panels, HUD, title/intro screens
- **Phaser 3** — top-down 2D scene of Paris with clickable NPC zones
- **Web Speech API** — voice input via microphone toggle; auto-sends player messages
- **Text-to-Speech** — NPC dialogue spoken aloud with period-appropriate tone
- **Background music** — ambient Belle Époque audio during gameplay

## Game Flow

1. **Title Screen** — choose a Mistral model variant for quest generation
2. **Intro Dialogue** — cinematic setup with TTS narration
3. **Paris Scene (Phaser)** — explore the map, click NPCs to interrogate them
4. **Dialogue Panel** — chat with AI-powered agents; voice or text input
5. **HUD** — tracks collected clues and current quest objective
6. **Game Over / Accusation** — make your final accusation to solve the case

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| 2D engine | Phaser 3.87 |
| Package manager | pnpm |
| Voice I/O | Web Speech API (STT + TTS) |
| AI backend | FastAPI (see [mh-back](https://github.com/divait/mh-back)) |

## Project Structure

```
src/
  App.tsx               # Root component, routing between screens
  main.tsx              # Entry point
  components/
    TitleScreen.tsx     # Model selection + game start
    IntroDialogue.tsx   # Cinematic intro with TTS
    DialoguePanel.tsx   # NPC chat interface (voice/text)
    HUD.tsx             # Clue tracker + objective display
    GameOverScreen.tsx  # Final accusation screen
  game/
    ParisScene.ts       # Phaser scene — map, zones, NPC click handlers
    zones.ts            # NPC zone definitions and positions
    walls.ts            # Collision boundaries
    gameState.ts        # Shared game state (clues, quest, active NPC)
    types.ts            # TypeScript interfaces
    constants.ts        # Game constants
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm i -g pnpm`)
- Backend running at `http://localhost:8000` — see [mh-back](https://github.com/divait/mh-back)

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
pnpm build
pnpm preview
```

## Environment

The frontend talks directly to the backend API. The base URL is hardcoded to `http://localhost:8000` for local development. Update `src/game/constants.ts` if you deploy the backend to a different host.

## NPC Categories

NPCs are colour-coded by the backend (`GET /npcs`):

| Border colour | Category | Description |
|---------------|----------|-------------|
| Blue | Original 3 | Re-skinned from the 1789 era |
| Gold | Belle Époque 3 | Original 1889–1911 characters |
| Grey | Persons | Non-agentic background characters (no AI) |
