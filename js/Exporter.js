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
 * Handles exporting project data to various formats (JSON, MIDI, WAV).
 */
export default class Exporter {
    /**
     * Creates an instance of the Exporter.
     * @param {Object} state - The application state object containing tracks and project settings.
     * @param {Object} audioEngine - The audio engine instance used for rendering audio.
     */
    constructor(state, audioEngine) {
        this.state = state;
        this.audioEngine = audioEngine;
    }

    /**
     * Saves the current project state as a JSON file.
     * Retrieves data via state.saveProject() or state.getData().
     */
    saveProject() {
        // Retrieve project data
        let json;
        if (typeof this.state.saveProject === 'function') {
             json = this.state.saveProject();
        } else if (typeof this.state.getData === 'function') {
             json = JSON.stringify(this.state.getData());
        } else {
             console.error("State saving method not found");
             return;
        }
        
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project_${Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Exports the entire project as a MIDI file.
     */
    exportMidi() {
        if (!this.state.tracks || this.state.tracks.length === 0) return;
        const midiBytes = this.buildMidiFile(this.state.tracks, 1); 
        this.downloadBlob(midiBytes, `full_project_${Date.now()}.mid`, "audio/midi");
    }

    /**
     * Exports a single specific track as a MIDI file.
     * @param {number} trackIndex - The index of the track to export.
     */
    exportTrackMidi(trackIndex) {
        const track = this.state.tracks[trackIndex];
        if (!track) return;
        const midiBytes = this.buildMidiFile([track], 0); 
        const safeName = track.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        this.downloadBlob(midiBytes, `${safeName}.mid`, "audio/midi");
    }

    /**
     * Exports a single specific track as a WAV audio file.
     * Temporarily solos the track, renders it offline, and then restores the state.
     * @param {number} trackIndex - The index of the track to export.
     */
    async exportTrackWav(trackIndex) {
        if (!this.audioEngine) return;

        // Save state snapshot (mute/solo status)
        const snapshot = this.state.tracks.map(t => ({ muted: t.isMuted, solo: t.isSolo }));

        try {
            // Solo the specific track
            this.state.tracks.forEach((t, i) => {
                if (i === trackIndex) {
                    t.isSolo = true;
                    t.isMuted = false;
                } else {
                    t.isSolo = false;
                    t.isMuted = true;
                }
            });

            const trackName = this.state.tracks[trackIndex].name.replace(/\s+/g, '_');
            
            // Render offline
            const buffer = await this.audioEngine.renderOffline(this.state);
            
            // Convert buffer to WAV
            const wavData = this.bufferToWave(buffer, buffer.length);
            
            this.downloadBlob(wavData, `${trackName}.wav`, "audio/wav");

        } catch (err) {
            console.error("Track Export Failed:", err);
            alert("Export failed: " + err.message);
        } finally {
            // Restore original state
            this.state.tracks.forEach((t, i) => {
                t.isMuted = snapshot[i].muted;
                t.isSolo = snapshot[i].solo;
            });
        }
    }

    /**
     * Exports the full project mix as a WAV audio file.
     */
    async exportWav() {
        if (!this.audioEngine) return;
        try {
            const buffer = await this.audioEngine.renderOffline(this.state);
            const wavData = this.bufferToWave(buffer, buffer.length);
            this.downloadBlob(wavData, `song_${Date.now()}.wav`, "audio/wav");
        } catch (err) {
            console.error(err);
            alert("WAV Export Failed. Check console.");
        }
    }

    // ============================================================
    // 🌊 WAV ENCODER (FIXED & OPTIMIZED)
    // ============================================================
    
    /**
     * Converts an AudioBuffer to WAV format (16-bit PCM).
     * @param {AudioBuffer} abuffer - The source AudioBuffer.
     * @param {number} len - The length of samples to process.
     * @returns {DataView} The resulting WAV file data.
     */
    bufferToWave(abuffer, len) {
        const numOfChan = abuffer.numberOfChannels;
        const length = len * numOfChan * 2 + 44; // 16-bit = 2 bytes per sample
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        const channels = [];
        let i, sample, offset = 0, pos = 0;
    
        // Write WAV Header helpers
        const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
        const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"

        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16);         // length = 16
        setUint16(1);          // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                 // 16-bit

        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4); // chunk length

        // Extract channels
        for(i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        // Write interleaved data
        // Important Fix: Loop proceeds by sample index (Frame)
        offset = 44; // Start data after header
        
        for (i = 0; i < len; i++) {
            for (let ch = 0; ch < numOfChan; ch++) {
                // Get sample between -1 and 1
                sample = channels[ch][i]; 
                
                // Clamping (prevent digital distortion)
                sample = Math.max(-1, Math.min(1, sample)); 
                
                // Convert to 16-bit PCM
                // Scale based on polarity (positive * 32767, negative * 32768)
                sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0; 
                
                view.setInt16(offset, sample, true); 
                offset += 2; // Advance byte offset
            }
        }
    
        return view;
    }

    // ============================================================
    // 🎹 MIDI ENCODER LOGIC
    // ============================================================

    /**
     * Builds a MIDI file byte array from a list of tracks.
     * @param {Array} tracks - List of track objects containing notes.
     * @param {number} format - MIDI format (0 for single track, 1 for multi-track).
     * @returns {Uint8Array} The complete MIDI file as a byte array.
     */
    buildMidiFile(tracks, format = 1) {
        const TICKS_PER_BEAT = 480; 
        const stepsPerBeat = this.state.stepsPerBar / 4; 
        const ticksPerStep = TICKS_PER_BEAT / stepsPerBeat;

        const header = [
            0x4D, 0x54, 0x68, 0x64, 
            0, 0, 0, 6,             
            0, format,              
            (tracks.length >> 8) & 0xFF, tracks.length & 0xFF, 
            (TICKS_PER_BEAT >> 8) & 0xFF, TICKS_PER_BEAT & 0xFF 
        ];

        let fileBytes = [...header];

        // Change: Added index for channel management
        tracks.forEach((track, index) => {
            let trackEvents = [];
            
            // --- Calculate MIDI Channel ---
            // Channel 10 (index 9) is reserved for drums.
            let channel = index % 16; // Rotate channels between 0 and 15
            
            if (track.type === 'DRUMS') {
                channel = 9; // Channel 10 for drums
            } else {
                // If synth track lands on drum channel (9), shift it to 10
                if (channel === 9) channel = 10;
            }

            // Construct Status Bytes for this channel
            // Note On: 0x90 + channel
            // Note Off: 0x80 + channel
            const noteOnStatus = 0x90 | channel;
            const noteOffStatus = 0x80 | channel;

            track.notes.forEach(note => {
                const startTick = Math.round(note.time * ticksPerStep);
                const endTick = Math.round((note.time + note.duration) * ticksPerStep);
                const velocity = Math.floor((note.velocity || 0.8) * 127);

                // Use dynamic status instead of fixed 0x90
                trackEvents.push({ tick: startTick, type: noteOnStatus, note: note.midi, velocity: velocity });
                trackEvents.push({ tick: endTick, type: noteOffStatus, note: note.midi, velocity: 0 });
            });

            trackEvents.sort((a, b) => a.tick - b.tick);

            let trackBytes = [];
            trackBytes.push(0, 0xFF, 0x03);
            const nameBytes = this.stringToBytes(track.name || "Untitled");
            trackBytes.push(nameBytes.length, ...nameBytes);

            if (this.state.bpm) {
                const micros = Math.round(60000000 / this.state.bpm);
                trackBytes.push(0, 0xFF, 0x51, 0x03);
                trackBytes.push((micros >> 16) & 0xFF, (micros >> 8) & 0xFF, micros & 0xFF);
            }

            let lastTick = 0;
            trackEvents.forEach(event => {
                const delta = event.tick - lastTick;
                lastTick = event.tick;
                trackBytes.push(...this.toVLQ(delta));
                trackBytes.push(event.type, event.note, event.velocity);
            });

            trackBytes.push(0, 0xFF, 0x2F, 0x00);

            const trkHeader = [
                0x4D, 0x54, 0x72, 0x6B, 
                (trackBytes.length >> 24) & 0xFF,
                (trackBytes.length >> 16) & 0xFF,
                (trackBytes.length >> 8) & 0xFF,
                trackBytes.length & 0xFF
            ];
            fileBytes.push(...trkHeader, ...trackBytes);
        });

        return new Uint8Array(fileBytes);
    }

    /**
     * Converts a number to Variable Length Quantity (VLQ) bytes.
     * Used for MIDI delta times.
     * @param {number} value - The value to convert.
     * @returns {Array} Array of bytes.
     */
    toVLQ(value) {
        let buffer = [];
        let temp = value;
        do {
            let byte = temp & 0x7F;
            temp >>= 7;
            if (buffer.length > 0) byte |= 0x80; 
            buffer.unshift(byte); 
        } while (temp > 0);
        return buffer;
    }

    /**
     * Converts a string to an array of byte codes.
     * @param {string} str - The input string.
     * @returns {Array} Array of character codes.
     */
    stringToBytes(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
        return bytes;
    }

    /**
     * Helper to trigger a browser download for a Blob.
     * @param {Blob|Uint8Array|DataView} data - The file data.
     * @param {string} filename - The name of the file to download.
     * @param {string} mimeType - The MIME type of the file.
     */
    downloadBlob(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}