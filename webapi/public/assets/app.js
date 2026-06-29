window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data) return;

    // --- 1. XỬ LÝ LỆNH SEEK/INTRO ---
    if (data.action === 'introduction') {
        const player = jwplayer("player");
        if (player && player.seek) {
            if (currentSkipConfig && currentSkipConfig.intro) {
                player.seek(currentSkipConfig.intro.end);
            }
        }
    }

    if (data.action === 'x-playnows' && data.playlist) {

        console.log(playlist)
    }
});