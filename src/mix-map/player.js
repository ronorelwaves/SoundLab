const VIDEO_ID = "P_7q2RJtVQA";
const TRACK_ID = "1Rt3oh7shVSWj6q2MieDHa";
const YOUTUBE_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
const SPOTIFY_URL = `https://open.spotify.com/track/${TRACK_ID}`;
let youtubeApiPromise;
let playerSequence = 0;

// Share one official API script across lesson visits without replacing another
// feature's ready callback. A failed load can be retried on a subsequent visit.
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    let settled = false;
    let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const ownsScript = !script;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      script.removeEventListener("error", onError);
      if (window.onYouTubeIframeAPIReady === onReady) {
        window.onYouTubeIframeAPIReady = previousReady;
      }
      if (error) {
        if (ownsScript) script.remove();
        reject(error);
      } else resolve(window.YT);
    };
    const onReady = () => {
      try { previousReady?.(); }
      finally { finish(window.YT?.Player ? null : new Error("YouTube API unavailable")); }
    };
    const onError = () => finish(new Error("YouTube API failed to load"));
    const timeout = setTimeout(onError, 12000);
    window.onYouTubeIframeAPIReady = onReady;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
    }
    script.addEventListener("error", onError, { once: true });
    if (ownsScript) document.head.append(script);
  }).catch((error) => {
    youtubeApiPromise = undefined;
    throw error;
  });
  return youtubeApiPromise;
}

export function mountMusicPlayer(root) {
  root.classList.add("mix-player");
  root.innerHTML = `
    <div class="mix-provider-tabs" role="group" aria-label="בחירת נגן">
      <button type="button" data-provider="youtube" aria-pressed="true" dir="ltr">YouTube</button>
      <button type="button" data-provider="spotify" aria-pressed="false" dir="ltr">Spotify</button>
    </div>
    <div class="mix-player-frame"></div>
    <div class="mix-transport" role="group" aria-label="דילוג בהאזנה">
      <button type="button" data-seek="-5" disabled>↶ 5 שניות אחורה</button>
      <button type="button" data-seek="5" disabled>5 שניות קדימה ↷</button>
    </div>
    <p class="mix-player-status" role="status" aria-live="polite"></p>
    <p class="mix-player-note"></p>
    <a class="mix-player-external" target="_blank" rel="noopener noreferrer"></a>`;
  const frame = root.querySelector(".mix-player-frame");
  const transport = root.querySelector(".mix-transport");
  const status = root.querySelector(".mix-player-status");
  const note = root.querySelector(".mix-player-note");
  const external = root.querySelector(".mix-player-external");
  const seekButtons = [...root.querySelectorAll("[data-seek]")];
  let player;
  let provider;
  let generation = 0;
  let readyTimeout;
  let disposed = false;

  function disableSeeking() {
    seekButtons.forEach((button) => { button.disabled = true; });
  }

  function releasePlayer() {
    clearTimeout(readyTimeout);
    disableSeeking();
    if (player) {
      try { player.destroy(); } catch { /* Removing the iframe also stops playback. */ }
      player = undefined;
    }
    frame.replaceChildren();
  }

  function youtubeUnavailable() {
    disableSeeking();
    status.textContent = "כפתורי הדילוג אינם זמינים כרגע. אפשר להשתמש בבקרי הנגן, או לפתוח את השיר בקישור למטה.";
  }

  function selectProvider(nextProvider) {
    if (provider === nextProvider || disposed) return;
    provider = nextProvider;
    const currentGeneration = ++generation;
    releasePlayer();
    root.querySelectorAll("[data-provider]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.provider === provider));
    });
    const iframe = document.createElement("iframe");
    iframe.width = "100%";
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.border = "0";
    iframe.loading = "eager";
    transport.hidden = provider !== "youtube";
    status.textContent = "";

    if (provider === "spotify") {
      frame.classList.add("mix-player-frame-spotify");
      iframe.title = "נגן Spotify – Billie Jean של Michael Jackson";
      iframe.src = `https://open.spotify.com/embed/track/${TRACK_ID}?utm_source=generator&theme=0`;
      iframe.height = "352";
      note.textContent = "השתמשו בבקרי הנגן כדי להאזין ולנווט. Spotify עשוי להשמיע תצוגה מקדימה בלבד, בהתאם לחשבון, לדפדפן ולהגדרותיו. להאזנה מלאה אפשר לפתוח את השיר ב־Spotify או לעבור ל־YouTube.";
      external.href = SPOTIFY_URL;
      external.textContent = "פתיחת השיר ב־Spotify ↗";
      frame.append(iframe);
      return;
    }

    frame.classList.remove("mix-player-frame-spotify");
    iframe.id = `mix-youtube-${++playerSequence}`;
    iframe.title = "נגן YouTube – Billie Jean של Michael Jackson";
    iframe.height = "240";
    const parameters = new URLSearchParams({
      enablejsapi: "1", origin: window.location.origin, autoplay: "0",
      controls: "1", playsinline: "1", hl: "he", rel: "0",
    });
    iframe.src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${parameters}`;
    note.textContent = "להאזנה חוזרת לקטע קצר, השתמשו בפס ההתקדמות של הנגן ובכפתורי הדילוג. אפשר לעצור ולהמשיך בכל רגע.";
    external.href = YOUTUBE_URL;
    external.textContent = "פתיחת השיר ב־YouTube ↗";
    status.textContent = "טוענים את כפתורי הדילוג…";
    frame.append(iframe);
    readyTimeout = setTimeout(youtubeUnavailable, 15000);

    loadYoutubeApi().then((YT) => {
      if (disposed || currentGeneration !== generation) return;
      player = new YT.Player(iframe.id, {
        events: {
          onReady(event) {
            if (disposed || currentGeneration !== generation) return;
            clearTimeout(readyTimeout);
            player = event.target;
            seekButtons.forEach((button) => { button.disabled = false; });
            status.textContent = "כפתורי הדילוג מוכנים. ההשמעה מתחילה רק בלחיצה בנגן.";
          },
          onError(event) {
            if (disposed || currentGeneration !== generation) return;
            clearTimeout(readyTimeout);
            disableSeeking();
            status.textContent = [101, 150].includes(event.data)
              ? "YouTube אינו מאפשר להפעיל את הסרטון הזה בתוך האתר. אפשר לפתוח את השיר ב־YouTube, או לעבור לנגן Spotify."
              : "לא ניתן להשמיע כאן את השיר כרגע. אפשר לפתוח אותו ב־YouTube, או לעבור לנגן Spotify.";
          },
        },
      });
    }).catch(() => {
      if (disposed || currentGeneration !== generation) return;
      clearTimeout(readyTimeout);
      youtubeUnavailable();
    });
  }

  function onClick(event) {
    const providerButton = event.target.closest("[data-provider]");
    if (providerButton && root.contains(providerButton)) {
      selectProvider(providerButton.dataset.provider);
      return;
    }
    const seekButton = event.target.closest("[data-seek]");
    if (!seekButton || !root.contains(seekButton) || seekButton.disabled || !player) return;
    try {
      const currentTime = Number(player.getCurrentTime()) || 0;
      const duration = Number(player.getDuration()) || Infinity;
      const target = Math.max(0, Math.min(duration, currentTime + Number(seekButton.dataset.seek)));
      const state = player.getPlayerState();
      if (state === 1 || state === 2 || state === 3) {
        // The official seekTo method preserves a paused player's state.
        player.seekTo(target, true);
      } else {
        // seekTo starts an unstarted/cued/ended player. Cue instead so a
        // navigation click cannot start music before the student's play click.
        player.cueVideoById({ videoId: VIDEO_ID, startSeconds: target });
      }
    } catch {
      youtubeUnavailable();
    }
  }

  root.addEventListener("click", onClick);
  selectProvider("youtube");
  return () => {
    disposed = true;
    generation++;
    root.removeEventListener("click", onClick);
    releasePlayer();
  };
}
