/* ============================================================
   Browser audio helpers for the live intake: base64 PCM codecs
   and a playback queue that flushes instantly on barge-in.
   ============================================================ */

export interface PlaybackQueue {
  enqueueBase64(base64: string): void;
  flush(): void;
  dispose(): void;
}

export function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    for (let j = 0; j < slice.length; j++) binary += String.fromCharCode(slice[j]);
  }
  return btoa(binary);
}

export function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  if (binary.length % 2 !== 0) return new Int16Array(0);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export function createPlaybackQueue(ctx: AudioContext, rate = 24000): PlaybackQueue {
  let nextTime = 0;
  const sources = new Set<AudioBufferSourceNode>();

  function enqueueBase64(base64: string) {
    if (ctx.state === "closed") return;
    const samples = base64ToInt16(base64);
    if (samples.length === 0) return;
    const audio = ctx.createBuffer(1, samples.length, rate);
    const channel = audio.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
    const source = ctx.createBufferSource();
    source.buffer = audio;
    source.connect(ctx.destination);
    const at = Math.max(nextTime, ctx.currentTime + 0.02);
    source.start(at);
    nextTime = at + audio.duration;
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
    };
  }

  function flush() {
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    sources.clear();
    nextTime = ctx.currentTime + 0.05;
  }

  return { enqueueBase64, flush, dispose: flush };
}
