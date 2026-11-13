// Merge Dungeon — Web Audio 합성 효과음 + 타이틀 BGM. 외부 파일 없음. 첫 입력 후 unlock.
window.MD = window.MD || {};
(function () {
  let ac = null, muted = false, master = null, sfxGain = null, bgmGain = null;

  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
      sfxGain = ac.createGain(); sfxGain.gain.value = 0.28; sfxGain.connect(master);
      bgmGain = ac.createGain(); bgmGain.gain.value = 0.16; bgmGain.connect(master);
    } catch (e) { ac = null; }
  }

  // ---------- SFX ----------
  // 톤 시퀀스: steps = [{f, d, type?}], 각 d 초. slide = 피치 글라이드
  function seq(steps, vol, slideTo) {
    if (!ac) return;
    let t = ac.currentTime;
    steps.forEach((st) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = st.type || 'square'; o.frequency.setValueAtTime(st.f, t);
      if (st.to) o.frequency.exponentialRampToValueAtTime(st.to, t + st.d);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol || 0.5, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + st.d);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + st.d + 0.02);
      t += st.d;
    });
  }
  function noise(dur, vol, hp) {
    if (!ac) return;
    const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf; g.gain.value = vol || 0.3;
    if (hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); f.connect(g); } else s.connect(g);
    g.connect(sfxGain); s.start();
  }

  const sfx = {
    slide: () => noise(0.04, 0.08, 2000),
    mergeWeapon: () => { noise(0.03, 0.15, 3000); seq([{ f: 1200, d: 0.05, type: 'triangle' }, { f: 1800, d: 0.09, type: 'triangle' }], 0.35); },
    mergeMonster: () => seq([{ f: 300, to: 160, d: 0.12, type: 'sine' }, { f: 420, to: 520, d: 0.08, type: 'triangle' }], 0.45),
    potion: () => seq([{ f: 500, to: 900, d: 0.07, type: 'sine' }, { f: 700, to: 1200, d: 0.07, type: 'sine' }], 0.35),
    coin: () => seq([{ f: 988, d: 0.05 }, { f: 1319, d: 0.12 }], 0.3),
    kill: () => { noise(0.07, 0.35, 800); seq([{ f: 900, to: 200, d: 0.1, type: 'sawtooth' }], 0.35); },
    damage: () => { noise(0.1, 0.3); seq([{ f: 140, to: 60, d: 0.18, type: 'sawtooth' }], 0.5); },
    heal: () => seq([{ f: 523, d: 0.07, type: 'triangle' }, { f: 659, d: 0.07, type: 'triangle' }, { f: 880, d: 0.12, type: 'triangle' }], 0.4),
    floor: () => seq([{ f: 392, d: 0.08 }, { f: 494, d: 0.08 }, { f: 587, d: 0.08 }, { f: 784, d: 0.18 }], 0.4),
    boss: () => seq([{ f: 110, d: 0.18, type: 'sawtooth' }, { f: 98, d: 0.18, type: 'sawtooth' }, { f: 87, d: 0.3, type: 'sawtooth' }], 0.5),
    pick: () => seq([{ f: 660, d: 0.06, type: 'triangle' }, { f: 880, d: 0.1, type: 'triangle' }], 0.4),
    dead: () => seq([{ f: 330, d: 0.16 }, { f: 262, d: 0.16 }, { f: 196, d: 0.16 }, { f: 131, d: 0.4 }], 0.45),
    tap: () => seq([{ f: 880, d: 0.04 }], 0.25),
    start: () => seq([{ f: 523, d: 0.07 }, { f: 659, d: 0.07 }, { f: 784, d: 0.07 }, { f: 1047, d: 0.2 }], 0.45),
    bomb: () => { noise(0.25, 0.6); seq([{ f: 120, to: 40, d: 0.3, type: 'sawtooth' }], 0.6); },
    mirror: () => seq([{ f: 880, d: 0.05, type: 'triangle' }, { f: 1760, d: 0.05, type: 'triangle' }, { f: 880, d: 0.05, type: 'triangle' }, { f: 1760, d: 0.12, type: 'triangle' }], 0.35),
    feat: () => seq([{ f: 784, d: 0.07 }, { f: 988, d: 0.07 }, { f: 1175, d: 0.07 }, { f: 1568, d: 0.22, type: 'triangle' }], 0.4),
    evolve: () => { seq([{ f: 440, d: 0.08 }, { f: 554, d: 0.08 }, { f: 659, d: 0.08 }, { f: 880, d: 0.1 }, { f: 1109, d: 0.1 }, { f: 1319, d: 0.35 }], 0.45); noise(0.3, 0.2, 3000); },
  };
  function play(name) { if (ac && !muted && sfx[name]) sfx[name](); }

  // ---------- BGM (칩튠 시퀀서) ----------
  // 단위: 16분음표. 음높이는 MIDI 번호, 0 = 쉼표.
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const TRACKS = {
    // 타이틀: 밝고 빠른 행진곡풍
    title: {
      bpm: 132, vol: 0.16, leadType: 'square', bassType: 'triangle', leadVol: 0.5, bassVol: 0.8, drums: true,
      lead: [69,0,69,72, 76,0,74,72, 71,0,69,0, 67,69,71,0, 69,0,69,72, 76,0,79,77, 76,0,74,0, 72,0,0,0,
             74,0,74,77, 81,0,79,77, 76,0,74,0, 72,74,76,0, 77,0,76,0, 74,0,72,0, 71,0,72,0, 69,0,0,0],
      bass: [45,0,45,0, 45,0,45,0, 43,0,43,0, 43,0,43,0, 41,0,41,0, 41,0,41,0, 43,0,43,0, 40,0,40,0,
             38,0,38,0, 38,0,38,0, 41,0,41,0, 41,0,41,0, 43,0,43,0, 40,0,40,0, 45,0,45,0, 45,0,0,0],
      drum: [1,0,2,0, 1,0,2,0, 1,0,2,0, 1,1,2,0, 1,0,2,0, 1,0,2,0, 1,0,2,0, 1,0,2,2,
             1,0,2,0, 1,0,2,0, 1,0,2,0, 1,1,2,0, 1,0,2,0, 1,0,2,0, 1,0,2,0, 2,2,2,2],
    },
 // 보스: 빠르고 어두운 사각파 + 드럼
    boss: {
      bpm: 150, vol: 0.14, leadType: 'square', bassType: 'sawtooth', leadVol: 0.45, bassVol: 0.5, drums: true,
      lead: [57,0,57,60, 57,0,55,0, 57,0,57,60, 63,0,62,60, 57,0,57,60, 57,0,55,0, 53,0,55,0, 56,0,0,0,
             57,0,57,60, 57,0,55,0, 57,0,57,60, 63,0,62,60, 65,0,63,0, 62,0,60,0, 56,0,57,0, 0,0,0,0],
      bass: [33,0,0,0, 33,0,33,0, 33,0,0,0, 33,0,33,0, 31,0,0,0, 31,0,31,0, 29,0,0,0, 32,0,32,0,
             33,0,0,0, 33,0,33,0, 33,0,0,0, 33,0,33,0, 29,0,0,0, 29,0,29,0, 32,0,0,0, 33,0,0,0],
      drum: [1,0,2,0, 1,0,2,2, 1,0,2,0, 1,1,2,0, 1,0,2,0, 1,0,2,2, 1,0,2,0, 1,1,2,2,
             1,0,2,0, 1,0,2,2, 1,0,2,0, 1,1,2,0, 1,0,2,0, 1,0,2,2, 1,1,2,2, 1,2,1,2],
    },
    // 인게임: 느리고 성긴 아르페지오, 드럼 없음, 작은 볼륨. 생각을 방해하지 않게.
    game: {
      bpm: 96, vol: 0.085, leadType: 'triangle', bassType: 'sine', leadVol: 0.45, bassVol: 0.7, drums: false,
      lead: [57,0,0,64, 0,0,69,0, 0,0,64,0, 0,0,0,0, 60,0,0,67, 0,0,72,0, 0,0,67,0, 0,0,0,0,
             55,0,0,62, 0,0,67,0, 0,0,62,0, 0,0,0,0, 52,0,0,59, 0,0,64,0, 0,0,59,0, 0,0,0,0,
             53,0,0,60, 0,0,65,0, 0,0,60,0, 0,0,0,0, 50,0,0,57, 0,0,62,0, 0,0,57,0, 0,0,0,0,
             53,0,0,60, 0,0,65,0, 0,0,60,0, 0,0,0,0, 52,0,0,59, 0,0,64,0, 0,0,59,0, 0,0,0,0],
      bass: [33,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 36,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
             31,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 28,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
             29,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 26,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
             29,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 28,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      drum: [],
    },
  };
  let bgm = null; // { name, track, step, nextTime, timer }

  function note(midi, t, d, type, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = hz(midi);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + d * 0.5); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(bgmGain); o.start(t); o.stop(t + d + 0.02);
  }
  function drum(kind, t) {
    const n = Math.floor(ac.sampleRate * 0.06), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = buf; f.type = kind === 1 ? 'lowpass' : 'highpass'; f.frequency.value = kind === 1 ? 400 : 5000;
    g.gain.value = kind === 1 ? 0.9 : 0.35; s.connect(f); f.connect(g); g.connect(bgmGain); s.start(t);
  }
  function schedule() {
    const T = bgm.track, STEP = 60 / T.bpm / 4, ahead = 0.25;
    while (bgm.nextTime < ac.currentTime + ahead) {
      const i = bgm.step % T.lead.length, t = bgm.nextTime;
      if (T.lead[i]) note(T.lead[i], t, STEP * (T.drums ? 0.9 : 2.6), T.leadType, T.leadVol);
      if (T.bass[i]) note(T.bass[i], t, STEP * (T.drums ? 1.8 : 7), T.bassType, T.bassVol);
      if (T.drums && T.drum[i]) drum(T.drum[i], t);
      bgm.step += 1; bgm.nextTime += STEP;
    }
  }
  // 테마별 변주: 같은 악보, 악기·템포만 다르게
  const VARIANTS = {
    stone: {}, moss: { leadType: 'sine', bpm: 90 }, frost: { leadType: 'triangle', bassType: 'sine', bpm: 80 },
    ember: { leadType: 'square', bpm: 112, leadVol: 0.4 }, void: { leadType: 'sine', bassType: 'triangle', bpm: 84 },
    gold: { leadType: 'triangle', bpm: 104 }, throne: { bpm: 100, leadType: 'square' },
  };
  function startBgm(name, variant) {
    name = name || 'title';
    if (!ac) return;
    const key = name + (name === 'game' && variant ? ':' + variant : '');
    if (bgm && bgm.name === key) return;
    stopBgm();
    const track = name === 'game' && variant ? { ...TRACKS.game, ...(VARIANTS[variant] || {}) } : TRACKS[name];
    bgmGain.gain.cancelScheduledValues(ac.currentTime);
    bgmGain.gain.setValueAtTime(0, ac.currentTime);
    bgmGain.gain.linearRampToValueAtTime(track.vol, ac.currentTime + 0.6);
    bgm = { name: key, track, step: 0, nextTime: ac.currentTime + 0.05, timer: setInterval(schedule, 80) };
    schedule();
  }
  function stopBgm() {
    if (!bgm) return;
    clearInterval(bgm.timer); bgm = null;
  }
  function bgmName() { return bgm ? bgm.name : null; }

  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 1; }
  function isMuted() { return muted; }
  function ready() { return !!ac; }

  MD.audio = { unlock, play, setMuted, isMuted, ready, startBgm, stopBgm, bgmName };
})();
