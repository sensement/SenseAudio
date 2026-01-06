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
 * Listens for the extension action icon click event.
 * Opens the main application interface (index.html) in a new browser tab.
 *
 * This function serves as the entry point when the user interacts with the
 * extension's toolbar icon.
 *
 * @param {chrome.tabs.Tab} tab - The tab that was active when the extension icon was clicked.
 * @see {@link https://developer.chrome.com/docs/extensions/reference/action/#event-onClicked}
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html")
  });
});