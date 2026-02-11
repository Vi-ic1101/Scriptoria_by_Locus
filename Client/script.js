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

                // Show Refine Button
                const refineBtn = document.getElementById('refine-btn');
                if (refineBtn) refineBtn.classList.remove('hidden');

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

/* RENDER OUTPUT TO PAPER SHEET */
function renderOutput() {
    // Default View: Screenplay
    const paper = document.getElementById('screenplay-content');
    const dock = document.getElementById('dock-content');

    // Ensure Paper is visible, Dock is hidden primarily
    paper.classList.remove('hidden');
    dock.classList.add('hidden');

    // Format Screenplay
    if (generatedContent && generatedContent.screenplay) {
        paper.innerHTML = formatScreenplay(generatedContent.screenplay);
    } else {
        paper.innerHTML = "<div class='watermark'>WAITING FOR INPUT...</div>";
    }

    // Reset Tabs
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[onclick*="screenplay"]').classList.add('active');
}

/* TAB SWITCHING (Filesystem Metaphor) */
function switchTab(tabName) {
    const paper = document.getElementById('screenplay-content');
    const dock = document.getElementById('dock-content');
    const buttons = document.querySelectorAll('.nav-btn');

    // Update Buttons
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });

    if (tabName === 'screenplay') {
        paper.classList.remove('hidden');
        dock.classList.add('hidden');
        if (generatedContent) paper.innerHTML = formatScreenplay(generatedContent.screenplay);
    }
    else if (tabName === 'characters') {
        paper.classList.add('hidden');
        dock.classList.remove('hidden');
        dock.innerHTML = generatedContent ? formatCharacters(generatedContent.characters) : "No characters generated.";
    }
    else if (tabName === 'sound') {
        paper.classList.add('hidden');
        dock.classList.remove('hidden');
        dock.innerHTML = generatedContent ? formatSound(generatedContent.sound_design) : "No sound design generated.";
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

/* HELPER FUNCTIONS */
function formatScreenplay(text) {
    if (!text) return "";
    // Basic bolding for sluglines and character names
    return text.replace(/^(INT\.|EXT\.)/gm, '<b>$1</b>')
        .replace(/([A-Z]{3,}\s?\(V\.O\.\)|[A-Z]{3,})/g, '<b>$1</b>');
}

function formatCharacters(text) {
    if (!text) return "";
    return `<h3>CAST LIST</h3><div style="white-space: pre-wrap;">${text}</div>`;
}

function formatSound(text) {
    if (!text) return "";
    return `<h3>SOUND DESIGN</h3><div style="white-space: pre-wrap;">${text}</div>`;
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

/* REFINEMENT FEATURE */
async function startRefinement() {
    const statusDiv = document.getElementById('questions-container');
    const dock = document.getElementById('refinement-dock');
    const btn = document.getElementById('refine-btn');
    const applyBtn = document.getElementById('apply-fix-btn');

    // Toggle Dock
    dock.classList.remove('hidden');
    btn.classList.add('hidden');

    // Clear & Show Loading
    statusDiv.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted);">🤔 Analyzing your script for improvements...</div>`;
    applyBtn.style.display = 'none';

    try {
        const response = await fetch('/followup-questions');
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Render Questions
        renderQuestions(data.questions);
        applyBtn.style.display = 'block'; // Show apply button

    } catch (e) {
        console.error(e);
        statusDiv.innerHTML = `<div style="color:red; font-size:0.8rem;">Could not load questions. Try again later.</div>`;
        setTimeout(() => {
            dock.classList.add('hidden');
            btn.classList.remove('hidden');
        }, 3000);
    }
}

function renderQuestions(questions) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    questions.forEach((q, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = "15px";

        wrapper.innerHTML = `
            <div style="font-size:0.8rem; margin-bottom:5px; color:#ddd;">${q}</div>
            <textarea id="answer-${index}" rows="2" placeholder="Your answer (optional)..." 
                style="width:100%; background:#222; border:1px solid #444; color:#fff; padding:8px; font-family:var(--font-body); border-radius:4px; font-size:0.8rem;"></textarea>
        `;
        container.appendChild(wrapper);
    });
}

async function submitRefinements() {
    const container = document.getElementById('questions-container');
    const inputs = container.querySelectorAll('textarea');
    const answers = {};
    let hasAnswers = false;

    // Harvest Answers
    inputs.forEach((input, index) => {
        const questionText = input.previousElementSibling.innerText;
        const answerText = input.value.trim();

        if (answerText) {
            answers[questionText] = answerText;
            hasAnswers = true;
        }
    });

    if (!hasAnswers) return alert("Please answer at least one question to improve the script.");

    // Start Premium Loading (Custom Text)
    startPremiumLoading("Applying Fixes...", "Polishing Dialogue...");

    try {
        const response = await fetch('/improve-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: answers })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Success!
        generatedContent.screenplay = data.screenplay;
        renderOutput(); // Re-render script view

        alert("Script improved successfully!");

        // Reset UI
        document.getElementById('refinement-dock').classList.add('hidden');
        document.getElementById('refine-btn').classList.remove('hidden');

    } catch (e) {
        console.error(e);
        alert("Improvement failed: " + e.message);
    } finally {
        stopPremiumLoading();
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