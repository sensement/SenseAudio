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
 * Manages the undo/redo history stack for the application state.
 * Handles state snapshots, history limits, and restoration of data.
 */
export default class History {
    /**
     * Creates an instance of the History manager.
     * @param {Object} state - The state management object containing data logic.
     * @param {Object} renderer - The renderer object responsible for drawing the UI.
     * @param {number} [limit=50] - Maximum number of history steps to store.
     */
    constructor(state, renderer, limit = 50) {
        this.state = state;
        this.renderer = renderer;
        this.limit = limit; // Maximum number of stored history steps

        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Saves the current state snapshot.
     * This method should be called before any destructive modification to the data.
     */
    saveState() {
        // Create a deep copy of the current data
        const snapshot = this.state.getData();
        const clone = JSON.parse(JSON.stringify(snapshot));

        this.undoStack.push(clone);

        // If the history limit is exceeded, remove the oldest entry
        if (this.undoStack.length > this.limit) {
            this.undoStack.shift();
        }

        // Clear the redo stack as the new change invalidates the future timeline
        this.redoStack = [];

        // console.log("State Saved. Stack size:", this.undoStack.length);
    }

    /**
     * Reverts the application state to the previous snapshot.
     */
    undo() {
        if (this.undoStack.length === 0) return;

        // 1. Save the current state to the redo stack (to allow re-doing later)
        const currentSnapshot = this.state.getData();
        this.redoStack.push(JSON.parse(JSON.stringify(currentSnapshot)));

        // 2. Retrieve the last saved state from the undo stack
        const previousState = this.undoStack.pop();

        // 3. Restore the state
        this.state.restoreData(previousState);
        this.renderer.resize(); // Resize is necessary as the number of measures may have changed
        this.renderer.draw();

        // console.log("Undo performed.");
    }

    /**
     * Reapplies a previously undone state.
     */
    redo() {
        if (this.redoStack.length === 0) return;

        // 1. Push the current state back to the undo stack
        const currentSnapshot = this.state.getData();
        this.undoStack.push(JSON.parse(JSON.stringify(currentSnapshot)));

        // 2. Retrieve the next state from the redo stack
        const nextState = this.redoStack.pop();

        // 3. Restore the state
        this.state.restoreData(nextState);
        this.renderer.resize();
        this.renderer.draw();

        // console.log("Redo performed.");
    }
}