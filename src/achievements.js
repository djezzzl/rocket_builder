const BOSS_IDS = ['king', 'mother', 'kraken', 'dragon'];
const totalBosses = s => BOSS_IDS.reduce((t, id) => t + (s.stats.bosses[id] || 0), 0);

export const ACHIEVEMENTS = [
  { id: 'first-ship',  icon: '🛸', name: 'Space Defender',  desc: 'Destroy your first alien ship',      reward: 20,   check: s => s.stats.ships >= 1 },
  { id: 'ships-50',    icon: '👾', name: 'Alien Hunter',    desc: 'Destroy 50 alien ships',             reward: 100,  check: s => s.stats.ships >= 50 },
  { id: 'ships-300',   icon: '🌌', name: 'Galaxy Guardian', desc: 'Destroy 300 alien ships',            reward: 400,  check: s => s.stats.ships >= 300 },
  { id: 'meteors-200', icon: '🪨', name: 'Rock Smasher',    desc: 'Smash 200 meteors',                  reward: 100,  check: s => s.stats.meteors >= 200 },
  { id: 'boss-king',   icon: '👑', name: 'King Crusher',    desc: 'Defeat the Meteor King',             reward: 150,  check: s => s.stats.bosses.king >= 1 },
  { id: 'boss-mother', icon: '🛸', name: 'Mothership Down', desc: 'Defeat the Alien Mothership',        reward: 250,  check: s => s.stats.bosses.mother >= 1 },
  { id: 'boss-kraken', icon: '🐙', name: 'Kraken Tamer',    desc: 'Defeat the Space Kraken',            reward: 400,  check: s => s.stats.bosses.kraken >= 1 },
  { id: 'boss-dragon', icon: '🐉', name: 'Dragon Slayer',   desc: 'Defeat the Star Dragon',             reward: 600,  check: s => s.stats.bosses.dragon >= 1 },
  { id: 'boss-all',    icon: '🏆', name: 'Boss Master',     desc: 'Defeat all four bosses',             reward: 1000, check: s => BOSS_IDS.every(id => s.stats.bosses[id] >= 1) },
  { id: 'boss-10',     icon: '⚔️', name: 'Boss Hunter',     desc: 'Defeat 10 bosses',                   reward: 800,  check: s => totalBosses(s) >= 10 },
  { id: 'flawless',    icon: '💎', name: 'Untouchable',     desc: 'Defeat a boss without getting hit',  reward: 500,  check: s => s.stats.flawless >= 1 },
  { id: 'saturn',      icon: '🪐', name: 'Ring Rider',      desc: 'Fly up to 20000 m',                  reward: 300,  check: s => s.best >= 20000 },
];

// Marks newly earned achievements on the save, pays their rewards and returns them.
export function checkAchievements(save) {
  const earned = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements.includes(a.id) || !a.check(save)) continue;
    save.achievements.push(a.id);
    save.coins += a.reward;
    earned.push(a);
  }
  return earned;
}
