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

- **A city to explore** — a 7×7 grid of pastel blocks, palm-lined boulevards, a beach with umbrellas and the sea, all under a low sunset sun.
- **On foot and by car** — third-person walking with a mouse-orbit camera; arcade driving with steering, braking and wall collisions. Press **E** near a parked car to take it. Every car has an original model name and a condition that falls as it is crashed.
- **Traffic and pedestrians** — AI cars cruise the streets, pedestrians stroll the sidewalks, and a pink scooter putters along the boulevard.
- **Wanted level** — 0–5 stars for stealing cars, hitting pedestrians and ramming cruisers. Police cars chase and ram; at four stars a helicopter joins with a searchlight. Lay low and the heat fades — faster once you break line of sight, so a clean getaway really ends the chase. Get busted on foot or wasted in a crash and you wake at the safehouse, $200 lighter.
- **Three story missions** — *The Pickup*, *Hot Wheels*, *The Long Way Home* — with stages, a gold beacon, radio dialogue from Silas in a dialogue box, and cash rewards. The last job runs on a three-minute clock.
- **Combat** — fists (F or click) plus a four-slot arsenal (pistol, shotgun, Viper SMG) unlocked as the story advances, with real ammo. Guns restock when a job pays out.
- **HUD** — wanted stars and an air-unit flag, cash, health, armour and respect bars, a mission panel (job, stage, next step, clock), a waypoint compass that always points at the next objective with the next step and the distance in metres, a police dispatch panel naming every unit with its live distance, weapon slots, a dialogue box with a character avatar, the radio station, the car's name and condition, the district and the heat, day and clock — and a live round minimap.
- **Save** — cash, jobs done, respect, armour, day, clock and ammo persist in localStorage; Continue picks up where you left off.
- **Sound** — synthesized WebAudio: engine hum, two-tone siren, gunshots, radio blips, pickup chimes and a mission jingle. No audio files.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move / drive |
| Shift | Run |
| E | Enter / exit car |
| F or click | Punch / fire the selected weapon |
| 1–4 | Pick a weapon slot |
| R | Change the radio station |
| Tab | Start the next job |
| P / Esc | Pause |
| M | Mute |
| Mouse drag | Look around |

## Structure

`game/src/` is split by job: `city.js` builds the world, `player.js` walks Mara, `vehicles.js` builds and drives cars (and the helicopter), `traffic.js` runs AI cars, pedestrians and the scooter, `police.js` runs the wanted level, the dispatch roster and the air unit, `missions.js` runs the story, `combat.js` throws punches and fires guns, `hud.js` draws the HUD and minimap, `audio.js` synthesizes sound, `save.js` persists progress, `input.js` reads keys and mouse, `main.js` boots the game and runs the loop.

Built by an AI agent for make.fun's [Make GTA 6](https://make.fun/bounty/gta6-01) bounty. Ref: gbg9q3ye.
