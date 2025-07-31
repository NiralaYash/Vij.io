const video = document.getElementById('videoPlayer');
const selector = document.getElementById('videoSelector');
let progress = {};
let saveTimeout = null;
let lastSavedTime = 0;

//
async function setFolder() {
    const folderPath = document.getElementById('folderInput').value;
    await fetch('/api/set-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
    });
    loadVideos();
}

async function loadVideos() {
    const res = await fetch('/api/videos');
    const videos = await res.json();

    selector.innerHTML = '';
    videos.forEach(videoFile => {
        const option = document.createElement('option');
        option.value = videoFile;
        option.textContent = videoFile;
        selector.appendChild(option);
    });

    const progRes = await fetch('/api/progress');
    progress = await progRes.json();
    const timestamps = progress.timestamps || {};


    if (videos.length > 0) {
        const lastPlayed = progress.lastPlayed;
        const defaultVideo = videos.includes(lastPlayed) ? lastPlayed : videos[0];
        selector.value = defaultVideo;
        loadVideo(defaultVideo);

    }
}

function loadVideo(filename) {
    video.src = `/stream/${filename}`;
    const timestamps = progress.timestamps || {};
    video.currentTime = timestamps[filename] || 0;

}

selector.addEventListener('change', () => {
    loadVideo(selector.value);
});

function saveProgress() {
    const filename = selector.value;
    const currentTime = Math.floor(video.currentTime);

    if (currentTime === lastSavedTime) return; // avoid duplicate save
    lastSavedTime = currentTime;

    fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, time: currentTime })
    });
}

// Hook into useful events
video.addEventListener('pause', saveProgress);
video.addEventListener('seeked', saveProgress);

video.addEventListener('timeupdate', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveProgress, 5000);
});

window.addEventListener('beforeunload', saveProgress);

loadVideos();
