/* VIEW NAVIGATION */
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        // Reset animations
        v.querySelectorAll('.animate-entry').forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; /* trigger reflow */
            el.style.animation = null;
        });
    });

    const activeView = document.getElementById(viewId);
    activeView.classList.add('active');

    // Add animation class to direct children or specific groups
    if (viewId === 'view-input') {
        activeView.querySelector('.app-header').classList.add('animate-entry');
        activeView.querySelector('.workspace').classList.add('animate-entry');
    } else if (viewId === 'view-output') {
        activeView.querySelector('.app-header').classList.add('animate-entry');
        activeView.querySelector('.studio-layout').classList.add('animate-entry');
    }

    // Smooth scroll to top
    window.scrollTo(0, 0);
}

/* STATE MANAGEMENT */
let generatedContent = {
    screenplay: "",
    characters: "",
    sound_design: "",
    meta: {}
};

/* API COMMUNICATION */
/* LOADING MANAGER */
const loadingPhrases = [
    "Developing Protagonist...",
    "Brainstorming Plot Twists...",
    "Drafting Scene Headers...",
    "Writing Dialogue...",
    "Polishing Action Lines...",
    "Generating Character Arcs...",
    "Formatting Screenplay...",
    "Calculating Pacing...",
    "Visualizing Set Design...",
    "Finalizing Draft..."
];

const cinematicQuotes = [
    '"To make a great film, you need three things – the script, the script and the script." – Alfred Hitchcock',
    '"A story is not just a series of events, it is a journey." – Syd Field',
    '"Cinema is a matter of what\'s in the frame and what\'s out." – Martin Scorsese',
    '"Details are not the details. They make the design." – Charles Eames',
    '"Every great story begins with a character who wants something." – Aaron Sorkin'
];

let loadingInterval, quoteInterval;

function startPremiumLoading() {
    const overlay = document.getElementById('loading-overlay');
    const statusText = document.getElementById('loading-status');
    const quoteText = document.getElementById('loading-quote');

    overlay.classList.remove('hidden');

    // Cycle Status
    let phraseIndex = 0;
    statusText.textContent = loadingPhrases[0];
    loadingInterval = setInterval(() => {
        phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
        statusText.textContent = loadingPhrases[phraseIndex];
    }, 2500);

    // Cycle Quotes
    let quoteIndex = 0;
    quoteText.textContent = cinematicQuotes[0];
    quoteInterval = setInterval(() => {
        quoteIndex = (quoteIndex + 1) % cinematicQuotes.length;
        quoteText.textContent = cinematicQuotes[quoteIndex];
    }, 4000);
}

function stopPremiumLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('hidden');
    clearInterval(loadingInterval);
    clearInterval(quoteInterval);
}

/* API COMMUNICATION */
async function handleGeneration() {
    const prompt = document.getElementById('story-prompt').value;
    const genre = document.getElementById('genre-select').value;
    const sceneCount = document.getElementById('scene-count').value;
    const language = document.getElementById('language-select').value;

    if (!prompt) return alert("Please enter a story concept.");

    // Start Premium Loader
    startPremiumLoading();

    try {
        // 1. Initiate Generation Job
        const response = await fetch('/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                story: prompt,
                genre: genre,
                scene_count: sceneCount,
                language: language
            })
        });

        if (!response.ok) throw new Error("Failed to initiate generation");

        const initData = await response.json();
        const jobId = initData.job_id;

        if (!jobId) throw new Error("No Job ID received");

        // 2. Poll for Status
        await pollForCompletion(jobId);

    } catch (error) {
        console.error("Error:", error);
        alert("Failed to generate content. Please try again.");
        stopPremiumLoading();
    }
}

async function pollForCompletion(jobId) {
    const pollInterval = 3000; // 3 seconds

    const checkStatus = async () => {
        try {
            const res = await fetch(`/generation-status/${jobId}`);
            if (!res.ok) throw new Error("Polling failed");

            const data = await res.json();

            if (data.status === 'completed') {
                // Success!
                generatedContent = data.data;
                generatedContent.share_id = data.share_id; // Capture Share ID
                renderOutput();
                navigateTo('view-output');
                stopPremiumLoading();
            } else if (data.status === 'failed') {
                // Failure
                throw new Error(data.error || "Generation failed in background");
            } else {
                // Still processing... keep polling
                setTimeout(checkStatus, pollInterval);
            }
        } catch (error) {
            console.error("Polling Error:", error);
            alert("An error occurred during generation: " + error.message);
            stopPremiumLoading();
        }
    };

    // Start polling
    setTimeout(checkStatus, pollInterval);
}


/* OUTPUT RENDERING */
function renderOutput() {
    // Default View: Screenplay
    const scriptViewer = document.getElementById('screenplay-content');
    scriptViewer.innerHTML = `
        <div style="text-align:center; font-family:var(--font-heading); font-size:1.5rem; color:var(--text-muted); margin-bottom:40px; border-bottom:1px solid #ddd; padding-bottom:20px;">SCREENPLAY</div>
        ${generatedContent.screenplay || "No script generated."}
    `;

    // Set styles explicitly (restored from previous logic)
    scriptViewer.style.fontFamily = "var(--font-script)";
    scriptViewer.style.fontSize = "1rem";
    scriptViewer.style.whiteSpace = "pre-wrap";

    // Populate Dock (Default to Synopsis)
    switchTab('screenplay');
}

/* SHARE FUNCTIONALITY */
function generateShareLink() {
    if (!generatedContent || !generatedContent.share_id) {
        return alert("No shareable link available. Please generate a script first.");
    }

    const shareUrl = `${window.location.origin}/share/${generatedContent.share_id}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Link copied to clipboard!\n" + shareUrl);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        prompt("Here is your shareable link:", shareUrl);
    });
}


/* DOCK TABS */
function switchTab(tabName) {
    // 1. Update Buttons
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        // Check onclick attribute to match the tabName
        if (b.getAttribute('onclick').includes(`'${tabName}'`)) {
            b.classList.add('active');
        }
    });

    const scriptViewer = document.getElementById('screenplay-content');
    const dock = document.getElementById('dock-content');

    // 2. Logic for Swapping Views
    if (tabName === 'screenplay') {
        // STANDARD VIEW: Screenplay in Center, Synopsis in Dock
        scriptViewer.innerHTML = `
            <div style="text-align:center; font-family:var(--font-heading); font-size:1.5rem; color:var(--text-muted); margin-bottom:40px; border-bottom:1px solid #ddd; padding-bottom:20px;">SCREENPLAY</div>
            ${generatedContent.screenplay || "No script generated."}
        `;
        scriptViewer.style.fontFamily = "var(--font-script)";
        scriptViewer.style.fontSize = "1rem";
        scriptViewer.style.whiteSpace = "pre-wrap";

        // Format Synopsis: separating Logline and Synopsis
        let rawSynopsis = generatedContent.synopsis || "No synopsis available.";
        let formattedSynopsis = rawSynopsis;

        // Check if both labels exist to format them nicely
        if (rawSynopsis.includes("Logline:") && rawSynopsis.includes("Synopsis:")) {
            formattedSynopsis = rawSynopsis
                .replace("Logline:", "<strong style='color:var(--accent); display:block; margin-bottom:5px;'>LOGLINE</strong>")
                .replace("Synopsis:", "<br><br><strong style='color:var(--accent); display:block; margin-bottom:5px;'>SYNOPSIS</strong>");
        } else {
            // Fallback for partial labels
            formattedSynopsis = rawSynopsis
                .replace(/Logline:/i, "<strong style='color:var(--accent); display:block; margin-bottom:5px;'>LOGLINE</strong>")
                .replace(/Synopsis:/i, "<br><br><strong style='color:var(--accent); display:block; margin-bottom:5px;'>SYNOPSIS</strong>");
        }

        dock.innerHTML = `<h3>STORY FILES</h3><div style="font-size:0.95rem;">${formattedSynopsis}</div>`;
        dock.style.fontFamily = "var(--font-body)";
        dock.style.whiteSpace = "normal";

    } else if (tabName === 'characters') {
        // CAST VIEW: Cast in Center, Screenplay in Dock
        scriptViewer.innerHTML = `
            <div style="text-align:center; font-family:var(--font-heading); font-size:1.5rem; color:var(--accent); margin-bottom:40px; border-bottom:1px solid var(--accent); padding-bottom:20px;">CAST & CHARACTERS</div>
            ${generatedContent.characters || "No characters generated."}
        `;
        scriptViewer.style.fontFamily = "var(--font-body)";
        scriptViewer.style.fontSize = "1.1rem"; // Slightly larger for readability
        scriptViewer.style.whiteSpace = "pre-wrap";

        // Place Screenplay in Dock
        dock.innerHTML = `<h3>SCREENPLAY (Reference)</h3><div style="font-size:0.85rem; font-family:var(--font-script); white-space:pre-wrap;">${generatedContent.screenplay || "No script."}</div>`;
        dock.style.fontFamily = "var(--font-script)";

    } else if (tabName === 'sound') {
        // SOUND VIEW: Sound in Center, Screenplay in Dock
        scriptViewer.innerHTML = `
            <div style="text-align:center; font-family:var(--font-heading); font-size:1.5rem; color:var(--accent); margin-bottom:40px; border-bottom:1px solid var(--accent); padding-bottom:20px;">SOUND DESIGN</div>
            ${generatedContent.sound_design || "No sound design generated."}
        `;
        scriptViewer.style.fontFamily = "var(--font-body)";
        scriptViewer.style.fontSize = "1.1rem";
        scriptViewer.style.whiteSpace = "pre-wrap";

        dock.innerHTML = `<h3>SCREENPLAY (Reference)</h3><div style="font-size:0.85rem; font-family:var(--font-script); white-space:pre-wrap;">${generatedContent.screenplay || "No script."}</div>`;
        dock.style.fontFamily = "var(--font-script)";
    }
}

/* AUDIO PLAYER FACTORY */
function createCustomAudioPlayer(url, title = "Audio Track") {
    const container = document.createElement('div');
    container.className = 'custom-audio-player';

    // HTML Structure
    container.innerHTML = `
        <button class="play-pid-btn">▶</button>
        <div class="track-info">
            <div class="track-title">${title}</div>
            <div class="progress-container">
                <div class="progress-bar-fill"></div>
            </div>
        </div>
        <div class="time-display">0:00</div>
    `;

    const audio = new Audio(url);
    const btn = container.querySelector('.play-pid-btn');
    const progressFill = container.querySelector('.progress-bar-fill');
    const progressContainer = container.querySelector('.progress-container');
    const timeDisplay = container.querySelector('.time-display');

    // Play/Pause
    btn.addEventListener('click', () => {
        if (audio.paused) {
            // Stop others
            document.querySelectorAll('audio').forEach(a => a.pause());
            audio.play();
            btn.innerHTML = '❚❚';
        } else {
            audio.pause();
            btn.innerHTML = '▶';
        }
    });

    // Time Update
    audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = `${percent}%`;

        const mins = Math.floor(audio.currentTime / 60);
        const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${mins}:${secs}`;
    });

    // Reset on End
    audio.addEventListener('ended', () => {
        btn.innerHTML = '▶';
        progressFill.style.width = '0%';
    });

    // Seek
    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pos * audio.duration;
    });

    return container;
}

/* TOOLS */
async function generateMusic() {
    const statusDiv = document.getElementById('media-player-container');
    const scriptText = generatedContent.screenplay;

    if (!scriptText) return alert("No script to analyze!");

    // Helper to detect scenes
    function extractScenes(text) {
        // Robust regex to capture:
        // 1. Markdown headers (## Scene 1)
        // 2. Bold headers (**INT. ...**)
        // 3. Standard headers (INT. / EXT.)
        // 4. Case insensitive
        const regex = /(?:^(?:[\*\#]+)?\s*(?:INT\.|EXT\.|SCENE\b|I\/E\.)(?:.|\n)+?)(?=(?:[\*\#]+)?\s*(?:INT\.|EXT\.|SCENE\b|I\/E\.)|$)/gim;

        // Use 'match' instead of 'matchAll' for simpler array handling with the 'g' flag, 
        // but 'match' with 'g' doesn't return capture groups, it returns full matches which is what we want here 
        // because the whole group is the scene content.

        // Note: JS Regex statefulness with global flag can be tricky. 
        // Let's use split-based approach or confirmed functional regex.

        // Alternative: Split by lookahead pattern if possible, or just match the pattern.
        const matches = text.match(regex);
        return matches ? matches.map(m => m.trim()) : [text];
    }

    const scenes = extractScenes(scriptText);
    statusDiv.innerHTML = `<div style="margin-bottom:10px; font-size:0.8rem;">🎼 Composing scores for ${scenes.length} scenes...</div>`;

    const list = document.createElement('div');
    statusDiv.appendChild(list);

    // Process sequentially
    for (let i = 0; i < scenes.length; i++) {
        const sceneText = scenes[i];
        const sceneHeader = sceneText.split('\n')[0].substring(0, 40) + "...";

        // UI Placeholder
        const item = document.createElement('div');
        item.style.marginBottom = "15px";
        item.innerHTML = `
            <div style="font-size:0.7rem; color:#aaa; margin-bottom:5px;">SCENE ${i + 1}: ${sceneHeader}</div>
            <div class="loader" style="width:15px; height:15px; border-width:2px; display:block;"></div>
        `;
        list.appendChild(item);

        // Scroll to new item
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            // Use header + truncated action for prompt
            const description = `Cinematic score for: ${sceneText.substring(0, 300)}`;

            const response = await fetch('/generate-music', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: description })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Replace loader with Custom Player
            item.querySelector('.loader').remove();
            const player = createCustomAudioPlayer(data.audio_url, `Scene ${i + 1} Score`);
            item.appendChild(player);

        } catch (e) {
            console.error(e);
            item.innerHTML = `<div style="font-size:0.7rem; color:red;">SCENE ${i + 1}: Generation Failed</div>`;
        }
    }
}

async function narrateScript() {
    const statusDiv = document.getElementById('media-player-container');
    statusDiv.innerHTML = "🎙️ Preparing Narration...";

    try {
        const response = await fetch('/narrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'screenplay' })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        statusDiv.innerHTML = '<div>🎙️ Narration Ready:</div>';
        const player = createCustomAudioPlayer(data.audio_url, "Full Screenplay Narration");
        statusDiv.appendChild(player);

    } catch (e) {
        statusDiv.innerHTML = "❌ Narration failed.";
        console.error(e);
    }
}

/* CUSTOM UI CONTROLS */
function initCustomSelects() {
    const selects = document.querySelectorAll('select');

    selects.forEach(select => {
        // Create Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';

        // Create Trigger
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.innerHTML = `<span>${select.options[select.selectedIndex].text}</span>`;

        // Create Options Container
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'custom-options';

        // Populate Options
        Array.from(select.options).forEach(option => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-option';
            if (option.selected) customOption.classList.add('selected');
            customOption.textContent = option.text;
            customOption.dataset.value = option.value;

            customOption.addEventListener('click', () => {
                // Update Logic
                select.value = option.value;
                trigger.querySelector('span').textContent = option.text;

                // Visual Updates
                wrapper.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                customOption.classList.add('selected');
                wrapper.classList.remove('open');
            });

            optionsDiv.appendChild(customOption);
        });

        // Assemble
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsDiv);

        // Insert and Click Logic
        select.parentNode.insertBefore(wrapper, select);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate close
            // Close others
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
    });

    // Close when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    });
}

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
    initCustomSelects();
});

function download(format) {
    window.location.href = `/download/${format}`;
}