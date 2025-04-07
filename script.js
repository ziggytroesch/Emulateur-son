// -----------------------------
// CONTEXTES ET VARIABLES
// -----------------------------
const notes = [
  { fr: 'Do', en: 'C' }, { fr: 'Do# / Réb', en: 'C#' },
  { fr: 'Ré', en: 'D' }, { fr: 'Ré# / Mib', en: 'D#' },
  { fr: 'Mi', en: 'E' }, { fr: 'Fa', en: 'F' },
  { fr: 'Fa# / Solb', en: 'F#' }, { fr: 'Sol', en: 'G' },
  { fr: 'Sol# / Lab', en: 'G#' }, { fr: 'La', en: 'A' },
  { fr: 'La# / Sib', en: 'A#' }, { fr: 'Si', en: 'B' }
];
const rhythms = {
  rock: [60, null, 80, null, 80, null, 60, null],
  jazz: [null, 100, null, 120, 80, null, null, 120],
  blues: [80, null, 100, null, 60, null, 60, 80],
  funk: [100, 140, null, 140, 100, null, 140, null],
  custom: [60, null, 120, null]
};
let currentOctave = 4;
let isRhythmOn = false;
let isMetronomeOn = false;
let isLooping = false;
let loopNotes = [];
let loopStartTime = null;
let rhythmInterval, metronomeInterval;
let sustain = false;
let currentPreset = 'default';
let synthType = 'sine';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// -----------------------------
// INTERFACE
// -----------------------------
function startMode(mode) {
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("interface").style.display = "block";
  createKeyboard(mode === "advanced");
}

function createKeyboard(isAdvanced) {
  const keyboard = document.getElementById('keyboard');
  keyboard.innerHTML = '';
  notes.forEach(n => {
    if (!isAdvanced && n.en.includes('#')) return;
    const key = document.createElement('div');
    key.className = 'key';
    if (n.en.includes('#')) key.classList.add('sharp');
    key.innerHTML = `<strong>${n.en}</strong><br><small>${n.fr}</small>`;
    key.addEventListener('click', () => playNote(n.en, currentOctave));
    keyboard.appendChild(key);
  });
}

document.getElementById('octaveUp').onclick = () => {
  if (currentOctave < 7) currentOctave++;
  document.getElementById('octaveValue').textContent = currentOctave;
};

document.getElementById('octaveDown').onclick = () => {
  if (currentOctave > 1) currentOctave--;
  document.getElementById('octaveValue').textContent = currentOctave;
};

document.getElementById('synthSelect').onchange = (e) => synthType = e.target.value;
document.getElementById('vintageSynth').onchange = (e) => currentPreset = e.target.value;
document.getElementById('sustainToggle').onchange = (e) => sustain = e.target.checked;

// -----------------------------
// MÉTRONOME
// -----------------------------
document.getElementById('metronomeToggle').onchange = (e) => {
  isMetronomeOn = e.target.checked;
  if (isMetronomeOn) startMetronome();
  else clearInterval(metronomeInterval);
};

function startMetronome() {
  const bpm = parseInt(document.getElementById('tempo').value);
  const interval = 60000 / bpm;
  metronomeInterval = setInterval(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }, interval);
}

// -----------------------------
// RYTHMES
// -----------------------------
document.getElementById('toggleRhythm').onclick = () => {
  if (!isRhythmOn) {
    playRhythmPattern();
    isRhythmOn = true;
    document.getElementById('toggleRhythm').textContent = "Arrêter Rythme";
  } else {
    clearInterval(rhythmInterval);
    isRhythmOn = false;
    document.getElementById('toggleRhythm').textContent = "Démarrer Rythme";
  }
};

function playRhythmPattern() {
  const bpm = parseInt(document.getElementById('tempo').value);
  const interval = 60000 / bpm;
  const pattern = rhythms[document.getElementById('rhythmSelect').value];
  let step = 0;
  rhythmInterval = setInterval(() => {
    const freq = pattern[step % pattern.length];
    if (freq) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    }
    step++;
  }, interval);
}

// -----------------------------
// BOUCLEUR
// -----------------------------
document.getElementById('startLoop').onclick = () => {
  loopNotes = [];
  loopStartTime = audioCtx.currentTime;
  isLooping = true;
};

document.getElementById('stopLoop').onclick = () => {
  isLooping = false;
  if (loopNotes.length > 0) {
    loopNotes.forEach(n => scheduleLoopNote(n));
  }
};

document.getElementById('clearLoop').onclick = () => {
  loopNotes = [];
  loopStartTime = null;
  isLooping = false;
};

function scheduleLoopNote(n) {
  const delay = n.time;
  setTimeout(() => {
    playNote(n.note, n.octave);
    scheduleLoopNote(n); // reboucle
  }, delay * 1000);
}

// -----------------------------
// SON + PRESETS
// -----------------------------
function playNote(note, octave) {
  const freq = getFrequency(note, octave);
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  // Enveloppe par défaut
  const env = {
    attack: 0.01,
    decay: 0.1,
    sustain: sustain ? 0.8 : 0.3,
    release: sustain ? 2.0 : 0.3
  };

  // Presets
  const presets = {
    ms20: { type: 'sawtooth', filter: { type: 'lowpass', freq: 800, Q: 10 } },
    sh101: { type: 'square', filter: { type: 'lowpass', freq: 1200, Q: 1 } },
    mellotron: { type: 'sample', url: 'https://cdn.jsdelivr.net/gh/your-user/mello-flute.wav' },
    prophet: { type: 'sawtooth', filter: { type: 'lowpass', freq: 1500, Q: 0.7 } },
    moog: { type: 'triangle', filter: { type: 'lowpass', freq: 1000, Q: 5 } }
  };

  if (currentPreset === 'mellotron') {
    const audio = new Audio(presets.mellotron.url);
    audio.play();
    return;
  }

  const preset = presets[currentPreset] || {};
  osc.type = preset.type || synthType;
  osc.frequency.value = freq;

  // Enveloppe
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + env.attack);
  gain.gain.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay);
  gain.gain.setTargetAtTime(0, now + 0.5, env.release);

  // Filtre
  if (preset.filter) {
    filter.type = preset.filter.type;
    filter.frequency.value = preset.filter.freq;
    filter.Q.value = preset.filter.Q;
    osc.connect(filter).connect(gain);
  } else {
    osc.connect(gain);
  }

  // Effets
  let finalNode = gain;
  if (document.getElementById('reverbToggle').checked) {
    const convolver = audioCtx.createConvolver();
    convolver.buffer = createImpulseResponse(audioCtx);
    gain.connect(convolver);
    finalNode = convolver;
  }
  if (document.getElementById('delayToggle').checked) {
    const delay = audioCtx.createDelay();
    delay.delayTime.value = 0.3;
    finalNode.connect(delay);
    delay.connect(audioCtx.destination);
    finalNode = delay;
  }

  finalNode.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 2);
  if (isLooping && loopStartTime !== null) {
    loopNotes.push({ note, octave, time: audioCtx.currentTime - loopStartTime });
  }
}

function getFrequency(note, octave) {
  const A4 = 440;
  const semitones = {
    'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5,
    'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0,
    'A#': 1, 'B': 2
  };
  return A4 * Math.pow(2, (semitones[note] + (octave - 4) * 12) / 12);
}

function createImpulseResponse(ctx, duration = 2, decay = 2) {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let i = 0; i < 2; i++) {
    let channel = impulse.getChannelData(i);
    for (let j = 0; j < length; j++) {
      channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
    }
  }
  return impulse;
}
