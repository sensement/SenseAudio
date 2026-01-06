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

import { getInstrumentSettings } from './InstrumentDefs.js';

/**
 * Renderer Class
 * Handles the rendering of the Piano Roll, Grid, Chords, and Audio Visualizer on HTML5 Canvas.
 */
export default class Renderer {
    /**
     * Creates an instance of Renderer.
     * * @param {string} canvasId - The ID of the HTML canvas element.
     * @param {Object} state - The application state object containing current track, notes, etc.
     * @param {Object} brain - The music theory logic engine.
     * @param {Object} audio - The audio engine instance (required for visualizer data).
     */
    constructor(canvasId, state, brain, audio) {
        // Mod 1: Added 'audio' to inputs
        this.mainCanvas = document.getElementById(canvasId);
        this.mainCtx = this.mainCanvas.getContext('2d', { alpha: false });

        this.virtualSizer = document.getElementById('virtualSizer');

        this.domPlayhead = document.getElementById('domPlayhead');
        const pianoArea = document.getElementById('pianoRollArea');
        if (!this.domPlayhead && pianoArea) {
            this.domPlayhead = document.createElement('div');
            this.domPlayhead.id = 'domPlayhead';
            pianoArea.appendChild(this.domPlayhead);
        }
        if (this.domPlayhead) this.domPlayhead.style.display = 'block';

        this.chordCanvas = document.getElementById('chordCanvas');
        this.chordCtx = this.chordCanvas.getContext('2d', { alpha: false });

        this.state = state;
        this.brain = brain;
        this.audio = audio; // Store audio engine to access the analyzer

        this.config = {
            keyWidth: 60,
            gridW: 40,
            gridH: 22,
            startMidi: 108,
            numKeys: 88
        };

        this.drumNames = {
            36: 'KICK', 35: 'KICK 2',
            38: 'SNARE', 40: 'SNARE 2', 37: 'STICK',
            42: 'CL-HAT', 44: 'PD-HAT', 46: 'OP-HAT',
            49: 'CRASH', 57: 'CRASH 2',
            39: 'CLAP',
            41: 'LO-TOM', 43: 'LO-TOM',
            45: 'MID-TOM', 47: 'MID-TOM',
            48: 'HI-TOM', 50: 'HI-TOM'
        };

        this.scaleSet = new Set();
        this.cachedScrollLeft = 0;
        this.cachedWidth = 0;

        // Mod 2: Visualizer gradient variable
        this.vizGradient = null;

        if (this.brain) this.updateScaleCache();

        window.addEventListener('resize', () => {
            requestAnimationFrame(() => this.resize());
        });

        // setTimeout(() => this.resize(true), 50);
        // 🔥 Add scroll listener for smooth visualizer updates
        if (pianoArea) {
            pianoArea.addEventListener('scroll', () => {
                this.cachedScrollLeft = pianoArea.scrollLeft;
                // If playing, the visualizer must move with the scroll (redraw)
                if (this.state.isPlaying) requestAnimationFrame(() => this.draw());
            });
        }
    }

    /**
     * Updates the cache of notes in the current scale.
     */
    updateScaleCache() {
        this.scaleSet = this.brain.getScaleNotes(this.state.rootKey, this.state.scaleName);
    }

    /**
     * Forces a resize and redraw of the canvas.
     */
    forceResize() {
        this.resize(true);
    }

    /**
     * Resizes the canvas based on container dimensions and configures gradients.
     * @param {boolean} [force=false] - If true, forces canvas height recalculation.
     */
    resize(force = false) {
        const container = document.getElementById('pianoRollArea');
        if (!container) return;

        const visibleWidth = container.clientWidth;
        this.cachedWidth = visibleWidth;

        const totalHeight = this.config.numKeys * this.config.gridH;

        if (this.mainCanvas.height !== totalHeight || force) {
            this.mainCanvas.height = totalHeight;
            if (this.domPlayhead) this.domPlayhead.style.height = totalHeight + 'px';

            // Mod 3: Create Aurora Borealis gradient
            // From bottom (Cyan) to top (Transparent)
            this.vizGradient = this.mainCtx.createLinearGradient(0, totalHeight, 0, totalHeight * 0.5);
            this.vizGradient.addColorStop(0, 'rgba(0, 210, 211, 0.25)'); // Bottom: Soft Cyan
            this.vizGradient.addColorStop(1, 'rgba(0, 210, 211, 0.0)');  // Top: Transparent
        }
        this.chordCanvas.height = 80;

        let minCellWidth = 30;
        if (this.state.stepsPerBar >= 16) minCellWidth = 25;
        if (this.state.stepsPerBar >= 32) minCellWidth = 15;
        this.config.gridW = minCellWidth;

        const totalSteps = Math.max(4, this.state.totalBars) * this.state.stepsPerBar;
        const fullSongWidth = this.config.keyWidth + (totalSteps * minCellWidth) + 500;

        if (this.virtualSizer) {
            this.virtualSizer.style.width = fullSongWidth + 'px';
        }

        if (this.mainCanvas.width !== visibleWidth || force) {
            this.mainCanvas.width = visibleWidth;
            this.chordCanvas.width = visibleWidth;
        }

        this.draw();
        this.drawPlayheadOnly();
    }

    /**
     * Calculates the currently visible horizontal range of the piano roll.
     * @returns {Object} An object with start and end pixel coordinates.
     */
    getVisibleRange() {
        return {
            start: this.cachedScrollLeft,
            end: this.cachedScrollLeft + this.cachedWidth
        };
    }

    /**
     * Main draw loop orchestrator.
     */
    draw() {
        const container = document.getElementById('pianoRollArea');
        this.cachedScrollLeft = container ? container.scrollLeft : 0;

        const view = this.getVisibleRange();
        this.drawPianoRoll(view);
        this.drawChordTrack(view);
    }

    /**
     * Draws only the playhead (red line) and triggers redraws if visualizer is active.
     */
    drawPlayheadOnly() {
        const c = this.config;
        let absX = 0;

        if (this.state.isPlaying) {
            absX = this.state.currentPlayX;

            // 🔥 Critical fix for freeze issue:
            // If visualizer is active, the entire canvas must be redrawn every frame
            // so the bar movement is visible.
            if (this.state.showVisualizer) {
                this.draw();
            }
        } else {
            absX = c.keyWidth + (this.state.playbackStartStep * c.gridW);
        }

        // Move the red line (DOM Element) - This is always executed
        absX = Math.floor(Math.max(c.keyWidth, absX));
        if (this.domPlayhead) this.domPlayhead.style.transform = `translateX(${absX}px)`;
    }

    // ============================================================
    // 📊 FIXED: Draw Visualizer (Always at the bottom of the screen)
    // ============================================================
    // 📊 FIXED: Fixed Visualizer (No movement with horizontal scroll)
    // ============================================================
    // 📊 FIXED: Fully Symmetrical Visualizer (No gap in the middle)
    // ============================================================
    /**
     * Draws the audio visualizer at the bottom of the screen.
     * @param {CanvasRenderingContext2D} ctx - The canvas context.
     * @param {number} w - Canvas width.
     * @param {number} h - Canvas height.
     */
    drawVisualizer(ctx, w, h) {
        if (!this.state.showVisualizer || !this.state.isPlaying || !this.audio || !this.audio.analyser) return;

        const container = document.getElementById('pianoRollArea');
        if (!container) return;

        const scrollTop = container.scrollTop;
        const viewHeight = container.clientHeight;
        const bottomY = scrollTop + viewHeight;

        const dataArray = this.audio.getAudioData();
        const bufferLength = dataArray.length;

        const gradient = ctx.createLinearGradient(0, bottomY, 0, bottomY - (viewHeight * 0.4));
        gradient.addColorStop(0, 'rgba(0, 210, 211, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 210, 211, 0.0)');

        ctx.save();
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'screen';

        const usableLength = Math.floor(bufferLength * 0.4);
        const barWidth = 10;
        const gap = 4;
        const totalBarW = barWidth + gap;

        // Screen center (fixed)
        const visibleCenterX = container.clientWidth / 2;

        const halfScreenBars = Math.floor((container.clientWidth / 2) / totalBarW);
        const step = Math.floor(usableLength / halfScreenBars) || 1;
        const maxHeight = viewHeight * 0.5;

        for (let i = 0; i < halfScreenBars; i++) {
            const value = dataArray[i * step] / 255.0;
            if (value < 0.05) continue;

            const barHeight = Math.pow(value, 2.5) * maxHeight;

            // Fix: Add very small gap (gap/2) at start so center bars don't touch completely (looks better)
            const xOffset = (i * totalBarW) + (gap / 2);

            // Draw right side (from center + offset right)
            ctx.fillRect(visibleCenterX + xOffset, bottomY - barHeight, barWidth, barHeight);

            // Draw left side (from center - offset left)
            // 🔥 Fix: Removed 'if (i > 0)'. Now the left center bar is also drawn.
            // Coordinates also corrected to be exactly symmetrical.
            ctx.fillRect(visibleCenterX - xOffset - barWidth, bottomY - barHeight, barWidth, barHeight);
        }

        ctx.restore();
    }

    /**
     * Draws the main piano roll area (background, grid, notes).
     * @param {Object} view - The visible range object {start, end}.
     */
    drawPianoRoll(view) {
        const c = this.config;
        const ctx = this.mainCtx;
        const h = this.mainCanvas.height;
        const w = this.mainCanvas.width;
        const scrollX = this.cachedScrollLeft;

        const currentTrack = this.state.currentTrack;
        const isDrums = currentTrack && currentTrack.type === 'DRUMS';

        // 1. Background
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, w, h);

        const rangeInfo = this.brain.vocalRanges[this.state.vocalRangeType] || { min: 0, max: 127 };

        // 2. Horizontal rows
        for (let i = 0; i < c.numKeys; i++) {
            let midi = c.startMidi - i;
            let y = i * c.gridH;

            if (isDrums) {
                if (this.drumNames[midi]) ctx.fillStyle = '#252525';
                else ctx.fillStyle = '#101010';
                ctx.fillRect(0, y, w, c.gridH);
            } else {
                let isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
                let inScale = this.scaleSet.has(midi);
                const isOutOfRange = (midi < rangeInfo.min || midi > rangeInfo.max);

                let rowColor = isBlack ? '#1a1a1a' : '#222';
                if (!inScale) rowColor = '#151515';
                if (isOutOfRange) rowColor = '#0d0d0d';

                ctx.fillStyle = rowColor;
                ctx.fillRect(0, y, w, c.gridH);

                if (this.state.highlightScale && inScale) {
                    const alpha = isOutOfRange ? 0.02 : 0.08;
                    ctx.fillStyle = `rgba(72, 219, 251, ${alpha})`;
                    ctx.fillRect(0, y, w, c.gridH);
                }
            }

            ctx.beginPath();
            ctx.moveTo(0, y + c.gridH);
            ctx.lineTo(w, y + c.gridH);
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // --- Mod 4: Draw Visualizer (Best placement here) ---
        // Visualizer is drawn over background (rows) but under grid and notes
        this.drawVisualizer(ctx, w, h);

        // --- Scrollable Area ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(c.keyWidth, 0, w - c.keyWidth, h);
        ctx.clip();

        const toScreenX = (absX) => absX - scrollX;
        const gridRes = this.state.stepsPerBar / (this.state.timeNumerator / this.state.timeDenominator);
        // Fallback safety if time signature isn't fully implemented in logic yet:
        const quarterSteps = this.state.stepsPerBar / 4;

        const startCol = Math.floor((view.start - c.keyWidth) / c.gridW);
        const endCol = Math.ceil((view.end - c.keyWidth) / c.gridW);
        const safeStart = Math.max(0, startCol);
        const maxSteps = Math.max(this.state.totalBars * this.state.stepsPerBar, endCol);

        ctx.lineWidth = 1;

        // 3. Grid Lines
        ctx.beginPath();
        for (let j = safeStart; j <= maxSteps; j++) {
            let absX = c.keyWidth + (j * c.gridW);
            let screenX = toScreenX(absX);
            if (screenX > -50 && screenX < w) {
                ctx.moveTo(screenX, 0);
                ctx.lineTo(screenX, h);
            }
        }
        ctx.strokeStyle = '#1e1e1e';
        ctx.stroke();

        ctx.beginPath();
        for (let j = safeStart; j <= maxSteps; j++) {
            if (j % quarterSteps === 0) {
                let absX = c.keyWidth + (j * c.gridW);
                let screenX = toScreenX(absX);
                if (screenX > -50 && screenX < w) {
                    ctx.moveTo(screenX, 0);
                    ctx.lineTo(screenX, h);
                }
            }
        }
        ctx.strokeStyle = '#333';
        ctx.stroke();

        ctx.beginPath();
        for (let j = safeStart; j <= maxSteps; j++) {
            if (j % this.state.stepsPerBar === 0) {
                let absX = c.keyWidth + (j * c.gridW);
                let screenX = toScreenX(absX);
                if (screenX > -50 && screenX < w) {
                    ctx.moveTo(screenX, 0);
                    ctx.lineTo(screenX, h);
                }
            }
        }
        ctx.strokeStyle = '#666';
        ctx.stroke();

        // 4. Active Chord
        if (this.state.highlightActiveChord && !isDrums) {
            const barPixelW = this.state.stepsPerBar * c.gridW;
            const startBar = Math.floor((view.start - c.keyWidth) / barPixelW);
            const endBar = Math.ceil((view.end - c.keyWidth) / barPixelW);

            for (let b = Math.max(0, startBar); b < Math.min(this.state.totalBars, endBar); b++) {
                let chordIdx = this.state.barChords[b] || 0;
                let chordDef = this.brain.chordDegrees[this.state.scaleName][chordIdx];
                if (chordDef) {
                    const allowedPCs = chordDef.intervals.map(i => (this.state.rootKey + i) % 12);
                    let absStartX = c.keyWidth + (b * barPixelW);
                    let screenStartX = toScreenX(absStartX);

                    for (let i = 0; i < c.numKeys; i++) {
                        let midi = c.startMidi - i;
                        if (allowedPCs.includes(midi % 12)) {
                            if (midi < rangeInfo.min || midi > rangeInfo.max) continue;
                            let y = i * c.gridH;
                            ctx.fillStyle = 'rgba(255, 159, 67, 0.15)';
                            ctx.fillRect(screenStartX, y, barPixelW, c.gridH);
                        }
                    }
                }
            }
        }

        // 5. Notes
        const notesToDraw = this.state.notes;
        notesToDraw.forEach(note => {
            let absX = c.keyWidth + (note.time * c.gridW);
            let notePixelWidth = (note.duration * c.gridW);

            if (absX + notePixelWidth < view.start || absX > view.end) return;

            let rowIndex = c.startMidi - note.midi;
            if (rowIndex < 0 || rowIndex >= c.numKeys) return;

            let y = rowIndex * c.gridH;
            let screenX = toScreenX(absX);

            ctx.save();
            const vel = note.velocity !== undefined ? note.velocity : 0.8;
            ctx.globalAlpha = 0.4 + (vel * 0.6);

            let noteColor = '#95a5a6';
            let strokeColor = '#7f8c8d';

            if (this.state.currentTrack && this.state.currentTrack.color) {
                noteColor = this.state.currentTrack.color;
                strokeColor = '#fff';
            } else {
                const barIndex = Math.floor(note.time / this.state.stepsPerBar);
                const chordIdx = this.state.barChords[barIndex] || 0;
                const chordDef = this.brain.chordDegrees[this.state.scaleName][chordIdx];
                if (chordDef) {
                    const chordRootIdx = this.brain.getChordRootInScale(this.state.rootKey, this.state.scaleName, chordIdx);
                    const role = this.brain.getNoteRole(note.midi, chordDef, this.state.rootKey, chordRootIdx);
                    if (role !== 'NON_CHORD') {
                        noteColor = '#0984e3';
                        strokeColor = '#74b9ff';
                    }
                }
            }

            ctx.fillStyle = noteColor;
            ctx.fillRect(screenX + 1, y + 1, notePixelWidth - 2, c.gridH - 2);

            if (isDrums) {
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillRect(screenX + 4, y + 4, notePixelWidth - 8, c.gridH - 8);
            }

            ctx.strokeStyle = strokeColor;
            ctx.strokeRect(screenX + 1, y + 1, notePixelWidth - 2, c.gridH - 2);

            if (this.state.showLabels && notePixelWidth > 15) {
                ctx.fillStyle = '#000';
                ctx.globalAlpha = 1.0;
                ctx.font = 'bold 10px Arial';

                let nName = "";
                if (isDrums) {
                    nName = this.drumNames[note.midi] || "";
                    if (notePixelWidth < 35 && nName.length > 3) nName = nName.substring(0, 2);
                } else {
                    nName = this.brain.getNoteLabel(note.midi);
                }

                if (nName) {
                    ctx.textAlign = 'left';
                    const maxWidth = notePixelWidth - 4;
                    ctx.fillText(nName, screenX + 4, y + 14, maxWidth);
                }
            }
            ctx.restore();
        });

        ctx.restore();

        // 6. Piano Keys (Fixed Column)
        ctx.clearRect(0, 0, c.keyWidth, h);
        ctx.fillStyle = isDrums ? '#2d3436' : '#1e1e1e';
        ctx.fillRect(0, 0, c.keyWidth, h);

        for (let i = 0; i < c.numKeys; i++) {
            let midi = c.startMidi - i;
            let y = i * c.gridH;

            if (isDrums) {
                if (this.drumNames[midi]) {
                    ctx.fillStyle = '#fab1a0';
                    ctx.font = 'bold 9px Arial';
                    ctx.textAlign = 'right';
                    ctx.fillText(this.drumNames[midi], c.keyWidth - 5, y + 14);
                    ctx.strokeStyle = '#444';
                    ctx.strokeRect(0, y, c.keyWidth, c.gridH);
                } else {
                    ctx.strokeStyle = '#333';
                    ctx.strokeRect(0, y, c.keyWidth, c.gridH);
                }
            } else {
                let isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
                let isRoot = (midi % 12 === this.state.rootKey);
                let noteName = this.brain.getNoteName(midi);
                const isOutOfRange = (midi < rangeInfo.min || midi > rangeInfo.max);

                ctx.fillStyle = isOutOfRange ? (isBlack ? '#111' : '#888') : (isRoot ? '#e67e22' : (isBlack ? '#222' : '#eee'));
                ctx.fillRect(0, y, c.keyWidth, c.gridH);
                ctx.strokeStyle = '#444';
                ctx.strokeRect(0, y, c.keyWidth, c.gridH);

                if (midi % 12 === 0 || isRoot || this.state.showLabels) {
                    ctx.fillStyle = isOutOfRange ? '#555' : ((isBlack && !isRoot) ? '#fff' : '#000');
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(noteName, 4, y + 14);
                }
            }
        }
    }

    /**
     * Draws the chord track and timeline at the top.
     * @param {Object} view - The visible range object {start, end}.
     */
    drawChordTrack(view) {
        const c = this.config;
        const ctx = this.chordCtx;
        const w = this.chordCanvas.width;
        const h = this.chordCanvas.height;
        const CHORD_H = 50;
        const RULER_H = 30;
        const steps = this.state.stepsPerBar;
        const barPixelW = steps * c.gridW;
        const scrollX = this.cachedScrollLeft;
        const toScreenX = (absX) => absX - scrollX;

        ctx.fillStyle = '#2d3436';
        ctx.fillRect(0, 0, w, CHORD_H);
        ctx.fillStyle = '#222';
        ctx.fillRect(0, CHORD_H, w, RULER_H);
        ctx.strokeStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(0, CHORD_H);
        ctx.lineTo(w, CHORD_H);
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.rect(c.keyWidth, 0, w - c.keyWidth, h);
        ctx.clip();

        const startBar = Math.floor((view.start - c.keyWidth) / barPixelW);
        const endBar = Math.ceil((view.end - c.keyWidth) / barPixelW);

        for (let b = Math.max(0, startBar); b < Math.min(this.state.totalBars, endBar); b++) {
            let absX = c.keyWidth + (b * barPixelW);
            let screenX = toScreenX(absX);

            if (this.state.barStructure) {
                const sectionKey = this.state.barStructure[b] || 'NONE';
                if (sectionKey !== 'NONE') {
                    const colors = {
                        'INTRO': '#3498db', 'VERSE': '#2ecc71', 'PRE_CHORUS': '#f1c40f',
                        'CHORUS': '#e74c3c', 'BRIDGE': '#9b59b6', 'SOLO': '#e67e22',
                        'DROP': '#d63031', 'OUTRO': '#34495e', 'NONE': '#95a5a6'
                    };
                    const blockColor = colors[sectionKey] || '#95a5a6';

                    ctx.fillStyle = blockColor;
                    ctx.fillRect(screenX, 0, barPixelW, 6);
                    ctx.globalAlpha = 0.1;
                    ctx.fillRect(screenX, 0, barPixelW, CHORD_H);
                    ctx.globalAlpha = 1.0;
                    ctx.font = 'bold 9px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillStyle = blockColor;
                    ctx.fillText(sectionKey, screenX + 4, 16);
                }
            }
            ctx.strokeStyle = '#555';
            ctx.strokeRect(screenX, 0, barPixelW, CHORD_H);

            let chordIdx = this.state.barChords[b];
            let txt = "-";
            if (chordIdx !== undefined && chordIdx !== -1) {
                let chordDef = this.brain.chordDegrees[this.state.scaleName][chordIdx];
                if (chordDef) txt = this.brain.getRealChordName(chordDef, this.state.rootKey);
            }
            if (barPixelW < 40) txt = ".";

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText(txt, screenX + (barPixelW / 2), CHORD_H / 2 + 8);
        }

        let btnStartX = c.keyWidth + (this.state.totalBars * barPixelW);
        let screenBtnX = toScreenX(btnStartX);
        let btnW = 40;

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(screenBtnX, 0, btnW, CHORD_H);
        ctx.strokeStyle = '#c0392b';
        ctx.strokeRect(screenBtnX, 0, btnW, CHORD_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("-", screenBtnX + (btnW / 2), CHORD_H / 2 + 7);

        ctx.fillStyle = '#27ae60';
        ctx.fillRect(screenBtnX + btnW, 0, btnW, CHORD_H);
        ctx.strokeStyle = '#2ecc71';
        ctx.strokeRect(screenBtnX + btnW, 0, btnW, CHORD_H);
        ctx.fillStyle = '#fff';
        ctx.fillText("+", screenBtnX + btnW + (btnW / 2), CHORD_H / 2 + 7);

        const maxSteps = (view.end - c.keyWidth) / c.gridW;
        const loopStartStep = Math.floor((view.start - c.keyWidth) / c.gridW);

        ctx.textAlign = 'left';
        ctx.beginPath();
        for (let j = loopStartStep; j < maxSteps; j++) {
            if (j < 0) continue;
            let absX = c.keyWidth + (j * c.gridW);
            let screenX = toScreenX(absX);

            if (j % this.state.stepsPerBar === 0) {
                ctx.moveTo(screenX, CHORD_H);
                ctx.lineTo(screenX, h);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px Arial';
                const barNum = (j / this.state.stepsPerBar) + 1;
                ctx.fillText(barNum, screenX + 5, CHORD_H + 12);
            } else {
                ctx.moveTo(screenX, CHORD_H);
                ctx.lineTo(screenX, CHORD_H + 5);
            }
        }
        ctx.strokeStyle = '#555';
        ctx.stroke();

        let markerAbsX = c.keyWidth + (this.state.playbackStartStep * c.gridW);
        let markerScreenX = toScreenX(markerAbsX);
        if (markerScreenX > c.keyWidth) {
            ctx.fillStyle = '#00d2d3';
            ctx.beginPath();
            ctx.moveTo(markerScreenX, CHORD_H);
            ctx.lineTo(markerScreenX - 6, CHORD_H + 8);
            ctx.lineTo(markerScreenX + 6, CHORD_H + 8);
            ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, c.keyWidth, h);
        ctx.strokeStyle = '#555';
        ctx.strokeRect(0, 0, c.keyWidth, h);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px Arial';
        ctx.fillText("TIME", 15, CHORD_H + 20);
    }

    /**
     * Centers the view vertically based on the track type.
     * @param {string} trackType - The type of track (e.g., 'DRUMS', 'BASS').
     */
    centerViewOnRange(trackType) {
        const container = document.getElementById('pianoRollArea');
        if (!container) return;
        let targetMidiCenter = (trackType === 'DRUMS') ? 43 : 72;
        const rowIndex = this.config.startMidi - targetMidiCenter;
        const targetY = rowIndex * this.config.gridH;
        const viewHeight = container.clientHeight;
        container.scrollTo({ top: targetY - (viewHeight / 2), behavior: 'smooth' });
    }

    /**
     * Smartly centers the view on the current track's content or defaults.
     * @param {Object} track - The track object to focus on.
     */
    centerViewOnTrack(track) {
        const container = document.getElementById('pianoRollArea');
        if (!container || !track) return;

        let targetMidi = 60; // Default value (C4)

        // ============================================
        // 🥁 1. Drums Logic
        // ============================================
        if (track.type === 'DRUMS') {
            // For drums, note pitch doesn't matter.
            // Drum positions are fixed (Kick 36, Snare 38, Hat 42).
            // We focus on 42 (Closed Hat) so kick and cymbals are visible.
            targetMidi = 42;
        }
        // ============================================
        // 🎹 2. Logic for other instruments (Synth/Bass/Pad)
        // ============================================
        else {
            // A) If track has notes: Focus on average note pitch
            if (track.notes && track.notes.length > 0) {
                let sum = 0;
                track.notes.forEach(n => sum += n.midi);
                targetMidi = Math.round(sum / track.notes.length);
            }
            // B) If track is empty: Guess from instrument settings or name
            else {
                // Attempt to read instrument settings (if imported)
                // If InstrumentDefs is unavailable, this code is safe
                try {
                    const settings = getInstrumentSettings(track.preset);
                    if (settings && settings.centerMidi) {
                        targetMidi = settings.centerMidi;
                    } else {
                        // Smart guess based on name
                        if (track.name.toLowerCase().includes('bass')) targetMidi = 40; // E2
                        else if (track.name.toLowerCase().includes('pad')) targetMidi = 60; // C4
                        else targetMidi = 60;
                    }
                } catch (e) {
                    targetMidi = 60; // Final fallback
                }
            }
        }

        // ============================================
        // 📐 3. Scroll Math Calculation
        // ============================================

        // Formula: Distance from highest note (108) to target note
        const rowIndex = this.config.startMidi - targetMidi;

        // Convert to pixels
        const targetY = rowIndex * this.config.gridH;

        // Calculate Viewport center
        const viewHeight = container.clientHeight;

        // Final scroll value (TargetY - half screen + half row for precision)
        const finalScrollTop = targetY - (viewHeight / 2) + (this.config.gridH / 2);

        // Apply scroll
        container.scrollTo({
            top: finalScrollTop,
            behavior: 'smooth'
        });
    }
}