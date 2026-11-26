import { PARTS } from './parts.js';
import { loadSave, writeSave, resetSave } from './save.js';
import { Garage } from './garage.js';
import { Flight } from './flight.js';
import { BOSSES } from './enemies.js';
import { checkAchievements } from './achievements.js';

const $ = id => document.getElementById(id);
let save = loadSave();

const garage = new Garage(save, {
  onSave: () => writeSave(save),
  onLaunch: () => {
    garage.hide();
    save.flights += 1;
    flight.start(save);
  },
  onReset: () => { save = resetSave(); garage.show(save); },
});

const flight = new Flight({
  onEnd: ({ crashed, coins, time, altitude, unlocks, kills, bossKills, achievements }) => {
    save.coins += coins;
    save.best = Math.max(save.best, altitude);
    const earned = [...achievements, ...checkAchievements(save)];
    writeSave(save);
    $('s-title').textContent = crashed ? '💥 Crash!' : '🏠 Safe landing!';
    const parts = unlocks.map(id => `${PARTS[id].icon} ${PARTS[id].name}`).join(', ');
    $('s-body').innerHTML = `
      ⏱️ Flight time: <b>${Math.floor(time)} s</b><br>
      📏 Highest: <b>${Math.floor(altitude)} m</b><br>
      🪙 Coins earned: <b>${coins}</b><br>
      👾 Aliens destroyed: <b>${kills}</b><br>
      ${bossKills.length ? `⚔️ Bosses defeated: <b>${bossKills.map(id => `${BOSSES[id].emoji} ${BOSSES[id].name}`).join(', ')}</b><br>` : ''}
      ${parts ? `🎁 New parts: <b>${parts}</b><br>` : ''}
      ${earned.length ? `🏅 Achievements: <b>${earned.map(a => `${a.icon} ${a.name}`).join(', ')}</b><br>` : ''}
      ${crashed ? 'Improve your rocket and try again!' : ''}`;
    $('summary').classList.remove('hidden');
  },
});

$('btn-back').onclick = () => {
  $('summary').classList.add('hidden');
  garage.show(save);
};

// Stop iOS double-tap zoom and pinch gestures from hijacking play.
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

garage.show(save);
window.brickRocket = { garage, flight };
