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
 * Renders an interactive Circle of Fifths widget on a canvas.
 * Handles user interactions for key selection and visual feedback.
 */
export default class CircleOfFifths {
    /**
     * Creates an instance of the CircleOfFifths.
     * @param {string} containerId - The ID of the DOM element to contain the canvas.
     * @param {Object} state - The initial state object containing the rootKey.
     * @param {Function} onKeyChange - Callback function triggered when the key changes.
     */
    constructor(containerId, state, onKeyChange) {
        this.container = document.getElementById(containerId);
        this.state = state;
        this.onKeyChange = onKeyChange;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);

        // Modern color palette definition
        this.colors = {
            bg: '#1e1e1e',
            text: '#e0e0e0',
            textMinor: '#888',
            highlight: '#00d2d3', // Theme turquoise
            activeGlow: 'rgba(0, 210, 211, 0.6)',
            sliceNormal: '#2d3436',
            sliceHover: '#3d4548',
            sliceActive: '#00cec9', // Slightly brighter for active state
            line: '#111'
        };

        this.circleOrder = [
            { note: 'C', index: 0 }, { note: 'G', index: 7 }, { note: 'D', index: 2 },
            { note: 'A', index: 9 }, { note: 'E', index: 4 }, { note: 'B', index: 11 },
            { note: 'F#', index: 6 }, { note: 'Db', index: 1 }, { note: 'Ab', index: 8 },
            { note: 'Eb', index: 3 }, { note: 'Bb', index: 10 }, { note: 'F', index: 5 }
        ];

        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleHover(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoverIndex = -1;
            this.draw();
        });

        this.hoverIndex = -1;

        // Listen for window resize events to update circle dimensions
        window.addEventListener('resize', () => this.resize());

        // Small delay to ensure CSS is loaded before initial resize
        setTimeout(() => this.resize(), 50);
    }

    /**
     * Resizes the canvas to fit the container while maintaining high DPI clarity.
     */
    resize() {
        if (!this.container.clientWidth) return; // Do nothing if hidden

        // 1. Configure High DPI / Retina display settings
        const dpr = window.devicePixelRatio || 1;
        const size = Math.min(this.container.clientWidth, this.container.clientHeight);

        // Physical size in CSS
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;

        // Actual pixel size
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;

        // Scale the context to match DPI
        this.ctx.scale(dpr, dpr);

        this.centerX = size / 2;
        this.centerY = size / 2;
        // Larger radius (using 95% of available space)
        this.radius = (size / 2) * 0.95;

        this.draw();
    }

    /**
     * Draws the complete Circle of Fifths including slices, text, and active states.
     */
    draw() {
        const ctx = this.ctx;
        const r = this.radius;
        // Clear canvas (considering the scale factor)
        ctx.clearRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);

        const sliceAngle = (Math.PI * 2) / 12;
        const startOffset = -Math.PI / 2 - (sliceAngle / 2);

        this.circleOrder.forEach((item, i) => {
            const startAngle = startOffset + (i * sliceAngle);
            const endAngle = startAngle + sliceAngle;

            // Gap between slices for aesthetics
            const gap = 0.04;
            const drawStart = startAngle + gap;
            const drawEnd = endAngle - gap;

            const isActive = (this.state.rootKey === item.index);
            const isHover = (this.hoverIndex === i);

            // --- 1. Draw Outer Slice (Major) ---
            ctx.beginPath();
            // Create donut shape (center hole)
            ctx.arc(this.centerX, this.centerY, r, drawStart, drawEnd); // Outer edge
            ctx.arc(this.centerX, this.centerY, r * 0.55, drawEnd, drawStart, true); // Inner edge
            ctx.closePath();

            // Apply gradient and colors
            if (isActive) {
                // Gradient for active state
                const grad = ctx.createRadialGradient(this.centerX, this.centerY, r * 0.5, this.centerX, this.centerY, r);
                grad.addColorStop(0, '#00b894');
                grad.addColorStop(1, '#00d2d3');
                ctx.fillStyle = grad;

                // Neon glow effect
                ctx.shadowColor = this.colors.activeGlow;
                ctx.shadowBlur = 20;
            } else if (isHover) {
                ctx.fillStyle = '#444';
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#252526';
                ctx.shadowBlur = 0;
            }

            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow for text rendering

            // --- 2. Major Key Text ---
            const textAngle = startAngle + (sliceAngle / 2);
            const textDist = r * 0.8; // Text position radius
            const tx = this.centerX + Math.cos(textAngle) * textDist;
            const ty = this.centerY + Math.sin(textAngle) * textDist;

            ctx.font = isActive ? 'bold 18px "Segoe UI", sans-serif' : '16px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isActive ? '#000' : this.colors.text;
            ctx.fillText(item.note, tx, ty);

            // --- 3. Inner Slice (Minor) ---
            // Display only text for the relative minor
            const minorDist = r * 0.65;
            const tmx = this.centerX + Math.cos(textAngle) * minorDist;
            const tmy = this.centerY + Math.sin(textAngle) * minorDist;

            const minorName = this.getMinorName(item.note);
            ctx.font = '12px "Segoe UI", sans-serif';
            ctx.fillStyle = isActive ? 'rgba(0,0,0,0.6)' : this.colors.textMinor;
            ctx.fillText(minorName + 'm', tmx, tmy);
        });

        // --- 4. Circle Center (Decorative) ---
        // Ring around the center
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, r * 0.45, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center text
        ctx.fillStyle = this.colors.highlight;
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = this.colors.activeGlow;
        ctx.shadowBlur = 10;
        ctx.fillText("KEY", this.centerX, this.centerY - 10);

        ctx.font = '18px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fff';
        const currentNote = this.circleOrder.find(x => x.index === this.state.rootKey)?.note || "?";
        ctx.fillText(currentNote, this.centerX, this.centerY + 12);

        ctx.shadowBlur = 0;
    }

    /**
     * Returns the relative minor key for a given major note.
     * @param {string} majorNote - The note name of the major key.
     * @returns {string} The name of the relative minor key.
     */
    getMinorName(majorNote) {
        const map = {
            'C': 'A', 'G': 'E', 'D': 'B', 'A': 'F#', 'E': 'C#', 'B': 'G#',
            'F#': 'D#', 'Db': 'Bb', 'Ab': 'F', 'Eb': 'C', 'Bb': 'G', 'F': 'D'
        };
        return map[majorNote] || '';
    }

    /**
     * Handles click events on the canvas to change the selected key.
     * @param {MouseEvent} e - The click event.
     */
    handleClick(e) {
        const idx = this.getIndexFromEvent(e);
        if (idx !== -1) {
            const selected = this.circleOrder[idx];
            if (this.state.rootKey !== selected.index) {
                this.state.rootKey = selected.index;
                if (this.onKeyChange) this.onKeyChange(selected.index);
                this.draw();
            }
        }
    }

    /**
     * Handles mouse move events for hover effects.
     * @param {MouseEvent} e - The mouse move event.
     */
    handleHover(e) {
        const idx = this.getIndexFromEvent(e);
        if (this.hoverIndex !== idx) {
            this.hoverIndex = idx;
            this.canvas.style.cursor = idx !== -1 ? 'pointer' : 'default';
            this.draw();
        }
    }

    /**
     * Calculates the index of the circle slice under the mouse cursor.
     * @param {MouseEvent} e - The mouse event.
     * @returns {number} The index of the slice (0-11), or -1 if outside interactive area.
     */
    getIndexFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Correct mouse calculations regarding CSS scale
        // Note: rect.width is the display size.
        const x = (e.clientX - rect.left); // Mouse coordinates in CSS pixels
        const y = (e.clientY - rect.top);

        // Calculate coordinates relative to the center
        const relX = x - (rect.width / 2);
        const relY = y - (rect.height / 2);

        // Calculate angle
        let angle = Math.atan2(relY, relX);
        angle += (Math.PI / 2) + (Math.PI / 12);
        if (angle < 0) angle += Math.PI * 2;

        const sliceAngle = (Math.PI * 2) / 12;
        const index = Math.floor(angle / sliceAngle) % 12;

        // Calculate normalized radial distance (0 to 1)
        const dist = Math.sqrt(relX * relX + relY * relY);
        const maxR = rect.width / 2; // Maximum display radius

        // Check if clicked on the donut area (between 50% and 95% radius)
        if (dist < maxR * 0.50 || dist > maxR * 0.95) return -1;

        return index;
    }
}