/*
 * SenseAudio - Visual Theory & Creative Studio
 * Copyright (C) 2026 SensementMusic.com
 *
 * This file is part of SenseAudio (A Sensement Music Project).
 *
 * SenseAudio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SenseAudio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SenseAudio. If not, see <https://www.gnu.org/licenses/>.
 *
 * All branding, logos, and the name "Sensement Music" are properties of SensementMusic.com.
 */

/**
 * Class representing the Chord Calculator module.
 * Handles UI interactions, chord calculations, and piano visualization.
 */
export default class ChordCalculator {
    /**
     * Creates an instance of ChordCalculator.
     * @param {string} containerId - The ID of the DOM element to contain the calculator.
     * @param {Object} state - The global application state.
     * @param {Object} audioEngine - The audio engine instance for playback.
     */
    constructor(containerId, state, audioEngine) {
        this.container = document.getElementById(containerId);
        this.state = state;
        this.audio = audioEngine;

        // UI Elements
        this.rootSelect = document.getElementById('calcRoot');
        this.typeSelect = document.getElementById('calcType');
        this.octaveInput = document.getElementById('calcOctave');
        this.display = document.getElementById('calcDisplay');

        // Description display element
        this.descDisplay = document.getElementById('calcDesc');

        this.invDisplay = document.getElementById('calcInvDisplay');
        this.previewBtn = document.getElementById('calcPreviewBtn');
        this.insertBtn = document.getElementById('calcInsertBtn');

        // Piano Canvas settings
        this.pianoContainer = document.getElementById('piano-container');
        this.canvas = document.createElement('canvas');
        this.pianoContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Music data
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // Chord definitions with musical descriptions (Vibe)
        this.chordDefinitions = {
            'Major': {
                intervals: [0, 4, 7],
                label: '',
                desc: 'Happy, bright, and stable. The basis of pop music.'
            },
            'Minor': {
                intervals: [0, 3, 7],
                label: 'm',
                desc: 'Sad, serious, or emotional. Good for storytelling.'
            },
            'Diminished': {
                intervals: [0, 3, 6],
                label: 'dim',
                desc: 'Tense and scary. Wants to resolve to a Major chord.'
            },
            'Augmented': {
                intervals: [0, 4, 8],
                label: 'aug',
                desc: 'Suspenseful, dreamlike, and floating. Unsettling.'
            },
            'Sus2': {
                intervals: [0, 2, 7],
                label: 'sus2',
                desc: 'Open, airy, and hopeful. Neither happy nor sad.'
            },
            'Sus4': {
                intervals: [0, 5, 7],
                label: 'sus4',
                desc: 'Tension seeking resolution (usually to Major).'
            },
            'Maj7': {
                intervals: [0, 4, 7, 11],
                label: 'maj7',
                desc: 'Dreamy, romantic, jazzy, and nostalgic.'
            },
            'Min7': {
                intervals: [0, 3, 7, 10],
                label: 'm7',
                desc: 'Soulful, smooth, and moody. Great for Lo-Fi/Jazz.'
            },
            'Dom7': {
                intervals: [0, 4, 7, 10],
                label: '7',
                desc: 'Bluesy, funky, and strong tension. Leads to Tonic.'
            },
            'Dim7': {
                intervals: [0, 3, 6, 9],
                label: 'dim7',
                desc: 'Very dramatic, intense, and unstable. Horror feel.'
            },
            'Min7b5': {
                intervals: [0, 3, 6, 10],
                label: 'm7b5',
                desc: 'Dark, mysterious, and complex. Often used in Jazz.'
            }
        };

        // Current state
        this.currentRoot = 0; // C
        this.currentType = 'Major';
        this.currentOctave = 4;
        this.inversion = 0;
        this.isSpread = false; // Spread voicing state
        this.activeMidis = [];

        // Interactive variables
        this.hoveredMidi = -1;
        this.pianoMeta = {};

        this.init();
    }

    /**
     * Initializes the component, populates UI, and sets up event listeners.
     */
    init() {
        // 1. Populate dropdowns
        this.noteNames.forEach((n, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.text = n;
            this.rootSelect.add(opt);
        });

        Object.keys(this.chordDefinitions).forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.text = type;
            this.typeSelect.add(opt);
        });

        // 2. Value change listeners
        const update = () => {
            this.recalculate();
            this.drawPiano();
            this.scrollToActiveChord(); // Auto-scroll
        };

        this.rootSelect.addEventListener('change', (e) => {
            this.currentRoot = parseInt(e.target.value);
            update();
        });
        this.typeSelect.addEventListener('change', (e) => {
            this.currentType = e.target.value;
            update();
        });
        this.octaveInput.addEventListener('input', (e) => {
            this.currentOctave = parseInt(e.target.value);
            update();
        });

        // Inversion buttons
        document.querySelectorAll('.mod-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                if (action === 'inv-up') this.inversion++;
                if (action === 'inv-down') this.inversion--;
                if (this.inversion < 0) this.inversion = 0;
                if (this.inversion > 3) this.inversion = 3;

                this.invDisplay.innerText = this.inversion === 0 ? "Root Pos" : `Inv: ${this.inversion}`;
                update();
            });
        });

        // Spread button (with toggle class)
        const spreadBtn = document.getElementById('btnSpread');
        if (spreadBtn) {
            spreadBtn.addEventListener('click', () => {
                this.isSpread = !this.isSpread;
                spreadBtn.classList.toggle('active', this.isSpread);
                update();
            });
        }

        // 3. Main button listeners
        this.previewBtn.addEventListener('click', () => this.playChord());
        this.insertBtn.addEventListener('click', () => this.insertToProject());

        // 4. Mouse interaction with piano
        this.canvas.addEventListener('mousemove', (e) => {
            const midi = this.getMidiAt(e.offsetX, e.offsetY);
            this.canvas.style.cursor = midi !== -1 ? 'pointer' : 'default';
            if (midi !== this.hoveredMidi) {
                this.hoveredMidi = midi;
                this.drawPiano();
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredMidi = -1;
            this.drawPiano();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const midi = this.getMidiAt(e.offsetX, e.offsetY);
            if (midi !== -1) {
                if (this.audio) {
                    this.audio.ctx.resume();
                    this.audio.playNote(midi, 0.3, this.audio.ctx.currentTime, {
                        waveform: 'triangle',
                        attack: 0.01,
                        release: 0.3
                    }, 0.7);
                }
            }
        });

        // Scroll with mouse wheel on piano (optional but useful)
        this.pianoContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.pianoContainer.scrollLeft += e.deltaY;
        });

        update();
    }

    /**
     * Gets the MIDI note number at the specified coordinates.
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @returns {number} The MIDI note number or -1 if no key is found.
     */
    getMidiAt(x, y) {
        if (!this.pianoMeta.keyW) return -1;
        const {
            startMidi,
            numKeys,
            keyW,
            containerH
        } = this.pianoMeta;

        // Check black keys
        let whiteX = 0;
        for (let i = 0; i < numKeys; i++) {
            const midi = startMidi + i;
            if (this.isBlack(midi)) {
                const blackW = keyW * 0.65;
                const blackH = containerH * 0.6;
                const bx = whiteX - (blackW / 2);
                if (x >= bx && x <= bx + blackW && y >= 0 && y <= blackH) return midi;
            } else {
                whiteX += keyW;
            }
        }

        // Check white keys
        whiteX = 0;
        for (let i = 0; i < numKeys; i++) {
            const midi = startMidi + i;
            if (!this.isBlack(midi)) {
                if (x >= whiteX && x <= whiteX + keyW && y >= 0 && y <= containerH) return midi;
                whiteX += keyW;
            }
        }
        return -1;
    }

    /**
     * Recalculates the active MIDI notes based on current settings (Root, Type, Inversion, Spread).
     * Updates the UI display and description.
     */
    recalculate() {
        const def = this.chordDefinitions[this.currentType];
        const intervals = [...def.intervals];
        const rootMidi = (this.currentOctave + 1) * 12 + this.currentRoot;

        // 1. Inversion
        let processedIntervals = intervals.map(i => i);
        for (let i = 0; i < this.inversion; i++) {
            const first = processedIntervals.shift();
            processedIntervals.push(first + 12);
        }

        // 2. Base Midis
        let currentMidis = processedIntervals.map(interval => rootMidi + interval);

        // 3. Spread (Drop 2)
        if (this.isSpread && currentMidis.length >= 3) {
            currentMidis[1] += 12;
            currentMidis.sort((a, b) => a - b);
        }

        this.activeMidis = currentMidis;

        // 4. Update UI Text
        const rootName = this.noteNames[this.currentRoot];
        this.display.innerText = `${rootName}${def.label}`;

        if (this.inversion > 0 && !this.isSpread) {
            const bassNote = this.noteNames[this.activeMidis[0] % 12];
            this.display.innerHTML += `<span style="font-size:0.6em; opacity:0.7; margin-left:5px">/${bassNote}</span>`;
        }

        // 5. Update Description (Vibe)
        if (this.descDisplay) {
            this.descDisplay.innerText = def.desc || "";
        }
    }

    /**
     * Scrolls the piano container to center the active chord.
     */
    scrollToActiveChord() {
        if (this.activeMidis.length === 0 || !this.pianoMeta) return;
        const minMidi = Math.min(...this.activeMidis);
        const maxMidi = Math.max(...this.activeMidis);
        const centerMidi = (minMidi + maxMidi) / 2;

        const startMidi = this.pianoMeta.startMidi;
        const keyW = this.pianoMeta.keyW;

        let whiteKeysCount = 0;
        for (let i = startMidi; i < centerMidi; i++) {
            if (!this.isBlack(i)) whiteKeysCount++;
        }

        const targetPixel = (whiteKeysCount * keyW);
        const containerCenter = this.pianoContainer.clientWidth / 2;

        this.pianoContainer.scrollTo({
            left: targetPixel - containerCenter + (keyW / 2),
            behavior: 'smooth'
        });
    }

    /**
     * Plays the current chord using the audio engine.
     */
    playChord() {
        if (!this.audio) return;
        this.audio.ctx.resume();
        const now = this.audio.ctx.currentTime;
        this.activeMidis.forEach(midi => {
            this.audio.playNote(midi, 0.5, now, {
                waveform: 'triangle',
                attack: 0.01,
                release: 0.5
            }, 0.6);
        });
    }

    /**
     * Inserts the current chord into the project via a custom event.
     * Validates track selection before insertion.
     */
    insertToProject() {
        if (!this.state || this.state.activeTrackIndex === -1) {
            alert("Please select a track first!");
            return;
        }

        const event = new CustomEvent('insertChord', {
            detail: {
                midis: this.activeMidis,
                duration: this.state.stepsPerBar
            }
        });
        window.dispatchEvent(event);
        this.container.classList.add('hidden');
    }

    /**
     * Draws the piano keys on the canvas.
     * Handles both white and black keys, highlighting active and hovered keys.
     */
    drawPiano() {
        const FIXED_KEY_W = 34;
        const FIXED_OCTAVES = 5;
        const startMidi = 36;

        let totalKeys = FIXED_OCTAVES * 12;
        let numWhites = 0;
        for (let i = 0; i < totalKeys; i++) {
            if (!this.isBlack(startMidi + i)) numWhites++;
        }

        const canvasWidth = numWhites * FIXED_KEY_W;
        const containerH = 120;

        this.canvas.width = canvasWidth;
        this.canvas.height = containerH;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, canvasWidth, containerH);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        this.pianoMeta = {
            startMidi,
            numKeys: totalKeys,
            keyW: FIXED_KEY_W,
            containerH
        };

        // Draw white keys
        let x = 0;
        for (let i = 0; i < totalKeys; i++) {
            const midi = startMidi + i;
            if (!this.isBlack(midi)) {
                const isActive = this.activeMidis.includes(midi);
                const isHover = (this.hoveredMidi === midi);

                ctx.fillStyle = isActive ? '#00d2d3' : (isHover ? '#ffeaa7' : '#eee');
                ctx.fillRect(x, 0, FIXED_KEY_W - 1, containerH);

                ctx.fillStyle = isActive ? '#00b2b3' : (isHover ? '#d4ac0d' : '#ccc');
                ctx.fillRect(x, containerH - 6, FIXED_KEY_W - 1, 6);

                if (isActive || isHover) {
                    ctx.fillStyle = '#1e272e';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.fillText(this.noteNames[midi % 12], x + (FIXED_KEY_W / 2), containerH - 20);
                } else if (midi % 12 === 0) {
                    ctx.fillStyle = '#999';
                    ctx.font = '9px sans-serif';
                    ctx.fillText(`C${Math.floor(midi/12)-1}`, x + (FIXED_KEY_W / 2), containerH - 10);
                }

                x += FIXED_KEY_W;
            }
        }

        // Draw black keys
        x = 0;
        for (let i = 0; i < totalKeys; i++) {
            const midi = startMidi + i;
            if (!this.isBlack(midi)) {
                x += FIXED_KEY_W;
            } else {
                const blackW = FIXED_KEY_W * 0.65;
                const blackH = containerH * 0.6;
                const bx = x - (blackW / 2);

                const isActive = this.activeMidis.includes(midi);
                const isHover = (this.hoveredMidi === midi);

                ctx.fillStyle = isActive ? '#00d2d3' : (isHover ? '#ffeaa7' : '#222');
                ctx.fillRect(bx, 0, blackW, blackH);

                ctx.strokeStyle = isHover ? '#fff' : '#444';
                ctx.lineWidth = 1;
                ctx.strokeRect(bx, 0, blackW, blackH);

                if (isActive || isHover) {
                    ctx.fillStyle = '#1e272e';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillText(this.noteNames[midi % 12], bx + (blackW / 2), blackH - 12);
                }
            }
        }
    }

    /**
     * Checks if a MIDI note corresponds to a black key.
     * @param {number} midi - The MIDI note number.
     * @returns {boolean} True if the note is a black key, false otherwise.
     */
    isBlack(midi) {
        return [1, 3, 6, 8, 10].includes(midi % 12);
    }
}