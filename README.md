# GestureSpeak: Universal Gesture NLP Assistant

GestureSpeak is a real-time, browser-based computer vision and natural language processing application. It translates universal hand gestures (requiring no user training to use) into words and phrases, compiles them into sentences, performs sentiment analysis (NLP), and reads them aloud using Text-to-Speech (TTS).

The visual design features a clean, high-tech dark theme utilizing glassmorphism panels, glowing borders, custom UI ranges, and responsive layouts.

## Features

- **Real-Time Hand Tracking**: Uses MediaPipe Hands to detect 21 3D hand joints and overlays a futuristic neon skeleton grid directly on top of the webcam feed.
- **Gesture Classification**: Uses robust geometric heuristics based on joint angles and relative distance vectors to recognize gestures regardless of rotation.
- **Sentence Compiler**: Integrates a progressive lock timer. Holding a gesture for a configurable duration (default: 1.2s) triggers audio chimes and appends the corresponding phrase to the workspace.
- **Web Audio Sound Effects**: Generates customized auditory feedback (ticks and confirmation chimes) locally using the Web Audio API without requiring any external audio downloads.
- **Text-to-Speech (TTS)**: Leverages the native Web Speech API to read sentences aloud, with settings to customize the voice, rate, pitch, and volume.
- **NLP Sentiment Analysis**: Tokenizes compiled sentences and scores them using a local lexicon dictionary. Updates positive, neutral, and negative metrics dynamically.
- **Interactive Control Center**: Includes configurations for hold durations, cooldown times, speech parameters, and video mirroring.
- **Activity Log Terminal**: Records historical events, actions taken, and speech commands in a simulated CLI interface.

## Universal Gesture Map

- **Open Hand**: Hello / Welcome
- **Thumbs Up**: Yes / Agree / Good
- **Thumbs Down**: No / Disagree / Bad
- **Peace Sign**: Peace / Victory
- **Fist**: Stop / Hold on
- **Rock On**: Awesome / Rock
- **Pointing Up**: Look / Question

## Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Grid), Vanilla ES6+ JavaScript.
- **Computer Vision**: MediaPipe Hands (CDN version) and MediaPipe Camera Utilities.
- **Audio Engines**: Web Audio API (Synthesizer Oscillators) and SpeechSynthesis API (Text-to-Speech).
- **Icons**: Lucide Icons.

## Local Setup

Since the application runs entirely client-side, no database or backend compilation is required.

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/ChelsaMJ/GestureSpeak.git
   ```

2. Open the project directory:
   ```bash
   cd GestureSpeak
   ```

3. Start a local HTTP server. For example, using Python:
   ```bash
   python -m http.server 8000
   ```

4. Open your web browser and navigate to:
   ```
   http://localhost:8000
   ```

5. Click the "Initialize Engine" button on the welcome card and allow camera access when prompted.
