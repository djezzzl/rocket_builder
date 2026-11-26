# Brick Rocket – new weapons, enemies, bosses and achievements

## New weapon bricks (expensive)

| Part | Price | Behaviour |
|---|---|---|
| Plasma Cannon | 150 | slow, big orb that goes through everything it hits |
| Tesla Coil | 220 | lightning that jumps between up to 4 nearby targets |
| Railgun | 320 | instant beam that hits everything in a long line |
| Nova Core | 450 | energy blast all around the rocket |
| Star Cannon | 900 | a fan of 6 homing stars. **Only unlocked by beating the Star Dragon** |

The first four are unlocked from ❓ crates, the same way the other locked parts are. Crates never give boss-only parts.

## Enemies

| Enemy | Shows up from threat | Behaviour |
|---|---|---|
| Drone | 1 | chases you and explodes on contact |
| Space Mine | 1.5 | drifts until you get close, then homes in |
| UFO | 2 | circles you at a distance and shoots |
| Fighter | 3 | aims, then dashes at you and shoots a spread |

## Scaling

- `power = hp / 5 + total weapon DPS`
- `threat = clamp(1 + time / 90 + power / 60, 1, 15)`

As threat goes up, enemy (and meteor) HP, damage, spawn rate and coin rewards all go up with it. A stronger rocket gets tougher and more rewarding fights.

## Bosses

The first boss appears after 60 s of flight, and the next one 90 s after the previous boss is gone. Only one boss exists at a time, and bosses only appear if the rocket has at least one weapon. The first boss of each flight is the easiest one you haven't beaten yet. After that, bosses go through the list in order and get stronger each time.

1. **Meteor King**: a giant rock that follows you and throws meteors.
2. **Alien Mothership**: keeps its distance, launches drones and fires rings of bullets.
3. **Space Kraken**: alternates between charging at you and spraying ink.
4. **Star Dragon**: a long serpent with a segmented body that breathes fire.

A boss shows its HP bar at the top of the screen. Beating one gives a big coin reward and drops 2 crates. Beating the Star Dragon also unlocks the Star Cannon.

The barrier blocks enemy bullets and destroys small enemies. Against bosses it blocks contact damage but doesn't hurt them.

## Achievements

Achievements are saved, and each one gives coins once. You can see them on a 🏆 screen in the garage, and a toast pops up when you earn one.

- Space Defender (first alien ship destroyed), Alien Hunter (50 ships), Galaxy Guardian (300 ships)
- Rock Smasher (200 meteors)
- King Crusher, Mothership Down, Kraken Tamer, Dragon Slayer (one for each boss)
- Boss Master (all 4 bosses), Boss Hunter (10 bosses in total)
- Untouchable (beat a boss without taking damage during the fight)
- Ring Rider (reach 20,000 m)

## Modules

- `src/enemies.js`: enemy and boss definitions, pure scaling helpers, and their behaviour and drawing.
- `src/achievements.js`: pure definitions plus `checkAchievements(save)`.
- `src/flight.js`: switched over to generic targets, so weapons hit meteors, enemies and boss parts alike.

The pure helpers are unit-tested.
