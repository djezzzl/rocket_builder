// Catalog of every brick. Each brick is 1x1 on the build grid.
export const PARTS = {
  cockpit:  { name: 'Cockpit',    icon: '👨‍🚀', price: 0,   hp: 30, mass: 2, color: '#f2f2f2', unlocked: true,  desc: 'Your pilot. Exactly one!' },
  hull:     { name: 'Hull',       icon: '🧱', price: 5,   hp: 15, mass: 1, color: '#d01012', unlocked: true,  desc: 'Cheap brick to connect parts' },
  engine:   { name: 'Engine',     icon: '🔥', price: 15,  hp: 10, mass: 1, color: '#6d6e70', unlocked: true,  thrust: 260, desc: 'Pushes you forward' },
  wing:     { name: 'Wing',       icon: '🪽', price: 10,  hp: 8,  mass: 0.5, color: '#0055bf', unlocked: true,  turn: 1.2, desc: 'Turn faster' },
  armor:    { name: 'Armor',      icon: '🛡️', price: 25,  hp: 45, mass: 2.5, color: '#5a5a5a', unlocked: false, desc: 'Tough but heavy' },
  battery:  { name: 'Battery',    icon: '🔋', price: 30,  hp: 8,  mass: 1, color: '#4b9f4a', unlocked: false, energy: 40, recharge: 6, desc: 'More energy for boost & barrier' },
  booster:  { name: 'Booster',    icon: '🚀', price: 45,  hp: 8,  mass: 1, color: '#fe8a18', unlocked: false, boost: 1, desc: 'BOOST button: super speed' },
  shield:   { name: 'Barrier',    icon: '🔵', price: 70,  hp: 8,  mass: 1, color: '#36aebf', unlocked: false, shield: 1, desc: 'BARRIER button: smash meteors' },
  laser:    { name: 'Laser',      icon: '⚡', price: 40,  hp: 8,  mass: 1, color: '#c91a09', unlocked: false, weapon: 'laser',   desc: 'Zaps meteors automatically' },
  blaster:  { name: 'Blaster',    icon: '💥', price: 60,  hp: 8,  mass: 1, color: '#ffcd03', unlocked: false, weapon: 'blaster', desc: 'Shoots 3 balls at once' },
  missile:  { name: 'Missile',    icon: '🎯', price: 90,  hp: 8,  mass: 1.5, color: '#923978', unlocked: false, weapon: 'missile', desc: 'Homing rockets, big boom' },
  magnet:   { name: 'Magnet',     icon: '🧲', price: 30,  hp: 8,  mass: 1, color: '#a0a5a9', unlocked: false, magnet: 60, desc: 'Grab items from far away' },
  bigengine:{ name: 'Mega Engine',icon: '☄️', price: 120, hp: 15, mass: 2, color: '#1b2a34', unlocked: false, thrust: 700, desc: 'Huge push!' },
};

export const WEAPONS = {
  laser:   { cooldown: 0.35, speed: 900, damage: 6,  range: 520, color: '#ff3b3b', radius: 3 },
  blaster: { cooldown: 0.8,  speed: 600, damage: 8,  range: 460, color: '#ffd400', radius: 5, spread: 0.25, count: 3 },
  missile: { cooldown: 1.6,  speed: 380, damage: 30, range: 700, color: '#ff8c00', radius: 6, homing: 4 },
};

export const PART_IDS = Object.keys(PARTS);

export const GARAGE_SIZES = [
  { w: 3,  h: 4,  price: 0 },
  { w: 5,  h: 6,  price: 150 },
  { w: 7,  h: 8,  price: 400 },
  { w: 9,  h: 10, price: 900 },
  { w: 11, h: 12, price: 2000 },
];

export const PAINTS = ['auto', '#d01012', '#0055bf', '#ffcd03', '#4b9f4a', '#fe8a18', '#f2f2f2', '#1b2a34', '#923978', '#36aebf', '#ff9ecd'];

export const CELL = 18; // world units per brick
