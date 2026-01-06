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
 * Parser for MIDI files, optimized for internal SenseAudio formats.
 * Extracts note events and normalizes timing based on beats.
 */
export default class MidiParser {
    constructor() {}

    /**
     * Parses a MIDI ArrayBuffer and extracts note events normalized by beats.
     * * @param {ArrayBuffer} arrayBuffer - The raw MIDI file buffer.
     * @returns {Array<{midi: number, startBeat: number, durationBeat: number}>} List of parsed note objects.
     * @throws {Error} If the file header is invalid.
     */
    parse(arrayBuffer) {
        const data = new DataView(arrayBuffer);
        let pointer = 0;

        // Read header chunk
        if (this.readString(data, pointer, 4) !== 'MThd') throw new Error("Invalid MIDI");
        pointer += 14; // Skip fixed header data (simplified)

        // Read Time Division from the main header (crucial for normalization)
        // TimeDivision offset is at byte 12 (after MThd(4) + len(4) + fmt(2) + trks(2))
        const timeDiv = data.getUint16(12, false);
        const ticksPerBeat = timeDiv;

        // Find the start of the track chunk
        while (pointer < data.byteLength) {
            if (this.readString(data, pointer, 4) === 'MTrk') break;
            pointer++;
        }
        if (pointer >= data.byteLength) return []; // No track found

        pointer += 4; // Skip 'MTrk' identifier
        const trackSize = data.getUint32(pointer, false);
        pointer += 4;
        const trackEnd = pointer + trackSize;

        let allNotes = [];
        let currentTimeTicks = 0;
        let activeNotes = {};

        while (pointer < trackEnd) {
            const { value: deltaTime, length: deltaLen } = this.readVarInt(data, pointer);
            pointer += deltaLen;
            currentTimeTicks += deltaTime;

            let eventTypeByte = data.getUint8(pointer);

            // Handle Running Status (simplified logic)
            if (eventTypeByte < 0x80) {
                // Assumption: Input is a standard file exported by our system.
                // External complex files may require more robust logic.
            } else {
                pointer++;
            }

            const eventType = eventTypeByte >> 4;

            // Note On (9) & Note Off (8)
            if (eventType === 0x9 || eventType === 0x8) {
                const note = data.getUint8(pointer++);
                const velocity = data.getUint8(pointer++);
                const isNoteOn = (eventType === 0x9) && (velocity > 0);

                if (isNoteOn) {
                    if (!activeNotes[note]) activeNotes[note] = [];
                    activeNotes[note].push(currentTimeTicks);
                } else {
                    if (activeNotes[note] && activeNotes[note].length > 0) {
                        const startTicks = activeNotes[note].shift();

                        // --- Important Change: Return "Beat" value ---
                        // Instead of determining the discrete step here,
                        // we store the exact mathematical value (e.g., beat 1.5).

                        const startBeat = startTicks / ticksPerBeat;
                        const endBeat = currentTimeTicks / ticksPerBeat;
                        const durationBeat = endBeat - startBeat;

                        allNotes.push({
                            midi: note,
                            startBeat: startBeat,      // Start time in beats
                            durationBeat: durationBeat // Duration in beats
                        });
                    }
                }
            }
            // Skip other events (simplified for internal output)
            else if (eventType === 0xC || eventType === 0xD) pointer++;
            else if (eventType === 0xB || eventType === 0xE) pointer += 2;
            else if (eventType === 0xF) {
                if (eventTypeByte === 0xFF) {
                    pointer++; // type
                    const { value: len, length: l } = this.readVarInt(data, pointer);
                    pointer += l + len;
                }
            }
        }
        return allNotes;
    }

    /**
     * Reads a string from the DataView at a specific offset.
     * * @param {DataView} view - The DataView to read from.
     * @param {number} offset - The starting byte offset.
     * @param {number} length - The number of bytes to read.
     * @returns {string} The read string.
     */
    readString(view, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            if (offset + i < view.byteLength)
                str += String.fromCharCode(view.getUint8(offset + i));
        }
        return str;
    }

    /**
     * Reads a Variable-Length Quantity (VLQ) integer from the DataView.
     * Used in MIDI to represent time deltas.
     * * @param {DataView} view - The DataView to read from.
     * @param {number} offset - The starting byte offset.
     * @returns {{value: number, length: number}} The decoded value and the number of bytes read.
     */
    readVarInt(view, offset) {
        let value = 0;
        let length = 0;
        let byte;
        do {
            if (offset + length >= view.byteLength) break;
            byte = view.getUint8(offset + length);
            value = (value << 7) | (byte & 0x7F);
            length++;
        } while (byte & 0x80);
        return { value, length };
    }
}