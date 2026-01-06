# SenseAudio 🎵

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-GPLv3-green.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Chrome%20Ext-orange.svg)
![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)

### Visual Theory & Creative Studio - A Sensement Music Project

**Powered by [SensementMusic.com](https://sensementmusic.com)**

> **Where Music Theory meets Pure JavaScript & Algorithmic Composition.**

**SenseAudio** is a dual-purpose web application designed for both **music education** and **creative production**. It bridges the gap between learning theory and applying it, using a lightweight architecture built entirely in **Vanilla JavaScript**.

Whether you are a student visualizing the Circle of Fifths or a producer looking for algorithmic melody ideas, this tool runs instantly in your browser with **zero dependencies**.

## 🌟 Core Philosophy

This project serves two distinct user groups:

### 1. 🎓 For Education (Theory & Structure)

Designed as a **"Sandbox for Music Theory,"** this tool allows educators to demonstrate complex concepts visually and interactively, moving beyond static textbook examples.

* **Visualizing Diatonic Relationships:** The **Interactive Circle of Fifths** (`CircleOfFifths.js`) connects directly to the piano roll. Teachers can demonstrate **modulation** instantly: clicking a new key shifts the grid's highlighted "safe notes," allowing students to *see* how scales overlap and diverge.

* **Instant Harmonic Feedback:** The `ChordCalculator` engine acts as a **real-time harmony spell-checker**. As students stack notes, the system analyzes intervals to identify chords (e.g., "C Major 7", "D min 9") immediately. This reinforces the connection between vertical note spacing and chord nomenclature.

* **The Math-Music Connection:** Educators can use the `MusicBrain` to teach **stochastic processes**. By observing how the Markov Chain algorithm generates melodies based on input probabilities, students can visualize the mathematical structure behind musical improvisation and style.

* **Safe Experimentation Environment:** With a robust **Undo/Redo History System** (`History.js`), students can experiment fearlessly. They can try complex progressions, make mistakes, and revert instantly, encouraging "learning by doing" rather than passive observation.

### 2. 🎹 For Production (The Creative Engine)

A capable sketching tool for your musical ideas.

* **Adaptive Style Generation:** The `MusicBrain` (Markov Chain) doesn't just output random notes. It analyzes the **statistical structure** of your current melody. If you write a jazz progression, it suggests jazzy continuations. If you write a simple pop melody, it adapts to that simplicity.

* **Multi-Instrument Support:** Switch between different synthesized tones defined in `InstrumentDefs.js` (e.g., Sine, Square, Sawtooth, Custom Synths) to hear how your melody sounds with different timbres.

* **Export Formats (MIDI & WAV):** Don't let your ideas stay in the browser. Use the `Exporter` to download standard **MIDI files** for your DAW, or render high-quality **WAV audio** directly from the engine.

## 📖 Comprehensive User Guide

### 1. The Workspace

The interface is divided into three logical zones:

* **Top Toolbar:** Controls for Playback (Play/Stop), Tempo (BPM), Instrument Selection, and global settings (Undo/Redo).

* **The Grid (Piano Roll):** The main canvas where horizontal axis represents Time and vertical axis represents Pitch. Light rows indicate "in-key" notes; dark rows are outside the selected scale.

* **Theory Panel (Bottom):** Houses the **Circle of Fifths** visualizer and Scale/Key selectors.

### 2. Controls & Interaction

Designed for speed and fluidity, similar to professional desktop DAWs:

**Mouse Actions:**

* **Create Note:** Click on any empty grid cell.

* **Select/Move:** Click and drag the center of an existing note to move it in time or pitch.

* **Resize Duration:** Hover over the right edge of a note (cursor changes) and drag to lengthen or shorten the note.

* **Delete:** (Depending on configuration) Right-click a note or Select + Press Delete.

**Keyboard Shortcuts:**

* `Spacebar`: Toggle Play/Pause.

* `Delete` / `Backspace`: Remove selected notes.

* `Ctrl + Z` / `Cmd + Z`: Undo last action.

* `Ctrl + Y` / `Cmd + Shift + Z`: Redo.

### 3. Theory & Composition Tools

* **Changing Keys:** Click on any slice of the **Circle of Fifths**. The entire grid will update immediately. Notes that were previously "correct" might dim, showing they are now out of key.

* **Scale Modes:** Use the dropdown to switch between Major, Minor, Dorian, etc. This filters which notes are highlighted on the grid.

* **Chord Hints:** Select a group of notes to see the detected chord name in the status bar (powered by `ChordCalculator`).

### 4. Algorithmic Generation (The "Brain")

1. **Prime the Engine:** The Markov Chain needs data to learn from. Draw at least 4-8 notes manually to establish a rhythm and interval pattern.

2. **Generate:** Click the **"Generate"** button. The AI will look at your last few notes and append a continuation that statistically matches your style.

3. **Iterate:** Don't like the result? Hit `Undo` (Ctrl+Z) and try generating again for a different variation.

### 5. Import & Export

* **Import MIDI:** Drag and drop any `.mid` file directly onto the canvas to load it. The `MidiParser` will map it to the grid.

* **Export MIDI:** Saves the current pattern as a standard MIDI file for use in Ableton, Logic, or FL Studio.

* **Export WAV:** Renders the internal audio engine's output to a high-quality `.wav` file for immediate listening.

## 🧠 Architecture Overview

The codebase is modular, making it an excellent resource for developers studying audio programming. Here is the complete breakdown of the JavaScript modules:

| Module | Role | Description |
| :--- | :--- | :--- |
| **`main.js`** | **Core** | The application entry point. Initializes all modules and sets up global event listeners. |
| **`State.js`** | **Store** | The "Single Source of Truth". Manages active notes, tempo, key, playback status, and settings. |
| **`MusicBrain.js`** | **Algo** | Implements Markov Chains to learn note transition probabilities and generate sequences. |
| **`AudioEngine.js`** | **Audio** | A low-latency wrapper around the Web Audio API. Handles real-time polyphony and gain staging. |
| **`Renderer.js`** | **View** | Handles the HTML5 Canvas drawing loop for the grid, notes, and playhead. |
| **`Interaction.js`** | **Events** | Bridges DOM events (Mouse/Keyboard) to State mutations (Click, Drag, Resize). |
| **`Exporter.js`** | **IO** | Handles data serialization. Generates `.mid` files and renders offline audio for `.wav` export. |
| **`History.js`** | **Util** | Manages the Undo/Redo stack, allowing users to revert changes safely. |
| **`InstrumentDefs.js`** | **Data** | Defines the synthesis parameters (ADSR envelopes, oscillator types) for different presets. |
| **`CircleOfFifths.js`** | **Theory** | Contains logic for calculating key signatures and rendering the circular visualizer. |
| **`ChordCalculator.js`** | **Theory** | Logic for determining appropriate chords based on the current scale and root note. |
| **`MidiParser.js`** | **IO** | Parses uploaded binary MIDI data into application-readable JSON format. |
| **`background.js`** | **Ext** | Chrome Extension service worker (handles lifecycle events when installed as an extension). |

## 🔮 Roadmap & Future Plans

The project is actively evolving. Here are the key features planned for upcoming releases:

### Global Music Support

* **Iranian Dastgahs & Microtonal Scales:** Implementing quarter-tone playback (Koron/Sori) and specific scale visualizations for **Persian musical modes**, Arabic Maqams, and other non-Western traditions.

* **Expanded Genre Models:** Pre-trained Markov models for specific styles including **Lo-Fi, Trap, Classical, and Ambient**.

### Platform Expansion

* **Official Store Releases:** Publishing the extension to **Chrome Web Store, Firefox Add-ons, and Microsoft Edge Add-ons** for one-click installation and automatic updates.

* **Native Mobile Apps:** Developing dedicated **iOS and Android applications** to bring the full production experience to mobile devices.

* **Responsive Design Overhaul:** Adapting the interface for seamless usage across **all screen sizes**, ensuring the workspace scales fluidly from desktop monitors to tablets and smartphones.

### Cloud & Connectivity

* **Cloud Ecosystem:** User authentication system to save projects to the cloud, allowing cross-device synchronization and community sharing.

* **AI Lyricist Integration:** Connecting to LLM APIs to generate lyrics based on the mood and structure of the composed melody.

### Smart Content Creation

* **High-Fidelity AI Rendering:** Integration with generative audio models (like **MusicGen** or Stable Audio) to transform MIDI sketches into fully produced, realistic audio tracks.

* **"Soundtrack the Web" (Extension Exclusive):** A context-menu feature to analyze the text/sentiment of any webpage and generate an instant, fitting background track.

* **Lyric-to-Melody Engine:** A reverse-generation tool where users input lyrics, and the engine composes a melody that fits the syllabic rhythm.

* **Social Media Presets:** Auto-formatting and time-boxing tools to generate loops specifically for **TikTok (15s/60s), YouTube Shorts, and Instagram Reels**.

### Core Improvements

* **Advanced Synthesis:** Adding Filters (LPF/HPF) and LFO modulation to the Audio Engine for richer sound design.

* **Touch Optimization:** Enhanced UI controls for better usability on tablets and touch screens.

## 🚀 Installation

### As a Chrome Extension

1. Clone this repository.

2. Go to `chrome://extensions/` > Enable **Developer mode**.

3. Click **Load unpacked** > Select folder.

### As a Web App

Simply open `index.html`. No build steps (npm/yarn) required.

> **💡 Note for Developers:** Because this project uses ES6 Modules, opening `index.html` directly via the file system (`file://`) may cause CORS errors in some browsers. For the best development experience, run a local server:
>
> ```bash
> # Python 3
> python -m http.server
> # Node.js (via npx)
> npx serve
> ```

## 🤝 Contributing & Feature Requests

We welcome contributions! Whether it's fixing bugs, improving the documentation, or proposing new features (like new instrument definitions), please feel free to fork the repository and submit a Pull Request.

🎶 Request a Music Style or Feature
Have a specific musical tradition or genre you want to see? (e.g., Persian Dastgahs, Indian Ragas, Lo-Fi patterns)?
Please open an Issue on GitHub with the label feature request. We prioritize community-requested styles and tools!

## 🛠 Tech Stack

* **Core:** Vanilla JavaScript (ES6+)

* **Audio:** Web Audio API (Native browser synthesis)

* **Graphics:** HTML5 Canvas (via `Renderer.js`) & CSS Grid

* **Data:** JSON (for MIDI parsing/exporting)

## ⚖️ License & Commercial Usage

**SenseAudio** is dual-licensed software.

### 1. Open Source License (GPLv3)

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This allows for free use in **educational, personal, and open-source projects**.

### 2. Commercial License

For proprietary use, closed-source distribution, or integration into commercial products without GPL restrictions, a **Commercial License** is available.

**Why buy a commercial license?**

* **Release your product under your own license** (non-GPL).

* **Direct technical support** from the SensementMusic team.

* **Legal assurance** and indemnification.

For commercial licensing inquiries, please contact: **licensing@sensementmusic.com**

**All branding, names, and associated assets are property of SensementMusic.com.**

---

**Made with ❤️, Logic, and 🎵 by the Sensement Music Team**