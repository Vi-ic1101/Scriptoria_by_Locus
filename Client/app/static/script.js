// Frame Navigation Logic
function goToFrame(frameNum) {
    document.querySelectorAll('.frame').forEach(f => f.classList.remove('active'));
    
    // Logic for Frame 5/Dashboard
    if(frameNum === 5 || frameNum === 'dashboard') {
        document.getElementById('frame-dashboard').classList.add('active');
    } else {
        document.getElementById(`frame-${frameNum}`).classList.add('active');
    }
}

// FastAPI API Communication
async function handleGeneration() {
    const promptValue = document.getElementById('story-prompt').value;
    const timing = document.getElementById('timing-dropdown').value;
    const loader = document.getElementById('loading-overlay');
    const output = document.getElementById('display-output');

    if (!promptValue) return alert("Please enter a concept first!");

    // Show loading state
    loader.classList.remove('hidden');
    output.classList.add('hidden');
    
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: promptValue,
                timing: timing 
            })
        });

        const data = await response.json();
        
        // Store data globally for tab switching
        window.generatedContent = data.output; 
        
        // Navigate to Dashboard
        goToFrame(5);
        switchTab('screenplay'); // Default view
        
    } catch (error) {
        console.error("AI Generation Error:", error);
        alert("Ollama connection failed. Ensure the server is running.");
    } finally {
        loader.classList.add('hidden');
        output.classList.remove('hidden');
    }
}

// Tab Switching within Dashboard
function switchTab(part) {
    const display = document.getElementById('display-output');
    
    // Update active button UI
    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.part === part);
    });

    // In a real scenario, you'd parse the LLM text into these sections
    // For now, we display the raw response in the active tab
    display.innerHTML = `
        <div class="content-animate">
            <h2 style="text-transform: capitalize; margin-bottom: 15px;">${part}</h2>
            <div class="ai-text-wrapper">${window.generatedContent || "Generating content..."}</div>
        </div>
    `;
}