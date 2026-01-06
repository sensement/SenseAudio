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
 * Manages the global state of the application, including tracks, playback settings,
 * and musical structure (bars, chords, scale).
 */
export default class State {
    constructor() {
        this.bpm = 120;
        this.rootKey = 0;
        this.scaleName = 'Major';
        this.vocalRangeType = 'NONE';
        this.stepsPerBar = 16;
        this.totalBars = 4;
        this.tracks = [];
        this.activeTrackIndex = 0;
        this.barChords = [];
        this.barStructure = [];
        this.clipboard = null;
        this.autoScroll = true;
        this.showLabels = true;
        this.showVisualizer = true;
        this.highlightActiveChord = false;
        this.highlightScale = false;
        this.playbackStartStep = 0;
        this.isPlaying = false;
        this.currentPlayX = 0;
        this._playbackNotes = [];

        this.sectionTypes = {
            'INTRO':      { label: 'Intro', color: '#3498db' },
            'VERSE':      { label: 'Verse', color: '#2ecc71' },
            'PRE_CHORUS': { label: 'Pre-Chorus', color: '#f1c40f' },
            'CHORUS':     { label: 'Chorus', color: '#e74c3c' },
            'BRIDGE':     { label: 'Bridge', color: '#9b59b6' },
            'SOLO':       { label: 'Solo', color: '#e67e22' },
            'DROP':       { label: 'Drop', color: '#d63031' },
            'OUTRO':      { label: 'Outro', color: '#34495e' },
            'NONE':       { label: 'None', color: '#95a5a6' }
        };

        // Create default track
        this.addTrack('SYNTH', 'Grand Piano');

        for (let i = 0; i < this.totalBars; i++) {
            this.barChords.push(0);
            this.barStructure.push('NONE');
        }
    }

    /**
     * Gets the notes of the currently active track.
     * @returns {Array} List of note objects.
     */
    get notes() {
        if (!this.tracks[this.activeTrackIndex]) return [];
        return this.tracks[this.activeTrackIndex].notes;
    }

    /**
     * Sets the notes for the currently active track.
     * @param {Array} val - The new list of notes.
     */
    set notes(val) {
        if (this.tracks[this.activeTrackIndex]) {
            this.tracks[this.activeTrackIndex].notes = val;
        }
    }

    /**
     * Gets the currently active track object.
     * @returns {Object} The active track.
     */
    get currentTrack() {
        return this.tracks[this.activeTrackIndex];
    }

    /**
     * Creates a structured track object with smart defaults and merged settings.
     * * @param {string} id - Unique identifier for the track.
     * @param {string} name - Display name of the track.
     * @param {string} type - Type of track ('DRUMS' or 'SYNTH').
     * @param {string} presetName - Name of the instrument preset.
     * @returns {Object} The constructed track object.
     */
    createTrackObject(id, name, type, presetName) {
        // Retrieve settings and color from central file (e.g., Trap Kit)
        const settings = getInstrumentSettings(presetName);

        let finalSettings;

        if (type === 'DRUMS') {
            // 1. Default values to prevent errors (if InstrumentDefs is incomplete)
            const defaults = { waveform: 'square', attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 };

            // 2. Merge: Start with defaults, then overwrite with actual settings.
            // This preserves specialParams and specific settings from InstrumentDefs.
            finalSettings = { ...defaults, ...JSON.parse(JSON.stringify(settings)) };
        } else {
            // For synths, copy the entire settings object
            finalSettings = JSON.parse(JSON.stringify(settings));
        }

        // CRITICAL: Inject preset name into settings.
        // AudioEngine.playDrum requires this to identify the kit.
        finalSettings.preset = presetName || 'Default';

        return {
            id: id,
            name: name,
            type: type,
            preset: presetName || 'Default',
            color: settings.color || '#3498db',
            volume: 0.8,
            isMuted: false,
            isSolo: false,
            notes: [],
            synthSettings: finalSettings
        };
    }

    /**
     * Adds a new track to the project.
     * @param {string} type - The type of track ('SYNTH' or 'DRUMS').
     * @param {string|null} presetName - Optional preset name.
     */
    addTrack(type, presetName = null) {
        let trackName = presetName || (type === 'DRUMS' ? 'Drums' : 'Synth');
        const count = this.tracks.filter(t => t.name.startsWith(trackName)).length;
        if (count > 0) trackName += ` ${count + 1}`;

        // Generate a unique and robust ID
        const uniqueId = 'trk_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        const newTrack = this.createTrackObject(uniqueId, trackName, type, presetName);
        this.tracks.push(newTrack);
        this.activeTrackIndex = this.tracks.length - 1;
    }

    /**
     * Adds a note to the current track or updates an existing one.
     * @param {number} midi - MIDI note number.
     * @param {number} time - Start time in steps.
     * @param {number} duration - Duration in steps.
     * @param {number} velocity - Velocity (0-1).
     * @returns {Object} The added or updated note.
     */
    addNote(midi, time, duration = 1, velocity = 0.8) {
        const exists = this.findNoteAt(midi, time);
        if (exists) {
            exists.duration = duration;
            exists.velocity = velocity;
            return exists;
        }
        const newNote = { midi, time, duration, velocity };
        this.notes.push(newNote);
        return newNote;
    }

    /**
     * Finds a note at a specific pitch and time location.
     * @param {number} midi - MIDI note number.
     * @param {number} time - Time in steps.
     * @returns {Object|undefined} The note object if found.
     */
    findNoteAt(midi, time) {
        return this.notes.find(n => n.midi === midi && time >= n.time && time < (n.time + n.duration));
    }

    /**
     * Removes a note at a specific pitch and time location.
     * @param {number} midi - MIDI note number.
     * @param {number} time - Time in steps.
     */
    removeNote(midi, time) {
        const index = this.notes.findIndex(n => n.midi === midi && time >= n.time && time < (n.time + n.duration));
        if (index !== -1) this.notes.splice(index, 1);
    }

    /**
     * Retrieves all notes within a specific bar.
     * @param {number} barIndex - The index of the bar.
     * @returns {Array} List of notes in the bar.
     */
    getNotesInBar(barIndex) {
        const start = barIndex * this.stepsPerBar;
        const end = start + this.stepsPerBar;
        return this.notes.filter(n => n.time >= start && n.time < end);
    }

    /**
     * Flattens all notes from all tracks into a single array with track metadata.
     * Useful for the AudioEngine or exporting data.
     * @returns {Array} Flattened array of all notes.
     */
    getAllNotesFlattened() {
        let all = [];
        // Removed solo/mute filtering logic from here.
        // We send all notes and delegate audio management to the AudioEngine.

        this.tracks.forEach(t => {
            // if (t.isMuted && !t.isSolo) return;  <-- Removed
            // if (soloTrack && !t.isSolo) return;  <-- Removed

            if (!t.id) t.id = 'trk_' + Math.random().toString(36).substr(2, 9);

            const safeSynthSettings = { ...t.synthSettings };
            if (!safeSynthSettings.preset) {
                safeSynthSettings.preset = t.preset || 'Default';
            }

            all = all.concat(t.notes.map(n => ({
                ...n,
                // trackVolume is not critical here as it is applied in the mixer,
                // but kept just in case it is needed for export.
                trackVolume: t.volume,
                _synthSettings: safeSynthSettings,
                trackType: t.type,
                trackPreset: t.preset || 'Default',
                trackId: t.id
            })));
        });
        return all;
    }

    /**
     * Inserts a new bar at the specified index.
     * @param {number} atIndex - Index to insert the bar.
     * @param {number|null} templateIndex - Optional index to copy structure from.
     */
    insertBar(atIndex, templateIndex = null) {
        if (atIndex > this.totalBars) atIndex = this.totalBars;
        const steps = this.stepsPerBar;
        const insertTime = atIndex * steps;
        this.tracks.forEach(t => {
            t.notes.forEach(n => {
                if (n.time >= insertTime) n.time += steps;
            });
        });
        let templateStruct = (templateIndex !== null && this.barStructure[templateIndex]) 
            ? this.barStructure[templateIndex] 
            : (atIndex > 0 ? this.barStructure[atIndex - 1] : 'NONE');
        
        this.barChords.splice(atIndex, 0, 0);
        this.barStructure.splice(atIndex, 0, templateStruct);
        this.totalBars++;
    }

    /**
     * Deletes a bar at the specified index.
     * @param {number} atIndex - Index of the bar to delete.
     */
    deleteBar(atIndex) {
        if (this.totalBars <= 1) return;
        const steps = this.stepsPerBar;
        const start = atIndex * steps;
        this.tracks.forEach(t => {
            t.notes = t.notes.filter(n => !(n.time >= start && n.time < start + steps));
            t.notes.forEach(n => {
                if (n.time >= start + steps) n.time -= steps;
            });
        });
        this.barChords.splice(atIndex, 1);
        this.barStructure.splice(atIndex, 1);
        this.totalBars--;
    }

    /**
     * Copies the content of a bar to the clipboard.
     * @param {number} barIndex - Index of the bar to copy.
     */
    copyBar(barIndex) {
        const start = barIndex * this.stepsPerBar;
        const notes = this.currentTrack.notes.filter(n => n.time >= start && n.time < start + this.stepsPerBar);
        this.clipboard = {
            notes: notes.map(n => ({ ...n, relativeTime: n.time - start })),
            chord: this.barChords[barIndex],
            structure: this.barStructure[barIndex]
        };
    }

    /**
     * Pastes clipboard content into the target bar.
     * @param {number} targetIndex - Index of the target bar.
     */
    pasteBar(targetIndex) {
        if (!this.clipboard) return;
        const start = targetIndex * this.stepsPerBar;
        this.currentTrack.notes = this.currentTrack.notes.filter(n => n.time < start || n.time >= start + this.stepsPerBar);
        this.clipboard.notes.forEach(n => {
            this.currentTrack.notes.push({ ...n, time: start + n.relativeTime });
        });
        this.barChords[targetIndex] = this.clipboard.chord;
        this.barStructure[targetIndex] = this.clipboard.structure;
    }

    /**
     * Serializes the current state for saving.
     * @returns {Object} State data object.
     */
    getData() {
        return {
            tracks: this.tracks,
            bpm: this.bpm,
            stepsPerBar: this.stepsPerBar,
            totalBars: this.totalBars,
            barChords: this.barChords,
            barStructure: this.barStructure,
            rootKey: this.rootKey,
            scaleName: this.scaleName
        };
    }

    /**
     * Loads project data into the state.
     * @param {Object} data - The project data object.
     */
    loadProject(data) {
        if (!data) return;
        this.bpm = data.bpm;
        this.rootKey = data.rootKey;
        this.scaleName = data.scaleName;
        this.stepsPerBar = data.stepsPerBar;
        this.totalBars = data.totalBars;
        this.barChords = data.barChords;
        this.barStructure = data.barStructure;
        if (data.tracks) {
            this.tracks = data.tracks;
            this.tracks.forEach(t => {
                // Generate ID if missing in saved file (for legacy projects)
                if (!t.id) t.id = 'trk_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

                if (t.preset) {
                    const fresh = getInstrumentSettings(t.preset);
                    // Reset only if settings are corrupted
                    if (!t.synthSettings.waveform) t.synthSettings = JSON.parse(JSON.stringify(fresh));
                    if (!t.synthSettings.preset) t.synthSettings.preset = t.preset;
                }
            });
        }
        this.activeTrackIndex = 0;
    }

    /**
     * Adds a note specifically to a target track index.
     * @param {number} trackIndex - Index of the target track.
     * @param {number} midi - MIDI note number.
     * @param {number} time - Start time.
     * @param {number} duration - Duration.
     * @param {number} velocity - Velocity.
     */
    addNoteToTrack(trackIndex, midi, time, duration, velocity) {
        if (!this.tracks[trackIndex]) return;
        const track = this.tracks[trackIndex];
        track.notes = track.notes.filter(n => n.midi !== midi || n.time !== time);
        track.notes.push({
            midi: midi,
            time: time,
            duration: duration,
            velocity: velocity,
            trackType: track.type,
            trackVolume: track.volume,
            trackPreset: track.preset || 'Default',
            _synthSettings: track.synthSettings
            // No need to store trackId here as getAllNotesFlattened generates it on the fly.
        });
    }

    /**
     * Restores data (alias for loadProject).
     * @param {Object} data - The project data.
     */
    restoreData(data) {
        this.loadProject(data);
    }
}