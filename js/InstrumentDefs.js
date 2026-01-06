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
 * @fileoverview Defines the synthesizer instrument presets and drum kits for the audio engine.
 * Contains configuration for oscillators, envelopes, filters, and effects.
 */

/**
 * Collection of instrument definitions including synthesizers and drum kits.
 * @constant
 * @type {Object.<string, Object>}
 */
export const INSTRUMENTS = {
    // --- System Default ---
    'Default': {
        category: '⚙️ General',
        waveform: 'triangle',
        attack: 0.05,
        decay: 0.1,
        sustain: 0.5,
        release: 0.2,
        filterType: 'lowpass',
        filterFreq: 20000,
        filterQ: 0,
        delayMix: 0,
        reverbMix: 0,
        color: '#3498db',
        centerMidi: 72
    },

    // ==========================================
    // 🎹 Pianos & Keys
    // ==========================================
    'Grand Piano': {
        category: '🎹 Pianos & Keys',
        waveform: 'triangle',
        attack: 0.01,
        decay: 0.4,
        sustain: 0.3,
        release: 0.5,
        filterType: 'lowpass',
        filterFreq: 4000,
        filterQ: 1,
        reverbMix: 0.2,
        color: '#00d2d3',
        centerMidi: 60 // C4
    },
    'Bright Piano': {
        category: '🎹 Pianos & Keys',
        waveform: 'square',
        attack: 0.01,
        decay: 0.3,
        sustain: 0.2,
        release: 0.4,
        filterType: 'lowpass',
        filterFreq: 8000,
        filterQ: 2,
        reverbMix: 0.15,
        color: '#48dbfb',
        centerMidi: 60
    },
    'Electric Piano': {
        category: '🎹 Pianos & Keys',
        waveform: 'sine',
        attack: 0.02,
        decay: 0.4,
        sustain: 0.1,
        release: 0.8,
        filterType: 'lowpass',
        filterFreq: 1000,
        filterQ: 0,
        delayMix: 0.15,
        reverbMix: 0.3,
        color: '#e056fd',
        specialParams: {
            tremolo: true
        },
        centerMidi: 60
    },
    'Vintage Rhodes': {
        category: '🎹 Pianos & Keys',
        waveform: 'sine',
        attack: 0.03,
        decay: 0.6,
        sustain: 0.4,
        release: 1.0,
        filterType: 'lowpass',
        filterFreq: 1500,
        filterQ: 1,
        chorusAmount: 0.2,
        reverbMix: 0.3,
        color: '#c56cf0',
        specialParams: {
            secondOsc: 'triangle',
            detune: 3,
            tremolo: true
        },
        centerMidi: 60
    },

    // ==========================================
    // ☁️ Pads & Atmospheres
    // ==========================================
    'Soft Pad': {
        // Adjusted reverb to prevent muddiness
        category: '☁️ Pads & Atmospheres',
        waveform: 'triangle',
        attack: 1.0,
        decay: 3.0,
        sustain: 0.8,
        release: 3.0,
        filterType: 'lowpass',
        filterFreq: 600, // Slightly opened up frequency
        filterQ: 0,
        delayMix: 0.2,
        reverbMix: 0.6,
        color: '#1abc9c',
        specialParams: {
            secondOsc: 'sine',
            detune: 8
        }, // Increased detune for wider sound
        centerMidi: 55
    },

    'Dark Ocean Pad': {
        category: '☁️ Pads & Atmospheres',
        waveform: 'sawtooth', // Sawtooth: Stronger and richer
        attack: 1.0, // Faster attack (previously 2.5, which was too slow)
        decay: 3.0,
        sustain: 0.8,
        release: 4.0,
        filterType: 'lowpass',
        filterFreq: 1500, // Critical: Opened filter frequency to avoid muffled notes
        filterQ: 2, // Slight resonance to add character
        reverbMix: 0.9, // High spaciousness
        delayMix: 0.5,
        color: '#2c3e50',
        // Two sawtooth waves with high detune = massive underwater sound
        specialParams: {
            secondOsc: 'sawtooth',
            detune: 20
        },
        centerMidi: 48
    },

    'Bright Cloud Pad': {
        // Fixed ringing issue: Changed sharp Highpass to open Lowpass
        category: '☁️ Pads & Atmospheres',
        waveform: 'sawtooth', // Sawtooth is inherently bright
        attack: 0.5,
        decay: 1.0,
        sustain: 0.6,
        release: 3.0,
        filterType: 'lowpass', // Highpass can be harsh; open Lowpass is smoother
        filterFreq: 2500, // High frequency for brightness
        filterQ: 0,
        reverbMix: 0.7,
        delayMix: 0.3,
        color: '#ecf0f1',
        specialParams: {
            secondOsc: 'sine',
            detune: 10
        },
        centerMidi: 72
    },

    'Vintage Synth Pad': {
        // Generally good, adjusted for warmth
        category: '☁️ Pads & Atmospheres',
        waveform: 'sawtooth',
        attack: 0.8,
        decay: 0.5,
        sustain: 0.7,
        release: 2.5,
        filterType: 'lowpass',
        filterFreq: 1000,
        filterQ: 2, // Resonance for vintage feel
        reverbMix: 0.5,
        delayMix: 0.2,
        color: '#f39c12',
        specialParams: {
            secondOsc: 'sawtooth',
            detune: 12
        },
        centerMidi: 60
    },

    // ==========================================
    // 🎻 Organic & Vintage Strings
    // ==========================================

    'Orchestral Strings': {
        // Simulation of a large violin and cello section
        // Rich, full, and dignified sound
        category: '☁️ Pads & Atmospheres',
        waveform: 'sawtooth', // Sawtooth is the best choice for string simulation
        attack: 0.8,
        decay: 1.5,
        sustain: 0.8,
        release: 2.0,
        filterType: 'lowpass',
        filterFreq: 1800,
        filterQ: 1, // Open filter to hear the bowing texture
        reverbMix: 0.6,
        chorusAmount: 0.7, // Chorus is essential for the "ensemble" effect
        color: '#8e44ad',
        specialParams: {
            secondOsc: 'sawtooth',
            detune: 10
        },
        centerMidi: 60
    },

    'Analog Strings': {
        // Nostalgic 80s synth sound (like Juno or Jupiter)
        // Warm, trembling, and highly emotional
        category: '☁️ Pads & Atmospheres',
        waveform: 'sawtooth',
        attack: 1.2,
        decay: 2.0,
        sustain: 0.7,
        release: 3.0,
        filterType: 'lowpass',
        filterFreq: 1000,
        filterQ: 0, // Slightly muffled and warmer
        reverbMix: 0.5,
        delayMix: 0.3,
        color: '#d35400',
        // Sawtooth/Square mix + Tremolo = Vintage sound
        specialParams: {
            secondOsc: 'square',
            detune: 15,
            tremolo: true
        },
        centerMidi: 60
    },

    'Hollow Flute Pad': {
        // Flute/Wind hybrid sound (Mellotron vibe)
        // Excellent for soft and acoustic contexts
        category: '☁️ Pads & Atmospheres',
        waveform: 'triangle', // Triangle wave has a hollow, flute-like quality
        attack: 1.5,
        decay: 1.0,
        sustain: 0.9,
        release: 2.5,
        filterType: 'lowpass',
        filterFreq: 900,
        filterQ: 0,
        reverbMix: 0.8, // Heavy reverb for a dreamy atmosphere
        color: '#27ae60',
        specialParams: {
            secondOsc: 'sine',
            detune: 5
        },
        centerMidi: 64
    },

    'Warm Strings': {
        // Replaces Hollow Flute
        // Standard, warm, transparent strings (like a violin section)
        category: '☁️ Pads & Atmospheres',
        waveform: 'sawtooth', // Sawtooth: best wave for string sounds
        attack: 0.5, // Faster attack (immediate onset)
        decay: 2.0,
        sustain: 0.7,
        release: 2.0,
        filterType: 'lowpass',
        filterFreq: 2000, // Filter is open for transparent sound
        filterQ: 0, // No resonance (prevents whistling artifacts)
        reverbMix: 0.6,
        chorusAmount: 0.8, // Heavy chorus to volumize the sound
        color: '#27ae60', // Green
        specialParams: {
            secondOsc: 'sawtooth',
            detune: 10
        },
        centerMidi: 60
    },

    'Emotional Pad': {
        // Replaces Glassy Bowed
        // Deep, cinematic, and melancholic (cello/contrabass style)
        category: '☁️ Pads & Atmospheres',
        waveform: 'sawtooth',
        attack: 0.8, // Dignified but audible onset (not too slow)
        decay: 3.0,
        sustain: 0.8,
        release: 3.5,
        filterType: 'lowpass',
        filterFreq: 900, // Lower cutoff for depth and emotion
        filterQ: 0,
        reverbMix: 0.9, // Washed in reverb
        delayMix: 0.3,
        color: '#8e44ad', // Purple
        // Mixed with Sine to fill bass frequencies
        specialParams: {
            secondOsc: 'sine',
            detune: 6
        },
        centerMidi: 48 // One octave lower
    },

    // ==========================================
    // 🎸 Guitars & Strings
    // ==========================================
    'Distorted Guitar': {
        category: '🎸 Guitars & Strings',
        waveform: 'sawtooth',
        attack: 0.005,
        decay: 0.2,
        sustain: 0.8,
        release: 0.1,
        filterType: 'lowpass',
        filterFreq: 4000,
        filterQ: 5,
        distortion: 2500,
        delayMix: 0.15,
        reverbMix: 0.1,
        color: '#c0392b',
        specialParams: {
            secondOsc: 'sawtooth',
            detune: 10
        },
        centerMidi: 52 // E3
    },
    'Acoustic Guitar': {
        category: '🎸 Guitars & Strings',
        waveform: 'triangle',
        attack: 0.002,
        decay: 0.8,
        sustain: 0.0,
        release: 0.8,
        filterType: 'lowpass',
        filterFreq: 3000,
        filterQ: 1,
        reverbMix: 0.3,
        color: '#cd853f',
        specialParams: {
            secondOsc: 'sine',
            detune: 2
        },
        centerMidi: 60
    },
    'Chamber Strings': {
        category: '🎸 Guitars & Strings',
        waveform: 'sawtooth',
        attack: 0.5,
        decay: 0.1,
        sustain: 0.8,
        release: 1.0,
        filterType: 'lowpass',
        filterFreq: 2500,
        filterQ: 0,
        chorusAmount: 0.4,
        reverbMix: 0.5,
        color: '#3498db',
        centerMidi: 60
    },
    'Solo Cello': {
        category: '🎸 Guitars & Strings',
        waveform: 'sawtooth',
        attack: 0.2,
        decay: 0.2,
        sustain: 0.9,
        release: 0.6,
        filterType: 'lowpass',
        filterFreq: 1200,
        filterQ: 1,
        reverbMix: 0.4,
        color: '#8b4513',
        centerMidi: 48 // C3
    },

    // ==========================================
    // 🔊 Bass & Leads
    // ==========================================
    'Analog Bass': {
        category: '🔊 Bass & Leads',
        waveform: 'sawtooth',
        attack: 0.01,
        decay: 0.2,
        sustain: 0.4,
        release: 0.1,
        filterType: 'lowpass',
        filterFreq: 600,
        filterQ: 2,
        color: '#9b59b6',
        centerMidi: 36 // C2
    },
    'Sub Bass': {
        category: '🔊 Bass & Leads',
        waveform: 'sine',
        attack: 0.05,
        decay: 0.2,
        sustain: 0.8,
        release: 0.2,
        filterType: 'lowpass',
        filterFreq: 150,
        filterQ: 0,
        color: '#2f3542',
        centerMidi: 32 // G#1
    },
    'Saw Lead': {
        category: '🔊 Bass & Leads',
        waveform: 'sawtooth',
        attack: 0.01,
        decay: 0.1,
        sustain: 0.6,
        release: 0.2,
        filterType: 'lowpass',
        filterFreq: 5000,
        filterQ: 2,
        delayMix: 0.3,
        reverbMix: 0.2,
        color: '#f1c40f',
        centerMidi: 72 // C5
    },
    'Soft Lead': {
        category: '🔊 Bass & Leads',
        waveform: 'sine',
        attack: 0.1,
        decay: 0.2,
        sustain: 0.7,
        release: 0.4,
        filterType: 'lowpass',
        filterFreq: 2000,
        filterQ: 1,
        delayMix: 0.2,
        reverbMix: 0.4,
        color: '#55efc4',
        centerMidi: 72
    },

    // ==========================================
    // 🥁 Drums & Percussion (Full Data-Driven)
    // ==========================================

    'Standard Kit': {
        category: '🥁 Drums & Percussion',
        color: '#e67e22',
        isDrum: true,
        // Default parameters
        drumParams: {
            kick: {
                freq: 150,
                endFreq: 40,
                decay: 0.5,
                wave: 'sine',
                attack: 0.001
            },
            snare: {
                freq: 200,
                filter: 1000,
                decay: 0.25,
                noiseMix: 1.0,
                toneMix: 0.5
            },
            hat: {
                filter: 6000,
                dur: 0.05
            },
            tom: {
                base: 1.0
            } // Tom pitch multiplier
        }
    },

    'Trap Kit': {
        category: '🥁 Drums & Percussion',
        color: '#ff7979',
        isDrum: true,
        drumParams: {
            // 808 sound (long bass)
            kick: {
                freq: 100,
                endFreq: 30,
                decay: 0.8,
                wave: 'sine',
                attack: 0.05
            },
            // Dry and sharp snare
            snare: {
                freq: 350,
                filter: 2500,
                decay: 0.15,
                noiseMix: 0.8,
                toneMix: 0.3
            },
            // Tight hi-hats
            hat: {
                filter: 8000,
                dur: 0.03
            },
            tom: {
                base: 1.2
            } // Higher-pitched toms
        }
    },

    'Electronic Kit': { // (Techno style)
        category: '🥁 Drums & Percussion',
        color: '#d35400',
        isDrum: true,
        drumParams: {
            // Punchy and short kick
            kick: {
                freq: 200,
                endFreq: 45,
                decay: 0.3,
                wave: 'triangle',
                attack: 0.001
            },
            snare: {
                freq: 180,
                filter: 800,
                decay: 0.2,
                noiseMix: 1.2,
                toneMix: 0.5
            },
            hat: {
                filter: 5000,
                dur: 0.05
            },
            tom: {
                base: 0.8
            } // Lower toms
        }
    },

    'Rock Kit': { // New kit for testing
        category: '🥁 Drums & Percussion',
        color: '#ff3f34',
        isDrum: true,
        drumParams: {
            kick: {
                freq: 140,
                endFreq: 50,
                decay: 0.4,
                wave: 'sine',
                attack: 0.01
            },
            snare: {
                freq: 190,
                filter: 1200,
                decay: 0.3,
                noiseMix: 0.9,
                toneMix: 0.8
            }, // Stronger body
            hat: {
                filter: 4000,
                dur: 0.06
            }, // More metallic sound
            tom: {
                base: 1.0
            }
        }
    },

    'Lo-Fi Kit': {
        category: '🥁 Drums & Percussion',
        color: '#badc58',
        isDrum: true,
        drumParams: {
            kick: {
                freq: 120,
                endFreq: 60,
                decay: 0.4,
                wave: 'sine',
                lofi: true
            },
            snare: {
                freq: 220,
                filter: 400,
                decay: 0.1,
                noiseMix: 0.6,
                toneMix: 0.5,
                lofi: true
            },
            hat: {
                filter: 2000,
                dur: 0.04
            },
            tom: {
                base: 1.0
            }
        }
    },

    'Studio Kit': {
        category: '🥁 Drums & Percussion',
        color: '#706fd3', // Dark purple/blue color
        isDrum: true,
        drumParams: {
            // Dry, punchy kick (acoustic style)
            kick: {
                freq: 100,
                endFreq: 50,
                decay: 0.3,
                wave: 'sine',
                attack: 0.005
            },

            // Snare with wooden body and tight wires
            snare: {
                freq: 250,
                filter: 1500,
                decay: 0.2,
                noiseMix: 0.7,
                toneMix: 0.8
            },

            // Sharp metallic hats
            hat: {
                filter: 8000,
                dur: 0.04
            },

            // Tuned and resonant toms (Key feature)
            tom: {
                base: 1.0,
                type: 'acoustic'
            }
        }
    },
};

/**
 * Retrieves the instrument settings for a given preset name.
 * If the preset is not found, it returns the 'Default' preset.
 *
 * @param {string} presetName - The name of the instrument preset to retrieve.
 * @returns {Object} The instrument configuration object containing parameters like waveform, envelope, and filter settings.
 */
export function getInstrumentSettings(presetName) {
    return INSTRUMENTS[presetName] || INSTRUMENTS['Default'];
}