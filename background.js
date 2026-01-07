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

// ============================================================================
// 1. App Navigation & Core Logic
// ============================================================================

/**
 * Listens for the extension action icon click event.
 * Opens the main application interface (index.html) in a new browser tab.
 * @see {@link https://developer.chrome.com/docs/extensions/reference/action/#event-onClicked}
 */
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("index.html")
    });
});

// ============================================================================
// 2. Analytics System (Offline-First via Cloudflare D1)
// ============================================================================

/**
 * CONFIGURATION:
 * The endpoint for the Cloudflare Worker that handles analytics logging.
 * Acts as a bridge to the D1 database.
 */
const WORKER_URL = 'https://analytics-logger.soroush-zendedel.workers.dev/';

/**
 * Session timeout threshold in milliseconds.
 * 30 minutes of inactivity will result in a new session ID.
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// ----------------------------------------------------------------------------
// User Identity & Session Management
// ----------------------------------------------------------------------------

/**
 * Retrieves or generates unique identifiers for the user and the current session.
 * - Client ID: Persistent ID stored in local storage (simulates a unique device/user).
 * - Session ID: Ephemeral ID stored in session storage, resets after inactivity.
 * @returns {Promise<{clientId: string, sessionId: string}>} The identity object.
 */
async function getIdentity() {
    // 1. Handle Client ID (Persistent)
    let { clientId } = await chrome.storage.local.get('clientId');
    if (!clientId) {
        clientId = self.crypto.randomUUID();
        await chrome.storage.local.set({ clientId });
    }

    // 2. Handle Session ID (Time-bound)
    let { sessionId, lastActive } = await chrome.storage.session.get(['sessionId', 'lastActive']);
    const now = Date.now();

    // Check if session is missing or expired
    if (!sessionId || !lastActive || (now - lastActive) > SESSION_TIMEOUT_MS) {
        sessionId = self.crypto.randomUUID(); // Start new session
    }

    // Update last activity timestamp
    await chrome.storage.session.set({ sessionId, lastActive: now });

    return { clientId, sessionId };
}

// ----------------------------------------------------------------------------
// Tracking Core Logic
// ----------------------------------------------------------------------------

/**
 * Main entry point to track an event.
 * Handles online/offline states automatically.
 * @param {string} eventName - The name of the event (e.g., 'app_startup', 'export_midi').
 * @param {Object} [params={}] - Additional metadata for the event.
 */
async function trackEvent(eventName, params = {}) {
    const { clientId, sessionId } = await getIdentity();
    const timestamp = Date.now();

    const payload = {
        client_id: clientId,
        session_id: sessionId,
        events: [{
            name: eventName,
            params: params,
            timestamp: timestamp
        }]
    };

    // Determine dispatch method based on network status
    if (navigator.onLine) {
        sendData(payload).catch((err) => {
            console.warn('[SenseAudio Analytics] Send failed, queuing offline.', err);
            saveOffline(payload);
        });
    } else {
        saveOffline(payload);
    }
}

// ----------------------------------------------------------------------------
// Network & Storage Utilities
// ----------------------------------------------------------------------------

/**
 * Sends the event payload to the Cloudflare Worker.
 * @param {Object} payload - The data object containing client info and events.
 * @returns {Promise<void>}
 */
async function sendData(payload) {
    const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
    }

    // On success, attempt to flush any previously queued offline events
    flushOfflineQueue();
}

/**
 * Saves the event payload to local storage when the user is offline.
 * @param {Object} payload - The data object to queue.
 */
async function saveOffline(payload) {
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
    offlineQueue.push(payload);
    await chrome.storage.local.set({ offlineQueue });
    console.debug('[SenseAudio Analytics] Event queued offline.');
}

/**
 * Attempts to send all queued offline events to the server.
 * Should be called when connectivity is restored.
 */
async function flushOfflineQueue() {
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
    if (offlineQueue.length === 0) return;

    console.debug(`[SenseAudio Analytics] Flushing ${offlineQueue.length} offline events...`);

    const newQueue = [];
    
    // Process queue items
    for (const item of offlineQueue) {
        try {
            await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        } catch (e) {
            // If transmission fails again, keep it in the queue for next time
            newQueue.push(item);
        }
    }

    // Update the queue with any remaining items
    await chrome.storage.local.set({ offlineQueue: newQueue });
}

// ----------------------------------------------------------------------------
// Event Listeners
// ----------------------------------------------------------------------------

/**
 * Triggered when the extension is installed or updated.
 */
chrome.runtime.onInstalled.addListener((details) => {
    trackEvent('extension_installed', { reason: details.reason });
});

/**
 * Triggered when the browser starts up.
 * Also acts as a "Wake Up" call to flush offline queues.
 */
chrome.runtime.onStartup.addListener(() => {
    trackEvent('browser_startup');
    // Delay flush to ensure network is initialized
    setTimeout(flushOfflineQueue, 5000);
});

/**
 * Listens for messages from the main application (UI scripts).
 * This allows the front-end to log events via the service worker.
 * Message Format: { type: 'ANALYTICS_EVENT', name: '...', params: {...} }
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYTICS_EVENT') {
        trackEvent(request.name, request.params);
    }
});

/**
 * Listens for network restoration to immediately flush the offline queue.
 * Note: 'online' event availability in Service Workers depends on browser version.
 */
self.addEventListener('online', () => {
    flushOfflineQueue();
});
