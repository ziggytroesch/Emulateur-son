const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const keyboard = document.getElementById('keyboard');
const synthSelect = document.getElementById('synthSelect');
const reverbToggle = document.getElementById('reverbToggle');
const delayToggle = document.getElementById('delayToggle');
const tempoSlider = document.getElementById('tempo');
const tempoValue = document.getElementById('tempoValue');
const rhythmSelect = document.getElementById('rhythmSelect');
const octaveValue = document.getElementById('octaveValue');
const vintageSynth = document.getElementById('vintageSynth');

let currentOctave = 4;
let isRhythmOn = false;
let rhythmInterval;
let synthType = 'sine';
let currentPreset = 'default';
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const keyToNote = {
  'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
  'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
  'u': 'A#', 'j': 'B'
};

const vintagePresets = {
  ms20: {
    type: 'sawtooth',
    filter: { type: 'lowpass', freq: 800, Q: 10 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 }
  },
  sh101: {
    type: 'square',
    filter: { type: 'lowpass', freq: 1200, Q: 1 },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.1 }
  },
  mellotron: {
    type: 'sample',
    url: 'https://cdn.jsdelivr.net/gh/your-user/mello-flute.wav'
  },
  prophet: {
    type: 'sawtooth',
    filter: { type: 'lowpass', freq: 1500, Q: 0.7 },
    envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.3 }
  },
  moog: {
    type: 'triangle',
    filter: { type: 'lowpass', freq: 1000, Q: 5 },
    envelope: { attack: 0.03, decay: 0.2, sustain: 0.4, release: 0.2 }
  }
};

const rhythms = {
  '808': [60, null, 80, null, 80, null, 60, null],
  '909': [120, null, 120, null, 100, 100, null, 80],
  'linn': [100, null, 130, null, null, 100, 130, null],
  'custom': [60, null, 120, null]
};

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

function playNote(note, octave) {
  const freq = getFrequency(note, octave);
  const now = audioCtx.currentTime;

  if (currentPreset === 'mellotron') {
    const audio = new Audio(vintagePresets.mellotron.url);
    audio.play();
    return;
  }

  const preset = vintagePresets[currentPreset] || {};
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = preset.type || synthType;
  osc.frequency.value = freq;

  const env = preset.envelope || { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 };
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + env.attack);
  gain.gain.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay);
  gain.gain.setTargetAtTime(0, now + 0.5, env.release);

  if (preset.filter) {
    filter.type = preset.filter.type;
    filter.frequency.value = preset.filter.freq;
    filter.Q.value = preset.filter.Q;
    osc.connect(filter).connect(gain);
  } else {
    osc.connect(gain);
  }

  let finalNode = gain;

  if (reverbToggle.checked) {
    const reverb = audioCtx.createConvolver();
    reverb.buffer = createImpulseResponse(audioCtx);
    gain.connect(reverb);
    finalNode = reverb;
  }

  if (delayToggle.checked) {
    const delay = audioCtx.createDelay();
    delay.delayTime.value = 0.3;
    finalNode.connect(delay);
    delay.connect(audioCtx.destination);
    finalNode = delay;
  }

  finalNode.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 1);
}

function createKeyboard() {
  keyboard.innerHTML = '';
  notes.forEach(note => {
    const key = document.createElement('div');
    key.className = 'key';
    if (note.includes('#')) key.classList.add('sharp');
    key.textContent = note + currentOctave;
    key.addEventListener('click', () => playNote(note, currentOctave));
    keyboard.appendChild(key);
  });
}

function playRhythmPattern() {
  const bpm = parseInt(tempoSlider.value);
  const interval = 60000 / bpm;
  const pattern = rhythms[rhythmSelect.value];
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

document.getElementById('octaveUp').onclick = () => {
  if (currentOctave < 7) currentOctave++;
  octaveValue.textContent = currentOctave;
  createKeyboard();
};

document.getElementById('octaveDown').onclick = () => {
  if (currentOctave > 1) currentOctave--;
  octaveValue.textContent = currentOctave;
  createKeyboard();
};

synthSelect.onchange = (e) => synthType = e.target.value;
vintageSynth.onchange = (e) => currentPreset = e.target.value;

tempoSlider.oninput = () => {
  tempoValue.textContent = tempoSlider.value;
  if (isRhythmOn) {
    clearInterval(rhythmInterval);
    playRhythmPattern();
  }
};

document.getElementById('toggleRhythm').onclick = () => {
  if (!isRhythmOn) {
    playRhythmPattern();
    isRhythmOn = true;
    document.getElementById('toggleRhythm').textContent = 'Arrêter Rythme';
  } else {
    clearInterval(rhythmInterval);
    isRhythmOn = false;
    document.getElementById('toggleRhythm').textContent = 'Démarrer Rythme';
  }
};

document.addEventListener('keydown', (e) => {
  const note = keyToNote[e.key.toLowerCase()];
  if (note) playNote(note, currentOctave);
});

createKeyboard();
