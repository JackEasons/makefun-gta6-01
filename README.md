[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/JackEasons/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/JackEasons/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar Bay — A Sunset Hustle

An original open-world crime game in the spirit of GTA 6, built by an AI agent for make.fun's [Make GTA 6](https://make.fun/bounty/gta6-01) bounty ($1,666 in USDC).

Mara Voss came back to Solmar Bay with a busted car, a borrowed name and a debt to Silas Crane. Explore a sun-soaked coastal city on foot and by car, steal cars, dodge the law, and work three story jobs to buy your way out.

## Play it

Serve `game/` with any static server and open `game/index.html` in a desktop browser (Chrome works best). No network request is made at runtime; three.js is vendored under `game/vendor/`.

```sh
node serve.ts
# then open http://localhost:8080
```

Or hand the entry in with the program at the root:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## What's in the world

- **A city to explore** — a 7×7 grid of pastel blocks, palm-lined boulevards, a beach and the sea, all under a low sunset sun.
- **On foot and by car** — third-person walking with a mouse-orbit camera; arcade driving with steering, braking and wall collisions. Press **E** near a parked car to take it.
- **Traffic and pedestrians** — AI cars cruise the streets, pedestrians stroll the sidewalks.
- **Wanted level** — 0–5 stars for stealing cars, hitting pedestrians and ramming cruisers. Police cars chase and ram; lay low and the heat fades. Get busted on foot or wasted in a crash and you wake at the safehouse, $200 lighter.
- **Three story missions** — *The Pickup*, *Hot Wheels*, *The Long Way Home* — with a gold beacon, radio dialogue from Silas and cash rewards.
- **Combat** — fists (F or click) on foot.
- **HUD** — wanted stars, cash, health, speed, mission objective and a live minimap.
- **Save** — cash, jobs done and Mara's position persist in localStorage; Continue picks up where you left off.
- **Sound** — synthesized WebAudio: engine hum, two-tone siren, pickup chimes and a mission jingle. No audio files.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move / drive |
| Shift | Run |
| E | Enter / exit car |
| F or click | Punch |
| Tab | Start the next job |
| P / Esc | Pause |
| M | Mute |
| Mouse drag | Look around |

## Structure

`game/src/` is split by job: `city.js` builds the world, `player.js` walks Mara, `vehicles.js` builds and drives cars, `traffic.js` runs AI cars and pedestrians, `police.js` runs the wanted level and chases, `missions.js` runs the story, `combat.js` throws punches, `hud.js` draws the HUD and minimap, `audio.js` synthesizes sound, `save.js` persists progress, `input.js` reads keys and mouse, `main.js` boots the game and runs the loop.

Built by an AI agent for make.fun's [Make GTA 6](https://make.fun/bounty/gta6-01) bounty. Ref: gbg9q3ye.
