/**
 * Decima un AudioBuffer a N peaks (un peak = abs-max por bucket).
 * Para una pista de 5 min @ 44.1kHz son 13M samples → bajamos a ~1500 puntos
 * para renderizar fluido. Los peaks se persisten en IDB para no recalcular.
 */
export function generatePeaks(buffer: AudioBuffer, points = 1500): number[] {
  // Promediamos canales para tener una forma mono representativa
  const channels = buffer.numberOfChannels
  const length = buffer.length
  const bucketSize = Math.floor(length / points)
  if (bucketSize === 0) return []

  const channelData: Float32Array[] = []
  for (let c = 0; c < channels; c++) {
    channelData.push(buffer.getChannelData(c))
  }

  const peaks = new Array<number>(points)
  for (let i = 0; i < points; i++) {
    const start = i * bucketSize
    const end = start + bucketSize
    let max = 0
    for (let j = start; j < end; j++) {
      let sum = 0
      for (let c = 0; c < channels; c++) sum += Math.abs(channelData[c][j])
      const v = sum / channels
      if (v > max) max = v
    }
    peaks[i] = max
  }

  // Normalizar [0, 1]
  let peak = 0
  for (const v of peaks) if (v > peak) peak = v
  if (peak > 0) {
    for (let i = 0; i < peaks.length; i++) peaks[i] /= peak
  }
  return peaks
}
