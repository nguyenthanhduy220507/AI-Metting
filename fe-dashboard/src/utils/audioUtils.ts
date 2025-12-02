/**
 * Audio utility functions for recording and processing
 */

/**
 * Convert audio blob to WAV format
 */
export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create WAV file
  const wav = audioBufferToWav(audioBuffer);
  return new Blob([wav], { type: 'audio/wav' });
}

/**
 * Convert AudioBuffer to WAV format
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Convert audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

/**
 * Analyze audio buffer to generate waveform data
 */
export async function analyzeAudio(audioBlob: Blob, bars: number = 200): Promise<number[]> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / bars);
  const waveform: number[] = [];

  for (let i = 0; i < bars; i++) {
    let sum = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);

    for (let j = start; j < end; j++) {
      sum += Math.abs(channelData[j]);
    }

    const average = sum / (end - start);
    waveform.push(average);
  }

  // Normalize to 0-1 range
  const max = Math.max(...waveform);
  return waveform.map((value) => (max > 0 ? value / max : 0));
}

/**
 * Trim silence from beginning and end of audio
 */
export async function trimSilence(audioBlob: Blob, threshold: number = -40, minSilenceDuration: number = 200): Promise<Blob> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const thresholdLinear = Math.pow(10, threshold / 20);
  const minSilenceSamples = Math.floor((minSilenceDuration / 1000) * sampleRate);

  // Find start (skip silence at beginning)
  let startIndex = 0;
  let silenceCount = 0;
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) < thresholdLinear) {
      silenceCount++;
      if (silenceCount >= minSilenceSamples) {
        startIndex = i - minSilenceSamples;
        break;
      }
    } else {
      silenceCount = 0;
    }
  }

  // Find end (skip silence at end)
  let endIndex = channelData.length;
  silenceCount = 0;
  for (let i = channelData.length - 1; i >= 0; i--) {
    if (Math.abs(channelData[i]) < thresholdLinear) {
      silenceCount++;
      if (silenceCount >= minSilenceSamples) {
        endIndex = i + minSilenceSamples;
        break;
      }
    } else {
      silenceCount = 0;
    }
  }

  // Ensure we have at least some audio
  if (endIndex <= startIndex) {
    startIndex = 0;
    endIndex = channelData.length;
  }

  // Create new audio buffer with trimmed data
  const trimmedLength = endIndex - startIndex;
  const trimmedBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    trimmedLength,
    sampleRate
  );

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const originalData = audioBuffer.getChannelData(channel);
    const trimmedData = trimmedBuffer.getChannelData(channel);
    for (let i = 0; i < trimmedLength; i++) {
      trimmedData[i] = originalData[startIndex + i];
    }
  }

  // Convert back to blob
  const wav = audioBufferToWav(trimmedBuffer);
  return new Blob([wav], { type: 'audio/wav' });
}

/**
 * Convert blob to File object
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

