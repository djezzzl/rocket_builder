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
  plasma:   { name: 'Plasma Cannon', icon: '🟣', price: 150, hp: 10, mass: 1.5, color: '#6a1b9a', unlocked: false, weapon: 'plasma',  desc: 'Big orb that smashes through everything' },
  tesla:    { name: 'Tesla Coil', icon: '🌩️', price: 220, hp: 10, mass: 1.5, color: '#00838f', unlocked: false, weapon: 'tesla',   desc: 'Lightning jumps between enemies' },
  railgun:  { name: 'Railgun',    icon: '📡', price: 320, hp: 12, mass: 2, color: '#263238', unlocked: false, weapon: 'railgun', desc: 'Super beam hits everything in a line' },
  nova:     { name: 'Nova Core',  icon: '🌟', price: 450, hp: 15, mass: 2, color: '#ad1457', unlocked: false, weapon: 'nova',    desc: 'Blasts everything around you' },
  star:     { name: 'Star Cannon',icon: '⭐', price: 900, hp: 20, mass: 2, color: '#ffd600', unlocked: false, weapon: 'star', bossOnly: true, desc: 'Rain of homing stars! Beat the Star Dragon to get it' },
};

export const WEAPONS = {
  laser:   { cooldown: 0.35, speed: 900, damage: 6,  range: 520, color: '#ff3b3b', radius: 3 },
  blaster: { cooldown: 0.8,  speed: 600, damage: 8,  range: 460, color: '#ffd400', radius: 5, spread: 0.25, count: 3 },
  missile: { cooldown: 1.6,  speed: 380, damage: 30, range: 700, color: '#ff8c00', radius: 6, homing: 4, splash: 70 },
  plasma:  { cooldown: 1.1,  speed: 420, damage: 28, range: 600, color: '#c77dff', radius: 11, pierce: true },
  tesla:   { kind: 'chain', cooldown: 0.9, damage: 12, range: 380, color: '#9ffcff', chains: 4, chainRange: 200 },
  railgun: { kind: 'beam',  cooldown: 2.0, damage: 60, range: 950, color: '#00e5ff', width: 8 },
  nova:    { kind: 'pulse', cooldown: 2.6, damage: 35, range: 230, color: '#ff66cc' },
  star:    { cooldown: 1.6,  speed: 430, damage: 14, range: 750, color: '#fff36b', radius: 7, homing: 6, count: 6, spread: 0.35 },
};

export function weaponDps(type) {
  const w = WEAPONS[type];
  const hits = w.kind === 'chain' ? w.chains : w.count || 1;
  return (w.damage * hits) / w.cooldown;
}

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
