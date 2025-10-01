// Note: This file mirrors the TypeScript React app but written as plain JS for use with UMD React + Babel in the browser.
const { useState, useCallback, useEffect, useRef } = React;

function createWavHeader(dataLength, options) {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  view.setUint8(0, 'R'.charCodeAt(0));
  view.setUint8(1, 'I'.charCodeAt(0));
  view.setUint8(2, 'F'.charCodeAt(0));
  view.setUint8(3, 'F'.charCodeAt(0));
  view.setUint32(4, 36 + dataLength, true);
  view.setUint8(8, 'W'.charCodeAt(0));
  view.setUint8(9, 'A'.charCodeAt(0));
  view.setUint8(10, 'V'.charCodeAt(0));
  view.setUint8(11, 'E'.charCodeAt(0));
  view.setUint8(12, 'f'.charCodeAt(0));
  view.setUint8(13, 'm'.charCodeAt(0));
  view.setUint8(14, 't'.charCodeAt(0));
  view.setUint8(15, ' '.charCodeAt(0));
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint8(36, 'd'.charCodeAt(0));
  view.setUint8(37, 'a'.charCodeAt(0));
  view.setUint8(38, 't'.charCodeAt(0));
  view.setUint8(39, 'a'.charCodeAt(0));
  view.setUint32(40, dataLength, true);

  return buffer;
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(view) {
  if (view instanceof ArrayBuffer) return view;
  if (view instanceof Uint8Array) {
    if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength) {
      return view.buffer;
    }
    return view.slice().buffer;
  }
  return new Uint8Array(view).buffer;
}

const MAX_SCRIPT_LENGTH = 5000;
const initialScript = `Read aloud in a warm, welcoming tone

Welcome to the future of audio generation.`;

function getInitialTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const [script, setScript] = useState(initialScript);
  const [isLoading, setIsLoading] = useState(false);
  const [audios, setAudios] = useState([]);
  const [playbackSpeeds, setPlaybackSpeeds] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(getInitialTheme);
  const [model, setModel] = useState('legraphista/Orpheus:3b-ft-q8');
  const audioRefs = useRef([]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSpeedChange = (index, speed) => {
    const audioEl = audioRefs.current[index];
    if (audioEl) audioEl.playbackRate = speed;
    const newSpeeds = [...playbackSpeeds];
    newSpeeds[index] = speed;
    setPlaybackSpeeds(newSpeeds);
  };

  const handleGenerateAudio = useCallback(async () => {
    if (!script.trim()) {
      setError('Please enter a script to generate audio.');
      return;
    }
    if (script.length > MAX_SCRIPT_LENGTH) {
      setError(`Script exceeds the maximum length of ${MAX_SCRIPT_LENGTH} characters.`);
      return;
    }

    setIsLoading(true);
    setAudios([]);
    setPlaybackSpeeds([]);
    setError('');
    setStatusMessage('Sending request to Ollama...');

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, prompt: script, stream: false, options: { seed:42, temperature:0.3 } }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      if (data.audio) {
        setStatusMessage('Processing audio data...');
        const pcmData = base64ToUint8Array(data.audio);
        const wavOptions = { numChannels: 1, sampleRate: 24000, bitsPerSample: 16 };
        const wavHeader = createWavHeader(pcmData.byteLength, wavOptions);
        const wavBlob = new Blob([wavHeader, toArrayBuffer(pcmData)], { type: 'audio/wav' });
        const url = URL.createObjectURL(wavBlob);
        setAudios([{ name: 'ollama_output.wav', url }]);
        setPlaybackSpeeds([1]);
        setStatusMessage('Audio generation complete!');
      } else {
        throw new Error('No audio data received from Ollama. Ensure the model is running correctly.');
      }
    } catch (err) {
      console.error('Error generating audio with Ollama:', err);
      let errorMessage = `An error occurred: ${err.message}`;
      if (err.message.includes('Failed to fetch')) {
        errorMessage += ' Could not connect to Ollama. Please ensure the Ollama server is running and accessible at http://localhost:11434.';
      }
      setError(errorMessage);
      setStatusMessage('');
    } finally {
      setIsLoading(false);
    }
  }, [script]);

  return (
    React.createElement('div', { className: 'app-container' },
      React.createElement('header', null,
        React.createElement('div', { className: 'header-content' },
          React.createElement('h1', null, 'Ollama ChatTTS Text-to-Speech'),
          React.createElement('p', { className: 'description' }, 'Enter some text and generate audio using your local Ollama ChatTTS model.')
        ),
        React.createElement('button', { onClick: toggleTheme, className: 'theme-toggle', 'aria-label': `Switch to ${theme === 'light' ? 'dark' : 'light'} mode` },
          React.createElement('svg', { className: 'icon-sun', xmlns: 'http://www.w3.org/2000/svg', width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('circle', { cx: 12, cy: 12, r: 5 }),
            React.createElement('line', { x1: 12, y1: 1, x2: 12, y2: 3 }),
            React.createElement('line', { x1: 12, y1: 21, x2: 12, y2: 23 }),
            React.createElement('line', { x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 }),
            React.createElement('line', { x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 }),
            React.createElement('line', { x1: 1, y1: 12, x2: 3, y2: 12 }),
            React.createElement('line', { x1: 21, y1: 12, x2: 23, y2: 12 }),
            React.createElement('line', { x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 }),
            React.createElement('line', { x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 })
          ),
          React.createElement('svg', { className: 'icon-moon', xmlns: 'http://www.w3.org/2000/svg', width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' })
          )
        )
      ),
      React.createElement('main', null,
        React.createElement('div', { className: 'input-section' },
          React.createElement('label', { htmlFor: 'script-input' }, 'Your Script'),
            React.createElement('textarea', {
              id: 'script-input', value: script, onChange: (e) => setScript(e.target.value), disabled: isLoading, 'aria-label': 'Script input for text to speech', placeholder: 'Enter your script here...'
            }),
            React.createElement('label', { htmlFor: 'model-input', style: { marginTop: 8, display: 'block' } }, 'Model'),
            React.createElement('input', { id: 'model-input', type: 'text', value: model, onChange: (e) => setModel(e.target.value), disabled: isLoading, 'aria-label': 'Ollama model identifier', placeholder: 'e.g. legraphista/Orpheus:3b-ft-q8' }),
            React.createElement('div', { className: `char-counter ${script.length > MAX_SCRIPT_LENGTH ? 'error' : ''}` }, `${script.length} / ${MAX_SCRIPT_LENGTH}`)
        ),
        React.createElement('div', { className: 'controls' },
          React.createElement('button', { onClick: handleGenerateAudio, disabled: isLoading }, isLoading ? React.createElement('span', { className: 'loader' }) : null, isLoading ? 'Generating...' : 'Generate Audio')
        ),
        statusMessage && !error ? React.createElement('div', { className: 'status-message info' }, statusMessage) : null,
        error ? React.createElement('div', { className: 'status-message error' }, error) : null,
        audios.length > 0 ? React.createElement('section', { className: 'output-section' },
          React.createElement('h2', null, 'Generated Audio'),
          React.createElement('ul', { id: 'audio-list' },
            audios.map((audio, index) => React.createElement('li', { key: index, className: 'audio-item' },
              React.createElement('span', { className: 'audio-info' }, audio.name),
              React.createElement('div', { className: 'audio-controls' },
                React.createElement('select', {
                  className: 'speed-control', title: 'Playback Speed', value: playbackSpeeds[index] || 1, onChange: (e) => handleSpeedChange(index, parseFloat(e.target.value)), 'aria-label': `Playback speed for ${audio.name}`
                },
                  React.createElement('option', { value: '2' }, '2.0 X'),
                  React.createElement('option', { value: '1.75' }, '1.75 X'),
                  React.createElement('option', { value: '1.5' }, '1.5 X'),
                  React.createElement('option', { value: '1.25' }, '1.25 X'),
                  React.createElement('option', { value: '1' }, 'Normal'),
                  React.createElement('option', { value: '0.75' }, '0.75 X'),
                  React.createElement('option', { value: '0.5' }, '0.5 X'),
                  React.createElement('option', { value: '0.25' }, '0.25 X')
                ),
                React.createElement('audio', { ref: (el) => { audioRefs.current[index] = el; }, controls: true, src: audio.url, 'aria-label': `Playback for ${audio.name}` }),
                React.createElement('a', { href: audio.url, download: audio.name, className: 'download-btn', 'aria-label': `Download ${audio.name}` }, 'Download')
              )
            ))
          )
        ) : null
      )
    )
  );
}

const container = document.getElementById('root');
ReactDOM.createRoot(container).render(React.createElement(App));
