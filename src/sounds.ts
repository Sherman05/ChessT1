let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function playMoveSound() {
  playTone(600, 0.08, 'sine', 0.12);
}

export function playCaptureSound() {
  playTone(300, 0.15, 'square', 0.15);
  setTimeout(() => playTone(200, 0.1, 'square', 0.1), 50);
}

export function playCheckSound() {
  playTone(880, 0.1, 'sine', 0.18);
  setTimeout(() => playTone(880, 0.1, 'sine', 0.18), 120);
}

export function playGameOverSound() {
  playTone(523, 0.2, 'sine', 0.15);
  setTimeout(() => playTone(659, 0.2, 'sine', 0.15), 200);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.15), 400);
}
