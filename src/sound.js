// Completion sound for "task → done".
// Primary: plays /done.mp3 (put your file at  public/done.mp3 ).
// Fallback: if the mp3 is missing/blocked, a short synthesized chime plays instead.
// The sound stops as soon as the user interacts again (next click / key press).

const SRC = '/done.mp3'
let audioEl
let armed = false

function getEl() {
  if (!audioEl) {
    audioEl = new Audio(SRC)
    audioEl.preload = 'auto'
    audioEl.addEventListener('ended', disarm)
  }
  return audioEl
}

export function playDone() {
  try {
    const a = getEl()
    if (!a) return synthChime()
    a.pause()
    a.currentTime = 0
    a.play()
      .then(arm)                 // started ok → allow the next interaction to stop it
      .catch(() => synthChime()) // no file / autoplay blocked → fall back to a generated chime
  } catch {
    synthChime()
  }
}

export function stopDone() {
  try { if (audioEl) { audioEl.pause(); audioEl.currentTime = 0 } } catch { /* ignore */ }
  disarm()
}

// stop playback the next time the user clicks or presses a key (deferred one tick so the
// click that triggered "done" doesn't immediately cancel the sound)
function arm() {
  if (armed) return
  setTimeout(() => {
    armed = true
    window.addEventListener('pointerdown', stopDone, { once: true })
    window.addEventListener('keydown', stopDone, { once: true })
  }, 0)
}
function disarm() {
  armed = false
  window.removeEventListener('pointerdown', stopDone)
  window.removeEventListener('keydown', stopDone)
}

// ---- fallback: a short two-note chime via the Web Audio API (no asset needed) ----
let ctx
function synthChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.value = 0.18
    master.connect(ctx.destination)
    ;[{ f: 660, t: 0 }, { f: 990, t: 0.11 }].forEach(({ f, t }) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = f
      o.connect(g); g.connect(master)
      const s = now + t
      g.gain.setValueAtTime(0.0001, s)
      g.gain.exponentialRampToValueAtTime(1, s + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22)
      o.start(s); o.stop(s + 0.24)
    })
  } catch { /* never let a sound error break the app */ }
}
