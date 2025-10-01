// FIX: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
// FIX: 'ReactDOM' refers to a UMD global, but the current file is a module. Consider adding an import instead.
// FIX: Property 'createRoot' does not exist on type 'typeof import(".../node_modules/@types/react-dom/index")'.
// All errors are resolved by changing from UMD globals to importing React and ReactDOM as ES modules.
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// --- Browser-compatible WAV conversion utilities ---

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function createWavHeader(dataLength: number, options: WavConversionOptions): ArrayBuffer {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint8(0, 'R'.charCodeAt(0));
  view.setUint8(1, 'I'.charCodeAt(0));
  view.setUint8(2, 'F'.charCodeAt(0));
  view.setUint8(3, 'F'.charCodeAt(0));
  // RIFF chunk size
  view.setUint32(4, 36 + dataLength, true);
  // WAVE identifier
  view.setUint8(8, 'W'.charCodeAt(0));
  view.setUint8(9, 'A'.charCodeAt(0));
  view.setUint8(10, 'V'.charCodeAt(0));
  view.setUint8(11, 'E'.charCodeAt(0));
  // fmt sub-chunk identifier
  view.setUint8(12, 'f'.charCodeAt(0));
  view.setUint8(13, 'm'.charCodeAt(0));
  view.setUint8(14, 't'.charCodeAt(0));
  view.setUint8(15, ' '.charCodeAt(0));
  // fmt chunk size
  view.setUint32(16, 16, true);
  // Audio format (1 is PCM)
  view.setUint16(20, 1, true);
  // Number of channels
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate
  view.setUint32(28, byteRate, true);
  // Block align
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, bitsPerSample, true);
  // data sub-chunk identifier
  view.setUint8(36, 'd'.charCodeAt(0));
  view.setUint8(37, 'a'.charCodeAt(0));
  view.setUint8(38, 't'.charCodeAt(0));
  view.setUint8(39, 'a'.charCodeAt(0));
  // data chunk size
  view.setUint32(40, dataLength, true);

  return buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Ensure we pass an actual ArrayBuffer (not a generic ArrayBufferLike) to Blob
function toArrayBuffer(view: Uint8Array | ArrayBufferLike): ArrayBuffer {
  if (view instanceof ArrayBuffer) return view;
  if (view instanceof Uint8Array) {
    // If the Uint8Array covers the whole underlying buffer, we can return it directly
    if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength) {
      return view.buffer as ArrayBuffer;
    }
    // Otherwise create a copy into a new ArrayBuffer
    return view.slice().buffer as ArrayBuffer;
  }
  // For other ArrayBufferLike (e.g., SharedArrayBuffer) create a copy
  return new Uint8Array(view as ArrayBufferLike).buffer as ArrayBuffer;
}

// --- React App Component ---

const MAX_SCRIPT_LENGTH = 5000;

const initialScript = `[oral_2][laugh_0][break_6]I'm not a native speaker, but I'm trying my best.`;

interface GeneratedAudio {
  name: string;
  url: string;
}

const getInitialTheme = (): string => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};


const App = () => {
  const [script, setScript] = useState<string>(initialScript);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audios, setAudios] = useState<GeneratedAudio[]>([]);
  const [playbackSpeeds, setPlaybackSpeeds] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [theme, setTheme] = useState<string>(getInitialTheme);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);


  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme((prevTheme: string) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSpeedChange = (index: number, speed: number) => {
    const audioEl = audioRefs.current[index];
    if (audioEl) {
        audioEl.playbackRate = speed;
    }
    const newSpeeds = [...playbackSpeeds];
    newSpeeds[index] = speed;
    setPlaybackSpeeds(newSpeeds);
  };

  const handleGenerateAudio = useCallback(async () => {
    // --- Input Validation ---
    if (!script.trim()) {
      setError("Please enter a script to generate audio.");
      return;
    }

    if (script.length > MAX_SCRIPT_LENGTH) {
      setError(`Script exceeds the maximum length of ${MAX_SCRIPT_LENGTH} characters.`);
      return;
    }
    // --- End Validation ---

    setIsLoading(true);
    setAudios([]);
    setPlaybackSpeeds([]);
    setError('');
    setStatusMessage('Sending request to Ollama...');

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'legraphista/Orpheus:3b-ft-q8',
          prompt: script,
          stream: false,
          options: {
            seed: 42,
            temperature: 0.3
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}. ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.audio) {
        setStatusMessage('Processing audio data...');
        const pcmData = base64ToUint8Array(data.audio);
        const wavOptions = {
          numChannels: 1,
          sampleRate: 24000,
          bitsPerSample: 16
        };
        const wavHeader = createWavHeader(pcmData.byteLength, wavOptions);
  const wavBlob = new Blob([wavHeader, toArrayBuffer(pcmData)], { type: 'audio/wav' });
        const url = URL.createObjectURL(wavBlob);
        
        const newAudio = {
          name: `ollama_output.wav`,
          url: url,
        };
        
        setAudios([newAudio]);
        setPlaybackSpeeds([1]);
        setStatusMessage('Audio generation complete!');
      } else {
        throw new Error('No audio data received from Ollama. Ensure the model is running correctly.');
      }

    } catch (err) {
      console.error('Error generating audio with Ollama:', err);
      let errorMessage = `An error occurred: ${(err as Error).message}`;
      if ((err as Error).message.includes('Failed to fetch')) {
          errorMessage += ' Could not connect to Ollama. Please ensure the Ollama server is running and accessible at http://localhost:11434.';
      }
      setError(errorMessage);
      setStatusMessage('');
    } finally {
      setIsLoading(false);
    }
  }, [script]);

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <h1>Ollama ChatTTS Text-to-Speech</h1>
          <p className="description">
              Enter some text and generate audio using your local Ollama ChatTTS model.
          </p>
        </div>
        <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            <svg className="icon-sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            <svg className="icon-moon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        </button>
      </header>
      <main>
        <div className="input-section">
          <label htmlFor="script-input">Your Script</label>
          <textarea
            id="script-input"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            disabled={isLoading}
            aria-label="Script input for text to speech"
            placeholder="Enter your script here..."
          />
           <div className={`char-counter ${script.length > MAX_SCRIPT_LENGTH ? 'error' : ''}`}>
            {script.length} / {MAX_SCRIPT_LENGTH}
          </div>
        </div>
        
        <div className="controls">
          <button onClick={handleGenerateAudio} disabled={isLoading}>
            {isLoading && <span className="loader"></span>}
            {isLoading ? 'Generating...' : 'Generate Audio'}
          </button>
        </div>
        
        {(statusMessage && !error) && <div className="status-message info">{statusMessage}</div>}
        {error && <div className="status-message error">{error}</div>}

        {audios.length > 0 && (
          <section className="output-section">
            <h2>Generated Audio</h2>
            <ul id="audio-list">
              {audios.map((audio, index) => (
                <li key={index} className="audio-item">
                  <span className="audio-info">{audio.name}</span>
                  <div className="audio-controls">
                    <select
                        className="speed-control"
                        title="Playback Speed"
                        value={playbackSpeeds[index] || 1}
                        onChange={(e) => handleSpeedChange(index, parseFloat(e.target.value))}
                        aria-label={`Playback speed for ${audio.name}`}
                    >
                        <option value="2">2.0 X</option>
                        <option value="1.75">1.75 X</option>
                        <option value="1.5">1.5 X</option>
                        <option value="1.25">1.25 X</option>
                        <option value="1">Normal</option>
                        <option value="0.75">0.75 X</option>
                        <option value="0.5">0.5 X</option>
                        <option value="0.25">0.25 X</option>
                    </select>
                    <audio
                        ref={(el) => { audioRefs.current[index] = el; }}
                        controls 
                        src={audio.url} 
                        aria-label={`Playback for ${audio.name}`}
                    ></audio>
                    <a href={audio.url} download={audio.name} className="download-btn" aria-label={`Download ${audio.name}`}>
                      Download
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container!);
root.render(<App />);