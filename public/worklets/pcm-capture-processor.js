// AudioWorkletProcessor — runs on the audio rendering thread, off the main
// thread (unlike the deprecated ScriptProcessorNode), so it doesn't jank on
// mobile. Converts each 128-sample Float32 render quantum to 16-bit signed
// PCM (what Deepgram's linear16 encoding expects) and posts it to the main
// thread, batched into ~20ms frames to keep postMessage() calls reasonable.
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = []
    this._samplesPerFrame = Math.round(sampleRate * 0.02) // ~20ms per frame
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true
    const channel = input[0]
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]))
      this._buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff)
    }
    while (this._buffer.length >= this._samplesPerFrame) {
      const frame = this._buffer.splice(0, this._samplesPerFrame)
      const pcm16 = new Int16Array(frame.length)
      for (let i = 0; i < frame.length; i++) pcm16[i] = frame[i]
      this.port.postMessage(pcm16.buffer, [pcm16.buffer])
    }
    return true
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor)
