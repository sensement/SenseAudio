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

import MusicBrain from './MusicBrain.js';
import AudioEngine from './AudioEngine.js';
import State from './State.js';
import Renderer from './Renderer.js';
import Interaction from './Interaction.js';
import Exporter from './Exporter.js';
import MidiParser from './MidiParser.js';
import History from './History.js';
import CircleOfFifths from './CircleOfFifths.js';
import ChordCalculator from './ChordCalculator.js';
import { INSTRUMENTS, getInstrumentSettings } from './InstrumentDefs.js';

console.log("App Starting (Per-Track Synthesis)...");

// --- Initialization ---
const brain = new MusicBrain();
const state = new State();
const audio = new AudioEngine();
const renderer = new Renderer('mainCanvas', state, brain, audio); // Audio engine dependency injected
const history = new History(state, renderer);
const interaction = new Interaction(renderer, audio, history);
const exporter = new Exporter(state, audio);
const midiParser = new MidiParser();

/**
 * Unlocks the audio context on user interaction.
 * Required by modern browsers to allow audio playback.
 */
const unlockAudio = async () => {
    await audio.init();
    window.removeEventListener('mousedown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('mousedown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// --- DOM Elements: Playback Controls ---
const playBtn = document.getElementById('playBtn');
const bpmInput = document.getElementById('bpmInput');
const autoScrollBtn = document.getElementById('autoScrollBtn');
const pianoRollArea = document.getElementById('pianoRollArea');
const chordContainer = document.getElementById('chord-track-container');
const trackListContainer = document.getElementById('trackListContainer');
const addTrackBtn = document.getElementById('addTrackBtn');
const toggleVisualizerBtn = document.getElementById('toggleVisualizerBtn');

// --- DOM Elements: Music Theory Controls ---
const rootSel = document.getElementById('rootSelect');
const scaleSel = document.getElementById('scaleSelect');
const vocalRangeSel = document.getElementById('vocalRangeSelect');
const rhythmSel = document.getElementById('rhythmSelect');
const timeSigSelect = document.getElementById('timeSigSelect');

// --- DOM Elements: Panels & Modals ---
const synthPanel = document.getElementById('synthPanel');
const melodyPanel = document.getElementById('melodyPanel');
const structurePanel = document.getElementById('structurePanel');
const structureBtn = document.getElementById('structureWizardBtn');
const closeStructure = document.getElementById('closeStructureBtn');
const applyStructureBtn = document.getElementById('applyStructureBtn');
const structInfo = document.getElementById('structInfo');

// --- DOM Elements: File I/O ---
const fileInput = document.getElementById('fileInput');
const midiInput = document.getElementById('midiFileInput');

// --- DOM Elements: Synth Controls ---
const synthWave = document.getElementById('synthWave');
const synthAttack = document.getElementById('synthAttack');
const synthDecay = document.getElementById('synthDecay');
const synthSustain = document.getElementById('synthSustain');
const synthRelease = document.getElementById('synthRelease');

// --- DOM Elements: Context Menu ---
const contextMenu = document.getElementById('trackContextMenu');
const ctxExportWav = document.getElementById('ctxExportWav');
const ctxExportMidi = document.getElementById('ctxExportMidi');
const ctxDeleteTrack = document.getElementById('ctxDeleteTrack');
let selectedTrackIndexForContext = -1;

// --- Global State Variables ---
let animationFrameId;
let audioStartTime = 0;
let schedulerIntervalId = null;
let nextNoteIndex = 0;
let isAutoScrolling = false;

// ============================================================================
// Playback Logic
// ============================================================================

playBtn.addEventListener('click', () => {
    playBtn.blur();
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    audio.init().then(() => {
        if (state.isPlaying) stopPlayback();
        else startPlayback();
    });
});

/**
 * Starts the playback process.
 * Prepares notes, sorts them, and initializes the scheduler.
 */
function startPlayback() {
    // Retrieve notes from State (now including per-track synth settings)
    const allNotesToPlay = state.getAllNotesFlattened();
    if (allNotesToPlay.length === 0) return;

    allNotesToPlay.sort((a, b) => a.time - b.time);
    state._playbackNotes = allNotesToPlay;

    updateMixer();
    state.isPlaying = true;
    playBtn.innerText = "■ Stop";
    playBtn.style.color = "#ff6b6b";

    const stepDur = 60 / state.bpm * (4 / state.stepsPerBar);
    const now = audio.ctx.currentTime;
    audioStartTime = now + 0.1 - (state.playbackStartStep * stepDur);
    nextNoteIndex = 0;

    // Skip notes that have already passed based on start position
    while (nextNoteIndex < state._playbackNotes.length && state._playbackNotes[nextNoteIndex].time < state.playbackStartStep) {
        nextNoteIndex++;
    }

    if (schedulerIntervalId) clearInterval(schedulerIntervalId);
    schedulerIntervalId = setInterval(scheduler, 25);
    animatePlayhead();
}

/**
 * Stops playback and resets audio state.
 */
function stopPlayback() {
    state.isPlaying = false;
    playBtn.innerText = "▶ Play";
    playBtn.style.color = "";
    cancelAnimationFrame(animationFrameId);
    if (schedulerIntervalId) clearInterval(schedulerIntervalId);
    audio.stopAll();
    renderer.draw();
}

/**
 * Audio Scheduler: Schedules notes in advance to ensure precise timing.
 * Runs on a strict interval.
 */
function scheduler() {
    const ahead = 0.2;
    const stepDur = 60 / state.bpm * (4 / state.stepsPerBar);
    const now = audio.ctx.currentTime;
    const notes = state._playbackNotes || [];

    while (nextNoteIndex < notes.length) {
        const n = notes[nextNoteIndex];
        const t = audioStartTime + (n.time * stepDur);

        if (t > now + ahead) break;

        if (t > now - 0.1) {
            let vol = n.velocity;
            // if (n.trackVolume !== undefined) vol *= n.trackVolume;

            const settings = n._synthSettings || {
                waveform: 'triangle',
                attack: 0.01,
                decay: 0.1,
                sustain: 0.5,
                release: 0.5
            };

            if (n.trackType === 'DRUMS') {
                audio.playDrum(n.midi, Math.max(now, t), settings, vol, null, null, n.trackId);
            } else {
                // Critical Fix: Passing trackId prevents AudioEngine from rebuilding FX chains unnecessarily,
                // eliminating audio crackling during playback.
                audio.playNote(
                    n.midi,
                    n.duration * stepDur,
                    Math.max(now, t),
                    settings,
                    vol,
                    n.trackPreset,
                    null, // targetCtx (null for live playback)
                    null, // targetDest (null for live playback)
                    false, // bypassFX
                    false, // isOfflineRender
                    n.trackId // Key Parameter: Unique Track ID
                );
            }
        }
        nextNoteIndex++;
    }
}

/**
 * Animation Loop: Updates the playhead position and HUD UI.
 */
function animatePlayhead() {
    if (!state.isPlaying) return;

    const stepDur = 60 / state.bpm * (4 / state.stepsPerBar);
    const elapsed = audio.ctx.currentTime - audioStartTime;
    const currentStepFloat = elapsed / stepDur;

    const c = renderer.config;
    state.currentPlayX = Math.floor(c.keyWidth + (currentStepFloat * c.gridW));

    // Auto Scroll Logic
    if (state.autoScroll) {
        const w = pianoRollArea.clientWidth;
        const target = state.currentPlayX - (w / 2);
        if (target > 0 && Math.abs(pianoRollArea.scrollLeft - target) > 10) {
            isAutoScrolling = true;
            pianoRollArea.scrollLeft = target;
            renderer.cachedScrollLeft = target;
            renderer.draw();
            setTimeout(() => {
                isAutoScrolling = false;
            }, 50);
        }
    }

    renderer.drawPlayheadOnly();

    // --- HUD Update Logic (Practice Mode & Timeline) ---
    if (isHudVisible) {
        const currentBar = Math.floor(currentStepFloat / state.stepsPerBar);

        // 1. Update Progress Bar
        const progressInBar = (currentStepFloat % state.stepsPerBar) / state.stepsPerBar;
        hudProgressBar.style.width = `${progressInBar * 100}%`;

        // 2. Update Text (Only on bar change to save performance)
        if (currentBar !== lastRenderedBar) {
            lastRenderedBar = currentBar;

            if (currentBar >= 0 && currentBar < state.totalBars) {
                // Determine 3 chords: Current, Next, Later
                const currName = getChordName(currentBar);
                const nextName = getChordName(currentBar + 1);
                const laterName = getChordName(currentBar + 2);

                hudCurrentChord.innerText = currName;
                hudNextChord.innerText = nextName;
                hudLaterChord.innerText = laterName;

                // Meta Info
                const rawSection = state.barStructure[currentBar] || "";
                hudSection.innerText = rawSection.replace(/_/g, ' ');
                hudBarNum.innerText = `BAR ${currentBar + 1}`;

                // Slide Animation
                const cardRow = document.querySelector('.hud-cards-row');
                if (cardRow) {
                    cardRow.animate([
                        { transform: 'translateX(20px)', opacity: 0.8 },
                        { transform: 'translateX(0)', opacity: 1 }
                    ], { duration: 200, easing: 'ease-out' });
                }

            } else {
                hudCurrentChord.innerText = "END";
                hudNextChord.innerText = "";
                hudLaterChord.innerText = "";
            }
        }
    }

    // Stop if song ended
    if (currentStepFloat > (state.totalBars * state.stepsPerBar) + 1) {
        stopPlayback();
        state.playbackStartStep = 0;
        state.currentPlayX = 0;
        renderer.draw();
        return;
    }

    animationFrameId = requestAnimationFrame(animatePlayhead);
}

// ============================================================================
// Synth Panel Logic
// ============================================================================

/**
 * Updates the Synth Panel UI values based on the currently active track.
 */
function updateSynthPanelUI() {
    const track = state.tracks[state.activeTrackIndex];
    if (!track) return;

    const s = track.synthSettings;
    // ADSR
    document.getElementById('synthWave').value = s.waveform;
    document.getElementById('synthAttack').value = s.attack;
    document.getElementById('synthDecay').value = s.decay;
    document.getElementById('synthSustain').value = s.sustain;
    document.getElementById('synthRelease').value = s.release;

    // FX
    document.getElementById('synthDelayMix').value = s.delayMix || 0;
    document.getElementById('synthDelayTime').value = s.delayTime || 0.3;
    document.getElementById('synthDelayFeed').value = s.delayFeedback || 0.4;
    document.getElementById('synthReverb').value = s.reverbMix || 0;
}

// Listeners for Synth Control Changes (including FX)
const synthControls = [{
        el: document.getElementById('synthWave'),
        key: 'waveform',
        isNum: false
    },
    {
        el: document.getElementById('synthAttack'),
        key: 'attack',
        isNum: true
    },
    {
        el: document.getElementById('synthDecay'),
        key: 'decay',
        isNum: true
    },
    {
        el: document.getElementById('synthSustain'),
        key: 'sustain',
        isNum: true
    },
    {
        el: document.getElementById('synthRelease'),
        key: 'release',
        isNum: true
    },
    // --- FX Controls ---
    {
        el: document.getElementById('synthDelayMix'),
        key: 'delayMix',
        isNum: true
    },
    {
        el: document.getElementById('synthDelayTime'),
        key: 'delayTime',
        isNum: true
    },
    {
        el: document.getElementById('synthDelayFeed'),
        key: 'delayFeedback',
        isNum: true
    },
    {
        el: document.getElementById('synthReverb'),
        key: 'reverbMix',
        isNum: true
    }
];

synthControls.forEach(ctrl => {
    ctrl.el.addEventListener('input', (e) => {
        const track = state.tracks[state.activeTrackIndex];
        if (track) {
            let val = e.target.value;
            if (ctrl.isNum) val = parseFloat(val);
            track.synthSettings[ctrl.key] = val;
        }
    });
});

document.getElementById('synthMenuBtn').addEventListener('click', () => {
    melodyPanel.style.display = 'none';
    structurePanel.style.display = 'none';
    updateSynthPanelUI(); // Read values first
    synthPanel.style.display = 'block';
});
document.getElementById('closeSynthBtn').addEventListener('click', () => synthPanel.style.display = 'none');


// ============================================================================
// UI Event Listeners
// ============================================================================

autoScrollBtn.addEventListener('click', () => {
    state.autoScroll = !state.autoScroll;
    autoScrollBtn.classList.toggle('active', state.autoScroll);
    autoScrollBtn.style.color = state.autoScroll ? "#00d2d3" : "#888";
});
if (state.autoScroll) autoScrollBtn.classList.add('active');

if (toggleVisualizerBtn) {
    // 1. Click Handler
    toggleVisualizerBtn.addEventListener('click', () => {
        state.showVisualizer = !state.showVisualizer;
        toggleVisualizerBtn.classList.toggle('active', state.showVisualizer);
        renderer.draw();
    });

    // 2. Sync at Startup: Check if enabled in State, then activate class
    if (state.showVisualizer) {
        toggleVisualizerBtn.classList.add('active');
    }
}

window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') {
        e.preventDefault();
        playBtn.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        updateUIControls();
        renderer.draw();
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        history.redo();
        updateUIControls();
        renderer.draw();
    }
});

brain.noteNames.forEach((n, i) => {
    let opt = document.createElement('option');
    opt.value = i;
    opt.text = n;
    rootSel.add(opt);
});
rootSel.addEventListener('change', e => {
    state.rootKey = parseInt(e.target.value);
    renderer.updateScaleCache();
    renderer.draw();
});
scaleSel.addEventListener('change', e => {
    state.scaleName = e.target.value;
    renderer.updateScaleCache();
    renderer.draw();
});
vocalRangeSel.addEventListener('change', (e) => {
    state.vocalRangeType = e.target.value;
    renderer.draw();
});

function updateBPM(val) {
    if (isNaN(val) || val <= 0) return;
    state.bpm = val;
    renderer.draw();
}
bpmInput.addEventListener('input', (e) => updateBPM(parseInt(e.target.value)));
bpmInput.addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    if (val < 40) val = 40;
    if (val > 300) val = 300;
    e.target.value = val;
    updateBPM(val);
});
bpmInput.addEventListener('wheel', (e) => {
    e.preventDefault();
    let val = parseInt(bpmInput.value);
    e.deltaY < 0 ? val++ : val--;
    if (val < 40) val = 40;
    if (val > 300) val = 300;
    bpmInput.value = val;
    updateBPM(val);
});

// ============================================================================
// Melody Generator Logic
// ============================================================================

const genAlgorithmSelect = document.getElementById('genAlgorithm');
document.getElementById('melodyGenBtn').addEventListener('click', () => {
    synthPanel.style.display = 'none';
    structurePanel.style.display = 'none';
    melodyPanel.style.display = 'block';
});
document.getElementById('closeMelodyBtn').addEventListener('click', () => melodyPanel.style.display = 'none');

document.getElementById('doGenerateBtn').addEventListener('click', () => {
    const startBar = parseInt(document.getElementById('genStartBar').value) - 1;
    const lenBars = parseInt(document.getElementById('genLength').value);
    const complexity = document.getElementById('genComplexity').value;
    const algo = genAlgorithmSelect.value;
    if (startBar < 0 || lenBars <= 0) return;

    const startStep = startBar * state.stepsPerBar;
    const endStep = (startBar + lenBars) * state.stepsPerBar;

    // Warning for overwriting active track notes
    const activeTrack = state.tracks[state.activeTrackIndex];
    if (activeTrack.notes.some(n => n.time >= startStep && n.time < endStep)) {
        if (!confirm("Overwrite active track notes?")) return;
    }
    history.saveState();

    // Clear existing notes in the selected range for the active track
    activeTrack.notes = activeTrack.notes.filter(n => n.time < startStep || n.time >= endStep);

    // Generate Chord Map for the section
    const chordMap = {};
    for (let i = startBar; i < startBar + lenBars; i++) {
        const chordIdx = state.barChords[i] || 0;
        const chordDef = brain.chordDegrees[state.scaleName][chordIdx];
        if (chordDef) {
            const rootNote = brain.getChordRootInScale(state.rootKey, state.scaleName, chordIdx);
            chordMap[i] = chordDef.intervals.map(interval => rootNote + interval + 60);
        }
    }

    let generatedNotes = [];
    if (algo === 'MARKOV') generatedNotes = brain.generateMelodyMarkov(state.rootKey, state.scaleName, chordMap, startBar, lenBars, complexity, state);
    else generatedNotes = brain.generateMelody(startBar, lenBars, complexity, state);

    generatedNotes.forEach(n => state.addNote(n.midi, n.time, n.duration, n.velocity));
    melodyPanel.style.display = 'none';
    renderer.draw();
});


// ============================================================================
// Structure Wizard Logic
// ============================================================================

if (applyStructureBtn) {
    applyStructureBtn.addEventListener('click', () => {
        console.log("🚀 Generating Song Structure...");

        // 1. Get Values from Wizard Elements
        const templateKey = wizTemplate.value;
        const vibeIndex = parseInt(wizVibe.value) || 0;
        const genreKey = wizGenre.value; // Genre (POP, EDM, HIPHOP)

        const template = brain.songTemplates[templateKey];
        if (!template) return;

        // 2. Save State
        if (state.history) state.history.saveState();

        // 3. Reset Project
        state.tracks = [];
        state.activeTrackIndex = -1;

        // 4. Set Tempo
        state.bpm = template.bpm;
        document.getElementById('bpmInput').value = template.bpm;

        // 5. Generate Structure
        const structure = brain.generateSongStructure(templateKey);
        state.totalBars = structure.length;
        state.barStructure = structure;

        // 6. Generate Chords (using Genre)
        const selectedStyle = brain.getStyleByVibe(genreKey, vibeIndex);

        state.barChords = [];
        for (let i = 0; i < state.totalBars; i++) {
            const currentSection = state.barStructure[i];
            let targetSectionForChords = currentSection;

            // Handle Special Sections
            if (currentSection === 'SOLO' || currentSection === 'DROP') {
                targetSectionForChords = 'CHORUS';
            }

            let sectionChords = selectedStyle.sections[targetSectionForChords];
            if (!sectionChords) {
                // Final Fallback
                sectionChords = selectedStyle.sections['CHORUS'] || selectedStyle.sections['VERSE'] || [0];
            }

            const chord = sectionChords[i % sectionChords.length];
            state.barChords.push(chord !== undefined ? chord : 0);
        }

        // 7. Generate Tracks
        const instruments = brain.getInstrumentsForGenre(genreKey); // Key fix: get instruments by genre

        // A. Drums
        state.addTrack('DRUMS', 'Standard');
        generateDrumsForWholeSong(state.tracks.length - 1, genreKey);

        // B. Bass
        state.addTrack('SYNTH', instruments.bass);
        generateBassForWholeSong(state.tracks.length - 1);

        // C. Pad
        state.addTrack('SYNTH', instruments.pad);
        generatePadForWholeSong(state.tracks.length - 1);

        // D. Lead
        state.addTrack('SYNTH', instruments.lead);
        generateLeadForWholeSong(state.tracks.length - 1);

        // E. Arp
        state.addTrack('SYNTH', instruments.arp);
        const arpTrackIdx = state.tracks.length - 1;

        // If Rock, allow default settings for distortion; if Pop, apply softer settings.
        generateArpForWholeSong(arpTrackIdx, genreKey);

        // 8. Refresh UI
        renderTrackList();
        if (renderer.forceResize) renderer.forceResize();
        else renderer.resize();
        structurePanel.style.display = 'none';
        pianoRollArea.scrollLeft = 0;
    });
}

document.getElementById('clearBtn').addEventListener('click', () => {
    history.saveState();
    state.tracks[state.activeTrackIndex].notes = [];
    renderer.draw();
});
document.getElementById('trimBarsBtn').addEventListener('click', () => {
    if (confirm("Trim empty bars?")) {
        history.saveState();
        state.deleteBar(state.totalBars - 1);
        renderer.resize();
    }
}); // Simple version
document.getElementById('toggleLabelsBtn').addEventListener('click', () => {
    state.showLabels = !state.showLabels;
    renderer.draw();
});
document.getElementById('toggleChordHighlightBtn').addEventListener('click', () => {
    state.highlightActiveChord = !state.highlightActiveChord;
    renderer.draw();
});
document.getElementById('toggleScaleHighlightBtn').addEventListener('click', () => {
    state.highlightScale = !state.highlightScale;
    renderer.draw();
});

// Menu Actions
document.getElementById('menuNew').addEventListener('click', () => {
    if (confirm("New Project?")) {
        history.saveState();
        state.tracks = [state.createTrackObject(0, 'Grand Piano', 'SYNTH', '#00d2d3')];
        state.activeTrackIndex = 0;
        state.barChords = [0, 0, 0, 0];
        state.barStructure = ['NONE', 'NONE', 'NONE', 'NONE'];
        state.totalBars = 4;
        renderTrackList();
        renderer.resize();
    }
});
document.getElementById('menuSave').addEventListener('click', () => exporter.saveProject());
document.getElementById('menuOpen').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            state.loadProject(data);
            updateUIControls();
            renderTrackList();
            renderer.resize();
        } catch (err) {
            alert("Error loading file.");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});
document.getElementById('menuExportMidi').addEventListener('click', () => exporter.exportMidi());
document.getElementById('menuImportMidi').addEventListener('click', () => midiInput.click());
midiInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const notes = midiParser.parse(event.target.result);
            if (confirm(`Import ${notes.length} notes?`)) {
                history.saveState();
                notes.forEach(n => state.addNote(n.midi, n.time, n.duration, n.velocity));
                renderTrackList();
                renderer.resize();
            }
        } catch (err) {
            alert("Error parsing MIDI.");
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
});
document.getElementById('menuUndo').addEventListener('click', () => {
    history.undo();
    updateUIControls();
    renderTrackList();
    renderer.draw();
});
document.getElementById('menuRedo').addEventListener('click', () => {
    history.redo();
    updateUIControls();
    renderTrackList();
    renderer.draw();
});

function updateUIControls() {
    bpmInput.value = state.bpm;
    rootSel.value = state.rootKey;
    scaleSel.value = state.scaleName;
    rhythmSel.value = state.stepsPerBar;
    vocalRangeSel.value = state.vocalRangeType;
}

pianoRollArea.addEventListener('scroll', () => {
    chordContainer.scrollLeft = pianoRollArea.scrollLeft;
    if (renderer) renderer.cachedScrollLeft = pianoRollArea.scrollLeft;
    if (!isAutoScrolling) requestAnimationFrame(() => renderer.draw());
});

function scrollToMiddle() {
    const c = renderer.config;
    const targetMidi = 72;
    const rowIndex = c.startMidi - targetMidi;
    const noteY = rowIndex * c.gridH;
    const viewportH = pianoRollArea.clientHeight;
    const targetScroll = noteY - (viewportH / 2) + (c.gridH / 2);
    pianoRollArea.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
    });
}

window.addEventListener('load', () => {
    // Wait for CSS to load to avoid warnings
    if (renderer.forceResize) renderer.forceResize();
    else renderer.resize();
    renderTrackList();
    setTimeout(scrollToMiddle, 100);
});

function updateGridLogic() {
    const gridRes = parseInt(rhythmSelect.value);
    const timeSig = timeSigSelect.value.split('/');
    state.stepsPerBar = (parseInt(timeSig[0]) / parseInt(timeSig[1])) * gridRes;
    renderer.forceResize();
}
rhythmSelect.addEventListener('change', updateGridLogic);
timeSigSelect.addEventListener('change', updateGridLogic);

// ============================================================================
// Track List Logic
// ============================================================================

function renderTrackList() {
    trackListContainer.innerHTML = '';

    state.tracks.forEach((track, index) => {
        const isActive = (index === state.activeTrackIndex);
        const div = document.createElement('div');
        div.className = `track-item ${isActive ? 'active' : ''}`;

        // Color bar on left
        div.style.borderLeft = `4px solid ${track.color || '#3498db'}`;

        // Determine Icon
        let icon = '🎹';
        if (track.type === 'DRUMS') icon = '🥁';
        else if (track.preset && track.preset.includes('Guitar')) icon = '🎸';
        else if (track.preset && track.preset.includes('Bass')) icon = '🔊';
        else if (track.preset && track.preset.includes('Pad')) icon = '☁️';

        div.innerHTML = `
            <div class="track-header">
                <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                    <span class="inst-trigger" title="Change Instrument" style="cursor:pointer; font-size:1.2em; transition:0.2s;">
                        ${icon}
                    </span>
                    
                    <span class="track-name" title="Double Click to Rename" style="cursor: text; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${track.name}
                    </span>
                </div>

                <div class="track-controls">
                    <button class="track-btn" id="synthBtn-${index}" title="Synth Settings" style="color:var(--primary)">🎛️</button>
                    <button class="track-btn btn-m ${track.isMuted ? 'muted' : ''}" title="Mute">M</button>
                    <button class="track-btn btn-s ${track.isSolo ? 'soloed' : ''}" title="Solo">S</button>
                </div>
            </div>
            
            <div class="slider-wrapper">
                <input type="range" class="vol-slider" min="0" max="1" step="0.05" value="${track.volume}" title="Volume: ${Math.round(track.volume * 100)}%">
            </div>
        `;

        // 1. Select Track (Click on body)
        div.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.inst-trigger')) return;

            if (state.activeTrackIndex !== index) {
                state.activeTrackIndex = index;
                renderTrackList();
                renderer.draw();
                if (synthPanel.style.display === 'block') updateSynthPanelUI();
                renderer.centerViewOnTrack(track);
            }
        });

        // 2. Change Instrument (Click on icon)
        const instTrigger = div.querySelector('.inst-trigger');
        instTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            state.activeTrackIndex = index; // Select first
            renderTrackList();
            openInstrumentSelector(index); // Open menu
        });
        instTrigger.onmouseover = () => instTrigger.style.transform = 'scale(1.2)';
        instTrigger.onmouseout = () => instTrigger.style.transform = 'scale(1)';

        // 3. Rename Track (Double Click)
        const nameSpan = div.querySelector('.track-name');
        nameSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const n = prompt("Rename Track:", track.name);
            if (n) {
                track.name = n.trim();
                renderTrackList();
            }
        });

        // 4. Mute/Solo Buttons
        div.querySelector('.btn-m').addEventListener('click', (e) => {
            e.stopPropagation();
            track.isMuted = !track.isMuted;
            if (track.isMuted) track.isSolo = false;
            renderTrackList();
            updateMixer();
        });

        div.querySelector('.btn-s').addEventListener('click', (e) => {
            e.stopPropagation();
            track.isSolo = !track.isSolo;
            if (track.isSolo) track.isMuted = false;
            renderTrackList();
            updateMixer();
        });

        // 5. Synth Settings Button
        div.querySelector(`#synthBtn-${index}`).addEventListener('click', (e) => {
            e.stopPropagation();
            state.activeTrackIndex = index;
            renderTrackList();
            updateSynthPanelUI();
            synthPanel.style.display = 'block';
        });

        // 6. Volume Slider
        const volSlider = div.querySelector('.vol-slider');
        volSlider.addEventListener('input', (e) => {
            track.volume = parseFloat(e.target.value);
            e.target.title = `Volume: ${Math.round(track.volume * 100)}%`;
            updateMixer();
        });

        // 7. Context Menu (Right Click)
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            selectedTrackIndexForContext = index;

            // Position Menu
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
        });
        volSlider.addEventListener('click', (e) => e.stopPropagation());

        trackListContainer.appendChild(div);
    });
}


// --- Track Menu Logic (Replaces old Add Track button) ---

const addTrackMenuBtn = document.getElementById('addTrackMenuBtn');
const addTrackDropdown = document.getElementById('addTrackDropdown');

// 1. Toggle Menu
if (addTrackMenuBtn) {
    addTrackMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = addTrackDropdown.style.display === 'block';
        addTrackDropdown.style.display = isVisible ? 'none' : 'block';
    });
}

// 2. Select Item from Dropdown
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const type = item.getAttribute('data-type');
        const preset = item.getAttribute('data-preset');

        // Track is created and set as active
        state.addTrack(type, preset);

        renderTrackList();
        renderer.draw();
        addTrackDropdown.style.display = 'none';

        // Auto-scroll to new track
        const newTrack = state.tracks[state.activeTrackIndex];
        renderer.centerViewOnTrack(newTrack);

        setTimeout(() => {
            if (trackListContainer) trackListContainer.scrollTop = trackListContainer.scrollHeight;
        }, 10);
    });
});

// 3. Close Menu on Outside Click
window.addEventListener('click', () => {
    if (addTrackDropdown) addTrackDropdown.style.display = 'none';
});

// ============================================================================
// Drum Generator Logic
// ============================================================================

const drumGenPanel = document.getElementById('drumGenPanel');
const closeDrumGenBtn = document.getElementById('closeDrumGenBtn');
const drumGenMenuBtn = document.getElementById('menuDrumGen') || document.getElementById('drumGenMenuBtn');
const doGenerateDrumsBtn = document.getElementById('doGenerateDrumsBtn');

// Open Panel
if (drumGenMenuBtn) {
    drumGenMenuBtn.addEventListener('click', () => {
        // Check if DRUM track is selected
        const track = state.tracks[state.activeTrackIndex];
        if (!track || track.type !== 'DRUMS') {
            alert("Please select a DRUM track first!");
            return;
        }

        document.querySelectorAll('.floating-panel').forEach(p => p.style.display = 'none');
        drumGenPanel.style.display = 'block';
    });
}

// Close Panel
if (closeDrumGenBtn) {
    closeDrumGenBtn.addEventListener('click', () => {
        drumGenPanel.style.display = 'none';
    });
}

// Generate Drums Action
if (doGenerateDrumsBtn) {
    doGenerateDrumsBtn.addEventListener('click', () => {
        const trackIdx = state.activeTrackIndex;
        const track = state.tracks[trackIdx];
        if (!track || track.type !== 'DRUMS') return;

        if (state.history) state.history.saveState();

        const genre = document.getElementById('drumGenre').value;
        const humanizeAmt = parseInt(document.getElementById('drumHumanize').value) || 0;

        // Clear previous notes
        track.notes = [];

        // Loop through all bars
        for (let bar = 0; bar < state.totalBars; bar++) {
            const barStartStep = bar * state.stepsPerBar;

            const currentSection = state.barStructure[bar] || 'NONE';
            // Predict next section
            const nextSection = (bar < state.totalBars - 1) ? (state.barStructure[bar + 1] || 'NONE') : 'OUTRO';

            // Detect Transition
            let isTransition = (currentSection !== nextSection);
            if (bar === state.totalBars - 1) isTransition = true;

            // Loop through steps in bar
            for (let s = 0; s < state.stepsPerBar; s++) {
                const absStep = barStartStep + s;

                // Send nextSection to Brain for context
                const drumMidis = brain.getDrumPattern(genre, currentSection, nextSection, s, state.stepsPerBar, isTransition);

                drumMidis.forEach(midi => {
                    let vel = 0.9;
                    if (midi === 42) vel = 0.7;

                    const randomFlux = (Math.random() - 0.5) * (humanizeAmt / 50);
                    vel = Math.max(0.1, Math.min(1.0, vel + randomFlux));

                    state.addNoteToTrack(trackIdx, midi, absStep, 1, vel);
                });
            }
        }

        renderer.draw();
        console.log(`Generated ${genre} drums based on structure`);
    });
}

// --- Logic for Cascading Wizard ---

const wizGenre = document.getElementById('wizardGenre');
const wizTemplate = document.getElementById('wizardTemplate');
const wizVibe = document.getElementById('wizardVibe');

function initStructureWizard() {
    if (!wizGenre) return;

    // Get Genres from MusicBrain
    const allTemplates = Object.values(brain.songTemplates);
    const uniqueGenres = [...new Set(allTemplates.map(t => t.genre))];

    // Populate Genre Dropdown
    wizGenre.innerHTML = '';
    uniqueGenres.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.text = g;
        wizGenre.add(opt);
    });

    // Listeners
    wizGenre.addEventListener('change', () => {
        updateWizardTemplates();
        updateWizardVibes();
        updateWizardInfo();
    });

    wizTemplate.addEventListener('change', updateWizardInfo);
    wizVibe.addEventListener('change', updateWizardInfo);

    // Initial Load
    updateWizardTemplates();
    updateWizardVibes();
    updateWizardInfo();
}

function updateWizardTemplates() {
    const selectedGenre = wizGenre.value;
    wizTemplate.innerHTML = '';

    Object.keys(brain.songTemplates).forEach(key => {
        const t = brain.songTemplates[key];
        if (t.genre === selectedGenre) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.text = t.label;
            wizTemplate.add(opt);
        }
    });
}

function updateWizardVibes() {
    const selectedGenre = wizGenre.value;
    const vibes = brain.progressionStyles[selectedGenre] || [];

    wizVibe.innerHTML = '';
    vibes.forEach((v, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.text = v.name;
        wizVibe.add(opt);
    });
}

function updateWizardInfo() {
    const tempKey = wizTemplate.value;
    const template = brain.songTemplates[tempKey];

    const vibeIdx = wizVibe.value || 0;
    const selectedGenre = wizGenre.value;
    const vibeList = brain.progressionStyles[selectedGenre];
    const vibe = vibeList ? vibeList[vibeIdx] : null;

    const infoDiv = document.getElementById('structInfo');
    if (infoDiv && template && vibe) {
        infoDiv.style.display = 'block';

        // Suggest Scale
        const scaleTip = vibe.preferredScale ? `💡 Suggested Scale: <strong>${vibe.preferredScale}</strong>` : '';

        infoDiv.innerHTML = `
            <div style="margin-bottom:4px;"><strong>${template.label}</strong> <span style="opacity:0.6; font-size:0.9em;">(${template.bpm} BPM)</span></div>
            <div style="color:#aaa; margin-bottom:8px;">${template.desc}</div>
            
            <div style="border-top: 1px solid #444; margin: 8px 0; padding-top: 8px;"></div>
            
            <div style="margin-bottom:4px; color:var(--primary);">Vibe: <strong>${vibe.name}</strong></div>
            <div style="color:#aaa; margin-bottom:5px;">${vibe.desc}</div>
            
            <div style="font-size: 0.9em; color: #fab1a0; margin-top: 5px;">${scaleTip}</div>
        `;
    }
}

// Update structure button listener
structureBtn.addEventListener('click', () => {
    synthPanel.style.display = 'none';
    melodyPanel.style.display = 'none';
    structurePanel.style.display = 'block';

    initStructureWizard();
});

// ============================================================================
// Generator Helper Functions
// ============================================================================

/**
 * 1. Generates Drums for the entire song (Supports all Genres).
 */
function generateDrumsForWholeSong(trackIdx, genre) {
    const track = state.tracks[trackIdx];

    // Use genre from wizard (e.g., 'HIPHOP', 'LOFI', 'LATIN'). Default to POP.
    const drumGenre = genre || 'POP';

    for (let bar = 0; bar < state.totalBars; bar++) {
        const currentSection = state.barStructure[bar];
        const nextSection = (bar < state.totalBars - 1) ? state.barStructure[bar + 1] : 'OUTRO';

        // Detect transition
        let isTransition = (currentSection !== nextSection) || (bar === state.totalBars - 1);

        const barStartStep = bar * state.stepsPerBar;

        for (let s = 0; s < state.stepsPerBar; s++) {
            // Pass drumGenre directly to brain
            const notes = brain.getDrumPattern(drumGenre, currentSection, nextSection, s, state.stepsPerBar, isTransition);

            notes.forEach(midi => {
                let vel = 0.9;

                // Adjust velocity based on instrument
                if (midi === 42) vel = 0.7; // Hi-hats quieter
                if (midi === 36) vel = 1.0; // Kick loud

                // Genre specific velocity adjustments
                if (drumGenre === 'LOFI') vel *= 0.8;

                state.addNoteToTrack(trackIdx, midi, barStartStep + s, 1, vel);
            });
        }
    }
}

/**
 * 2. Generates Bass Lines (Root Notes).
 */
function generateBassForWholeSong(trackIdx) {
    for (let bar = 0; bar < state.totalBars; bar++) {
        const chordIdx = state.barChords[bar];
        const rootKey = state.rootKey; // e.g., 0 (C)

        // Find chord root in scale
        const scaleIndices = brain.scales[state.scaleName];
        const interval = scaleIndices[chordIdx % scaleIndices.length];
        let midiNote = rootKey + interval + 36; // C2 range (36)

        // Bass Rhythm
        const section = state.barStructure[bar];
        const barStart = bar * state.stepsPerBar;

        if (section === 'INTRO' || section === 'OUTRO') {
            // Whole note
            state.addNoteToTrack(trackIdx, midiNote, barStart, 16, 0.8);
        } else if (section === 'CHORUS' || section === 'DROP') {
            // Pumping rhythm (1/8 notes)
            for (let i = 0; i < 16; i += 2) state.addNoteToTrack(trackIdx, midiNote, barStart + i, 2, 0.9);
        } else {
            // Simple rhythm (1 and 3)
            state.addNoteToTrack(trackIdx, midiNote, barStart, 4, 0.8);
            state.addNoteToTrack(trackIdx, midiNote, barStart + 8, 4, 0.8);
        }
    }
}

/**
 * 3. Generates Pads (Chords) with smart spreading and voice leading.
 */
function generatePadForWholeSong(trackIdx) {
    const useSpread = document.getElementById('structSpreadCheck').checked;

    for (let bar = 0; bar < state.totalBars; bar++) {
        const chordIdx = state.barChords[bar];
        if (chordIdx === undefined || chordIdx === -1) continue;

        const section = state.barStructure[bar];

        // Usually no pads in Drop (Optional)
        if (section === 'DROP') continue;

        const chordDef = brain.chordDegrees[state.scaleName][chordIdx];
        if (!chordDef) continue;

        let rootBase = state.rootKey + 48; // Start from C3

        // 1. Basic Voicing
        let currentMidis = chordDef.intervals.map(interval => {
            let note = rootBase + interval;
            // Simple inversion to prevent high pitch
            if (interval > 7) note -= 12;
            return note;
        });

        // 2. Apply Spread (Fixed)
        // If checked, always raise the middle note by an octave
        if (useSpread && currentMidis.length >= 3) {
            currentMidis.sort((a, b) => a - b);
            currentMidis[1] += 12; // Raise 2nd note (index 1)
            currentMidis.sort((a, b) => a - b);
        }

        // 3. Add notes to track
        currentMidis.forEach(note => {
            if (note > 80) note -= 12; // High pitch guard

            state.addNoteToTrack(trackIdx, note, bar * state.stepsPerBar, 16, 0.6);
        });
    }
}

/**
 * 4. Generates Leads (Melody).
 */
function generateLeadForWholeSong(trackIdx) {
    // Generate lead for Chorus, Solo, and Drop
    for (let bar = 0; bar < state.totalBars; bar += 4) {
        const section = state.barStructure[bar];

        let complexity = 'MEDIUM';
        let shouldGenerate = false;

        if (section === 'CHORUS' || section === 'DROP') {
            shouldGenerate = true;
            complexity = 'MEDIUM'; // Catchy and simple
        } else if (section === 'SOLO') {
            shouldGenerate = true;
            complexity = 'HIGH'; // Technical and improvised
        }

        if (shouldGenerate) {
            const notes = brain.generateMelody(bar, 4, complexity, state);

            notes.forEach(n => {
                state.addNoteToTrack(trackIdx, n.midi, n.time, n.duration, n.velocity);
            });
        }
    }
}

const exportWavBtn = document.getElementById('menuExportWav');

if (exportWavBtn) {
    exportWavBtn.addEventListener('click', async () => {
        const originalText = exportWavBtn.innerText;
        exportWavBtn.innerText = "⏳ Rendering...";
        exportWavBtn.disabled = true;

        setTimeout(async () => {
            await exporter.exportWav();
            exportWavBtn.innerText = originalText;
            exportWavBtn.disabled = false;
        }, 100);
    });
}

// ============================================================================
// HUD & Practice Mode Logic
// ============================================================================
const chordHUD = document.getElementById('chordHUD');
const hudPrevChord = document.getElementById('hudPrevChord');
const hudCurrentChord = document.getElementById('hudCurrentChord');
const hudNextChord = document.getElementById('hudNextChord');
const hudLaterChord = document.getElementById('hudLaterChord');
const hudSection = document.getElementById('hudSection');
const hudBarNum = document.getElementById('hudBarNum');
const hudProgressBar = document.getElementById('hudProgressBar');
const toggleHudBtn = document.getElementById('toggleHudBtn');

let isHudVisible = false;
let lastRenderedBar = -1;

if (toggleHudBtn) {
    toggleHudBtn.addEventListener('click', () => {
        isHudVisible = !isHudVisible;

        if (isHudVisible) {
            chordHUD.style.display = 'flex';
            // Entry Animation
            chordHUD.style.opacity = '0';
            chordHUD.style.transform = 'translate(-50%, 20px)';
            setTimeout(() => {
                chordHUD.style.opacity = '1';
                chordHUD.style.transform = 'translate(-50%, 0)';
            }, 10);

            toggleHudBtn.style.background = '#00d2d3';
            toggleHudBtn.style.color = '#000';
            toggleHudBtn.innerText = "🎸 Exit Practice";
        } else {
            chordHUD.style.display = 'none';
            toggleHudBtn.style.background = '';
            toggleHudBtn.style.color = '';
            toggleHudBtn.innerText = "🎸 Practice Mode";
        }
    });
}

/**
 * Returns the real name of a chord (e.g., C Major).
 */
function getChordName(barIndex) {
    if (barIndex < 0 || barIndex >= state.totalBars) return "--";
    if (!state.barChords[barIndex] && state.barChords[barIndex] !== 0) return "--";

    const chordIdx = state.barChords[barIndex];
    const chordDef = brain.chordDegrees[state.scaleName][chordIdx];
    if (!chordDef) return "--";

    const rootNoteMidi = brain.getChordRootInScale(state.rootKey, state.scaleName, chordIdx);
    const rootName = brain.noteNames[rootNoteMidi % 12];

    let suffix = "";
    if (chordDef.type === 'Minor') suffix = "m";
    else if (chordDef.type === 'Dim') suffix = "°";
    else if (chordDef.type === 'Aug') suffix = "+";
    else if (chordDef.type === 'Dom7') suffix = "7";

    return rootName + suffix;
}

function updateHUD() {
    if (!isHudVisible || !state.isPlaying) {
        return;
    }
}

// ============================================================================
// Circle of Fifths Logic
// ============================================================================
const circleFifthsBtn = document.getElementById('circleFifthsBtn');
const overlayFifths = document.getElementById('overlay-fifths');
const closeOverlay = document.getElementById('close-overlay');
const modalBody = document.querySelector('#overlay-fifths .modal-body');
let circleInstance = null;

if (circleFifthsBtn && overlayFifths) {
    circleFifthsBtn.addEventListener('click', () => {
        overlayFifths.classList.remove('hidden');

        // Create instance if not exists
        if (!circleInstance) {
            circleInstance = new CircleOfFifths(
                modalBody.id || 'circle-container',
                state,
                (newRootKey) => {
                    // On circle click
                    rootSel.value = newRootKey;
                    state.rootKey = newRootKey;
                    renderer.updateScaleCache();
                    renderer.draw();
                    console.log("Key changed via Circle of Fifths to:", newRootKey);
                }
            );
        } else {
            // Resize if already exists
            circleInstance.resize();
            circleInstance.draw();
        }
    });
}

if (closeOverlay && overlayFifths) {
    closeOverlay.addEventListener('click', () => {
        overlayFifths.classList.add('hidden');
    });
}

if (overlayFifths) {
    overlayFifths.addEventListener('click', (e) => {
        if (e.target === overlayFifths) {
            overlayFifths.classList.add('hidden');
        }
    });
}

// ============================================================================
// Chord Calculator Logic
// ============================================================================
const chordCalcBtn = document.getElementById('chordCalcBtn');
const overlayCalc = document.getElementById('overlay-calculator');
const closeCalcBtn = document.getElementById('close-calc-btn');

let calcInstance = null;

if (chordCalcBtn && overlayCalc) {
    chordCalcBtn.addEventListener('click', () => {
        // Close other modals
        document.querySelectorAll('.glass-overlay').forEach(el => el.classList.add('hidden'));

        overlayCalc.classList.remove('hidden');

        if (!calcInstance) {
            calcInstance = new ChordCalculator('overlay-calculator', state, audio);
        }
    });
}

if (closeCalcBtn) {
    closeCalcBtn.addEventListener('click', () => overlayCalc.classList.add('hidden'));
}

if (overlayCalc) {
    overlayCalc.addEventListener('click', (e) => {
        if (e.target === overlayCalc) overlayCalc.classList.add('hidden');
    });
}

// Listen for Project Updates from Calculator
window.addEventListener('projectUpdated', () => {
    renderer.draw();
    console.log("Chord inserted and UI updated.");
});

// Logic: Insert Chord from Calculator
window.addEventListener('insertChord', (e) => {
    console.log("📥 Insert Request Received:", e.detail);

    const {
        midis,
        duration
    } = e.detail;
    const c = renderer.config;

    // 1. Determine Insert Position (Smart)
    let targetPixel = 0;

    if (state.isPlaying && state.currentPlayX > c.keyWidth) {
        // A) If playing: use playhead
        targetPixel = state.currentPlayX - c.keyWidth;
    } else {
        // B) If stopped: use scroll position
        targetPixel = pianoRollArea.scrollLeft;
    }

    // Convert pixel to step (time)
    let targetStep = targetPixel / c.gridW;

    // Quantize to nearest grid line
    targetStep = Math.round(targetStep);

    if (targetStep < 0) targetStep = 0;

    console.log(`📍 Inserting at Step: ${targetStep} (Bar: ${Math.floor(targetStep / state.stepsPerBar)})`);

    // 2. Save for Undo
    history.saveState();

    // 3. Add to Active Track
    if (state.activeTrackIndex === -1) {
        alert("Please select a track first!");
        return;
    }

    midis.forEach((midi, index) => {
        // Strum effect: 0.12 step delay (~20ms)
        const strumDelay = index * 0.12;
        state.addNote(midi, targetStep + strumDelay, duration, 0.8);
    });

    // 4. Redraw
    renderer.draw();
});

/**
 * 4. Context-Aware Arpeggiator (Data-driven from MusicBrain).
 */
function generateArpForWholeSong(trackIdx, genre) {
    const rootBase = state.rootKey + 60; // Middle range (C4)

    for (let bar = 0; bar < state.totalBars; bar++) {
        const chordIdx = state.barChords[bar];
        if (chordIdx === undefined || chordIdx === -1) continue;

        const section = state.barStructure[bar];
        const chordDef = brain.chordDegrees[state.scaleName][chordIdx];
        if (!chordDef) continue;

        // 1. Get pattern from MusicBrain
        const arpStyle = brain.getArpPattern(genre, section);

        // Skip if no pattern (e.g., Intro)
        if (!arpStyle) continue;

        // 2. Prepare notes (Extended to 2 Octaves)
        let notes = chordDef.intervals.map(i => rootBase + i);
        let extendedNotes = [...notes, ...notes.map(n => n + 12)];
        extendedNotes.sort((a, b) => a - b);

        // 3. Apply Pattern
        const {
            pattern,
            rate,
            gate
        } = arpStyle;
        const stepsInBar = state.stepsPerBar;
        let pIndex = 0;

        for (let s = 0; s < stepsInBar; s += rate) {
            const noteIndexOrNull = pattern[pIndex % pattern.length];

            if (noteIndexOrNull !== null && noteIndexOrNull !== undefined) {
                if (noteIndexOrNull < extendedNotes.length) {
                    const midi = extendedNotes[noteIndexOrNull];

                    // Humanize
                    const vel = 0.7 + (Math.random() * 0.1 - 0.05);

                    const duration = Math.max(0.1, rate * gate);

                    state.addNoteToTrack(trackIdx, midi, (bar * stepsInBar) + s, duration, vel);
                }
            }
            pIndex++;
        }
    }
}

document.getElementById('closeStructureBtn').addEventListener('click', () => {
    document.getElementById('structurePanel').style.display = 'none';
});

// ============================================================================
// Instrument Selector Logic
// ============================================================================

const instrumentPanel = document.getElementById('instrumentPanel');
const instrumentList = document.getElementById('instrumentList');
const closeInstrumentBtn = document.getElementById('closeInstrumentBtn');
let targetTrackIndexForInstrument = -1;

closeInstrumentBtn.addEventListener('click', () => {
    instrumentPanel.style.display = 'none';
});

window.openInstrumentSelector = (trackIndex) => {
    targetTrackIndexForInstrument = trackIndex;
    renderInstrumentList();

    // Center Panel
    instrumentPanel.style.display = 'block';
    instrumentPanel.style.left = '50%';
    instrumentPanel.style.top = '50%';
    instrumentPanel.style.transform = 'translate(-50%, -50%)';
};

function renderInstrumentList() {
    instrumentList.innerHTML = '';

    // 1. Group by Category
    const grouped = {};

    for (const [name, settings] of Object.entries(INSTRUMENTS)) {
        if (name === 'Default') continue;

        const cat = settings.category || 'Other';
        if (!grouped[cat]) {
            grouped[cat] = [];
        }
        grouped[cat].push(name);
    }

    // 2. Generate HTML
    const sortedCategories = Object.keys(grouped).sort();

    sortedCategories.forEach(catName => {
        // Category Header
        const catHeader = document.createElement('div');
        catHeader.className = 'inst-category-header';
        catHeader.textContent = catName;
        catHeader.style.cssText = "grid-column: 1 / -1; font-size: 12px; color: #aaa; margin-top: 10px; border-bottom: 1px solid #444; padding-bottom: 3px;";
        instrumentList.appendChild(catHeader);

        // Instrument Buttons
        grouped[catName].forEach(instName => {
            const settings = INSTRUMENTS[instName];

            const btn = document.createElement('div');
            btn.className = 'inst-item';
            btn.textContent = instName;
            btn.style.cssText = "background: #333; padding: 8px; border-radius: 4px; cursor: pointer; text-align: center; font-size: 11px; transition: 0.2s;";

            if (settings.color) {
                btn.style.borderLeft = `3px solid ${settings.color}`;
            }

            btn.onmouseover = () => btn.style.background = '#444';
            btn.onmouseout = () => btn.style.background = '#333';

            btn.onclick = () => {
                selectInstrument(instName);
            };
            instrumentList.appendChild(btn);
        });
    });
}

function selectInstrument(presetName) {
    if (targetTrackIndexForInstrument === -1) return;

    const track = state.tracks[targetTrackIndexForInstrument];
    const newSettings = getInstrumentSettings(presetName);

    // 1. Determine Track Type (Crucial for Piano Roll view)
    if (newSettings.isDrum) {
        track.type = 'DRUMS';
    } else {
        track.type = 'SYNTH';
    }

    // 2. Apply New Settings
    track.preset = presetName;
    track.synthSettings = JSON.parse(JSON.stringify(newSettings));

    // 3. Update Color and Name
    track.color = newSettings.color || '#3498db';
    track.name = presetName;

    // 4. Close and Redraw
    instrumentPanel.style.display = 'none';
    renderTrackList();
    renderer.draw();
    renderer.centerViewOnTrack(track);
}

// ============================================================================
// Context Menu Logic
// ============================================================================

document.addEventListener('click', (e) => {
    if (e.target.closest('#trackContextMenu')) return;
    contextMenu.style.display = 'none';
});

// Export WAV
ctxExportWav.addEventListener('click', () => {
    if (selectedTrackIndexForContext === -1) return;
    contextMenu.style.display = 'none';

    document.body.style.cursor = 'wait';

    exporter.exportTrackWav(selectedTrackIndexForContext)
        .then(() => {
            document.body.style.cursor = 'default';
        });
});

// Export MIDI
ctxExportMidi.addEventListener('click', () => {
    if (selectedTrackIndexForContext === -1) return;
    contextMenu.style.display = 'none';
    exporter.exportTrackMidi(selectedTrackIndexForContext);
});

// Delete Track
ctxDeleteTrack.addEventListener('click', () => {
    if (selectedTrackIndexForContext === -1) return;
    contextMenu.style.display = 'none';

    const trackName = state.tracks[selectedTrackIndexForContext].name;
    if (confirm(`Are you sure you want to delete "${trackName}"?`)) {
        state.tracks.splice(selectedTrackIndexForContext, 1);

        if (state.activeTrackIndex >= state.tracks.length) {
            state.activeTrackIndex = Math.max(0, state.tracks.length - 1);
        }

        renderTrackList();
        renderer.draw();
    }
});

// ============================================================================
// Real-time Mixer Logic
// ============================================================================

function updateMixer() {
    const soloActive = state.tracks.some(t => t.isSolo);

    state.tracks.forEach(track => {
        let finalVol = track.volume;

        // Mute/Solo Logic
        if (track.isMuted && !track.isSolo) finalVol = 0;
        if (soloActive && !track.isSolo) finalVol = 0;

        // Send to Audio Engine
        if (state.isPlaying || audio.liveTrackBuses.has(track.id)) {
            // Create bus if missing (e.g., initialized during silence)
            if (!audio.liveTrackBuses.has(track.id)) {
                audio.getOrCreateLiveBus(track.id, track.synthSettings);
            }
            audio.setTrackVolume(track.id, finalVol);
        }
    });
}