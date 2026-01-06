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
 * Main Audio Engine Class
 * Handles Web Audio API context management, node graph setup, synthesis (Synth/Drums),
 * live effects processing, and offline rendering for export.
 */
export default class AudioEngine {
    constructor() {
        // Critical: Context is not created at instantiation (set to Null).
        // It will be initialized on the first user interaction.
        this.ctx = null;

        // Non-audio state variables
        this.activeNodes = [];
        this.liveTrackBuses = new Map();
        
        // MIDI to Drum Type Mapping
        this.drumMap = {
            36: 'kick_1',
            35: 'kick_2',
            38: 'snare_1',
            40: 'snare_2',
            37: 'stick',
            39: 'clap',
            42: 'hat_closed',
            44: 'hat_pedal',
            46: 'hat_open',
            49: 'crash_1',
            57: 'crash_2',
            41: 'tom_low',
            43: 'tom_low_mid',
            45: 'tom_mid',
            47: 'tom_mid_hi',
            48: 'tom_high',
            50: 'tom_super'
        };

        // Buffers
        this.reverbBuffer = null;
        this.noiseBuffer = null;

        // Audio Nodes (initialized later)
        this.masterGain = null;
        this.analyser = null;
        this.dataArray = null;
    }

    /**
     * Initializes the AudioContext and loads necessary buffers.
     * This method must be called after a user interaction (e.g., click) to unlock audio.
     * @returns {Promise<void>}
     */
    async init() {
        // 1. If context does not exist, create it and setup master nodes
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.setupAudioNodes();
        }

        // 2. Resume context if suspended
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        // 3. Create buffers if they don't exist
        if (!this.reverbBuffer) this.reverbBuffer = this.createImpulseResponse();
        if (!this.noiseBuffer) this.noiseBuffer = this.createNoiseBuffer();
    }

    /**
     * Sets up the master audio graph, including Master Gain, Compressor,
     * and Mastering EQ (Low/High Cuts).
     */
    setupAudioNodes() {
        // --- 1. Define Nodes ---

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4;

        // Master Compressor
        this.masterCompressor = this.ctx.createDynamicsCompressor();
        this.masterCompressor.threshold.value = -10;
        this.masterCompressor.knee.value = 40;
        this.masterCompressor.ratio.value = 2;
        this.masterCompressor.attack.value = 0.005;
        this.masterCompressor.release.value = 0.15;

        // Final Low Cut (Cleaning Filter)
        this.masterLowCut = this.ctx.createBiquadFilter();
        // Explicit stereo enforcement to fix potential Glitch warnings
        this.masterLowCut.channelCount = 2;
        this.masterLowCut.channelCountMode = 'explicit';

        this.masterLowCut.type = 'highpass';
        this.masterLowCut.frequency.value = 30;
        this.masterLowCut.Q.value = 0;

        // Final High Cut (Noise Reduction)
        this.masterHighCut = this.ctx.createBiquadFilter();
        // Explicit stereo enforcement to fix potential Glitch warnings
        this.masterHighCut.channelCount = 2;
        this.masterHighCut.channelCountMode = 'explicit';

        this.masterHighCut.type = 'lowpass';
        this.masterHighCut.frequency.value = 18000;
        this.masterHighCut.Q.value = 0;

        // Analyser Node
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.85;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // --- 2. Drum Bus Setup ---
        this.drumBusGain = this.ctx.createGain();
        this.drumBusGain.gain.value = 0.8;
        this.drumBusComp = this.ctx.createDynamicsCompressor();
        this.drumBusComp.threshold.value = -15;
        this.drumBusComp.knee.value = 10;
        this.drumBusComp.ratio.value = 4;
        this.drumBusComp.attack.value = 0.01;
        this.drumBusComp.release.value = 0.1;

        // Internal Drum Bus connection
        this.drumBusGain.connect(this.drumBusComp);

        // --- 3. Final Routing Chain ---
        this.drumBusComp.connect(this.masterGain);

        // Mastering Chain: Gain -> Compressor -> LowCut -> HighCut -> Analyser -> Destination
        this.masterGain.connect(this.masterCompressor);
        this.masterCompressor.connect(this.masterLowCut);
        this.masterLowCut.connect(this.masterHighCut);
        this.masterHighCut.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
    }

    /**
     * Retrieves current frequency data from the analyser.
     * @returns {Uint8Array} Frequency data array.
     */
    getAudioData() {
        if (!this.analyser || !this.dataArray) return [];
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }

    /**
     * Generates a synthetic impulse response buffer for Reverb.
     * @returns {AudioBuffer}
     */
    createImpulseResponse() {
        const rate = this.ctx.sampleRate;
        const length = rate * 3.0;
        const impulse = this.ctx.createBuffer(2, length, rate);
        
        for (let i = 0; i < length; i++) {
            const n = i / length;
            const d = Math.pow(1 - n, 3);
            impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * d;
            impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * d;
        }
        return impulse;
    }

    /**
     * Generates a white noise buffer.
     * @returns {AudioBuffer}
     */
    createNoiseBuffer() {
        const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            d[i] = Math.random() * 2 - 1;
        }
        return b;
    }

    // --- Live FX Bus System ---

    /**
     * Retrieves or creates a persistent FX chain for a specific track.
     * @param {string|number} trackId - Unique identifier for the track.
     * @param {Object} params - Effect parameters (distortion, delay, reverb).
     * @returns {GainNode|null} The input node of the bus.
     */
    getOrCreateLiveBus(trackId, params) {
        if (!this.ctx) return null; // Protection against early calls

        let bus = this.liveTrackBuses.get(trackId);
        if (!bus) {
            bus = this.createLiveFXChain(this.ctx, this.masterGain);
            this.liveTrackBuses.set(trackId, bus);

            // Prevent clicking artifact during bus creation by ramping up gain
            bus.input.gain.value = 0;
            bus.input.gain.setTargetAtTime(1, this.ctx.currentTime, 0.05);
        }
        this.updateLiveBusParams(bus, params);
        return bus.input;
    }

    /**
     * Updates the volume for a specific track bus.
     * @param {string|number} trackId 
     * @param {number} volume 
     */
    setTrackVolume(trackId, volume) {
        if (!this.ctx) return;
        const bus = this.liveTrackBuses.get(trackId);
        if (bus && bus.input) {
            bus.input.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
        }
    }

    /**
     * Creates the live effects graph (Distortion, Delay, Reverb).
     * @param {AudioContext} ctx 
     * @param {AudioNode} destination 
     * @returns {Object} Object containing input node and references to internal effect nodes.
     */
    createLiveFXChain(ctx, destination) {
        const input = ctx.createGain();

        // --- Distortion Nodes ---
        const distDrive = ctx.createGain();
        distDrive.gain.value = 0;
        const distShaper = ctx.createWaveShaper();
        distShaper.curve = this.makeDistortionCurve(0);
        const distFilter = ctx.createBiquadFilter();
        distFilter.type = 'lowpass';
        distFilter.frequency.value = 4000;
        const distLevel = ctx.createGain();
        distLevel.gain.value = 0;

        // --- Delay Nodes ---
        const delayNode = ctx.createDelay();
        const delayFeedback = ctx.createGain();
        delayFeedback.gain.value = 0;
        const delayWet = ctx.createGain();
        delayWet.gain.value = 0;

        // --- Reverb Nodes ---
        const reverbNode = ctx.createConvolver();
        if (this.reverbBuffer) reverbNode.buffer = this.reverbBuffer;
        const reverbWet = ctx.createGain();
        reverbWet.gain.value = 0;

        // --- Dry Signal ---
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1;

        // --- Routing ---
        // Distortion Chain
        input.connect(distDrive);
        distDrive.connect(distShaper);
        distShaper.connect(distFilter);
        distFilter.connect(distLevel);
        distLevel.connect(destination);

        // Delay Chain
        input.connect(delayNode);
        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        delayNode.connect(delayWet);
        delayWet.connect(destination);

        // Reverb Chain
        input.connect(reverbNode);
        reverbNode.connect(reverbWet);
        reverbWet.connect(destination);

        // Dry Chain
        input.connect(dryGain);
        dryGain.connect(destination);

        return {
            input,
            nodes: { distDrive, distShaper, distLevel, delayNode, delayFeedback, delayWet, reverbNode, reverbWet, dryGain }
        };
    }

    /**
     * Updates the parameters of an existing live bus based on UI settings.
     * @param {Object} bus - The bus object returned by createLiveFXChain.
     * @param {Object} params - Effect settings.
     */
    updateLiveBusParams(bus, params) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const n = bus.nodes;

        // Distortion update
        if (params.distortion > 0) {
            if (!n.distShaper.curve) n.distShaper.curve = this.makeDistortionCurve(params.distortion);
            n.distDrive.gain.setTargetAtTime(5.0, now, 0.1);
            n.distLevel.gain.setTargetAtTime(0.3, now, 0.1);
            n.dryGain.gain.setTargetAtTime(0.2, now, 0.1);
        } else {
            n.distDrive.gain.setTargetAtTime(0, now, 0.1);
            n.distLevel.gain.setTargetAtTime(0, now, 0.1);
            n.dryGain.gain.setTargetAtTime(1.0, now, 0.1);
        }

        // Delay update
        if (params.delayMix > 0) {
            n.delayNode.delayTime.setTargetAtTime(params.delayTime || 0.3, now, 0.1);
            n.delayFeedback.gain.setTargetAtTime(0.3, now, 0.1);
            n.delayWet.gain.setTargetAtTime(params.delayMix, now, 0.1);
        } else {
            n.delayWet.gain.setTargetAtTime(0, now, 0.1);
        }

        // Reverb update
        if (params.reverbMix > 0) {
            if (!n.reverbNode.buffer && this.reverbBuffer) n.reverbNode.buffer = this.reverbBuffer;
            n.reverbWet.gain.setTargetAtTime(params.reverbMix, now, 0.1);
        } else {
            n.reverbWet.gain.setTargetAtTime(0, now, 0.1);
        }
    }

    /**
     * Plays a synthesizer note.
     * @param {number} midi - MIDI note number.
     * @param {number} duration - Duration in seconds.
     * @param {number} time - AudioContext time for playback (0 for now).
     * @param {Object} params - Synth parameters (ADSR, wave, filter).
     * @param {number} velocity - Note velocity (0-1).
     * @param {string} preset - Instrument preset name.
     * @param {AudioContext|null} targetCtx - Context (for offline rendering).
     * @param {AudioNode|null} targetDest - Destination node (for offline rendering).
     * @param {boolean} bypassFX - Bypass internal tracking (default false).
     * @param {boolean} isOfflineRender - Flag for offline mode.
     * @param {string|number|null} trackId - ID for routing to correct bus.
     */
    playNote(midi, duration, time, params, velocity = 0.8, preset = 'Default', targetCtx = null, targetDest = null, bypassFX = false, isOfflineRender = false, trackId = null) {
        // In offline mode, ctx is passed explicitly.
        // In live mode, if ctx is null (user hasn't interacted), we abort.
        const ctx = targetCtx || this.ctx;
        if (!ctx) return;

        params = params || {};
        const startTime = (time && time > 0) ? time : ctx.currentTime;

        let outputDestination;
        if (isOfflineRender) {
            outputDestination = targetDest || this.masterGain;
        } else {
            if (trackId) outputDestination = this.getOrCreateLiveBus(trackId, params);
            else outputDestination = this.masterGain;
        }

        const osc = ctx.createOscillator();
        const envGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const subCut = ctx.createBiquadFilter();

        const pName = preset ? preset.toLowerCase() : '';
        const isBass = pName.includes('bass') || pName.includes('kick') || pName.includes('808');

        if (isBass) {
            subCut.type = 'allpass';
        } else {
            subCut.type = 'lowshelf';
            subCut.frequency.value = 300;
            subCut.gain.value = -12;
        }

        let osc2 = null;
        const safeFreq = (f) => Math.max(20, Math.min(22000, f));
        const wave = params.waveform || 'triangle';
        const atk = params.attack || 0.01;
        const dec = params.decay || 0.1;
        const sus = params.sustain || 0.5;
        const rel = params.release || 0.2;
        const fType = params.filterType || 'lowpass';
        const fFreq = safeFreq(params.filterFreq || 20000);
        const fQ = params.filterQ || 0;

        osc.type = wave;
        osc.frequency.value = safeFreq(440 * Math.pow(2, (midi - 69) / 12));

        // Handle Special Parameters (Dual Osc / Tremolo)
        if (params.specialParams) {
            if (params.specialParams.secondOsc) {
                osc2 = ctx.createOscillator();
                osc2.type = params.specialParams.secondOsc;
                osc2.frequency.value = osc.frequency.value;
                if (params.specialParams.detune) osc2.detune.value = params.specialParams.detune;
            }
            if (params.specialParams.tremolo) {
                const tremolo = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoAmp = ctx.createGain();
                lfo.frequency.value = 5;
                lfoAmp.gain.value = 0.3;
                lfo.connect(lfoAmp);
                lfoAmp.connect(tremolo.gain);
                lfo.start(startTime);
                lfo.stop(startTime + duration + rel);
                envGain.connect(tremolo);
                tremolo.connect(outputDestination);
                outputDestination = tremolo;
            }
        }

        filter.frequency.setValueAtTime(fFreq, startTime);
        if (preset && preset.includes('Guitar')) {
            filter.frequency.linearRampToValueAtTime(Math.min(22000, fFreq + (velocity * 2000)), startTime + atk);
        }
        filter.type = fType;
        filter.Q.value = fQ;

        // --- ENVELOPE ---
        const attEnd = startTime + atk;
        const decEnd = attEnd + dec;
        const relStart = startTime + duration;

        envGain.gain.setValueAtTime(0, startTime);
        envGain.gain.linearRampToValueAtTime(velocity, attEnd);

        if (relStart > decEnd) {
            envGain.gain.exponentialRampToValueAtTime(Math.max(0.001, velocity * sus), decEnd);
        } else {
            envGain.gain.linearRampToValueAtTime(velocity, relStart);
        }

        envGain.gain.setTargetAtTime(0, relStart, rel / 4);
        const killTime = relStart + rel + 0.5;

        // --- Connections ---
        osc.connect(subCut);
        if (osc2) {
            osc2.connect(subCut);
            osc2.start(startTime);
            osc2.stop(killTime);
        }
        subCut.connect(filter);
        filter.connect(envGain);

        if (!(params.specialParams && params.specialParams.tremolo)) {
            envGain.connect(outputDestination);
        }

        osc.start(startTime);
        osc.stop(killTime);

        if (!isOfflineRender && !targetCtx) {
            this.trackNode(osc, envGain);
        }
    }

    /**
     * Plays a drum sound based on MIDI mapping.
     * @param {number} midi - MIDI note number.
     * @param {number} time - Playback time.
     * @param {Object} params - Drum kit parameters.
     * @param {number} velocity - Velocity.
     * @param {AudioContext|null} targetCtx - Context (offline support).
     * @param {AudioNode|null} targetDest - Destination (offline support).
     * @param {string|number|null} trackId - Track ID for routing.
     */
    playDrum(midi, time, params, velocity = 0.8, targetCtx = null, targetDest = null, trackId = null) {
        const ctx = targetCtx || this.ctx;
        if (!ctx) return;

        let dest = targetDest;
        if (!dest) {
            if (trackId) dest = this.getOrCreateLiveBus(trackId, params);
            else dest = this.drumBusGain;
        }

        const type = this.drumMap[midi];
        if (!type) return;

        const t = (time && time > 0) ? time : ctx.currentTime;

        const dParams = params.drumParams || {};
        const k = dParams.kick || { freq: 150, endFreq: 40, decay: 0.5, wave: 'sine', lofi: false };
        const s = dParams.snare || { freq: 200, filter: 1000, decay: 0.25, noiseMix: 1.0, toneMix: 0.5, lofi: false };
        const h = dParams.hat || { filter: 6000, dur: 0.05 };
        const tm = dParams.tom || { base: 1.0 };

        if (type.startsWith('kick')) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            let freq = k.freq;
            let endFreq = k.endFreq;
            let decay = k.decay;
            if (type === 'kick_2') { freq *= 0.8; decay *= 1.2; endFreq *= 0.8; }
            
            osc.type = k.wave || 'sine';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.1);
            gain.gain.setValueAtTime(velocity, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
            
            if (k.lofi) {
                const lofiFilter = ctx.createBiquadFilter();
                lofiFilter.type = 'lowpass';
                lofiFilter.frequency.value = 800;
                osc.connect(gain);
                gain.connect(lofiFilter);
                lofiFilter.connect(dest);
            } else {
                osc.connect(gain);
                gain.connect(dest);
            }
            osc.start(t);
            osc.stop(t + decay + 0.1);
        } else if (type.startsWith('snare')) {
            const noise = ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const noiseFilter = ctx.createBiquadFilter();
            const noiseGain = ctx.createGain();
            const tone = ctx.createOscillator();
            const toneGain = ctx.createGain();
            
            let toneFreq = (type === 'snare_2') ? s.freq * 1.2 : s.freq;
            
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = s.filter;
            noiseGain.gain.setValueAtTime(velocity * (s.noiseMix || 1), t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + s.decay);
            noise.connect(noiseFilter);
            
            if (s.lofi) {
                const lofiFilter = ctx.createBiquadFilter();
                lofiFilter.type = 'lowpass';
                lofiFilter.frequency.value = 3000;
                noiseFilter.connect(noiseGain);
                noiseGain.connect(lofiFilter);
                lofiFilter.connect(dest);
            } else {
                noiseFilter.connect(noiseGain);
                noiseGain.connect(dest);
            }
            
            noise.start(t);
            noise.stop(t + s.decay + 0.1);
            
            tone.type = 'triangle';
            tone.frequency.setValueAtTime(toneFreq, t);
            toneGain.gain.setValueAtTime(velocity * (s.toneMix || 0.5), t);
            toneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            tone.connect(toneGain);
            toneGain.connect(dest);
            tone.start(t);
            tone.stop(t + 0.15);
        } else if (type === 'clap') {
            const source = ctx.createBufferSource();
            source.buffer = this.noiseBuffer;
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            filter.Q.value = 1;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(velocity * 0.8, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            
            source.connect(filter);
            filter.connect(gain);
            gain.connect(dest);
            source.start(t);
            source.stop(t + 0.25);
        } else if (type === 'stick') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(350, t);
            gain.gain.setValueAtTime(velocity, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 300;
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(dest);
            osc.start(t);
            osc.stop(t + 0.1);
        } else if (type.startsWith('hat') || type.startsWith('crash')) {
            const src = ctx.createBufferSource();
            src.buffer = this.noiseBuffer;
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            
            let finalDur = type.startsWith('crash') ? 1.5 : (type === 'hat_open' ? h.dur * 6 : h.dur);
            let finalFreq = type.startsWith('crash') ? 3000 : h.filter;
            
            filter.type = 'highpass';
            filter.frequency.value = finalFreq;
            gain.gain.setValueAtTime(velocity * 0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + finalDur);
            
            src.connect(filter);
            filter.connect(gain);
            gain.connect(dest);
            src.start(t);
            src.stop(t + finalDur + 0.1);
        } else if (type.startsWith('tom')) {
            // Check if kit requests acoustic tom sounds
            const isAcoustic = (tm.type === 'acoustic');

            if (isAcoustic) {
                // ==========================================
                // Mode 1: Natural/New Sound (Acoustic)
                // Specific for Studio Kit (MIDI-like sound)
                // ==========================================
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine'; // Pure sine wave (realistic drum)

                // Precise frequencies for natural toms
                let basePitch = 100;
                let sustainTime = 0.5;

                if (type === 'tom_low') { basePitch = 90; sustainTime = 0.6; }
                else if (type === 'tom_low_mid') { basePitch = 110; sustainTime = 0.55; }
                else if (type === 'tom_mid') { basePitch = 130; sustainTime = 0.5; }
                else if (type === 'tom_mid_hi') { basePitch = 160; sustainTime = 0.45; }
                else if (type === 'tom_high') { basePitch = 200; sustainTime = 0.4; }
                else if (type === 'tom_super') { basePitch = 250; sustainTime = 0.3; }

                basePitch *= (tm.base || 1.0);

                // Complex envelope to simulate drum skin vibration
                osc.frequency.setValueAtTime(basePitch * 2.5, t); // Attack
                osc.frequency.exponentialRampToValueAtTime(basePitch, t + 0.1); // Rapid decay
                osc.frequency.linearRampToValueAtTime(basePitch * 0.9, t + sustainTime); // Long resonance

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(velocity, t + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.001, t + sustainTime);

                osc.connect(gain);
                gain.connect(dest);

                osc.start(t);
                osc.stop(t + sustainTime + 0.1);

            } else {
                // ==========================================
                // Mode 2: Old Synth Sound (Electronic/Rock)
                // (Preserved legacy code based on preference)
                // ==========================================
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                let basePitch = 80;
                if (type === 'tom_low') basePitch = 80;
                else if (type === 'tom_low_mid') basePitch = 100;
                else if (type === 'tom_mid') basePitch = 125;
                else if (type === 'tom_mid_hi') basePitch = 150;
                else if (type === 'tom_high') basePitch = 180;
                else if (type === 'tom_super') basePitch = 220;

                basePitch *= (tm.base || 1.0);

                filter.type = 'lowpass';
                filter.frequency.value = basePitch * 4;
                osc.frequency.setValueAtTime(basePitch * 1.5, t);
                osc.frequency.exponentialRampToValueAtTime(basePitch, t + 0.15);

                gain.gain.setValueAtTime(velocity, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(dest);
                osc.start(t);
                osc.stop(t + 0.6);
            }
        }
    }

    /**
     * Creates an FX chain specifically for offline rendering context.
     * @param {OfflineAudioContext} ctx 
     * @param {Object} params 
     * @param {AudioNode} destination 
     * @returns {GainNode} Input node.
     */
    createTrackFXChain(ctx, params, destination) {
        const input = ctx.createGain();
        let signalSource = input;

        if (params.distortion > 0) {
            const shaper = ctx.createWaveShaper();
            shaper.curve = this.makeDistortionCurve(params.distortion);
            const drive = ctx.createGain();
            drive.gain.value = 5.0;
            const cab = ctx.createBiquadFilter();
            cab.type = 'lowpass';
            cab.frequency.value = 4000;
            const distLevel = ctx.createGain();
            distLevel.gain.value = 0.3;
            const dryPath = ctx.createGain();
            dryPath.gain.value = 0.2;

            input.connect(drive);
            drive.connect(shaper);
            shaper.connect(cab);
            cab.connect(distLevel);
            input.connect(dryPath);
            const mergeNode = ctx.createGain();
            distLevel.connect(mergeNode);
            dryPath.connect(mergeNode);
            signalSource = mergeNode;
        }
        signalSource.connect(destination);

        if (params.delayMix > 0) {
            const d = ctx.createDelay();
            d.delayTime.value = params.delayTime || 0.3;
            const f = ctx.createGain();
            f.gain.value = 0.3;
            const w = ctx.createGain();
            w.gain.value = params.delayMix;
            signalSource.connect(d);
            d.connect(f);
            f.connect(d);
            d.connect(w);
            w.connect(destination);
        }

        if (params.reverbMix > 0 && this.reverbBuffer) {
            const r = ctx.createConvolver();
            r.buffer = this.reverbBuffer;
            const w = ctx.createGain();
            w.gain.value = params.reverbMix;
            signalSource.connect(r);
            r.connect(w);
            w.connect(destination);
        }
        return input;
    }

    /**
     * Performs an offline render of the current project state.
     * @param {Object} state - Project state (tracks, notes, settings).
     * @returns {Promise<AudioBuffer>} Final mastered audio buffer.
     */
    async renderOffline(state) {
        // Use main context sample rate for consistency, default to 44100 if null.
        const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;

        console.log("Starting Mastered Offline Render...");

        const secondsPerStep = (60 / state.bpm) * (4 / state.stepsPerBar);
        let maxStepTime = 0;
        state.tracks.forEach(t => {
            t.notes.forEach(n => {
                const end = n.time + n.duration;
                if (end > maxStepTime) maxStepTime = end;
            });
        });

        const barSteps = state.totalBars * state.stepsPerBar;
        if (maxStepTime < barSteps) maxStepTime = barSteps;

        const totalSeconds = maxStepTime * secondsPerStep;
        const tailSeconds = 4.0;
        const totalSamples = Math.ceil((totalSeconds + tailSeconds) * sampleRate);

        console.log(`Duration: ${totalSeconds.toFixed(2)}s. Mixing ${state.tracks.length} tracks.`);

        const rawLeft = new Float32Array(totalSamples);
        const rawRight = new Float32Array(totalSamples);

        for (let i = 0; i < state.tracks.length; i++) {
            const track = state.tracks[i];
            const isAnySolo = state.tracks.some(t => t.isSolo);
            if (isAnySolo && !track.isSolo) continue;
            if (track.isMuted && !track.isSolo) continue;

            const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
            const trackBus = this.createTrackFXChain(offlineCtx, track.synthSettings, offlineCtx.destination);

            track.notes.forEach(note => {
                const time = note.time * secondsPerStep;
                const duration = note.duration * secondsPerStep;
                try {
                    if (track.type === 'DRUMS') {
                        this.playDrum(note.midi, time, track.synthSettings, note.velocity, offlineCtx, offlineCtx.destination);
                    } else {
                        this.playNote(note.midi, duration, time, track.synthSettings, note.velocity, track.preset, offlineCtx, trackBus, true, true);
                    }
                } catch (e) {}
            });

            const trackBuffer = await offlineCtx.startRendering();
            const left = trackBuffer.getChannelData(0);
            const right = trackBuffer.getChannelData(1);
            const vol = track.volume !== undefined ? track.volume : 0.8;

            for (let j = 0; j < totalSamples; j++) {
                rawLeft[j] += left[j] * vol;
                rawRight[j] += right[j] * vol;
            }
        }

        console.log("Applying Master Chain (Matched to Live)...");

        const masteringCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
        const rawBuffer = masteringCtx.createBuffer(2, totalSamples, sampleRate);
        rawBuffer.copyToChannel(rawLeft, 0);
        rawBuffer.copyToChannel(rawRight, 1);

        const source = masteringCtx.createBufferSource();
        source.buffer = rawBuffer;

        const masterGain = masteringCtx.createGain();
        masterGain.gain.value = 0.4;
        const compressor = masteringCtx.createDynamicsCompressor();
        compressor.threshold.value = -10;
        compressor.knee.value = 40;
        compressor.ratio.value = 2;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.15;
        const lowCut = masteringCtx.createBiquadFilter();
        lowCut.type = 'highpass';
        lowCut.frequency.value = 30;
        const highCut = masteringCtx.createBiquadFilter();
        highCut.type = 'lowpass';
        highCut.frequency.value = 18000;

        source.connect(masterGain);
        masterGain.connect(compressor);
        compressor.connect(lowCut);
        lowCut.connect(highCut);
        highCut.connect(masteringCtx.destination);

        source.start(0);
        const masteredBuffer = await masteringCtx.startRendering();
        console.log("Export Complete!");
        return masteredBuffer;
    }

    /**
     * Creates a distortion curve for the WaveShaperNode.
     * @param {number} k - Distortion amount.
     * @returns {Float32Array}
     */
    makeDistortionCurve(k) {
        const n = 44100;
        const c = new Float32Array(n);
        const deg = Math.PI / 180;
        for (let i = 0; i < n; ++i) {
            const x = i * 2 / n - 1;
            c[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return c;
    }

    /**
     * Tracks active oscillators to allow stopping them later.
     * @param {OscillatorNode} s - Source oscillator.
     * @param {GainNode} g - Gain node.
     */
    trackNode(s, g) {
        this.activeNodes.push({ osc: s, gain: g });
        s.onended = () => this.activeNodes = this.activeNodes.filter(x => x.osc !== s);
    }

    /**
     * Stops all active sound sources immediately.
     */
    stopAll() {
        // If context is null, nothing is playing.
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.activeNodes.forEach(n => {
            try {
                n.osc.stop(t + 0.1);
            } catch (e) {}
        });
        this.activeNodes = [];
    }
}