# Brick Rocket – design

A 2D browser game for kids, played with a finger on an iPad. You build a rocket out of LEGO-style bricks in a garage, fly it into space, earn coins, then come back and improve it.

## Approach

I picked vanilla JavaScript (ES modules), an HTML5 canvas and a DOM-based garage UI. There is no build step, so GitHub Pages serves the files as they are.

Alternatives I rejected:
- Phaser or another engine: extra weight and more to learn, and we don't need it.
- React + Vite: needs a build step and doesn't help with the canvas game loop.

## Game loop

1. **Garage.** A grid of cells. Pick a brick from the palette, then tap a cell to place it (it costs coins). Tap a placed brick to remove it and get a full refund. Pick a paint color before placing. Buy garage upgrades to make the grid bigger: 3×4, 5×6, 7×8, 9×10, 11×12.
2. **Validation.** A rocket needs exactly one cockpit and at least one engine, and every brick must connect to the cockpit (edge neighbors).
3. **Flight.** The rocket launches from Earth, which is drawn at the bottom. The rocket always stays in the center of the screen and can point in any direction. The world and a parallax starfield move around it, and the sky fades from blue to black as you climb.
4. **Coins.** You earn coins every second you stay alive, and the rate goes up with altitude. You can also pick up items: coins, repair kits, and mystery crates. A crate unlocks a new part, or gives coins if everything is already unlocked.
5. **Danger.** Meteors spawn more often as time goes on. Each meteor hit does damage based on its size. When HP reaches 0, the rocket crashes, a summary appears, and you go back to the garage. Meteors that weapons destroy can drop coins.
6. **Progress.** Coins, unlocks, the current rocket and the garage size are saved in localStorage.

## Parts (all 1×1 bricks)

| Part | Effect |
|---|---|
| Cockpit | required; HP |
| Hull | cheap HP and connectivity |
| Armor | lots of HP, heavy |
| Engine / Big Engine | thrust |
| Wing | turn speed |
| Battery | energy capacity and recharge |
| Booster | BOOST button (energy): faster acceleration and top speed |
| Shield | BARRIER button (energy): bubble that destroys meteors |
| Laser | auto-fires fast beams at the nearest meteor |
| Blaster | auto-fires a spread of 3 shots |
| Missile | auto-fires slow homing rockets that do heavy damage |
| Magnet | bigger pickup radius |

Every brick adds mass. Thrust divided by mass gives acceleration, so heavy rockets need more engines.

## Controls (touch first)

- A floating joystick appears where you put your finger on the left half of the screen. The rocket turns toward the joystick direction, and pushing further gives more thrust.
- The right side has buttons: BOOST, BARRIER, and a return-home button.
- Keyboard fallback: arrow keys or WASD, Shift to boost, Space for the barrier.
- Weapons aim and fire on their own, which is easier for kids.

## Modules

- `src/parts.js`: the part catalog (pure data).
- `src/rocket.js`: pure logic (validate a build, compute stats).
- `src/save.js`: save and load from localStorage.
- `src/draw.js`: draws the LEGO bricks and the rocket.
- `src/garage.js`: the garage UI.
- `src/flight.js`: the flight simulation and rendering.
- `src/input.js`: joystick, buttons and keyboard.
- `src/main.js`: switches between screens.

## Testing

`node --test` covers the pure logic: validation, stats and economy helpers. The flight is checked by hand in a browser.

## Release

A public GitHub repo, served by GitHub Pages from the `master` branch root.
