/**
 * CloudClient.js
 * Communicates with Cloudflare Pages Functions (Serverless Backend).
 * Uses relative paths, so it works automatically on localhost, preview URLs, and production.
 */

const BASE_API = "/api";

export default class CloudClient {
    constructor() {}

    /**
     * Checks if the backend is reachable.
     */
    async ping() {
        try {
            const res = await fetch(`${BASE_API}/projects`); // Simple check
            return res.ok;
        } catch (e) {
            console.error("Cloud backend offline:", e);
            return false;
        }
    }

    /**
     * Saves a project to the cloud.
     */
    async saveProject(projectData, user, projectName) {
        if (!user || !user.id) throw new Error("User not logged in.");

        const payload = {
            userId: user.id,
            name: projectName || "Untitled Project",
            data: projectData,
            timestamp: Date.now()
        };

        // If updating an existing project
        if (projectData.cloudId) {
            payload.id = projectData.cloudId;
        }

        const response = await fetch(`${BASE_API}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Failed to save project.");
        }
        
        return await response.json(); // Returns { success: true, id: "..." }
    }

    /**
     * Fetches the list of projects for the current user.
     */
    async listProjects(user) {
        if (!user || !user.id) throw new Error("User not logged in.");

        // We pass userId via query param (secure validation happens on server)
        const response = await fetch(`${BASE_API}/projects?userId=${user.id}`);
        
        if (!response.ok) throw new Error("Failed to list projects.");
        return await response.json(); 
    }

    /**
     * Loads a specific project by ID.
     */
    async loadProject(projectId, user) {
        if (!user || !user.id) throw new Error("User not logged in.");

        const response = await fetch(`${BASE_API}/projects/${projectId}?userId=${user.id}`);
        
        if (!response.ok) throw new Error("Failed to load project.");
        return await response.json();
    }

    /**
     * Deletes a project.
     */
    async deleteProject(projectId, user) {
        if (!user || !user.id) throw new Error("User not logged in.");

        const response = await fetch(`${BASE_API}/projects/${projectId}?userId=${user.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error("Failed to delete project.");
        return true;
    }
}