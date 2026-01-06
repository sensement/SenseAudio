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
 * MusicBrain Class
 * * Core engine for AI music composition, handling music theory, 
 * chord progressions, melody generation (Markov & Motif-based), 
 * and rhythmic pattern generation across various genres.
 */
export default class MusicBrain {
    constructor() {
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        this.scales = {
            'Major': [0, 2, 4, 5, 7, 9, 11],
            'Minor': [0, 2, 3, 5, 7, 8, 10],
            'HarmonicMinor': [0, 2, 3, 5, 7, 8, 11],
            'Dorian': [0, 2, 3, 5, 7, 9, 10],
            'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
            'Blues': [0, 3, 5, 6, 7, 10],
            'PentatonicMajor': [0, 2, 4, 7, 9],
            'PentatonicMinor': [0, 3, 5, 7, 10]
        };
        
        this.intervals = {
            0: { score: 100, mood: "Unison" },
            7: { score: 95, mood: "Perfect 5th (Stable)" },
            4: { score: 90, mood: "Major 3rd (Happy)" },
            3: { score: 85, mood: "Minor 3rd (Sad)" },
            5: { score: 70, mood: "Perfect 4th" },
            12: { score: 100, mood: "Octave" },
            2: { score: 60, mood: "Major 2nd" },
            9: { score: 80, mood: "Major 6th" },
            11: { score: 40, mood: "Maj 7th (Tense)" },
            6: { score: 20, mood: "Tritone (Dissonant)" },
            1: { score: 10, mood: "Min 2nd (Clash)" }
        };

        // --- Chord Definitions + Functions + Vibes ---
        this.chordDegrees = {
            'Major': [
                { name: 'I', type: 'Major', intervals: [0, 4, 7], func: 'TONIC', vibe: 'Home, Stable' },
                { name: 'ii', type: 'Minor', intervals: [2, 5, 9], func: 'SUPERTONIC', vibe: 'Pre-Dominant' },
                { name: 'iii', type: 'Minor', intervals: [4, 7, 11], func: 'MEDIANT', vibe: 'Emotional bridge' },
                { name: 'IV', type: 'Major', intervals: [5, 9, 0], func: 'SUBDOMINANT', vibe: 'Motion, Openness' },
                { name: 'V', type: 'Major', intervals: [7, 11, 2], func: 'DOMINANT', vibe: 'Tension -> Home' },
                { name: 'vi', type: 'Minor', intervals: [9, 0, 4], func: 'SUBMEDIANT', vibe: 'Sad relative' },
                { name: 'vii°', type: 'Dim', intervals: [11, 2, 5], func: 'LEADING', vibe: 'Unstable' }
            ],
            'Minor': [
                { name: 'i', type: 'Minor', intervals: [0, 3, 7], func: 'TONIC', vibe: 'Home, Dark' },
                { name: 'ii°', type: 'Dim', intervals: [2, 5, 8], func: 'SUPERTONIC', vibe: 'Tense prep' },
                { name: 'III', type: 'Major', intervals: [3, 7, 10], func: 'MEDIANT', vibe: 'Relative Major' },
                { name: 'iv', type: 'Minor', intervals: [5, 8, 0], func: 'SUBDOMINANT', vibe: 'Soft motion' },
                { name: 'v', type: 'Minor', intervals: [7, 10, 2], func: 'DOMINANT', vibe: 'Soft tension' },
                { name: 'VI', type: 'Major', intervals: [8, 0, 3], func: 'SUBMEDIANT', vibe: 'Epic lift' },
                { name: 'VII', type: 'Major', intervals: [10, 2, 5], func: 'SUBTONIC', vibe: 'Backdoor' }
            ],
            'HarmonicMinor': [
                { name: 'i', type: 'Minor', intervals: [0, 3, 7], func: 'TONIC', vibe: 'Home, Serious' },
                { name: 'ii°', type: 'Dim', intervals: [2, 5, 8], func: 'SUPERTONIC', vibe: 'Tense' },
                { name: 'III+', type: 'Aug', intervals: [3, 7, 11], func: 'MEDIANT', vibe: 'Suspense' },
                { name: 'iv', type: 'Minor', intervals: [5, 8, 0], func: 'SUBDOMINANT', vibe: 'Dark motion' },
                { name: 'V', type: 'Major', intervals: [7, 11, 2], func: 'DOMINANT', vibe: 'STRONG Tension!' },
                { name: 'VI', type: 'Major', intervals: [8, 0, 3], func: 'SUBMEDIANT', vibe: 'Deceptive resolve' },
                { name: 'vii°', type: 'Dim', intervals: [11, 2, 5], func: 'LEADING', vibe: 'Very Unstable' }
            ],
            'Dorian': [
                { name: 'i', type: 'Minor', intervals: [0, 3, 7], func: 'TONIC', vibe: 'Groovy Home' },
                { name: 'ii', type: 'Minor', intervals: [2, 5, 9], func: 'SUPERTONIC', vibe: 'Soulful prep' },
                { name: 'III', type: 'Major', intervals: [3, 7, 10], func: 'MEDIANT', vibe: 'Bright contrast' },
                { name: 'IV', type: 'Major', intervals: [5, 9, 0], func: 'SUBDOMINANT', vibe: 'The Dorian Flavor!' },
                { name: 'v', type: 'Minor', intervals: [7, 10, 2], func: 'DOMINANT', vibe: 'Soft pull' },
                { name: 'vi°', type: 'Dim', intervals: [9, 0, 3], func: 'SUBMEDIANT', vibe: 'Dark passing' },
                { name: 'VII', type: 'Major', intervals: [10, 2, 5], func: 'SUBTONIC', vibe: 'Classic Rock resolve' }
            ],
            'Mixolydian': [
                { name: 'I', type: 'Major', intervals: [0, 4, 7], func: 'TONIC', vibe: 'Happy Home' },
                { name: 'ii', type: 'Minor', intervals: [2, 5, 9], func: 'SUPERTONIC', vibe: 'Mellow' },
                { name: 'iii°', type: 'Dim', intervals: [4, 7, 10], func: 'MEDIANT', vibe: 'Unstable' },
                { name: 'IV', type: 'Major', intervals: [5, 9, 0], func: 'SUBDOMINANT', vibe: 'Bright motion' },
                { name: 'v', type: 'Minor', intervals: [7, 10, 2], func: 'DOMINANT', vibe: 'Modal flavor' },
                { name: 'vi', type: 'Minor', intervals: [9, 0, 4], func: 'SUBMEDIANT', vibe: 'Relative minor' },
                { name: 'bVII', type: 'Major', intervals: [10, 2, 5], func: 'SUBTONIC', vibe: 'Backdoor to I' }
            ],
            'Blues': [
                { name: 'I7', type: 'Dom7', intervals: [0, 4, 7], func: 'TONIC', vibe: 'Blues Home' },
                { name: 'IV7', type: 'Dom7', intervals: [5, 9, 0], func: 'SUBDOMINANT', vibe: 'Blues motion' },
                { name: 'V7', type: 'Dom7', intervals: [7, 11, 2], func: 'DOMINANT', vibe: 'Turnaround' },
                { name: 'I', type: 'Major', intervals: [0, 4, 7], func: 'TONIC', vibe: 'Simplified' },
                { name: 'bVII', type: 'Major', intervals: [10, 2, 5], func: 'SUBTONIC', vibe: 'Cool resolve' }
            ],
            'PentatonicMajor': [
                { name: 'I', type: 'Major', intervals: [0, 4, 7], func: 'TONIC', vibe: 'Home' },
                { name: 'ii', type: 'Minor', intervals: [2, 5, 9], func: 'SUPERTONIC', vibe: 'Soft' },
                { name: 'iii', type: 'Minor', intervals: [4, 7, 11], func: 'MEDIANT', vibe: 'Sweet' },
                { name: 'V', type: 'Major', intervals: [7, 11, 2], func: 'DOMINANT', vibe: 'Strong' },
                { name: 'vi', type: 'Minor', intervals: [9, 0, 4], func: 'SUBMEDIANT', vibe: 'Warm' }
            ],
            'PentatonicMinor': [
                { name: 'i', type: 'Minor', intervals: [0, 3, 7], func: 'TONIC', vibe: 'Base' },
                { name: 'III', type: 'Major', intervals: [3, 7, 10], func: 'MEDIANT', vibe: 'Bright' },
                { name: 'iv', type: 'Minor', intervals: [5, 8, 0], func: 'SUBDOMINANT', vibe: 'Drifting' },
                { name: 'v', type: 'Minor', intervals: [7, 10, 2], func: 'DOMINANT', vibe: 'Soft' },
                { name: 'VII', type: 'Major', intervals: [10, 2, 5], func: 'SUBTONIC', vibe: 'Rock vibe' }
            ]
        };

        // --- Standard Vocal Ranges ---
        this.vocalRanges = {
            'NONE': { min: 0, max: 127, label: 'No Limit' },
            'SOPRANO': { min: 60, max: 84, label: 'Soprano (C4-C6)' },
            'MEZZO':   { min: 57, max: 81, label: 'Mezzo (A3-A5)' },
            'ALTO':    { min: 53, max: 77, label: 'Alto (F3-F5)' },
            'TENOR':    { min: 48, max: 72, label: 'Tenor (C3-C5)' },
            'BARITONE': { min: 41, max: 64, label: 'Baritone (F2-E4)' },
            'BASS':     { min: 36, max: 60, label: 'Bass (C2-C4)' }
        };

        // --- Harmony Rules (Section-based Suggestions) ---
        this.sectionRules = {
            'NONE': { 
                desc: 'No Section Defined', 
                suggested: [],
                avoid: [],
                tips: {} 
            },
            'INTRO': { 
                desc: 'Set the Atmosphere', 
                suggested: [0], 
                avoid: [],
                tips: {
                    0: '✨ Perfect Start',
                    4: '🚩 Tension Start'
                }
            },
            'VERSE': { 
                desc: 'Storytelling (Stable & Loop)', 
                suggested: [0, 5], 
                avoid: [],
                tips: {
                    0: '📖 Main Story',
                    5: '🌧 Emotional Loop',
                    3: '🚶‍♂️ Walking away'
                }
            },
            'PRE_CHORUS': { 
                desc: 'Build Tension', 
                suggested: [3, 4, 1], 
                avoid: [0], 
                tips: { 
                    4: '🔥 Ultimate Buildup', // Dominant chord
                    3: '🚀 Lift off',          // Subdominant chord
                    1: '🤔 Jazzy Prep'        // Supertonic chord
                } 
            },
            'CHORUS': { 
                desc: 'Release & Power', 
                suggested: [0, 3, 4, 5], 
                avoid: [1, 2, 6],
                tips: {
                    0: '💥 Power Home',
                    3: '🌞 Anthem Feel',
                    4: '📣 Call to action'
                }
            },
            'SOLO': { 
                desc: 'Instrumental Break', 
                suggested: [0, 5, 3, 4], // Usually focuses on main chords
                avoid: [],
                tips: {
                    0: '🎸 Epic Center',
                    5: '🔥 Emotional Solo'
                }
            },
            'BRIDGE': { 
                desc: 'Contrast & Shift', 
                suggested: [5, 2, 3], 
                avoid: [0],
                tips: {
                    5: '🌉 Dark Turn',
                    2: '💔 Emotional Shift',
                    4: '🎢 Peak Tension'
                }
            },
            'OUTRO': { 
                desc: 'Fade Out', 
                suggested: [0], 
                avoid: [4],
                tips: {
                    0: '🏁 The End',
                    3: '👋 Plagal Fade'
                }
            }
        };

        // ----------------------------------------------------------------
        // 1. Song Templates (Including genre tags)
        // ----------------------------------------------------------------
        this.songTemplates = {
            // === POP ===
            'POP_RADIO': {
                genre: 'POP', 
                label: 'Pop: Radio Hit',
                bpm: 120,
                desc: 'The gold standard. Balanced verse/chorus (~3:00).',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'VERSE', len: 8 }, { type: 'PRE_CHORUS', len: 4 }, { type: 'CHORUS', len: 8 },
                    { type: 'VERSE', len: 8 }, { type: 'PRE_CHORUS', len: 4 }, { type: 'CHORUS', len: 8 },
                    { type: 'BRIDGE', len: 8 }, { type: 'CHORUS', len: 16 }, { type: 'OUTRO', len: 4 }
                ]
            },
            'POP_SHORT': {
                genre: 'POP',
                label: 'Pop: Short / Viral',
                bpm: 124,
                desc: 'Fast paced, no bridge, straight to the point (~2:00).',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'VERSE', len: 8 }, { type: 'CHORUS', len: 8 },
                    { type: 'VERSE', len: 8 }, { type: 'CHORUS', len: 8 }, { type: 'OUTRO', len: 4 }
                ]
            },
            'POP_EPIC': {
                genre: 'POP',
                label: 'Pop: Power Ballad / Epic',
                bpm: 75,
                desc: 'Slow, emotional, includes Solo section (~3:45).',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'VERSE', len: 8 }, { type: 'PRE_CHORUS', len: 4 }, { type: 'CHORUS', len: 8 },
                    { type: 'VERSE', len: 8 }, { type: 'PRE_CHORUS', len: 4 }, { type: 'CHORUS', len: 8 },
                    { type: 'SOLO', len: 8 },    // <--- Solo Section
                    { type: 'BRIDGE', len: 8 },
                    { type: 'CHORUS', len: 16 }, 
                    { type: 'OUTRO', len: 8 }
                ]
            },

            // === HIP HOP (Includes Trap and Boom Bap) ===
            'TRAP': {
                genre: 'HIPHOP',
                label: 'Hip Hop: Modern Trap',
                bpm: 140,
                desc: 'Standard trap structure with distinct hook sections.',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'CHORUS', len: 8 }, { type: 'VERSE', len: 16 },
                    { type: 'CHORUS', len: 8 }, { type: 'VERSE', len: 16 }, { type: 'CHORUS', len: 8 }, { type: 'OUTRO', len: 4 }
                ]
            },
            'BOOMBAP': {
                genre: 'HIPHOP',
                label: 'Hip Hop: Old School',
                bpm: 90,
                desc: 'Focus on rhythm and long verses.',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'VERSE', len: 16 }, { type: 'CHORUS', len: 4 },
                    { type: 'VERSE', len: 16 }, { type: 'CHORUS', len: 4 }, { type: 'VERSE', len: 16 }, { type: 'OUTRO', len: 8 }
                ]
            },

            // === EDM ===
            'EDM_RADIO': {
                genre: 'EDM', 
                label: 'EDM: Radio Edit',
                bpm: 128,
                desc: 'Compact version of a dance track.',
                structure: [
                    { type: 'INTRO', len: 8 }, { type: 'VERSE', len: 8 }, { type: 'PRE_CHORUS', len: 8 }, { type: 'CHORUS', len: 8 },
                    { type: 'VERSE', len: 8 }, { type: 'PRE_CHORUS', len: 8 }, { type: 'CHORUS', len: 16 }, { type: 'OUTRO', len: 8 }
                ]
            },
            'EDM_CLUB': {
                genre: 'EDM',
                label: 'EDM: Club Extended',
                bpm: 128,
                desc: 'DJ friendly. Long Intro/Outro.',
                structure: [
                    { type: 'INTRO', len: 16 }, { type: 'VERSE', len: 16 }, { type: 'PRE_CHORUS', len: 8 }, { type: 'CHORUS', len: 16 },
                    { type: 'BRIDGE', len: 8 }, { type: 'PRE_CHORUS', len: 8 }, { type: 'CHORUS', len: 16 }, { type: 'OUTRO', len: 16 }
                ]
            },

            // === ROCK ===
            'ROCK_CLASSIC': {
                genre: 'ROCK',
                label: 'Classic Rock',
                bpm: 110,
                desc: 'Standard Verse-Chorus rock anthem.',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'VERSE', len: 8 }, { type: 'CHORUS', len: 8 },
                    { type: 'VERSE', len: 8 }, { type: 'CHORUS', len: 8 }, { type: 'SOLO', len: 8 }, // Rock needs a solo!
                    { type: 'CHORUS', len: 16 }, { type: 'OUTRO', len: 4 }
                ]
            },
            'PUNK_ROCK': {
                genre: 'ROCK',
                label: 'Punk / High Energy',
                bpm: 160,
                desc: 'Fast, loud, and short.',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'VERSE', len: 8 }, { type: 'CHORUS', len: 8 },
                    { type: 'VERSE', len: 8 }, { type: 'CHORUS', len: 8 }, { type: 'OUTRO', len: 4 }
                ]
            },

            // === LOFI / CHILL ===
            'LOFI_BEAT': {
                genre: 'LOFI',
                label: 'Lo-Fi Hip Hop',
                bpm: 80,
                desc: 'Relaxing beats to study/relax to.',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'VERSE', len: 16 }, { type: 'BRIDGE', len: 4 },
                    { type: 'VERSE', len: 16 }, { type: 'OUTRO', len: 8 }
                ]
            },

            // === LATIN ===
            'REGGAETON': {
                genre: 'LATIN',
                label: 'Latin / Reggaeton',
                bpm: 95,
                desc: 'The classic Dembow rhythm.',
                structure: [
                    { type: 'INTRO', len: 4 }, { type: 'CHORUS', len: 8 }, { type: 'VERSE', len: 16 },
                    { type: 'CHORUS', len: 8 }, { type: 'VERSE', len: 16 }, { type: 'CHORUS', len: 8 }, { type: 'OUTRO', len: 4 }
                ]
            },
            'PERSIAN_SLOW_6_8': {
                genre: 'PERSIAN', // Enables this genre in the list
                label: 'Persian: Slow 6/8 (Slo-Rock)',
                bpm: 85, 
                desc: 'Classic slow rhythm, emotional and heavy.',
                structure: [
                    { type: 'INTRO', len: 4 }, 
                    { type: 'VERSE', len: 8 }, 
                    { type: 'PRE_CHORUS', len: 4 }, 
                    { type: 'CHORUS', len: 8 },
                    { type: 'SOLO', len: 8 },     // Solo is critical in Persian music
                    { type: 'VERSE', len: 8 }, 
                    { type: 'CHORUS', len: 16 },  // Long final chorus
                    { type: 'OUTRO', len: 8 }
                ]
            },
            'PERSIAN_POP_NOSTALGIA': {
                genre: 'PERSIAN',
                label: 'Persian: 80s/90s Pop',
                bpm: 105,
                desc: 'Standard 4/4 pop structure (Ghomayshi Style).',
                structure: [
                    { type: 'INTRO', len: 8 },    // Long intros typical of the 80s
                    { type: 'VERSE', len: 8 }, 
                    { type: 'CHORUS', len: 8 },
                    { type: 'VERSE', len: 8 }, 
                    { type: 'CHORUS', len: 8 }, 
                    { type: 'BRIDGE', len: 8 },
                    { type: 'CHORUS', len: 16 },
                    { type: 'OUTRO', len: 8 }
                ]
            }
        };

        // ----------------------------------------------------------------
        // 2. Progression Styles (The Great Library)
        // ----------------------------------------------------------------
        // Guide: Numbers represent chord indices in the scale.
        // Major Scale: 0=I, 1=ii, 2=iii, 3=IV, 4=V, 5=vi, 6=vii°
        
        this.progressionStyles = {
            // ============================================================
            // POP: The King of Melody and Structure
            // ============================================================
            'POP': [
                {
                    name: 'The Axis of Awesome',
                    preferredScale: 'Major', // Pop standard
                    desc: 'The most famous 4 chords (I - V - vi - IV). Works for everything.',
                    sections: { 
                        'INTRO': [0],                
                        'VERSE': [0, 4],             // I - V (Calm)
                        'PRE_CHORUS': [5, 3],        // vi - IV (Tension)
                        'CHORUS': [0, 4, 5, 3],      // I - V - vi - IV (Peak)
                        'BRIDGE': [3, 4, 3, 4],      // IV - V (Suspense)
                        'SOLO': [0, 4, 5, 3],        // Solo bed
                        'OUTRO': [0]                 
                    }
                },
                {
                    name: 'Emotional Ballad',
                    preferredScale: 'Major', // Starts with relative minor (vi) but in Major scale
                    desc: 'Sad & deep start, heroic finish (vi - IV - I - V).',
                    sections: { 
                        'INTRO': [5, 3], 
                        'VERSE': [5, 3],             // vi - IV (Sad)
                        'PRE_CHORUS': [1, 4],        // ii - V (Jazz climb)
                        'CHORUS': [5, 3, 0, 4],      // vi - IV - I - V (Emotional release)
                        'BRIDGE': [2, 5, 1, 4],      // iii - vi... (Phase shift)
                        'SOLO': [5, 3, 0, 4],
                        'OUTRO': [3, 0]              // IV - I (Amen)
                    }
                },
                {
                    name: 'Doo-Wop / 50s',
                    preferredScale: 'Major', // Classic and Happy
                    desc: 'Classic romantic vibes (I - vi - IV - V).',
                    sections: { 
                        'INTRO': [0, 5, 3, 4],
                        'VERSE': [0, 5, 3, 4],       // I - vi - IV - V (Famous loop)
                        'PRE_CHORUS': [3, 4],        // IV - V
                        'CHORUS': [0, 5, 3, 4],      
                        'BRIDGE': [1, 4, 0, 4],      // ii - V - I - V
                        'SOLO': [0, 5, 3, 4],
                        'OUTRO': [0, 3, 0] 
                    }
                },
                {
                    name: 'Royal Road (Anime/Epic)',
                    preferredScale: 'Major', // Japanese Epic
                    desc: 'Powerful & Heroic (IV - V - iii - vi). Very popular in Japan.',
                    sections: { 
                        'INTRO': [3, 4, 2, 5],
                        'VERSE': [0, 4, 5, 0],       // I - V - vi - I
                        'PRE_CHORUS': [3, 4],        // IV - V (Launch)
                        'CHORUS': [3, 4, 2, 5],      // IV - V - iii - vi (Epic Peak)
                        'BRIDGE': [1, 4, 3, 4],
                        'SOLO': [3, 4, 2, 5],
                        'OUTRO': [3, 4, 0] 
                    }
                },
                {
                    name: 'Dreamy / Psychedelic',
                    preferredScale: 'Major', // Dreamy and Open
                    desc: 'Floating summer vibes (I - IV loop). Think Miley/Tame Impala.',
                    sections: { 
                        'INTRO': [0, 3],             // I - IV (Dreamy start)
                        'VERSE': [0, 3],             // I - IV (Simple open loop)
                        'PRE_CHORUS': [1, 4],        // ii - V (Movement for variety)
                        'CHORUS': [0, 3, 0, 3],      // I - IV - I - IV (Floating feel)
                        'BRIDGE': [5, 2, 3, 4],      // vi - iii... (Darker)
                        'SOLO': [0, 3],              // Great bed for FX-heavy lead guitar
                        'OUTRO': [0]                 // Fading into horizon
                    }
                },
                {
                    name: '80s Synth-Pop Revival',
                    preferredScale: 'Major', // Energetic and Danceable
                    desc: 'Fast, energetic and driving (As It Was / Blinding Lights vibes).',
                    sections: { 
                        'INTRO': [5, 5, 3, 3],       // vi - IV (Leaning on minor and fourth)
                        'VERSE': [5, 0, 4, 3],       // vi - I - V - IV
                        'PRE_CHORUS': [1, 4],        // ii - V
                        'CHORUS': [5, 3, 0, 4],      // vi - IV - I - V (Golden Disco Formula)
                        'BRIDGE': [3, 4, 3, 4],      // Stop on drums
                        'SOLO': [5, 3, 0, 4],        // Synth solo
                        'OUTRO': [5]                 // Sudden stop on minor
                    }
                },
                {
                    name: 'Gen-Z Alternative',
                    preferredScale: 'Minor', // Dark and Minimal
                    desc: 'Moody, bass-driven and minimal.',
                    sections: { 
                        'INTRO': [5],                // Bass only (vi in Major or i in Minor)
                        'VERSE': [5, 3],             // Dark repetition
                        'PRE_CHORUS': [0, 4],        // Temporary hope
                        'CHORUS': [5, 2, 3, 4],      // Dramatic peak
                        'BRIDGE': [1, 6, 5],         // Chromatic movement
                        'OUTRO': [5]
                    }
                }
            ],

            // ============================================================
            // EDM: Energy, Drop, and Repetition
            // ============================================================
            'EDM': [
                {
                    name: 'Festival Anthem',
                    preferredScale: 'Minor', // For energy and seriousness
                    desc: 'Big Room Energy (vi - IV - I - V). Minor feel.',
                    sections: { 
                        'INTRO': [5],                // Drone (One note)
                        'VERSE': [5, 2],             // vi - iii (Dark)
                        'PRE_CHORUS': [3, 4],        // IV - V (Buildup)
                        'CHORUS': [5, 3, 0, 4],      // DROP (Energy)
                        'DROP': [5, 3, 0, 4],        // Same as chorus
                        'BRIDGE': [1, 4],
                        'OUTRO': [5, 0]
                    }
                },
                {
                    name: 'Summer Vibes',
                    preferredScale: 'Major', // Beach and Happy
                    desc: 'Uplifting & Sunny (IV - I - V - vi). Avicii style.',
                    sections: { 
                        'INTRO': [3, 0],
                        'VERSE': [3, 0],             // IV - I
                        'PRE_CHORUS': [1, 4],        // ii - V
                        'CHORUS': [3, 0, 4, 5],      // IV - I - V - vi
                        'DROP': [3, 0, 4, 5],
                        'BRIDGE': [1, 3, 4],
                        'OUTRO': [3, 3, 0]
                    }
                }
            ],

            // ============================================================
            // HIPHOP: Dark and Catchy Loops
            // ============================================================
            'HIPHOP': [
                {
                    name: 'Dark Trap',
                    preferredScale: 'Phrygian', // Vital for Trap! (First semitone)
                    desc: 'Menacing & Phrygian (i - bII). Semitone tension.',
                    sections: { 
                        'INTRO': [0, 1],
                        'VERSE': [0, 1],             // i - bII (Semitone interval)
                        'PRE_CHORUS': [3, 4],        // iv - V (Classic tension)
                        'CHORUS': [0, 2, 0, 1],      // i - III - i - bII
                        'BRIDGE': [3, 4],
                        'OUTRO': [0]
                    }
                },
                {
                    name: 'Melodic / Emo Rap',
                    preferredScale: 'Minor', // Sad and Emotional
                    desc: 'Emotional Loop (vi - V - IV - V).',
                    sections: { 
                        'INTRO': [5, 4],
                        'VERSE': [5, 4],             // vi - V
                        'PRE_CHORUS': [3, 4],        // IV - V
                        'CHORUS': [3, 4, 5, 5],      // IV - V - vi - vi
                        'BRIDGE': [1, 4],
                        'OUTRO': [5]
                    }
                }
            ],

            // ============================================================
            // ROCK: Power and Riffs
            // ============================================================
            'ROCK': [
                {
                    name: 'Arena Rock',
                    preferredScale: 'Mixolydian', // Classic Rock scale (bVII)
                    desc: 'Powerful Mixolydian (I - bVII - IV). AC/DC style.',
                    sections: { 
                        'INTRO': [0, 6, 3],          // I - bVII - IV
                        'VERSE': [0, 3],             // I - IV
                        'PRE_CHORUS': [5, 4],        // vi - V (Driving force)
                        'CHORUS': [0, 6, 3, 4],      // I - bVII - IV - V (Epic)
                        'SOLO': [0, 6, 3],           // Solo bed
                        'BRIDGE': [1, 4],
                        'OUTRO': [0, 0, 0]           
                    }
                },
                {
                    name: 'Alternative / Grunge',
                    preferredScale: 'Minor', // Dark and Depressed
                    desc: 'Moody & Contrast (vi - I - V). Verse/Chorus shift.',
                    sections: { 
                        'INTRO': [5, 2],
                        'VERSE': [5, 2],             // vi - iii (Minor/Dark)
                        'PRE_CHORUS': [3, 4],        // IV - V (Opening up)
                        'CHORUS': [5, 0, 4, 4],      // vi - I - V (Explosion)
                        'SOLO': [5, 0, 4],
                        'OUTRO': [5]
                    }
                }
            ],

            // ============================================================
            // LOFI: Jazzy and Nostalgic
            // ============================================================
            'LOFI': [
                {
                    name: 'Jazz Hop (2-5-1)',
                    preferredScale: 'Dorian', // Popular Jazz scale
                    desc: 'The Jazz Standard (ii - V - I). Smooth & Classy.',
                    sections: { 
                        'INTRO': [1, 4],
                        'VERSE': [1, 4, 0, 5],       // ii - V - I - vi
                        'PRE_CHORUS': [3, 6],        // IV - vii (Mode change)
                        'CHORUS': [1, 4, 0, 0],      // ii - V - I (Full resolution)
                        'BRIDGE': [3, 4],
                        'SOLO': [1, 4, 0],
                        'OUTRO': [0]
                    }
                },
                {
                    name: 'Nostalgic Drift',
                    preferredScale: 'Major', // Simple and Sweet
                    desc: 'Sentimental (IV - iii - ii - V).',
                    sections: { 
                        'INTRO': [3],
                        'VERSE': [3, 2],             // IV - iii (Descending)
                        'PRE_CHORUS': [1, 4],        // ii - V
                        'CHORUS': [3, 2, 1, 4],      // IV - iii - ii - V (Descending loop)
                        'BRIDGE': [5, 4],
                        'OUTRO': [0]
                    }
                }
            ],

            // ============================================================
            // LATIN: Dance and Feeling
            // ============================================================
            'LATIN': [
                {
                    name: 'Despacito Vibe',
                    preferredScale: 'Major', // Latin Pop is usually Major
                    desc: 'Latin Pop Standard (vi - IV - I - V).',
                    sections: { 
                        'INTRO': [5, 3],
                        'VERSE': [5, 3],             // vi - IV (Half)
                        'PRE_CHORUS': [0, 4],        // I - V (Other half)
                        'CHORUS': [5, 3, 0, 4],      // vi - IV - I - V (Full)
                        'BRIDGE': [1, 4],
                        'SOLO': [5, 3, 0, 4],
                        'OUTRO': [5]
                    }
                },
                {
                    name: 'Party Starter',
                    preferredScale: 'Minor', // For faster club dances
                    desc: 'Simple & Catchy (ii - V - vi).',
                    sections: { 
                        'INTRO': [1, 4],
                        'VERSE': [1, 4],             // ii - V
                        'PRE_CHORUS': [3, 4],        // IV - V
                        'CHORUS': [1, 4, 5, 5],      // ii - V - vi - vi
                        'SOLO': [1, 4, 5],
                        'OUTRO': [1]
                    }
                }
            ],
            // ============================================================
            // PERSIAN / NOSTALGIA: 60s/70s Persian Pop Style
            // ============================================================
            'PERSIAN': [
                {
                    name: 'Ghomayshi Vibe (Andalusian)',
                    preferredScale: 'HarmonicMinor', // Golden Key: Harmonic Minor
                    desc: 'Classic descending nostalgia (i - VII - VI - V). Think "Rainy".',
                    sections: { 
                        // Intro: Suspense on V
                        'INTRO': [4, 4, 0, 0],       // V - V - i - i (E - E - Am - Am)
                        
                        // Verse: Famous descending movement (Andalusian Cadence)
                        'VERSE': [0, 6, 5, 4],       // i - bVII - bVI - V (Am - G - F - E)
                        
                        // Pre-Chorus: Move to IV for variety
                        'PRE_CHORUS': [3, 0, 3, 4],  // iv - i - iv - V (Dm - Am - Dm - E)
                        
                        // Chorus: Emotional peak emphasizing tonic and dominant
                        'CHORUS': [0, 6, 5, 4],      // Repeat descending movement but with more energy
                        
                        // Bridge: Atmosphere change (usually starts with VI)
                        'BRIDGE': [5, 6, 3, 4],      // VI - VII - iv - V (F - G - Dm - E)
                        
                        'SOLO': [0, 6, 5, 4],        // Great bed for Synth or Guitar solo
                        
                        // Outro: End on suspense chord then resolve
                        'OUTRO': [4, 0]              // V - i (E -> Am)
                    }
                },
                {
                    name: '6/8 Persian Ballad',
                    preferredScale: 'HarmonicMinor',
                    desc: 'Traditional Persian Pop rhythm (i - iv - V).',
                    sections: { 
                        'INTRO': [0, 3],
                        'VERSE': [0, 3, 4, 0],       // i - iv - V - i
                        'PRE_CHORUS': [3, 0, 4, 4],  // iv - i - V - V
                        'CHORUS': [2, 5, 3, 4],      // III - VI - iv - V (Famous progression)
                        'BRIDGE': [1, 4],            // ii° - V
                        'OUTRO': [0]
                    }
                }
            ]
        };
        
        // ----------------------------------------------------------------
        // 3. Arpeggiator Styles (Arp patterns per style and section)
        // ----------------------------------------------------------------
        // Guide:
        // pattern: Note indices in the extended chord (0=root, 1=second note, ... 12=octave)
        //          null means Rest
        // rate: Speed (1 = 1/16, 2 = 1/8, 4 = 1/4)
        // gate: Note length (<1 = staccato, >1 = legato)
        
        this.arpStyles = {
            'POP': {
                'VERSE':  { pattern: [0, 2], rate: 2, gate: 0.6 }, // Simple: Root and Fifth
                'CHORUS': { pattern: [0, 1, 2, 3, 2, 1], rate: 1, gate: 0.9 }, // Classic: Up and Down
                'BRIDGE': { pattern: [0, 3, 1, 2], rate: 2, gate: 1.1 } // Melodic
            },
            'EDM': {
                'VERSE':  { pattern: [0, null, 0, null], rate: 1, gate: 0.4 }, // Short pluck
                'CHORUS': { pattern: [0, 2, 3, 2], rate: 1, gate: 0.8 }, // Energetic
                'BUILDUP':{ pattern: [0, 0, 0, 0, 1, 1, 1, 1], rate: 1, gate: 0.5 }
            },
            'ROCK': {
                'VERSE':  { pattern: [0, 1, 2, 1], rate: 2, gate: 1.5 }, // Clean Guitar (Let ring)
                'CHORUS': { pattern: [0, 0, 1, 0, 2, 0], rate: 1, gate: 0.7 }, // Pedal point (Static root)
                'SOLO':   { pattern: [0, 1, 2, 3], rate: 1, gate: 0.8 }
            },
            'LOFI': {
                'VERSE':  { pattern: [0, 1, 2, 3], rate: 4, gate: 1.2 }, // Very slow and sustained
                'CHORUS': { pattern: [0, 2, 1, 3], rate: 2, gate: 1.0 },
                'BRIDGE': { pattern: [0, null, 1, null], rate: 4, gate: 1.0 }
            },
            'LATIN': {
                'VERSE':  { pattern: [0, null, 2], rate: 2, gate: 0.6 },
                'CHORUS': { pattern: [0, null, 1, 2, null, 1], rate: 1, gate: 0.7 } // Syncopated (Space)
            },
            'HIPHOP': {
                'VERSE':  { pattern: [0, 2], rate: 4, gate: 0.5 }, // Sparse
                'CHORUS': { pattern: [0, 1, 2], rate: 2, gate: 0.6 }
            },
            'PERSIAN': { // Melodic and fluid arpeggios
                'VERSE':  { pattern: [0, 1, 2, 3], rate: 2, gate: 0.8 }, 
                'CHORUS': { pattern: [0, 1, 2, 3, 2, 1], rate: 2, gate: 0.9 } 
            }
        };

        // ----------------------------------------------------------------
        // 4. Instrument Mapping (Correct Instrument Settings)
        // ----------------------------------------------------------------
        this.genreInstruments = {
            'POP': { 
                bass: 'Analog Bass', 
                pad: 'Soft Pad', 
                lead: 'Saw Lead', 
                arp: 'Distorted Guitar' 
            },
            'ROCK': { 
                bass: 'Analog Bass', 
                pad: 'Vintage Synth Pad', 
                lead: 'Distorted Guitar', 
                arp: 'Distorted Guitar' 
            },
            'LOFI': { 
                bass: 'Sub Bass', 
                pad: 'Dark Ocean Pad', 
                lead: 'Vintage Rhodes', 
                arp: 'Distorted Guitar' 
            },
            'EDM': { 
                bass: 'Analog Bass', 
                pad: 'Bright Cloud Pad', 
                lead: 'Saw Lead', 
                arp: 'Distorted Guitar' 
            },
            'HIPHOP': { 
                bass: 'Sub Bass', 
                pad: 'Soft Pad', 
                lead: 'Soft Lead', 
                arp: 'Distorted Guitar' 
            },
            'LATIN': { 
                bass: 'Analog Bass', 
                pad: 'Electric Piano', 
                lead: 'Saw Lead', 
                arp: 'Distorted Guitar' 
            },
            'PERSIAN': { 
                bass: 'Analog Bass', 
                pad: 'Bright Cloud Pad', 
                lead: 'Saw Lead', 
                arp: 'Acoustic Guitar' 
            }
        };
    }

    /**
     * Returns instrument configuration for a specific genre.
     * @param {string} genre - The genre identifier (e.g., 'POP').
     * @returns {object} Instrument mapping.
     */
    getInstrumentsForGenre(genre) {
        return this.genreInstruments[genre] || this.genreInstruments['POP'];
    }

    // --- Basic Utility Methods ---

    /**
     * Converts MIDI number to note name (e.g., 60 -> C4).
     * @param {number} midi - MIDI note number.
     * @returns {string} Note name.
     */
    getNoteName(midi) {
        return this.noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
    }
    
    /**
     * Gets the label (pitch class) of a MIDI note (e.g., C, C#).
     * @param {number} midi - MIDI note number.
     * @returns {string} Pitch class name.
     */
    getNoteLabel(midi) {
        return this.noteNames[midi % 12];
    }

    /**
     * Returns a Set of MIDI numbers belonging to a scale.
     * @param {number} rootKey - Root key MIDI number (0-11).
     * @param {string} scaleName - Name of the scale (e.g., 'Major').
     * @returns {Set<number>} Set of valid MIDI notes.
     */
    getScaleNotes(rootKey, scaleName) {
        let indices = this.scales[scaleName] || this.scales['Major'];
        let set = new Set();
        for (let i = 0; i < 127; i++) {
            let interval = (i - rootKey + 12) % 12;
            if (indices.includes(interval)) set.add(i);
        }
        return set;
    }

    /**
     * constructs the real chord name based on root key and definition.
     * @param {object} chordDef - Chord definition object.
     * @param {number} rootKey - The global root key.
     * @returns {string} Chord name (e.g., "Am", "C").
     */
    getRealChordName(chordDef, rootKey) {
        const chordRootMidi = (rootKey + chordDef.intervals[0]) % 12;
        const rootName = this.noteNames[chordRootMidi];
        let suffix = "";
        if (chordDef.type === 'Minor') suffix = "m";
        else if (chordDef.type === 'Dim') suffix = "°";
        return `${rootName}${suffix}`;
    }
    
    /**
     * Calculates frequency from MIDI number.
     * @param {number} midi - MIDI note number.
     * @returns {string} Frequency in Hz (fixed to 2 decimals).
     */
    getFrequency(midi) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        return freq.toFixed(2);
    }

    // --- Analysis Methods ---

    /**
     * Analyzes a single note against the current scale and context.
     * @param {number} targetMidi - The note to analyze.
     * @param {number} rootKey - Root key of the song.
     * @param {Set} scaleSet - Set of valid scale notes.
     * @param {number|null} lastNoteMidi - Previous note (for interval analysis).
     * @returns {object} Analysis result {score, mood, details}.
     */
    analyzeNote(targetMidi, rootKey, scaleSet, lastNoteMidi) {
        let score = 0;
        let details = [];
        let mood = "Neutral";

        if (scaleSet.has(targetMidi)) {
            score += 50;
            details.push("In Scale");
        } else {
            return { score: 10, mood: "Out of Key", details: ["Accidental"] };
        }

        if (lastNoteMidi !== null) {
            let interval = Math.abs(targetMidi - lastNoteMidi) % 12;
            let quality = this.intervals[interval] || { score: 50, mood: "Unknown" };
            score += (quality.score / 2);
            details.push(`Interval: ${quality.mood}`);
        } else {
            let interval = Math.abs(targetMidi - (60 + rootKey)) % 12; 
            let quality = this.intervals[interval] || { score: 50, mood: "Neutral" };
            score += (quality.score / 2);
            details.push(`Root Relation: ${quality.mood}`);
        }

        return {
            score: Math.min(100, Math.round(score)),
            mood: score > 80 ? "Harmonious" : "Tense",
            details: details
        };
    }

    /**
     * Analyzes how well a set of notes fits a chord definition.
     * @param {Array} barNotes - Notes in the bar.
     * @param {object} chordDefinition - The target chord.
     * @param {number} rootKey - Song root key.
     * @returns {object} Match score and chord name.
     */
    analyzeBarHarmony(barNotes, chordDefinition, rootKey) {
        if (!chordDefinition) return { score: 0, details: "No Chord" };
        if (barNotes.length === 0) return { score: 100, details: "Empty" };

        const allowedPCs = chordDefinition.intervals.map(interval => (rootKey + interval) % 12);
        let matchCount = 0;
        barNotes.forEach(note => {
            if (allowedPCs.includes(note.midi % 12)) matchCount++;
        });

        let percentage = Math.round((matchCount / barNotes.length) * 100);
        return { score: percentage, chordName: chordDefinition.name };
    }

    /**
     * Determines the harmonic role of a note within a chord.
     */
    getNoteRole(midi, chordDef, scaleRoot, currentBarRootIdx) {
        if (!chordDef) return 'UNKNOWN';
        const noteIndex = midi % 12;
        const interval = (noteIndex - currentBarRootIdx + 12) % 12;

        if (interval === 0) return 'ROOT';
        if (interval === 7) return 'FIFTH';
        if (interval === 3 || interval === 4) return 'THIRD';
        if (interval === 10 || interval === 11) return 'SEVENTH';
        if (interval === 2 || interval === 5 || interval === 9) return 'EXTENSION';
        return 'NON_CHORD';
    }

    /**
     * Helper to get the absolute root of a chord within the scale.
     */
    getChordRootInScale(scaleRoot, scaleName, chordDegreeIndex) {
        // Safe implementation to prevent crashes
        // Assumes intervals[0] is the distance from scale root to chord root
        const chordDef = this.chordDegrees[scaleName] ? this.chordDegrees[scaleName][chordDegreeIndex] : null;
        if (!chordDef) return 0;
        return (scaleRoot + chordDef.intervals[0]) % 12;
    }

    // =========================================================================
    //  Melody Generation Engine (Simple, Fluid, Beautiful)
    // =========================================================================
    
    /**
     * Generates a structured melody based on sections and rhythm motifs.
     * @param {number} startBar - Starting bar index.
     * @param {number} length - Number of bars to generate.
     * @param {string} complexity - 'LOW', 'MEDIUM', 'HIGH'.
     * @param {object} state - Full song state (chords, scale, etc.).
     * @returns {Array} List of note objects.
     */
    generateMelody(startBar, length, complexity, state) {
        const newNotes = [];
        const scaleNotes = this.getScaleNotes(state.rootKey, state.scaleName); 
        const range = this.vocalRanges[state.vocalRangeType] || { min: 48, max: 84 }; 
        
        // 1. Adjust vocal range based on starting section (for the whole phrase)
        const firstSection = (state.barStructure && state.barStructure[startBar]) ? state.barStructure[startBar] : 'NONE';
        let targetMin = range.min;
        let targetMax = range.max;
        
        // Verse: Slightly lower and calmer
        if (firstSection === 'VERSE') targetMax -= 4; 
        // Chorus: Slightly higher and more open
        else if (firstSection === 'CHORUS') targetMin += 4; 

        // 2. Create Main Motif (Theme)
        // Repeated throughout this range to maintain continuity
        const mainRhythm = this.generateMelodicRhythm(complexity);
        
        // Last played note (to maintain continuity between bars)
        let lastMidi = -1;

        for (let b = 0; b < length; b++) {
            const currentBar = startBar + b;
            if (currentBar >= state.totalBars) break;
            
            const currentSection = (state.barStructure && state.barStructure[currentBar]) || 'NONE';
            const chordIdx = state.barChords[currentBar] || 0;
            const chordDef = this.chordDegrees[state.scaleName][chordIdx];

            // 3. Determine Rhythm for this bar (A-A-B-C Structure)
            let currentRhythmPattern = [];
            const positionInPhrase = b % 4; // Position in 4-bar phrase

            if (b === length - 1) {
                // End of piece: Sustained note (Resolve)
                currentRhythmPattern = [{duration: state.stepsPerBar, isRest: false}]; 
            } 
            else if (positionInPhrase === 3) {
                // Bar 4 (Phrase End): Simplify for breathing
                currentRhythmPattern = [
                    {duration: 8, isRest: false}, 
                    {duration: 8, isRest: (Math.random() > 0.5)} // Maybe rest, maybe sustain
                ];
            } 
            else if (positionInPhrase === 2) {
                 // Bar 3 (Variation): Slight change to main rhythm
                 currentRhythmPattern = this.variateRhythmSimple(mainRhythm);
            } 
            else {
                // Bar 1 & 2 (Theme): Execute main rhythm
                currentRhythmPattern = JSON.parse(JSON.stringify(mainRhythm));
            }
            
            // Exception: Intro
            if (currentSection === 'INTRO') {
                currentRhythmPattern = this.getIntroArpeggio();
            }

            // 4. Note Placement
            let stepCursor = 0;
            for (let noteDef of currentRhythmPattern) {
                if (stepCursor >= state.stepsPerBar) break;
                
                let dur = noteDef.duration;
                if (stepCursor + dur > state.stepsPerBar) dur = state.stepsPerBar - stepCursor;

                const isStrongBeat = (stepCursor % 4 === 0);
                const absTime = (currentBar * state.stepsPerBar) + stepCursor;

                if (!noteDef.isRest) {
                    const generatedMidi = this.pickSmoothNote({
                        lastMidi: lastMidi,
                        chordDef: chordDef,
                        rootKey: state.rootKey,
                        scaleNotes: scaleNotes,
                        min: targetMin,
                        max: targetMax,
                        isStrongBeat: isStrongBeat,
                        isPhraseStart: (stepCursor === 0 && positionInPhrase === 0)
                    });

                    if (generatedMidi) {
                        // Natural Velocity
                        let vel = 0.8;
                        if (currentSection === 'CHORUS') vel = 0.95;
                        if (!isStrongBeat) vel -= 0.15;
                        
                        newNotes.push({
                            midi: generatedMidi,
                            time: absTime,
                            duration: dur,
                            velocity: Math.max(0.1, Math.min(1.0, vel))
                        });
                        lastMidi = generatedMidi;
                    }
                }
                stepCursor += dur;
            }
        }
        return newNotes;
    }

    /**
     * Advanced Markov Chain Melody Generator.
     * Uses section-specific motifs and harmonic rules to create fluid improvisation.
     * * @param {number} root - Root key.
     * @param {string} scaleName - Scale name.
     * @param {object} chordNotesMap - Map of bars to chord notes.
     * @param {number} startBar - Starting bar.
     * @param {number} numBars - Number of bars to generate.
     * @param {string} complexity - Complexity level.
     * @param {object} state - Song state.
     */
    generateMelodyMarkov(root, scaleName, chordNotesMap, startBar, numBars, complexity, state) {
        const generatedNotes = [];
        
        // 1. Settings
        let stepsPerBar = 16;
        if (state && state.stepsPerBar) stepsPerBar = Number(state.stepsPerBar);
        const beat = stepsPerBar / 4; 
        const rootKey = Number(root);
        const allScaleNotes = this.getScaleNotesArr(rootKey, scaleName, 55, 84); 

        // 2. Build Motif Bank
        // Create a separate motif for each section
        const motifBank = {
            'INTRO': this.generateGoodMotif(complexity, stepsPerBar, 'SPARSE'), // Sparse
            'VERSE': this.generateGoodMotif(complexity, stepsPerBar, 'CHATTY'), // Rhythmic/Chatty
            'CHORUS': this.generateGoodMotif(complexity, stepsPerBar, 'ANTHEM'), // Sustained/Anthemic
            'BRIDGE': this.generateGoodMotif(complexity, stepsPerBar, 'SYNC'),  // Syncopated
            'OUTRO': this.generateGoodMotif(complexity, stepsPerBar, 'SPARSE')
        };
        
        // Default to Verse if structure is undefined
        const structure = (state && state.barStructure) ? state.barStructure : [];

        let lastMidi = -1; 
        
        for (let b = 0; b < numBars; b++) {
            const absoluteBar = startBar + b;
            const currentSection = structure[absoluteBar] ? structure[absoluteBar] : 'VERSE';
            
            // Retrieve motif specific to this section
            // Fallback to VERSE if unknown
            const baseMotif = motifBank[currentSection] || motifBank['VERSE'];

            const currentChordNotes = chordNotesMap[absoluteBar] || [];
            const chordClasses = currentChordNotes.map(n => Number(n) % 12);
            
            const phrasePos = b % 4; 
            const isLastBarOfPhrase = (phrasePos === 3);

            // Determine final pattern
            let currentPattern = [];

            if (isLastBarOfPhrase) {
                // Phrase End: Resolution
                // Sustained note at the end of every 4 bars
                currentPattern = [
                    { dur: beat * 2, type: 'NOTE' },
                    { dur: beat * 2, type: 'REST' }
                ];
            } else if (phrasePos === 2) {
                // Bar 3: Variation
                currentPattern = this.variateMotif(baseMotif);
            } else {
                // Execute section motif
                currentPattern = JSON.parse(JSON.stringify(baseMotif));
            }

            // --- Pitch Selection ---
            let currentStepInBar = 0;
            
            for (let noteDef of currentPattern) {
                if (currentStepInBar >= stepsPerBar) break;
                
                let duration = noteDef.dur;
                if (currentStepInBar + duration > stepsPerBar) duration = stepsPerBar - currentStepInBar;

                if (noteDef.type === 'REST') {
                    currentStepInBar += duration;
                    continue;
                }

                const absTime = (absoluteBar * stepsPerBar) + currentStepInBar;
                const isStrongBeat = (currentStepInBar % beat === 0);

                // Note Selection Strategy (No jumps)
                let targetMidi = -1;

                // Try higher pitch for Chorus for excitement
                let validRangeNotes = allScaleNotes;
                if (currentSection === 'CHORUS') {
                    // Filter out very low notes for chorus
                    validRangeNotes = allScaleNotes.filter(n => n >= 65); 
                }

                if (lastMidi === -1) {
                    const midRange = validRangeNotes.filter(n => n >= 60 && n <= 72);
                    let starters = midRange.length > 0 ? midRange : validRangeNotes;
                    
                    if (chordClasses.length > 0) {
                        const chordStarters = starters.filter(n => chordClasses.includes(n % 12));
                        if (chordStarters.length > 0) starters = chordStarters;
                    }
                    targetMidi = starters[Math.floor(Math.random() * starters.length)];
                } 
                else {
                    // Safe neighbors (Interval <= 7)
                    const neighbors = validRangeNotes.filter(n => Math.abs(n - lastMidi) <= 7);
                    
                    let candidates = [];
                    if (isStrongBeat && chordClasses.length > 0) {
                        candidates = neighbors.filter(n => chordClasses.includes(n % 12));
                    }
                    if (candidates.length === 0) candidates = neighbors;
                    if (candidates.length === 0) candidates = validRangeNotes.filter(n => Math.abs(n - lastMidi) <= 12);

                    if (candidates.length > 0) {
                        candidates.sort((a, b) => {
                            const distA = Math.abs(a - lastMidi);
                            const distB = Math.abs(b - lastMidi);
                            const scoreA = (distA === 0) ? 100 : distA;
                            const scoreB = (distB === 0) ? 100 : distB;
                            return scoreA - scoreB;
                        });

                        const r = Math.random();
                        let idx = 0;
                        if (r > 0.6) idx = 1;
                        if (r > 0.9) idx = Math.min(2, candidates.length - 1);
                        
                        targetMidi = candidates[Math.min(idx, candidates.length - 1)];
                    } else {
                        targetMidi = lastMidi;
                    }
                }

                let vel = 0.75;
                if (currentSection === 'CHORUS') vel = 0.85; // Chorus louder
                if (isStrongBeat) vel += 0.1; 
                vel += (Math.random() * 0.1 - 0.05);

                generatedNotes.push({
                    midi: Number(targetMidi),
                    time: absTime,
                    duration: Number(duration),
                    velocity: Number(vel.toFixed(2))
                });

                lastMidi = targetMidi;
                currentStepInBar += duration;
            }
        }

        return generatedNotes;
    }

    /**
     * Generates a rhythmic motif based on complexity and vibe (section type).
     */
    generateGoodMotif(complexity, stepsPerBar, vibe) {
        const beat = stepsPerBar / 4; // Length of one beat (e.g., 4)
        let sourcePatterns = [];

        // 1. Chorus Rhythm (ANTHEM): Sustained, epic, dignified
        if (vibe === 'ANTHEM') {
            sourcePatterns = [
                // Classic
                [beat * 2, beat * 2],               // Half - Half
                [beat * 4],                         // Whole note (Very epic)
                [beat, beat, beat * 2],             // Quarter - Quarter - Half
                
                // Modern Pop
                [beat * 1.5, beat * 0.5, beat * 2], // Dotted Quarter... (Famous pop rhythm)
                [beat * 2, beat, beat],             // Half - Quarter - Quarter
                [beat * 3, beat],                   // Dotted Half - Quarter
                
                // High Energy
                [beat, beat, beat, beat],           // Four on the floor
                [beat * 0.5, beat * 0.5, beat, beat * 2], // Fast start, sustained end
                [beat * 2.5, beat * 0.5, beat]      // Sustained then final hit
            ];
        } 
        // 2. Verse Rhythm (CHATTY): Fast, short, storytelling
        else if (vibe === 'CHATTY') {
            sourcePatterns = [
                // Simple Speech
                [beat, beat, beat, beat],           // Simple rhythm
                [beat/2, beat/2, beat, beat, beat], // ta-ta-ti ta ta
                [beat, beat/2, beat/2, beat, beat], // ta ta-ti-ti ta
                
                // Rhythmic and Funk
                [beat/2, beat/2, beat/2, beat/2, beat, beat], // 16th notes
                [beat/2, beat, beat/2, beat, beat], // Syncopated
                [beat, beat, beat/2, beat/2, beat],
                
                // Space (Breathing room)
                [beat, beat, beat * 2],             
                [beat/2, beat/2, beat, beat * 2],
                [beat * 0.75, beat * 0.25, beat, beat, beat] // Shuffle feel
            ];
            
            // Add finer rhythms for HIGH complexity
            if (complexity === 'HIGH') {
                sourcePatterns.push(
                    [beat/4, beat/4, beat/2, beat, beat, beat],
                    [beat/2, beat/2, beat/2, beat/2, beat/2, beat/2, beat]
                );
            }
        } 
        // 3. Bridge Rhythm (SYNC): Unexpected and syncopated
        else if (vibe === 'SYNC') {
            sourcePatterns = [
                [beat * 1.5, beat * 1.5, beat],     // Famous Reggaeton/Pop rhythm (3-3-2)
                [beat * 0.75, beat * 0.25, beat, beat * 1.5, beat * 0.5],
                [beat/2, beat, beat/2, beat, beat], // Off-beat
                [beat, beat * 0.5, beat, beat * 0.5, beat]
            ];
        } 
        // 4. Intro/Outro (SPARSE): Very sparse
        else {
            sourcePatterns = [
                [beat * 4],                         // Single note
                [beat * 2, beat * 2],               // Two notes
                [beat * 3, beat],                   // Atmosphere
                [beat * 4]                          // Repeat for sparsity probability
            ];
        }

        // Random selection from pool
        const rawRhythm = sourcePatterns[Math.floor(Math.random() * sourcePatterns.length)];
        
        let pattern = [];
        rawRhythm.forEach(d => {
            let dur = Math.max(1, Math.floor(d));
            pattern.push({ dur: dur, type: 'NOTE' });
        });
        
        return pattern;
    }

    // --- Motif Helper Methods ---

    /**
     * Overloaded method to generate motif without specific vibe (general use).
     */
    generateGoodMotif(complexity, stepsPerBar) {
        const beat = stepsPerBar / 4;
        let pattern = [];
        let remaining = stepsPerBar;

        // Pop Rhythms
        const patternsLow = [
            [beat, beat, beat, beat], // 1 1 1 1
            [beat*1.5, beat*0.5, beat, beat], // dotted
            [beat*2, beat, beat] // 2 1 1
        ];
        
        const patternsHigh = [
            [beat/2, beat/2, beat, beat/2, beat/2, beat], // Syncopation
            [beat*0.75, beat*0.25, beat, beat*0.75, beat*0.25, beat], // Shuffle feel
            [beat, beat/2, beat/2, beat/2, beat/2, beat]
        ];

        // Selection based on complexity
        let source = (complexity === 'HIGH') ? patternsHigh : patternsLow;
        // Mixed for MEDIUM
        if (complexity === 'MEDIUM') source = [...patternsLow, ...patternsHigh];
        
        const rawRhythm = source[Math.floor(Math.random() * source.length)];
        
        // Convert to object format
        rawRhythm.forEach(d => {
            let dur = Math.max(1, Math.floor(d));
            pattern.push({ dur: dur, type: 'NOTE' });
        });

        return pattern;
    }

    /**
     * Creates a slight variation of a motif (e.g., splitting a note).
     */
    variateMotif(motif) {
        const newMotif = JSON.parse(JSON.stringify(motif));
        // Find longest note and split it
        for (let i = 0; i < newMotif.length; i++) {
            if (newMotif[i].dur >= 4 && newMotif[i].type === 'NOTE') {
                const half = Math.floor(newMotif[i].dur / 2);
                newMotif[i].dur = half;
                newMotif.splice(i + 1, 0, { dur: half, type: 'NOTE' });
                break; // One change is enough
            }
        }
        return newMotif;
    }

    /**
     * Finds the closest note from a list of options to a target pitch.
     */
    findClosestNote(target, options) {
        if (!options || options.length === 0) return target;
        return options.reduce((prev, curr) => 
            Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
        );
    }

    /**
     * Selects an item from a list based on weights.
     */
    weightedChoice(values, weights) {
        let sum = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * sum;
        for (let i = 0; i < values.length; i++) {
            if (r < weights[i]) return values[i];
            r -= weights[i];
        }
        return values[0];
    }
    
    /**
     * Gets scale notes within a specific MIDI range as an array.
     */
    getScaleNotesArr(root, scaleName, minMidi, maxMidi) {
        const baseNotes = this.getScaleNotes(root, scaleName);
        const arr = [];
        for (let m = minMidi; m <= maxMidi; m++) {
            if (baseNotes.has(m)) arr.push(m);
        }
        return arr;
    }

    // --- Melody Engine Helpers ---

    /**
     * Generates standard melodic rhythms based on complexity.
     */
    generateMelodicRhythm(complexity) {
        const motifs = {
            'LOW': [
                [4, 4, 8],          // Simple and Heavy
                [6, 2, 8],          // Anchored
                [8, 4, 4],          // Sustained start
                [4, 4, 4, 4]        // March
            ],
            'MEDIUM': [
                [3, 3, 2, 4, 4],    // Famous Pop Rhythm (Tresillo variation)
                [4, 2, 2, 8],       // Classic
                [2, 2, 4, 4, 4],    // Fast start
                [4, 4, 2, 2, 4],    // Balanced
                [6, 2, 6, 2]        // Oscillating
            ],
            'HIGH': [
                [2, 2, 2, 2, 4, 4], // Fluid
                [3, 1, 3, 1, 4, 4], // Shuffle
                [2, 4, 2, 4, 4]     // Syncopated
            ]
        };
        
        const list = motifs[complexity] || motifs['MEDIUM'];
        const base = list[Math.floor(Math.random() * list.length)];
        return base.map(d => ({ duration: d, isRest: false }));
    }

    /**
     * Slight variation of a rhythm pattern.
     */
    variateRhythmSimple(pattern) {
        const p = JSON.parse(JSON.stringify(pattern));
        // Split first note if it is long
        if (p.length > 0 && p[0].duration >= 4) {
             const first = p.shift();
             const half = first.duration / 2;
             p.unshift({duration: half, isRest:false}, {duration: half, isRest:false});
        }
        return p;
    }

    /**
     * Returns a standard Intro arpeggio pattern (atmospheric).
     */
    getIntroArpeggio() {
        return [
            {duration: 4, isRest: false}, 
            {duration: 4, isRest: true}, 
            {duration: 4, isRest: false}, 
            {duration: 4, isRest: true}
        ];
    }

    /**
     * Intelligent Note Picker for smooth melodies.
     */
    pickSmoothNote(params) {
        const { lastMidi, chordDef, rootKey, scaleNotes, min, max, isStrongBeat, isPhraseStart } = params;
        
        const chordTones = [];
        const scaleTones = [];
        const allowedPCs = chordDef.intervals.map(i => (rootKey + i) % 12);

        for (let m = min; m <= max; m++) {
            if (scaleNotes.has(m)) {
                scaleTones.push(m);
                if (allowedPCs.includes(m % 12)) chordTones.push(m);
            }
        }
        
        if (scaleTones.length === 0) return null;

        // Phrase Start: Must be a chord tone or scale tone
        if (isPhraseStart || lastMidi === -1) {
            if (chordTones.length > 0) return chordTones[Math.floor(chordTones.length / 2)]; 
            return scaleTones[Math.floor(scaleTones.length / 2)];
        }

        let candidates = scaleTones;
        let bestNote = candidates[0];
        let bestScore = -Infinity;

        candidates.forEach(note => {
            let score = 0;
            const dist = note - lastMidi;
            const absDist = Math.abs(dist);

            // A. Proximity (Most important factor)
            if (absDist === 0) score -= 5;        // Repetition is not great
            else if (absDist <= 2) score += 20;   // Stepwise motion is excellent
            else if (absDist <= 4) score += 10;   // Third interval is good
            else if (absDist <= 5) score += 5;    // Fourth interval
            else score -= (absDist * 2);          // Large jumps discouraged

            // B. Harmony
            const isChordTone = allowedPCs.includes(note % 12);
            if (isChordTone) {
                if (isStrongBeat) score += 15; // Strong beat on chord tone
                else score += 5;
            } else {
                if (!isStrongBeat) score += 5; // Weak beat on passing tone
                else score -= 5;
            }

            // C. Randomness for variety
            score += (Math.random() * 8);

            if (score > bestScore) {
                bestScore = score;
                bestNote = note;
            }
        });

        return bestNote;
    }

    // --- Drum Pattern Engine ---

    /**
     * Generates drum notes for a specific step in the sequence.
     * @param {string} genre - Music genre.
     * @param {string} currentSection - Current section (Verse, Chorus, etc).
     * @param {string} nextSection - Next section (for transitions).
     * @param {number} stepIndex - Current step index.
     * @param {number} stepsPerBar - Steps per bar.
     * @param {boolean} isTransition - Is this a transition bar?
     * @returns {Array} Array of MIDI drum notes to add.
     */
    getDrumPattern(genre, currentSection, nextSection, stepIndex, stepsPerBar, isTransition) {
        // --- 1. Init & Constants ---
        const normalizedStep = Math.floor(stepIndex / (stepsPerBar / 16));
        const subStep = stepIndex % (stepsPerBar / 16); 
        const s = normalizedStep % 16;
        let notesToAdd = [];

        const KICK = 36; const SNARE = 38;
        const CHAT = 42; const OHAT = 46; const CRASH = 49;
        const LO_TOM = 41; const MID_TOM = 45; const HI_TOM = 48;

        // --- 2. Define Patterns ---
        const patterns = {
            'ROCK': { // Rock: Heavy on 2 and 4
                kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
                snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] // Open Hats (Continuous)
            },
            'POP': { // Pop: Standard
                kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
                snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]
            },
            'TECHNO': { // Techno/EDM: Four on the floor
                kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
                snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                hat:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0] // Off-beat hats
            },
            'EDM': { // Fallback to Techno
                kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
                snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                hat:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]
            },
            'HIPHOP': { // Hip Hop / Trap
                kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], 
                snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // Snare on 3 (Half-time feel)
                hat:   [1,0,1,0, 1,1,1,0, 1,0,1,0, 1,0,1,1] 
            },
            'LOFI': { // Lo-Fi: Calm and sparse
                kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
                snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
            },
            'LATIN': { // Reggaeton: Famous 3-3-2 Rhythm
                kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // Four on the floor
                snare: [0,0,0,1, 0,0,1,0, 0,0,0,1, 0,0,1,0], // The "Dem-Bow" syncopation
                hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
            },
            'PERSIAN': { // Simulated 6/8 Heavy or Persian Pop
                // Kick on 1 and 3 (Heavy)
                kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0], 
                // Snare on 2 and 4 (Standard) with fills
                snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1], 
                // Continuous fine hats
                hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] 
            }
        };
        
        const pt = patterns[genre] || patterns['POP'];

        // --- 3. Transition Logic ---
        if (isTransition && subStep === 0) {
            
            // Strategy A: Intro
            if (currentSection === 'INTRO') {
                if (s >= 14) { 
                    if (s === 14) notesToAdd.push(SNARE);
                    if (s === 15) notesToAdd.push(SNARE);
                    return notesToAdd; 
                }
            }

            // Strategy B: Descent (Chorus -> Verse)
            else if (currentSection === 'CHORUS' && nextSection !== 'CHORUS' && nextSection !== 'OUTRO') {
                if (s >= 12) {
                    if (s === 12) notesToAdd.push(HI_TOM);
                    if (s === 13) notesToAdd.push(MID_TOM);
                    if (s === 14) notesToAdd.push(LO_TOM);
                    return notesToAdd;
                }
            }

            // Strategy C: Buildup/Rise
            else if (nextSection === 'CHORUS' || nextSection === 'OUTRO' || s >= 8) { 
                if (s >= 8) {
                     if (genre === 'ROCK') {
                        if (s === 8 || s === 9) notesToAdd.push(SNARE);
                        if (s === 10 || s === 11) notesToAdd.push(MID_TOM);
                        if (s === 12 || s === 13) notesToAdd.push(LO_TOM);
                        if (s === 14) notesToAdd.push(KICK);
                        if (s === 15) notesToAdd.push(SNARE);
                    }
                    else if (genre === 'POP') {
                        if (s === 8 || s === 9) { notesToAdd.push(SNARE); }
                        if (s === 10) { notesToAdd.push(KICK); }
                        if (s === 11) { notesToAdd.push(MID_TOM); }
                        if (s === 12) { notesToAdd.push(KICK); }
                        if (s === 13) { notesToAdd.push(HI_TOM); }
                        if (s === 14) { notesToAdd.push(SNARE); notesToAdd.push(LO_TOM); }
                    }
                    else if (genre === 'TECHNO') {
                        notesToAdd.push(SNARE);
                        if (s % 2 === 0) notesToAdd.push(KICK);
                    }
                    else if (genre === 'TRAP') {
                        if (s === 8) notesToAdd.push(SNARE);
                        if (s === 9) notesToAdd.push(SNARE);
                        if (s === 10) notesToAdd.push(SNARE);
                        if (s === 13) notesToAdd.push(KICK);
                        if (s === 14) notesToAdd.push(SNARE);
                        if (s === 15) notesToAdd.push(SNARE);
                    }
                    else if (nextSection === 'CHORUS' || nextSection === 'OUTRO' || s >= 8) { 
                        if (s >= 8) {
                            if (genre === 'ROCK' || genre === 'PUNK_ROCK') {
                                // ...
                            }
                            else if (genre === 'POP') {
                                // ...
                            }
                            else if (genre === 'TECHNO' || genre === 'EDM') {
                                // ...
                            }
                            else if (genre === 'HIPHOP' || genre === 'TRAP') {
                                if (s === 8) notesToAdd.push(SNARE);
                                if (s === 9) notesToAdd.push(SNARE);
                                if (s === 10) notesToAdd.push(SNARE);
                                if (s === 13) notesToAdd.push(KICK);
                                if (s === 14) notesToAdd.push(SNARE);
                                if (s === 15) notesToAdd.push(SNARE);
                            }
                            // Simple fill for LOFI and LATIN
                            else {
                                if (s === 14) notesToAdd.push(SNARE);
                                if (s === 15) notesToAdd.push(SNARE);
                            }
                            return notesToAdd;
                        }
                    }
                    return notesToAdd;
                }
            }
        }

        // --- 4. Base Patterns (RHYTHM LOOPS) ---

        if (subStep === 0) {
            
            // --- PRE-CHORUS Logic ---
            if (currentSection === 'PRE_CHORUS') {
                if (s % 4 === 0) notesToAdd.push(KICK); 
                if (s % 2 === 0) notesToAdd.push(CHAT); 
                if (s === 7 || s === 15) notesToAdd.push(SNARE);
                return notesToAdd; 
            }

            // --- Standard Logic ---
            // KICK
            if (currentSection === 'INTRO') {
                if (s === 0 || s === 8) notesToAdd.push(KICK);
            } 
            else if (currentSection === 'SOLO') { // Solo needs kick
                 if (pt.kick[s]) notesToAdd.push(KICK);
            }
            else if (currentSection !== 'BRIDGE') { 
                if (pt.kick[s]) notesToAdd.push(KICK);
            }

            // SNARE
            if (currentSection !== 'INTRO' && currentSection !== 'OUTRO') {
                if (pt.snare[s]) notesToAdd.push(SNARE);
            }

            // HAT
            if (currentSection === 'CHORUS' || currentSection === 'SOLO') { // Solo also needs energetic hats
                if (genre !== 'TECHNO') {
                    if (s % 4 === 2) notesToAdd.push(OHAT); 
                    else notesToAdd.push(CHAT);
                } else if (pt.hat[s]) notesToAdd.push(CHAT);
            } else {
                if (pt.hat[s]) notesToAdd.push(CHAT);
            }

            // CRASH (Start of Chorus/Solo)
            if ((currentSection === 'CHORUS' || currentSection === 'SOLO') && stepIndex === 0) {
                notesToAdd.push(CRASH);
            }
        }
        
        return notesToAdd;
    }

    // =========================================================================
    //  Structure Wizard Methods
    // =========================================================================

    /**
     * Generates a linear song structure array from a template key.
     * @param {string} templateKey - Key of the template (e.g., 'POP_RADIO').
     * @returns {Array} Linear array of section names.
     */
    generateSongStructure(templateKey) {
        // Get template (e.g., POP_RADIO)
        const template = this.songTemplates[templateKey] || this.songTemplates['POP_RADIO'];
        let fullStructure = [];

        // Convert compressed format to linear bar list
        // Example: { type: 'INTRO', len: 4 } ---> ['INTRO', 'INTRO', 'INTRO', 'INTRO']
        template.structure.forEach(part => {
            for (let i = 0; i < part.len; i++) {
                fullStructure.push(part.type);
            }
        });

        return fullStructure;
    }

    /**
     * Selects an appropriate chord progression for a section based on genre.
     * @param {string} genreStyle - Genre style key.
     * @param {string} section - Section name (e.g., 'CHORUS').
     * @returns {Array} Array of chord indices.
     */
    getChordProgression(genreStyle, section) {
        // 1. Find style list (e.g., entire POP array)
        // Fallback to POP if style not found
        const styles = this.progressionStyles[genreStyle] || this.progressionStyles['POP'];
        
        // 2. Randomly select a "Vibe" from that genre
        // (Ensures variety each time button is pressed)
        const selectedStyle = styles[Math.floor(Math.random() * styles.length)];

        // 3. Extract chords for that section
        const chords = selectedStyle.sections[section];

        // Return standard progression if undefined for section
        return chords || [0, 5, 3, 4]; 
    }

    /**
     * Helper to find style definition by genre and index.
     */
    getStyleByVibe(genreKey, vibeIndex) {
        const styles = this.progressionStyles[genreKey] || this.progressionStyles['POP'];
        return styles[vibeIndex] || styles[0];
    }

    /**
     * Smartly retrieves the arpeggiator pattern.
     * @param {string} genre - Genre key.
     * @param {string} section - Section name.
     * @returns {object} Arp pattern object.
     */
    getArpPattern(genre, section) {
        // 1. Find Genre (Fallback to POP)
        const genreStyles = this.arpStyles[genre] || this.arpStyles['POP'];
        
        // 2. Map specific sections to standard sections
        let targetSection = section;
        if (section === 'INTRO' || section === 'OUTRO') return null; // Silence in Intro/Outro
        if (section === 'SOLO' || section === 'DROP') targetSection = 'CHORUS'; // Solo/Drop behaves like Chorus
        if (section === 'PRE_CHORUS') targetSection = 'VERSE'; // Pre-Chorus behaves like Verse

        // 3. Get Pattern
        const style = genreStyles[targetSection];
        
        // 4. Fallback (If not defined for BRIDGE, use VERSE)
        return style || genreStyles['VERSE'] || genreStyles['CHORUS'];
    }
}