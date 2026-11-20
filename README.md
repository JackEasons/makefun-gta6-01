# Solmar Bay — A Sunset Hustle

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/JackEasons/makefun-gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/JackEasons/makefun-gta6-01/reward.svg)](https://make.fun/c/gta6-01)

An original open-world crime game for the [make.fun GTA 6 bounty](https://make.fun/c/gta6-01), built with three.js and plain static files — no network, no build step. Mara Voss came back to Solmar Bay with a busted car, a borrowed name and a debt to Silas Crane. One job at a time, she is buying her way out — if the bay lets her.

## The game

- **A city to explore**: 7 × 6 blocks of sunset towers, a beach, a pier and the bay — on foot or behind the wheel.
- **Three jobs**: a pier pickup ($600), a stolen gold coupe delivered west ($900), and a getaway against the clock ($1,500). Finish all three and the bay is yours.
- **Traffic and pedestrians**: eight cars on the avenues, fourteen people on the sidewalks, all living their own routes.
- **Wanted level**: steal a car or drop a pedestrian and the SBPB answers — cruisers with named units, a spotlight helicopter at four stars, and a bust that costs $200.
- **Combat**: fists, pistol, shotgun (after one job) and Viper SMG (after two), plus drive-by shooting from the car.
- **HUD**: cash, health / armour / respect, wanted stars, a mission panel, a waypoint compass that always points at the next objective, dispatch rows with live distances, and a circular minimap.
- **Saves**: progress writes to localStorage after every job and on pause; Continue on the menu picks it back up.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

W A S D move & drive · Shift run · E enter / exit car · F punch / fire · 1-4 weapons · R radio · Tab next job · P pause · M mute · Drag mouse to look.

## Screenshots

The four shots in `screenshots/` are staged renders of the game itself (`?shot=cover|onfoot|driving|mission&seed=7`), taken in a browser from this code — never edited or composited.

## License

MIT. The city, people, cars and story are invented here — nothing from any commercial game.
