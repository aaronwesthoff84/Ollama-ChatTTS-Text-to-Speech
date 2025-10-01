
# Ollama ChatTTS Text-to-Speech Web UI

A powerful web application that converts text into high-quality, natural-sounding speech using a locally running [Ollama](https://ollama.com/) instance and the [linmaobang/chattts-ollama](https://ollama.com/linmaobang/chattts-ollama) model.

## ✨ Features

-   **Local First**: All text-to-speech processing happens on your local machine, ensuring privacy and offline capability.
-   **High-Quality Audio**: Leverages the advanced ChatTTS model for clear and natural speech.
-   **Simple Interface**: A clean and straightforward UI to enter text and generate audio.
-   **Playback Controls**: Adjust the playback speed for the generated audio clip.
-   **Downloadable Audio**: Save the generated audio as a `.wav` file.
-   **Light & Dark Mode**: A sleek, modern UI that adapts to your system's theme.
-   **Responsive Design**: Works beautifully on both desktop and mobile devices.

## 🚀 How to Run

This application requires a local Ollama server to be running with the correct model installed.

**Prerequisites:**
*   [Ollama](https://ollama.com/) installed on your system.
*   A simple web server. We provide instructions for Python's built-in server and a Node.js-based one.

**Step-by-Step Instructions:**

1.  **Install and Run Ollama**
    Follow the official instructions to [download and install Ollama](https://ollama.com/) for your operating system.

2.  **Pull the ChatTTS Model**
    Open your terminal or command prompt and run the following command to download the text-to-speech model. This may take some time and requires a significant amount of disk space.
    ```bash
    ollama pull linmaobang/chattts-ollama
    ```
    Once downloaded, Ollama will automatically serve this model when requested by the web app.

3.  **Download the Project Files**
    Download or clone this repository to your local machine. If using Git, open your terminal and run:
    ```bash
    git clone https://github.com/your-username/ollama-chattts-text-to-speech # Replace with the actual repo URL
    ```

4.  **Navigate to the Project Directory**
    Change your current directory to the project folder you just downloaded:
    ```bash
    cd ollama-chattts-text-to-speech
    ```
    All subsequent commands should be run from inside this directory.

5.  **Start the Local Web Server**
    This project is a static website and needs to be served by a web server to function correctly (you cannot just open `index.html` from your file system).

    Choose **one** of the following methods from your terminal:

    *   **Using Python (if you have Python installed):**
        ```bash
        # For Python 3
        python3 -m venv venv
        source venv/bin/activate
        python3 -m http.server
        ```

    *   **Using Node.js (if you have Node.js and npm installed):**
        This command uses `npx` to run a server without installing it globally.
        ```bash
        npx serve
        ```

6.  **Open the Application**
    Once the server is running, it will print a local address in your terminal. It will likely be one of these:
    *   `http://localhost:8000`
    *   `http://127.0.0.1:8000`
    *   `http://localhost:3000` (if using `npx serve`)

    Open this URL in your web browser to use the application.


## 📁 Repository Structure

```
├── index.html          # Main HTML entry point
├── index.css           # Stylesheet for the application
├── index.tsx           # Main React application logic
├── metadata.json       # Configuration for Google AI Studio (can be ignored for local use)
└── README.md           # This file
```

## 🛠️ Usage Examples

### Basic Usage
1.  **Enter Script**: Type your text into the "Your Script" area.
2.  **Generate**: Click "Generate Audio".
3.  **Listen**: The audio will be generated and will appear in the "Generated Audio" section.

### Using Special Tokens
The ChatTTS model supports special tokens to control the audio output.

**Example Script:**
```
[oral_2][laugh_0][break_6]I'm not a native speaker, but I'm trying my best.
```
- `[oral_N]`: Controls the "oral" quality (e.g., how wet the mouth sounds).
- `[laugh_N]`: Can introduce laughter.
- `[break_N]`: Inserts a pause.

Experiment with these tokens in your script to change the performance.

## 🐛 Troubleshooting

### "Failed to fetch" or "Could not connect to Ollama" error
-   **Ollama Not Running**: Ensure the Ollama application is running on your computer. You should see an Ollama icon in your system tray or menu bar.
-   **Firewall/CORS Issues**: Your browser is trying to connect to `http://localhost:11434`. Ensure no firewall is blocking this connection. If you are running Ollama on a different machine or have custom CORS policies, you may need to [configure Ollama's allowed origins](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-expose-ollama-on-my-network).

### "No audio data received from Ollama" error
-   **Model Not Pulled**: Make sure you have successfully run `ollama pull linmaobang/chattts-ollama`.
-   **Ollama Error**: Check the terminal where you started Ollama (or its logs) for any error messages when you click the "Generate Audio" button. The model may have failed to load.
