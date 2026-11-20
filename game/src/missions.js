// The three jobs: start them with Tab, follow the stages, get paid.
// Job 1 is a pier pickup, job 2 is a stolen coupe delivered west, job 3
// is a getaway against the clock. Finishing all three ends the story.
import { JOBS, JOB_BONUS, TUNING } from './config.js';
import { setWanted } from './police.js';
import { saveGame } from './save.js';

export function createMissions() {
  return {
    index: 0, // jobs finished
    active: false,
    stage: 0,
    timer: null,
    target: null,
  };
}

export function currentJob(G) {
  return JOBS[G.missions.index] || null;
}

export function currentStage(G) {
  const job = currentJob(G);
  if (!job || !G.missions.active) return null;
  return job.stages[G.missions.stage] || null;
}

export function startNextJob(G) {
  const m = G.missions;
  if (m.active || m.index >= JOBS.length) return false;
  const job = JOBS[m.index];
  m.active = true;
  m.stage = 0;
  m.timer = job.timerSeconds || null;
  m.target = job.stages[0].target || null;
  if (m.index === 2) {
    // The whole bay is looking for Mara from the moment job 3 starts.
    setWanted(G, 3);
  }
  G.hud.showDialogue(job.intro.name, job.intro.initials, job.intro.line);
  G.audio.chime();
  return true;
}

function completeJob(G) {
  const m = G.missions;
  const job = JOBS[m.index];
  G.stats.cash += job.reward;
  G.stats.armour = Math.min(100, G.stats.armour + JOB_BONUS.armour);
  G.stats.respect = Math.min(100, G.stats.respect + JOB_BONUS.respect);
  const bonus = JOB_BONUS.ammo;
  for (let i = 1; i <= 3; i += 1) {
    if (Number.isFinite(G.weapons.list[i].ammo)) {
      G.weapons.list[i].ammo += bonus[i];
    }
  }
  m.index += 1;
  m.active = false;
  m.stage = 0;
  m.timer = null;
  m.target = null;
  G.hud.showDialogue(job.done.name, job.done.initials, job.done.line);
  G.audio.chime();
  if (m.index === 1) {
    G.hud.toast('SHOTGUN unlocked — press 3.');
  } else if (m.index === 2) {
    G.hud.toast('VIPER SMG unlocked — press 4.');
  }
  saveGame(G);
  if (m.index >= JOBS.length) {
    G.onStoryComplete();
  }
}

function failJob(G) {
  const m = G.missions;
  m.active = false;
  m.stage = 0;
  m.timer = null;
  m.target = null;
  G.hud.showDialogue(
    'Silas Crane',
    'SC',
    'You took too long, Mara. The job is still there when you are ready.',
  );
}

export function updateMissions(G, dt) {
  const m = G.missions;
  if (!m.active) return;
  const job = JOBS[m.index];
  if (!job) return;

  // Job 3 is a countdown: lose the heat before it hits zero.
  if (m.index === 2) {
    m.timer -= dt;
    if (G.police.wanted <= 0) {
      completeJob(G);
      return;
    }
    if (m.timer <= 0) {
      failJob(G);
    }
    return;
  }

  const stage = job.stages[m.stage];
  if (!stage || !stage.target) return;
  const dx = stage.target.x - G.player.x;
  const dz = stage.target.z - G.player.z;
  if (Math.hypot(dx, dz) > TUNING.jobCompleteRadius) return;

  // Stage reached. Job 2's second stage needs the coupe itself, not Mara.
  if (m.index === 1 && m.stage === 0) {
    if (!G.player.inCar || G.player.car.name !== 'BREEZE GT') return;
  }
  if (m.index === 1 && m.stage === 1) {
    if (!G.player.inCar || G.player.car.name !== 'BREEZE GT') return;
  }

  if (m.stage + 1 < job.stages.length) {
    m.stage += 1;
    m.target = job.stages[m.stage].target || null;
    G.hud.toast('Coupe secured — get it to the garage.');
    G.audio.chime();
    return;
  }
  completeJob(G);
}

// The panel the HUD and the state dump read.
export function missionPanel(G) {
  const m = G.missions;
  if (m.index >= JOBS.length) {
    return {
      job: 'STORY COMPLETE',
      stage: '',
      next: 'Free roam — Solmar Bay is yours.',
      timer: null,
    };
  }
  const job = JOBS[m.index];
  const title = 'JOB ' + (m.index + 1) + '/3 · ' + job.name;
  if (!m.active) {
    return { job: title, stage: 'READY', next: 'Press Tab to start the next job.', timer: null };
  }
  const stage = job.stages[m.stage];
  return {
    job: title,
    stage: 'STAGE ' + (m.stage + 1) + '/' + job.stages.length,
    next: stage.text,
    timer: m.timer === null ? null : m.timer,
  };
}

export function missionObjective(G) {
  const m = G.missions;
  if (m.index >= JOBS.length) return 'Story complete — Solmar Bay is yours. Free roam.';
  if (!m.active) return 'Press Tab to start the next job.';
  const stage = JOBS[m.index].stages[m.stage];
  return stage.objective;
}
