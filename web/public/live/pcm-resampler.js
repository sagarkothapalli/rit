/* Praja RTI live intake — microphone tap → mono 16-bit PCM @ 16 kHz.
   Posts { type: "pcm", buffer: ArrayBuffer } every ~100 ms to the main thread.
   The node is muted downstream; audio leaves the page only as base64 chunks. */
class Pcm16kResampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000; // `sampleRate` is the context rate (worklet global)
    this.k = 0; // output sample index (global)
    this.consumed = 0; // input samples dropped from the front of `pending`
    this.pending = []; // input samples not yet consumed
    this.chunk = []; // pending int16 values
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0] && input[0].length > 0) {
      const channel = input[0];
      for (let i = 0; i < channel.length; i++) this.pending.push(channel[i]);
      this.emit();
    }
    return true;
  }

  emit() {
    const p = this.pending;
    for (;;) {
      const t = this.k * this.ratio - this.consumed; // output position in pending coords
      const i0 = Math.floor(t);
      const frac = t - i0;
      if (i0 < 0) {
        this.k++;
        continue;
      }
      if (i0 >= p.length) break;
      if (frac > 0 && i0 + 1 >= p.length) break; // interpolation needs one more sample
      const a = p[i0];
      const b = frac > 0 ? p[i0 + 1] : a;
      const s = Math.max(-1, Math.min(1, a + (b - a) * frac));
      this.chunk.push(s < 0 ? Math.round(s * 32768) : Math.round(s * 32767));
      this.k++;
      const removable = i0 + 1; // consumed prefix; next output never needs it back
      if (removable > 0) {
        p.splice(0, removable);
        this.consumed += removable;
      }
    }
    if (this.chunk.length >= 1600) this.flush(); // ~100 ms at 16 kHz
  }

  flush() {
    if (this.chunk.length === 0) return;
    const buf = new Int16Array(this.chunk).buffer;
    this.port.postMessage({ type: "pcm", buffer: buf }, [buf]);
    this.chunk = [];
  }
}

registerProcessor("pcm16k-resampler", Pcm16kResampler);
