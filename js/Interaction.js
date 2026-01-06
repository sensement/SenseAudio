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
 * Handles all user interactions with the application canvases.
 * Manages mouse events, tooltips, context menus, and note editing.
 */
export default class Interaction {
    /**
     * Creates an instance of Interaction.
     * @param {Object} renderer - The main renderer instance.
     * @param {Object} audio - The audio engine instance.
     * @param {Object} history - The history manager for undo/redo operations.
     */
    constructor(renderer, audio, history) {
        this.rend = renderer;
        this.state = renderer.state;
        this.brain = renderer.brain;
        this.audio = audio;
        this.history = history;

        this.lastTooltipTime = 0;
        this.activeMenu = null;
        this.draggingNote = null;

        const main = this.rend.mainCanvas;
        const chord = this.rend.chordCanvas;

        // Event listeners for the main canvas (Piano Roll)
        main.addEventListener('mousemove', e => this.throttledHover(e, 'MAIN'));
        main.addEventListener('mousedown', e => this.onMouseDown(e, 'MAIN'));
        main.addEventListener('mouseout', () => this.hideTooltip());
        main.addEventListener('contextmenu', e => e.preventDefault());
        main.addEventListener('wheel', e => this.onWheel(e), { passive: false });

        // Event listeners for the chord canvas (Ruler/Chords)
        chord.addEventListener('mousemove', e => this.throttledHover(e, 'CHORD'));
        chord.addEventListener('mousedown', e => this.onMouseDown(e, 'CHORD'));
        chord.addEventListener('mouseout', () => this.hideTooltip());
        chord.addEventListener('contextmenu', e => e.preventDefault());

        // Global listeners
        window.addEventListener('mouseup', () => this.onMouseUp());
        this.outsideClickListener = this.outsideClickListener.bind(this);
    }

    /**
     * Calculates the logical position (grid coordinates, MIDI note, etc.) based on mouse event.
     * @param {MouseEvent} e - The mouse event.
     * @param {string} source - The source canvas ('MAIN' or 'CHORD').
     * @returns {Object|null} An object containing zone info and coordinates, or null if invalid.
     */
    getPos(e, source) {
        const targetCanvas = (source === 'MAIN') ? this.rend.mainCanvas : this.rend.chordCanvas;
        const rect = targetCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const c = this.rend.config;

        // Check if mouse is in the Piano Keys area (Left side)
        if (mouseX < c.keyWidth) {
            if (source === 'MAIN') {
                const keyIdx = Math.floor(mouseY / c.gridH);
                const midi = c.startMidi - keyIdx;
                return { zone: 'KEYS', midi, x: e.clientX, y: e.clientY };
            }
            return null;
        }

        const scrollX = this.rend.cachedScrollLeft;
        const absX = mouseX + scrollX;

        // Handle Chord Canvas zones
        if (source === 'CHORD') {
            const barWidth = c.gridW * this.state.stepsPerBar;
            const barIndex = Math.floor((absX - c.keyWidth) / barWidth);
            
            // Timeline Ruler
            if (mouseY >= 50) {
                const step = Math.round((absX - c.keyWidth) / c.gridW);
                return { zone: 'RULER', step, x: e.clientX, y: e.clientY };
            }
            
            // Add/Remove Bar Buttons at the end of the track
            if (barIndex === this.state.totalBars) {
                const startBtn = c.keyWidth + (this.state.totalBars * barWidth);
                const localX = absX - startBtn;
                if (localX >= 0 && localX < 40) return { zone: 'REMOVE_BTN', x: e.clientX, y: e.clientY };
                if (localX >= 40 && localX < 80) return { zone: 'ADD_BTN', x: e.clientX, y: e.clientY };
            }
            
            return { zone: 'CHORD', bar: barIndex, x: e.clientX, y: e.clientY, absX: e.clientX, absY: e.clientY };
        }

        // Handle Main Grid zones
        if (source === 'MAIN') {
            const time = Math.floor((absX - c.keyWidth) / c.gridW);
            const keyIdx = Math.floor(mouseY / c.gridH);
            const midi = c.startMidi - keyIdx;
            return { zone: 'GRID', midi, time, x: e.clientX, y: e.clientY };
        }
        return null;
    }

    /**
     * Handles mouse down events to trigger actions like adding notes, playing sounds, or opening menus.
     * @param {MouseEvent} e - The mouse event.
     * @param {string} source - The source canvas.
     */
    onMouseDown(e, source) {
        this.audio.init();
        if (this.activeMenu) {
            this.closeMenu();
            return;
        }

        const pos = this.getPos(e, source);
        if (!pos) return;

        const activeTrack = this.state.tracks[this.state.activeTrackIndex];
        const currentSynthSettings = activeTrack ? activeTrack.synthSettings : null;
        // Detect active track type
        const isDrums = activeTrack && activeTrack.type === 'DRUMS';

        if (pos.zone === 'GRID') {
            // Shift+Click sets playback position
            if (e.shiftKey) {
                this.state.playbackStartStep = pos.time;
                this.rend.draw();
                return;
            }
            
            if (this.history) this.history.saveState();
            
            // Left Click: Add Note
            if (e.button === 0) {
                const note = this.state.addNote(pos.midi, pos.time);

                // --- Modified: Send preset to playNote ---
                // This ensures the click sound matches the main playback sound exactly.
                const presetName = activeTrack ? activeTrack.preset : 'Default';

                if (isDrums) {
                    this.audio.playDrum(pos.midi, 0, currentSynthSettings);
                } else {
                    // Added last parameter (presetName)
                    this.audio.playNote(pos.midi, 0.2, 0, currentSynthSettings, 0.8, presetName);
                }

                this.draggingNote = note;
            } 
            // Right Click: Remove Note
            else if (e.button === 2) {
                this.state.removeNote(pos.midi, pos.time);
            }
        } else if (pos.zone === 'KEYS') {
            // --- Modified: Send preset for piano keys ---
            const presetName = activeTrack ? activeTrack.preset : 'Default';

            if (isDrums) {
                this.audio.playDrum(pos.midi, 0, currentSynthSettings);
            } else {
                // Last parameter added
                this.audio.playNote(pos.midi, 0.5, 0, currentSynthSettings, 0.8, presetName);
            }
        } else if (pos.zone === 'CHORD') {
            if (pos.bar >= 0 && pos.bar < this.state.totalBars) {
                if (e.button === 0) this.showCustomChordMenu(pos.bar, pos.absX, pos.absY);
                else if (e.button === 2) this.showContextMenu(pos.bar, pos.absX, pos.absY);
            }
        } else if (pos.zone === 'ADD_BTN') {
            this.history.saveState();
            this.state.insertBar(this.state.totalBars);
            this.rend.resize();
        } else if (pos.zone === 'REMOVE_BTN') {
            this.history.saveState();
            this.state.deleteBar(this.state.totalBars - 1);
            this.rend.resize();
        } else if (pos.zone === 'RULER') {
            this.state.playbackStartStep = Math.max(0, pos.step);
        }
        this.rend.draw();
    }

    /**
     * Throttles the hover event to improve performance.
     * @param {MouseEvent} e 
     * @param {string} source 
     */
    throttledHover(e, source) {
        if (this.draggingNote && source === 'MAIN') {
            this.onHover(e, source);
            return;
        }
        const now = performance.now();
        if (now - this.lastTooltipTime > 40) {
            this.onHover(e, source);
            this.lastTooltipTime = now;
        }
    }

    /**
     * Handles hover events for tooltips and note dragging.
     * @param {MouseEvent} e 
     * @param {string} source 
     */
    onHover(e, source) {
        const cvs = (source === 'MAIN') ? this.rend.mainCanvas : this.rend.chordCanvas;

        // Note dragging (unchanged)
        if (this.draggingNote && source === 'MAIN') {
            cvs.style.cursor = 'e-resize';
            const pos = this.getPos(e, source);
            if (pos && pos.zone === 'GRID') {
                let d = pos.time - this.draggingNote.time + 1;
                if (d < 1) d = 1;
                if (this.draggingNote.duration !== d) {
                    this.draggingNote.duration = d;
                    this.rend.draw();
                }
            }
            return;
        }

        const pos = this.getPos(e, source);
        cvs.style.cursor = 'default';
        if (!pos || this.activeMenu) {
            this.hideTooltip();
            return;
        }

        // Get active track information
        const activeTrack = this.state.tracks[this.state.activeTrackIndex];
        const isDrums = activeTrack && activeTrack.type === 'DRUMS';

        if (pos.zone === 'KEYS') {
            // Show note or drum name in the left column
            if (isDrums) {
                const drumName = this.rend.drumNames[pos.midi] || 'Unknown';
                this.showTooltip(pos.x, pos.y, `<div class="tt-header">${drumName}</div>`);
            } else {
                const noteName = this.brain.getNoteName(pos.midi);
                const freq = this.brain.getFrequency(pos.midi);
                this.showTooltip(pos.x, pos.y, `<div class="tt-header">${noteName}</div><div class="tt-row">Freq: <span style="color:var(--accent)">${freq} Hz</span></div>`);
            }
        } else if (pos.zone === 'GRID') {
            const note = this.state.findNoteAt(pos.midi, pos.time);
            cvs.style.cursor = note ? 'pointer' : 'crosshair';

            let html = '';

            // --- Different logic for Drums and Synths ---
            if (isDrums) {
                const drumName = this.rend.drumNames[pos.midi] || '-';
                html = `<div class="tt-header" style="color:#ff9f43">${drumName}</div>`;

                // In drums, Scale Score and Role are meaningless, so we don't display them.
                if (note) {
                    html += `<div class="tt-row">Velocity: ${Math.round(note.velocity * 100)}%</div>`;
                } else {
                    html += `<div class="tt-row" style="color:#888">Click to add</div>`;
                }

            } else {
                // Standard Synth mode (show frequency and scale)
                const analysis = this.brain.analyzeNote(pos.midi, this.state.rootKey, this.brain.getScaleNotes(this.state.rootKey, this.state.scaleName), null);
                const freq = this.brain.getFrequency(pos.midi);

                html = `<div class="tt-header">${this.brain.getNoteName(pos.midi)}</div>`;
                html += `<div class="tt-row" style="border-bottom:1px solid #444; margin-bottom:4px;">Freq: <span style="color:#aaa">${freq} Hz</span></div>`;

                if (note) {
                    html += `<div class="tt-row" style="color:var(--accent)">Duration: ${note.duration} steps</div>`;
                    html += `<div class="tt-row">Velocity: ${Math.round(note.velocity * 100)}%</div>`;
                }
                let roleColor = analysis.isScaleNote ? '#2ecc71' : '#e74c3c';
                html += `<div class="tt-row">Role: <span style="color:${roleColor}">${analysis.role || 'Non-Scale'}</span></div>`;
                html += `<div class="tt-row">Score: <span style="color:${this.getColor(analysis.score)}">${analysis.score}/100</span></div>`;
            }

            this.showTooltip(pos.x, pos.y, html);
        } else if (pos.zone === 'CHORD') {
            // (Unchanged from before)
            cvs.style.cursor = 'context-menu';
            if (pos.bar < this.state.totalBars) {
                const chordIdx = this.state.barChords[pos.bar] || 0;
                const def = this.brain.chordDegrees[this.state.scaleName][chordIdx];
                const name = this.brain.getRealChordName(def, this.state.rootKey);
                const barNotes = this.state.getNotesInBar(pos.bar);
                const analysis = this.brain.analyzeBarHarmony(barNotes, def, this.state.rootKey);

                let html = `<div class="tt-header">Bar ${pos.bar + 1}: ${name}</div>`;
                html += `<div class="tt-row">Func: ${def.name}</div>`;
                html += `<div class="tt-row" style="color:${this.getColor(analysis.score)}">Harmony: ${analysis.score}%</div>`;
                html += `<div class="tt-row" style="margin-top:5px; padding-top:5px; border-top:1px solid #444; font-size:9px; color:#888;">Left: Select | Right: Edit</div>`;
                this.showTooltip(pos.x, pos.y, html);
            }
        } else if (pos.zone === 'ADD_BTN') {
            cvs.style.cursor = 'pointer';
            this.showTooltip(pos.x, pos.y, 'Add Bar');
        } else if (pos.zone === 'REMOVE_BTN') {
            cvs.style.cursor = 'pointer';
            this.showTooltip(pos.x, pos.y, 'Remove Bar');
        }
    }

    /**
     * Displays a tooltip at the specified coordinates.
     * @param {number} x 
     * @param {number} y 
     * @param {string} html 
     */
    showTooltip(x, y, html) {
        const tt = document.getElementById('tooltip');
        if (tt) {
            tt.style.display = 'block';
            tt.style.left = (x + 15) + 'px';
            tt.style.top = (y + 15) + 'px';
            tt.innerHTML = html;
        }
    }

    /**
     * Hides the global tooltip.
     */
    hideTooltip() {
        const tt = document.getElementById('tooltip');
        if (tt) tt.style.display = 'none';
    }

    /**
     * Handles global mouse up event.
     */
    onMouseUp() {
        this.draggingNote = null;
        if (this.rend.mainCanvas) this.rend.mainCanvas.style.cursor = 'default';
    }

    /**
     * Shows the custom chord selection menu (Left Click on chord bar).
     * @param {number} barIndex 
     * @param {number} x 
     * @param {number} y 
     */
    showCustomChordMenu(barIndex, x, y) {
        const availableChords = this.brain.chordDegrees[this.state.scaleName];

        // Get current section info (assume NONE if missing)
        const currentSection = this.state.barStructure ? (this.state.barStructure[barIndex] || 'NONE') : 'NONE';

        // --- Change 1: Create default rule to prevent errors ---
        // If no rule exists for this section, return an empty object to avoid null reference errors below.
        const rules = (this.brain.sectionRules && this.brain.sectionRules[currentSection])
            ? this.brain.sectionRules[currentSection]
            : { desc: '', suggested: [], avoid: [], tips: {} };

        const menu = document.createElement('div');
        menu.className = 'custom-chord-menu unified-menu';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.minWidth = '380px';

        menu.addEventListener('mousedown', (e) => e.stopPropagation());

        // --- Change 2: Removed if condition to always show header ---
        const header = document.createElement('div');
        header.className = 'menu-header-label';
        header.style.cssText = `display: flex; align-items: center; gap: 10px; padding: 8px 15px; border-bottom: 1px solid #3d3d3d; background: rgba(0,0,0,0.2);`;

        // Get section color and name (with undefined protection)
        const secInfo = this.state.sectionTypes[currentSection] || { label: currentSection, color: '#999' };

        header.innerHTML = `
            <span style="color:${secInfo.color}; font-size:11px; font-weight:bold;">${secInfo.label.toUpperCase()}</span>
            <span style="opacity:0.6; font-size:9px; text-transform:none; color:#ccc;">${rules.desc || ''}</span>
        `;
        menu.appendChild(header);

        // --- Chord List ---
        availableChords.forEach((chord, index) => {
            const item = document.createElement('div');
            item.className = 'chord-item';

            const realName = this.brain.getRealChordName(chord, this.state.rootKey);

            // 1. Determine color and badge type (Function Badge)
            let badgeClass = 'badge-leading';
            const func = chord.func || 'UNKNOWN';
            if (func === 'TONIC') badgeClass = 'badge-tonic';
            else if (func === 'DOMINANT') badgeClass = 'badge-dominant';
            else if (func === 'SUBDOMINANT') badgeClass = 'badge-subdominant';
            else if (func.includes('MEDIANT')) badgeClass = 'badge-mediant';
            else if (func === 'SUPERTONIC') badgeClass = 'badge-supertonic';

            // 2. Smart logic for descriptions
            let displayText = chord.vibe || '';
            let isSuggested = false;
            let isAvoid = false;

            // Since rules is no longer null, we can safely check.
            if (rules.tips && rules.tips[index]) {
                displayText = `<span style="color:#fab1a0; font-weight:bold;">${rules.tips[index]}</span>`;
            }

            if (rules.suggested && rules.suggested.includes(index)) {
                isSuggested = true;
            } else if (rules.avoid && rules.avoid.includes(index)) {
                isAvoid = true;
            }

            // 3. Grid HTML structure
            let innerHTML = `
                <div>
                    <span class="chord-degree">${chord.name}</span>
                    <span class="chord-real">${realName}</span>
                </div>
                
                <div class="func-badge ${badgeClass}">${func}</div>
                
                <div class="vibe-text">${displayText}</div>
            `;

            // Column 4: Recommendation badge (Rec)
            if (isSuggested) {
                item.classList.add('suggested');
                innerHTML += `<div class="rec-badge">★ REC</div>`;
            } else if (isAvoid) {
                item.classList.add('avoid');
                innerHTML += `<div></div>`;
            } else {
                innerHTML += `<div></div>`;
            }

            // Highlight current chord
            if (index === this.state.barChords[barIndex]) {
                item.style.backgroundColor = '#353b48';
                item.style.borderLeftColor = '#ff9f43';
                item.classList.remove('suggested');
            }

            item.innerHTML = innerHTML;
            item.onclick = (e) => {
                e.stopPropagation();
                if (this.history) this.history.saveState();
                this.state.barChords[barIndex] = index;
                this.rend.draw();
                this.closeMenu();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        this.activeMenu = menu;

        // Prevent overflow from screen
        const rect = menu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (y - rect.height) + 'px';
            menu.style.transformOrigin = "bottom left";
        }
        setTimeout(() => { window.addEventListener('mousedown', this.outsideClickListener); }, 50);
    }

    /**
     * Shows the context menu with bar actions (Right Click on chord bar).
     * @param {number} barIndex 
     * @param {number} x 
     * @param {number} y 
     */
    showContextMenu(barIndex, x, y) {
        this.closeMenu();

        // Create main container
        const menu = document.createElement('div');
        menu.className = 'custom-chord-menu unified-menu';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        // Helper function to create items
        const addItem = (icon, text, onClick, isDanger = false) => {
            const el = document.createElement('div');
            el.className = 'chord-item';
            if (isDanger) el.classList.add('danger-item');

            el.innerHTML = `
                <span class="menu-icon">${icon}</span>
                <span>${text}</span>
            `;

            el.onclick = (e) => {
                e.stopPropagation();
                onClick();
                this.closeMenu();
            };
            menu.appendChild(el);
        };

        // --- Section 1: Edit Actions ---
        const header1 = document.createElement('div');
        header1.className = 'menu-header-label';
        header1.innerText = `BAR ${barIndex + 1} ACTIONS`;
        menu.appendChild(header1);

        addItem('📄', 'Copy Bar', () => this.state.copyBar(barIndex));

        if (this.state.clipboard) {
            addItem('📋', 'Paste Bar', () => {
                if (this.history) this.history.saveState();
                this.state.pasteBar(barIndex);
                this.rend.draw();
            });
        }

        addItem('⬅️', 'Insert Before', () => {
            if (this.history) this.history.saveState();
            this.state.insertBar(barIndex, barIndex);
            this.rend.forceResize();
        });

        addItem('➡️', 'Insert After', () => {
            if (this.history) this.history.saveState();
            this.state.insertBar(barIndex + 1, barIndex);
            this.rend.forceResize();
        });

        addItem('🗑️', 'Delete Bar', () => {
            if (this.history) this.history.saveState();
            this.state.deleteBar(barIndex);
            this.rend.forceResize();
        }, true);

        // Separator
        menu.appendChild(document.createElement('hr'));

        // --- Section 2: Harmony (Added) ---
        const headerChord = document.createElement('div');
        headerChord.className = 'menu-header-label';
        headerChord.innerText = 'HARMONY';
        menu.appendChild(headerChord);

        addItem('🎹', 'Change Chord...', () => {
            // Open chord calculator
            // Assumes a button with ID chordCalcBtn exists in HTML
            const btn = document.getElementById('chordCalcBtn');
            if (btn) btn.click();
        });

        // Separator
        menu.appendChild(document.createElement('hr'));

        // --- Section 3: Section Type ---
        const header2 = document.createElement('div');
        header2.className = 'menu-header-label';
        header2.innerText = 'SECTION TYPE';
        menu.appendChild(header2);

        // Full list of sections including SOLO and DROP
        const types = ['NONE', 'INTRO', 'VERSE', 'PRE_CHORUS', 'CHORUS', 'BRIDGE', 'SOLO', 'DROP', 'OUTRO'];

        types.forEach(type => {
            const item = document.createElement('div');
            item.className = 'chord-item section-select-item';

            const currentType = this.state.barStructure[barIndex] || 'NONE';
            if (currentType === type) item.classList.add('active');

            // Get color and name info from State (ensure State is updated)
            const def = this.state.sectionTypes[type] || { label: type, color: '#999' };

            item.innerHTML = `
                <span class="dot" style="background:${def.color}"></span>
                <span class="label">${def.label}</span>
            `;

            item.onclick = (e) => {
                e.stopPropagation();
                if (this.history) this.history.saveState();
                this.state.barStructure[barIndex] = type;
                this.rend.draw();
                this.closeMenu();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        this.activeMenu = menu;

        // Adjust menu position to prevent it from going off the bottom of the screen
        const rect = menu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (y - rect.height) + 'px';
        }

        setTimeout(() => window.addEventListener('mousedown', this.outsideClickListener), 10);
    }

    /**
     * Closes the currently active menu.
     */
    closeMenu() {
        if (this.activeMenu) {
            this.activeMenu.remove();
            this.activeMenu = null;
            window.removeEventListener('mousedown', this.outsideClickListener);
        }
    }

    /**
     * Handles clicks outside the menu to close it.
     * @param {MouseEvent} e 
     */
    outsideClickListener(e) {
        if (this.activeMenu && !this.activeMenu.contains(e.target)) this.closeMenu();
    }

    /**
     * Helper to determine color based on score.
     * @param {number} score 
     * @returns {string} Hex color code.
     */
    getColor(score) {
        return score >= 80 ? '#2ecc71' : (score >= 50 ? '#f1c40f' : '#e74c3c');
    }

    /**
     * Handles mouse wheel events to adjust note velocity.
     * @param {WheelEvent} e 
     */
    onWheel(e) {
        const pos = this.getPos(e, 'MAIN');
        if (!pos || pos.zone !== 'GRID') return;
        if (this.wheelTimeout) return;
        this.wheelTimeout = setTimeout(() => { this.wheelTimeout = null; }, 30);
        
        const hoveringNote = this.state.findNoteAt(pos.midi, pos.time);
        if (hoveringNote) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            let newVel = Math.max(0.1, Math.min(1.0, hoveringNote.velocity + delta));
            if (hoveringNote.velocity !== newVel) {
                hoveringNote.velocity = newVel;
                this.showTooltip(e.clientX, e.clientY, `<div class="tt-header">Vel: ${Math.round(newVel * 100)}%</div>`);
                this.rend.draw();
            }
        }
    }
}