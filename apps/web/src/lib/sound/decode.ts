/**
 * Lectura de audio en el navegador. Los archivos no salen de la compu.
 * Chrome no decodifica AIFF, así que ese formato se lee a mano.
 */

interface Pcm {
  rate: number
  channels: Float32Array[]
}

/** AIFF y AIFF-C sin compresión (NONE, twos, sowt), 8 a 32 bits. */
function parseAiff(buf: ArrayBuffer): Pcm | null {
  const v = new DataView(buf)
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3))
  if (buf.byteLength < 12 || tag(0) !== 'FORM' || !['AIFF', 'AIFC'].includes(tag(8))) return null
  let nch = 0
  let frames = 0
  let bits = 0
  let rate = 0
  let little = false
  let data = -1
  for (let o = 12; o + 8 <= buf.byteLength; ) {
    const id = tag(o)
    const size = v.getUint32(o + 4)
    if (id === 'COMM') {
      nch = v.getInt16(o + 8)
      frames = v.getUint32(o + 10)
      bits = v.getInt16(o + 14)
      // frecuencia en punto flotante extendido de 80 bits
      const exp = v.getUint16(o + 16) & 0x7fff
      rate = (v.getUint32(o + 18) * 2 ** (exp - 16383 - 31)) | 0
      if (size > 18) {
        const comp = tag(o + 26)
        if (comp === 'sowt') little = true
        else if (!['NONE', 'twos'].includes(comp)) return null
      }
    } else if (id === 'SSND') data = o + 16 + v.getUint32(o + 8)
    o += 8 + size + (size & 1)
  }
  const bytes = bits / 8
  if (!nch || !rate || data < 0 || ![1, 2, 3, 4].includes(bytes)) return null
  frames = Math.min(frames, Math.floor((buf.byteLength - data) / (bytes * nch)))
  const channels = Array.from({ length: nch }, () => new Float32Array(frames))
  const scale = 1 / 2 ** (bits - 1)
  for (let f = 0, o = data; f < frames; f++) {
    for (let c = 0; c < nch; c++, o += bytes) {
      let s: number
      if (bytes === 2) s = v.getInt16(o, little)
      else if (bytes === 3) s = little ? ((v.getInt8(o + 2) << 16) | (v.getUint8(o + 1) << 8) | v.getUint8(o)) : ((v.getInt8(o) << 16) | (v.getUint8(o + 1) << 8) | v.getUint8(o + 2))
      else if (bytes === 4) s = v.getInt32(o, little)
      else s = v.getInt8(o)
      channels[c][f] = s * scale
    }
  }
  return { rate, channels }
}

const isAiff = (file: File) => /\.aiff?$/i.test(file.name)

/** Audio mono a 16 kHz, como lo espera el modelo de sonido. */
export async function decodeTo16k(file: File): Promise<Float32Array | null> {
  const buf = await file.arrayBuffer()
  if (isAiff(file)) {
    const pcm = parseAiff(buf)
    if (!pcm) return null
    const n = pcm.channels[0].length
    const ctx = new OfflineAudioContext(1, Math.ceil((n / pcm.rate) * 16000), 16000)
    const src = ctx.createBufferSource()
    const ab = ctx.createBuffer(pcm.channels.length, n, pcm.rate)
    pcm.channels.forEach((ch, c) => ab.copyToChannel(ch as Float32Array<ArrayBuffer>, c))
    src.buffer = ab
    src.connect(ctx.destination)
    src.start()
    return (await ctx.startRendering()).getChannelData(0)
  }
  try {
    // decodeAudioData remuestrea a la frecuencia del contexto
    const ab = await new OfflineAudioContext(1, 1, 16000).decodeAudioData(buf)
    const out = new Float32Array(ab.length)
    for (let c = 0; c < ab.numberOfChannels; c++) {
      const ch = ab.getChannelData(c)
      for (let i = 0; i < out.length; i++) out[i] += ch[i] / ab.numberOfChannels
    }
    return out
  } catch {
    return null
  }
}

/** URL reproducible de un archivo local. AIFF se pasa a WAV en memoria para que Chrome lo pueda tocar. */
export async function playableUrl(file: File): Promise<string> {
  if (!isAiff(file) || new Audio().canPlayType('audio/aiff')) return URL.createObjectURL(file)
  const pcm = parseAiff(await file.arrayBuffer())
  if (!pcm) return URL.createObjectURL(file)
  const nch = Math.min(2, pcm.channels.length)
  const n = pcm.channels[0].length
  const wav = new DataView(new ArrayBuffer(44 + n * nch * 2))
  const put = (o: number, s: string) => [...s].forEach((ch, i) => wav.setUint8(o + i, ch.charCodeAt(0)))
  put(0, 'RIFF')
  wav.setUint32(4, 36 + n * nch * 2, true)
  put(8, 'WAVEfmt ')
  wav.setUint32(16, 16, true)
  wav.setUint16(20, 1, true)
  wav.setUint16(22, nch, true)
  wav.setUint32(24, pcm.rate, true)
  wav.setUint32(28, pcm.rate * nch * 2, true)
  wav.setUint16(32, nch * 2, true)
  wav.setUint16(34, 16, true)
  put(36, 'data')
  wav.setUint32(40, n * nch * 2, true)
  for (let f = 0, o = 44; f < n; f++) for (let c = 0; c < nch; c++, o += 2) wav.setInt16(o, Math.max(-1, Math.min(1, pcm.channels[c][f])) * 32767, true)
  return URL.createObjectURL(new Blob([wav.buffer], { type: 'audio/wav' }))
}
