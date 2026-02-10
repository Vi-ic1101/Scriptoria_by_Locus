/* VIEW NAVIGATION */
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

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
async function handleGeneration() {
    const prompt = document.getElementById('story-prompt').value;
    const genre = document.getElementById('genre-select').value;
    const sceneCount = document.getElementById('scene-count').value;
    const language = document.getElementById('language-select').value;

    const btn = document.getElementById('generate-btn');
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');

    if (!prompt) return alert("Please enter a story concept.");

    // Loading State
    btn.disabled = true;
    btnText.textContent = "GENERATING...";
    loader.classList.remove('hidden');

    try {
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

        if (!response.ok) throw new Error("Generation failed");

        const data = await response.json();

        // Update State
        generatedContent = data;

        // Render Output
        renderOutput();

        // Navigate
        navigateTo('view-output');

    } catch (error) {
        console.error("Error:", error);
        alert("Failed to generate content. Please try again.");
    } finally {
        btn.disabled = false;
        btnText.textContent = "ACTION";
        loader.classList.add('hidden');
    }
}

/* OUTPUT RENDERING */
function renderOutput() {
    // Default View: Screenplay
    const scriptViewer = document.getElementById('screenplay-content');
    scriptViewer.textContent = generatedContent.screenplay || "No script generated.";

    // Populate Dock (Default to Characters tab content if needed, but we switch tabs dynamically)
    switchTab('screenplay'); // Reset dock to default state or just keep it ready
}

/* DOCK TABS */
function switchTab(tabName) {
    // 1. Update Buttons
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        if (b.innerText.toLowerCase().includes(tabName.substring(0, 4))) b.classList.add('active');
    });

    const dock = document.getElementById('dock-content');

    // 2. Update Content
    if (tabName === 'screenplay') {
        // In this UI, screenplay is in the center. The dock shows Synopsis here.
        dock.innerHTML = `<h3>SYNOPSIS</h3><p>${generatedContent.synopsis || "No synopsis available."}</p>`;
    } else if (tabName === 'characters') {
        dock.innerHTML = `<h3>CAST & CHARACTERS</h3><pre>${generatedContent.characters}</pre>`;
    } else if (tabName === 'sound') {
        dock.innerHTML = `<h3>SOUND DESIGN</h3><pre>${generatedContent.sound_design}</pre>`;
    }
}

/* TOOLS */
async function generateMusic() {
    const statusDiv = document.getElementById('media-player-container');
    const scriptText = generatedContent.screenplay;

    if (!scriptText) return alert("No script to analyze!");

    // Helper to detect scenes
    function extractScenes(text) {
        const regex = /((?:INT\.|EXT\.).+?)(?=(?:INT\.|EXT\.)|$)/gs;
        const matches = [...text.matchAll(regex)];
        return matches.length > 0 ? matches.map(m => m[1].trim()) : [text];
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
        item.style.background = "#222";
        item.style.padding = "10px";
        item.style.borderRadius = "4px";
        item.innerHTML = `
            <div style="font-size:0.7rem; color:#aaa; margin-bottom:5px;">SCENE ${i + 1}: ${sceneHeader}</div>
            <div class="loader" style="width:15px; height:15px; border-width:2px;"></div>
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

            item.innerHTML = `
                <div style="font-size:0.7rem; color:#d4af37; margin-bottom:5px;">SCENE ${i + 1}: ${sceneHeader}</div>
                <audio controls style="width: 100%; height: 30px;">
                    <source src="${data.audio_url}" type="audio/wav">
                </audio>
            `;

        } catch (e) {
            console.error(e);
            item.innerHTML = `
                <div style="font-size:0.7rem; color:red; margin-bottom:5px;">SCENE ${i + 1}: Failed</div>
            `;
        }
    }
}

async function narrateScript() {
    const statusDiv = document.getElementById('media-player-container');
    statusDiv.innerHTML = "🎙️ Recording Voiceover...";

    try {
        const response = await fetch('/narrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'screenplay' })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        statusDiv.innerHTML = `
            <audio controls autoplay style="width: 100%; margin-top: 10px;">
                <source src="${data.audio_url}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
    } catch (e) {
        statusDiv.innerHTML = "❌ Narration failed.";
        console.error(e);
    }
}

function download(format) {
    window.location.href = `/download/${format}`;
}