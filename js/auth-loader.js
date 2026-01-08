/*
 * SenseAudio - Dynamic Auth Loader
 * Copyright (C) 2026 SensementMusic.com
 *
 * This script dynamically injects the Clerk authentication script based on the
 * current environment. It distinguishes between Local Development, Production,
 * and Browser Extension contexts to ensure the correct API keys are used.
 */

(function() {
    'use strict';

    // ==========================================
    // 1. CONFIGURATION CONSTANTS
    // ==========================================
    const CONFIG = {
        development: {
            key: "pk_test_Y2F1c2FsLXdoYWxlLTUxLmNsZXJrLmFjY291bnRzLmRldiQ",
            script: "https://causal-whale-51.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
        },
        production: {
            key: "pk_live_Y2xlcmsuc3R1ZGlvLnNlbnNlbWVudG11c2ljLmNvbSQ",
            script: "https://clerk.studio.sensementmusic.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
        }
    };

    // ==========================================
    // 2. ENVIRONMENT DETECTION
    // ==========================================
    
    // Check if running on localhost or 127.0.0.1
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Check if running as a Browser Extension (Chrome/Edge/Firefox)
    // Extensions typically run under 'chrome-extension:' or 'moz-extension:' protocols
    const isExtension = window.location.protocol.includes('extension');

    // ==========================================
    // 3. LOGIC SELECTION
    // ==========================================

    // Determine the active environment:
    // - Use 'development' ONLY if we are on localhost AND NOT in an extension.
    // - Use 'production' for the live website or if running as an extension 
    //   (Extensions usually require the live database/auth system).
    const env = (isLocal && !isExtension) ? CONFIG.development : CONFIG.production;
    const envName = (isLocal && !isExtension) ? 'Development' : 'Production';

    console.log(`[AuthLoader] Initializing Clerk for environment: ${envName}`);

    // ==========================================
    // 4. SCRIPT INJECTION
    // ==========================================

    // Create the script element
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    // Set Clerk-specific attributes
    script.setAttribute('data-clerk-publishable-key', env.key);
    script.src = env.script;

    // Event Listeners for Load/Error
    script.onload = () => {
        console.log('[AuthLoader] Clerk script loaded successfully.');
        
        // Optional: Trigger initial Clerk load if needed manually
        if (window.Clerk) {
            // window.Clerk.load(); 
        }
    };

    script.onerror = () => {
        console.error('[AuthLoader] Critical Error: Failed to load Clerk script.');
    };

    // Inject into the <head> of the document
    document.head.appendChild(script);

})();