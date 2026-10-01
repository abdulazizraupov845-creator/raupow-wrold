"use strict";

/* =========================================================
   RAUPOWTube — YouTube Data API
   Navigation + Home + Search + Shorts + Saved + Liked
   History + Playlists + Subscriptions + Trending + Channels
   ========================================================= */

const CONFIG = {
    API_KEY: "AIzaSyBsi4AExeC_hMrZBaItVimX4APUvIuK8l8",
    API_URL: "https://www.googleapis.com/youtube/v3",
    REGION_CODE: "us",
    MAX_RESULTS: 24,
    STORAGE_PREFIX: "RAUPOW_YOUTUBE_"
};

/* =========================================================
   STATE
========================================================= */

const state = {
    page: "home",
    query: "",
    nextPageToken: "",
    currentVideo: null,
    currentCategory: "All",
    searchTimer: null,

    history: loadStorage("history", []),
    watchLater: loadStorage("watchLater", []),
    liked: loadStorage("liked", []),
    playlists: loadStorage("playlists", []),
    subscriptions: loadStorage("subscriptions", []),
    comments: loadStorage("comments", {}),
    theme: localStorage.getItem(
        CONFIG.STORAGE_PREFIX + "theme"
    ) || "dark"
};

/* =========================================================
   DOM
========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function byId(id) {
    return document.getElementById(id);
}

/* =========================================================
   STORAGE
========================================================= */

function loadStorage(key, fallback) {
    try {
        const value = localStorage.getItem(
            CONFIG.STORAGE_PREFIX + key
        );

        return value
            ? JSON.parse(value)
            : fallback;
    } catch (error) {
        console.warn("Storage error:", key, error);
        return fallback;
    }
}

function saveState() {
    localStorage.setItem(
        CONFIG.STORAGE_PREFIX + "history",
        JSON.stringify(state.history)
    );

    localStorage.setItem(
        CONFIG.STORAGE_PREFIX + "watchLater",
        JSON.stringify(state.watchLater)
    );

    localStorage.setItem(
        CONFIG.STORAGE_PREFIX + "liked",
        JSON.stringify(state.liked)
    );

    localStorage.setItem(
        CONFIG.STORAGE_PREFIX + "playlists",
        JSON.stringify(state.playlists)
    );

    localStorage.setItem(
        CONFIG.STORAGE_PREFIX + "subscriptions",
        JSON.stringify(state.subscriptions)
    );

    localStorage.setItem(
        CONFIG.STORAGE_PREFIX + "comments",
        JSON.stringify(state.comments)
    );

    localStorage.setItem(
        CONFIG.STORAGE_PREFIX + "theme",
        state.theme
    );
}

/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(number) {
    const n = Number(number) || 0;

    if (n >= 1000000000) {
        return (n / 1000000000).toFixed(1) + "B";
    }

    if (n >= 1000000) {
        return (n / 1000000).toFixed(1) + "M";
    }

    if (n >= 1000) {
        return (n / 1000).toFixed(1) + "K";
    }

    return n.toLocaleString();
}

function formatViews(number) {
    return `${formatNumber(number)} views`;
}

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();

    const seconds = Math.floor(
        (now - date) / 1000
    );

    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
        return `${days} day${days !== 1 ? "s" : ""} ago`;
    }

    const months = Math.floor(days / 30);

    if (months < 12) {
        return `${months} month${months !== 1 ? "s" : ""} ago`;
    }

    const years = Math.floor(months / 12);

    return `${years} year${years !== 1 ? "s" : ""} ago`;
}

function formatDuration(duration) {
    if (!duration) return "";

    const match = duration.match(
        /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
    );

    if (!match) return "";

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getVideoId(item) {
    if (!item) return "";

    if (typeof item.id === "string") {
        return item.id;
    }

    if (item.id?.videoId) {
        return item.id.videoId;
    }

    return "";
}

function getThumbnail(video) {
    const id = getVideoId(video);

    return (
        video?.snippet?.thumbnails?.high?.url ||
        video?.snippet?.thumbnails?.medium?.url ||
        video?.snippet?.thumbnails?.default?.url ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    );
}

function showToast(message) {
    const toast = byId("toast");

    if (!toast) return;

    const text = byId("toastText");

    if (text) {
        text.textContent = message;
    } else {
        toast.textContent = message;
    }

    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

/* =========================================================
   API
========================================================= */

function hasAPIKey() {
    return (
        CONFIG.API_KEY &&
        CONFIG.API_KEY.trim() !== "" &&
        !CONFIG.API_KEY.includes("BU_YERGA")
    );
}

async function youtubeRequest(endpoint, params = {}) {
    if (!hasAPIKey()) {
        throw new Error(
            "YouTube API key topilmadi."
        );
    }

    const url = new URL(
        `${CONFIG.API_URL}/${endpoint}`
    );

    const finalParams = {
        ...params,
        key: CONFIG.API_KEY
    };

    Object.entries(finalParams).forEach(
        ([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                url.searchParams.set(
                    key,
                    value
                );
            }
        }
    );

    const response = await fetch(
        url.toString()
    );

    if (!response.ok) {
        let message =
            "YouTube API xatosi.";

        try {
            const data =
                await response.json();

            message =
                data?.error?.message ||
                message;
        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}

/* =========================================================
   VIDEO API
========================================================= */

async function getVideoDetails(ids) {
    if (!ids?.length) return [];

    const data = await youtubeRequest(
        "videos",
        {
            part:
                "snippet,contentDetails,statistics",
            id: ids.join(",")
        }
    );

    return data.items || [];
}

async function searchYouTube(
    query,
    pageToken = "",
    options = {}
) {
    const params = {
        part: "snippet",
        type: "video",
        q: query,
        maxResults: CONFIG.MAX_RESULTS,
        regionCode: CONFIG.REGION_CODE,
        order: options.order || "relevance",
        safeSearch: "none"
    };

    if (pageToken) {
        params.pageToken = pageToken;
    }

    if (options.videoDuration) {
        params.videoDuration =
            options.videoDuration;
    }

    const data =
        await youtubeRequest(
            "search",
            params
        );

    const ids =
        (data.items || [])
            .map(getVideoId)
            .filter(Boolean);

    const videos =
        await getVideoDetails(ids);

    return {
        items: videos,
        nextPageToken:
            data.nextPageToken || ""
    };
}

/* =========================================================
   HOME
========================================================= */

async function loadHomeVideos() {
    showLoading();

    try {
        const data =
            await youtubeRequest(
                "videos",
                {
                    part:
                        "snippet,contentDetails,statistics",
                    chart: "mostPopular",
                    regionCode:
                        CONFIG.REGION_CODE,
                    maxResults:
                        CONFIG.MAX_RESULTS
                }
            );

        state.nextPageToken = "";

        renderVideos(
            data.items || [],
            byId("videoGrid")
        );

        renderShortsFromVideos(
            data.items || []
        );

        updatePageTitle(
            "Bosh sahifa",
            "YouTube videolari"
        );

    } catch (error) {
        showAPIError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   SEARCH
========================================================= */

async function performSearch(
    query = "",
    pageToken = ""
) {
    query = String(query).trim();

    if (!query) {
        state.query = "";
        state.page = "home";
        state.nextPageToken = "";

        await navigate("home");
        return;
    }

    state.query = query;
    state.page = "search";

    showPage("homePage");

    const grid = byId("videoGrid");

    if (!pageToken) {
        showLoading();
    }

    try {
        const data =
            await searchYouTube(
                query,
                pageToken,
                {
                    order: "relevance"
                }
            );

        state.nextPageToken =
            data.nextPageToken;

        if (pageToken) {
            appendVideos(
                data.items,
                grid
            );
        } else {
            renderVideos(
                data.items,
                grid
            );
        }

        updatePageTitle(
            `"${query}"`,
            "YouTube qidiruv natijalari"
        );

        const status =
            byId("searchStatus");

        const statusText =
            byId("searchStatusText");

        if (status) {
            status.classList.remove(
                "hidden"
            );
        }

        if (statusText) {
            statusText.textContent =
                `"${query}" bo‘yicha natijalar`;
        }

    } catch (error) {
        showAPIError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   CATEGORY
========================================================= */

async function searchCategory(
    category
) {
    const categoryMap = {
        All: "",
        Music: "music",
        Gaming: "gaming",
        News: "news",
        Live: "live",
        Sports: "sports",
        Learning: "programming tutorial",
        Movies: "movies",
        Fashion: "fashion",
        Technology: "technology",
        Comedy: "comedy",
        Cars: "cars",
        Football: "football"
    };

    state.currentCategory =
        category;

    $$(".category-chip")
        .forEach((chip) => {
            chip.classList.toggle(
                "active",
                chip.dataset.category ===
                    category
            );
        });

    const query =
        categoryMap[category] ||
        category;

    if (!query) {
        await navigate("home");
        return;
    }

    await performSearch(query);
}

/* =========================================================
   VIDEO CARD
========================================================= */

function createVideoCard(video) {
    const id = getVideoId(video);

    if (!id) return "";

    const snippet =
        video.snippet || {};

    const stats =
        video.statistics || {};

    const details =
        video.contentDetails || {};

    const title =
        escapeHTML(
            snippet.title ||
            "Untitled"
        );

    const channel =
        escapeHTML(
            snippet.channelTitle ||
            "Unknown channel"
        );

    const thumbnail =
        getThumbnail(video);

    const avatar =
        snippet.thumbnails?.default?.url ||
        thumbnail;

    const duration =
        formatDuration(
            details.duration
        );

    const views =
        formatViews(
            stats.viewCount || 0
        );

    const date =
        formatDate(
            snippet.publishedAt
        );

    return `
        <article
            class="video-card"
            data-video-id="${escapeHTML(id)}"
            tabindex="0"
        >
            <div class="video-thumbnail">
                <img
                    src="${escapeHTML(thumbnail)}"
                    alt="${title}"
                    loading="lazy"
                />

                ${
                    duration
                        ? `<span class="video-duration">${duration}</span>`
                        : ""
                }

                <button
                    class="thumbnail-menu"
                    data-action="menu"
                    aria-label="Menu"
                >
                    ⋮
                </button>
            </div>

            <div class="video-info">
                <img
                    class="channel-avatar"
                    src="${escapeHTML(avatar)}"
                    alt=""
                    loading="lazy"
                />

                <div class="video-text">
                    <h3 class="video-title">
                        ${title}
                    </h3>

                    <div class="channel-name">
                        ${channel}
                    </div>

                    <div class="video-meta">
                        ${views} • ${date}
                    </div>
                </div>
            </div>
        </article>
    `;
}

/* =========================================================
   SHORT CARD
========================================================= */

function createShortCard(video) {
    const id = getVideoId(video);

    if (!id) return "";

    const title =
        escapeHTML(
            video?.snippet?.title ||
            "Short"
        );

    const thumbnail =
        getThumbnail(video);

    return `
        <article
            class="short-card"
            data-video-id="${escapeHTML(id)}"
        >
            <div class="short-thumbnail">
                <img
                    src="${escapeHTML(thumbnail)}"
                    alt="${title}"
                    loading="lazy"
                />

                <div class="short-play">
                    ▶
                </div>
            </div>

            <h3>${title}</h3>
        </article>
    `;
}

/* =========================================================
   RENDER
========================================================= */

function renderVideos(
    videos,
    container
) {
    if (!container) return;

    if (!videos?.length) {
        showEmpty(
            container,
            "Video topilmadi",
            "Hozircha ko‘rsatish uchun video yo‘q."
        );

        return;
    }

    container.innerHTML =
        videos
            .map(createVideoCard)
            .join("");
}

function appendVideos(
    videos,
    container
) {
    if (
        !container ||
        !videos?.length
    ) {
        return;
    }

    container.insertAdjacentHTML(
        "beforeend",
        videos
            .map(createVideoCard)
            .join("")
    );
}

function renderShortsFromVideos(
    videos
) {
    const container =
        byId("shortsGrid");

    if (!container) return;

    container.innerHTML =
        videos
            .slice(0, 6)
            .map(createShortCard)
            .join("");
}

function showEmpty(
    container,
    title,
    text
) {
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h2>${escapeHTML(title)}</h2>
            <p>${escapeHTML(text)}</p>
        </div>
    `;
}

/* =========================================================
   LOADING
========================================================= */

function showLoading() {
    const loading =
        byId("loadingContainer");

    if (!loading) return;

    loading.classList.remove(
        "hidden"
    );

    loading.classList.add(
        "active"
    );
}

function hideLoading() {
    const loading =
        byId("loadingContainer");

    if (!loading) return;

    loading.classList.remove(
        "active"
    );

    loading.classList.add(
        "hidden"
    );
}

/* =========================================================
   ERROR
========================================================= */

function showAPIError(error) {
    console.error(error);

    const message =
        error?.message ||
        "YouTube bilan bog‘lanishda xatolik.";

    showToast(message);

    const errorContainer =
        byId("errorContainer");

    const errorTitle =
        byId("errorTitle");

    const errorMessage =
        byId("errorMessage");

    if (errorContainer) {
        errorContainer.classList.remove(
            "hidden"
        );
    }

    if (errorTitle) {
        errorTitle.textContent =
            "YouTube ma'lumotlarini yuklab bo‘lmadi";
    }

    if (errorMessage) {
        errorMessage.textContent =
            message;
    }

    const grid =
        byId("videoGrid");

    if (
        grid &&
        !grid.children.length
    ) {
        showEmpty(
            grid,
            "YouTube ma'lumotlarini yuklab bo‘lmadi",
            message
        );
    }
}

/* =========================================================
   PAGE SYSTEM — MUHIM FIX
========================================================= */

const PAGE_IDS = [
    "homePage",
    "watchPage",
    "shortsPage",
    "subscriptionsPage",
    "historyPage",
    "savedPage",
    "likedPage",
    "playlistsPage",
    "trendingPage",
    "channelsPage",
    "settingsPage"
];

function showPage(pageId) {
    PAGE_IDS.forEach((id) => {
        const page =
            byId(id);

        if (!page) return;

        const active =
            id === pageId;

        page.classList.toggle(
            "active",
            active
        );

        page.classList.toggle(
            "hidden",
            !active
        );

        page.hidden = !active;
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function updatePageTitle(
    title,
    subtitle = ""
) {
    const pageTitle =
        byId("pageTitle");

    const pageSubtitle =
        byId("pageSubtitle");

    if (pageTitle) {
        pageTitle.textContent =
            title;
    }

    if (pageSubtitle) {
        pageSubtitle.textContent =
            subtitle;
    }
}

/* =========================================================
   NAVIGATION — MUHIM FIX
========================================================= */

async function navigate(page) {
    state.page = page;

    closeSidebar();

    switch (page) {

        case "home":
            showPage("homePage");
            await loadHomeVideos();
            break;

        case "shorts":
            showPage("shortsPage");
            updatePageTitle(
                "Shorts",
                "Qisqa videolar"
            );
            await loadShortsPage();
            break;

        case "subscriptions":
            showPage(
                "subscriptionsPage"
            );
            await loadSubscriptionsPage();
            break;

        case "history":
            showPage("historyPage");
            renderHistory();
            break;

        case "playlists":
            showPage("playlistsPage");
            renderPlaylists();
            break;

        case "saved":
        case "watchLater":
            showPage("savedPage");
            renderSaved();
            break;

        case "liked":
            showPage("likedPage");
            renderLiked();
            break;

        case "trending":
            showPage("trendingPage");
            await loadTrendingPage();
            break;

        case "channels":
            showPage("channelsPage");
            renderChannels();
            break;

        case "settings":
            showPage("settingsPage");
            updateSettingsUI();
            break;

        default:
            showPage("homePage");
            await loadHomeVideos();
    }
}

/* =========================================================
   SHORTS
========================================================= */

async function loadShortsPage() {
    const container =
        byId("shortsGrid");

    if (!container) return;

    container.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <p>Shorts yuklanmoqda...</p>
        </div>
    `;

    try {
        const data =
            await searchYouTube(
                "shorts",
                "",
                {
                    order: "date",
                    videoDuration: "short"
                }
            );

        if (!data.items.length) {
            showEmpty(
                container,
                "Shorts topilmadi",
                "Hozircha Shorts topilmadi."
            );

            return;
        }

        container.innerHTML =
            data.items
                .map(createShortCard)
                .join("");

    } catch (error) {
        showAPIError(error);
    }
}

/* =========================================================
   SUBSCRIPTIONS
========================================================= */

async function loadSubscriptionsPage() {
    const container =
        byId("subscriptionList") ||
        document.querySelector(
            "#subscriptionsPage .video-grid"
        );

    if (!container) return;

    if (!state.subscriptions.length) {
        showEmpty(
            container,
            "Obunalar",
            "Hali hech qaysi kanalga obuna bo‘lmagansiz."
        );

        return;
    }

    container.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <p>Obunalar yuklanmoqda...</p>
        </div>
    `;

    try {
        const videos = [];

        for (
            const channelId
            of state.subscriptions
        ) {
            const data =
                await youtubeRequest(
                    "search",
                    {
                        part: "snippet",
                        channelId,
                        type: "video",
                        order: "date",
                        maxResults: 10
                    }
                );

            const ids =
                (data.items || [])
                    .map(getVideoId)
                    .filter(Boolean);

            const details =
                await getVideoDetails(ids);

            videos.push(
                ...details
            );
        }

        videos.sort(
            (a, b) =>
                new Date(
                    b.snippet.publishedAt
                ) -
                new Date(
                    a.snippet.publishedAt
                )
        );

        renderVideos(
            videos,
            container
        );

    } catch (error) {
        showAPIError(error);
    }
}

/* =========================================================
   HISTORY
========================================================= */

function addToHistory(video) {
    const id =
        getVideoId(video);

    if (!id) return;

    state.history =
        state.history.filter(
            (item) =>
                getVideoId(item) !== id
        );

    state.history.unshift(
        video
    );

    state.history =
        state.history.slice(
            0,
            100
        );

    saveState();
}

function renderHistory() {
    const container =
        byId("historyGrid");

    if (!container) return;

    if (!state.history.length) {
        showEmpty(
            container,
            "Tarix bo‘sh",
            "Ko‘rgan videolaringiz shu yerda chiqadi."
        );

        return;
    }

    renderVideos(
        state.history,
        container
    );
}

function clearHistory() {
    state.history = [];

    saveState();

    renderHistory();

    showToast(
        "Tarix tozalandi."
    );
}

/* =========================================================
   SAVED
========================================================= */

function isSaved(videoId) {
    return state.watchLater.some(
        (video) =>
            getVideoId(video) ===
            videoId
    );
}

function toggleWatchLater() {
    const video =
        state.currentVideo;

    if (!video) return;

    const id =
        getVideoId(video);

    if (isSaved(id)) {

        state.watchLater =
            state.watchLater.filter(
                (item) =>
                    getVideoId(item) !== id
            );

        showToast(
            "Saqlanganlardan olib tashlandi."
        );

    } else {

        state.watchLater.unshift(
            video
        );

        showToast(
            "Saqlanganlarga qo‘shildi 💾"
        );
    }

    saveState();

    updateWatchButtons(video);
}

function renderSaved() {
    const container =
        byId("savedGrid");

    if (!container) return;

    if (!state.watchLater.length) {
        showEmpty(
            container,
            "Saqlanganlar bo‘sh",
            "Saqlagan videolaringiz shu yerda chiqadi."
        );

        return;
    }

    renderVideos(
        state.watchLater,
        container
    );
}

/* =========================================================
   LIKED
========================================================= */

function isLiked(videoId) {
    return state.liked.some(
        (video) =>
            getVideoId(video) ===
            videoId
    );
}

function toggleLike() {
    const video =
        state.currentVideo;

    if (!video) return;

    const id =
        getVideoId(video);

    if (isLiked(id)) {

        state.liked =
            state.liked.filter(
                (item) =>
                    getVideoId(item) !== id
            );

        showToast(
            "Like olib tashlandi."
        );

    } else {

        state.liked.unshift(
            video
        );

        showToast(
            "Like bosildi 👍"
        );
    }

    saveState();

    updateWatchButtons(video);
}

function renderLiked() {
    const container =
        byId("likedGrid");

    if (!container) return;

    if (!state.liked.length) {
        showEmpty(
            container,
            "Yoqtirganlar bo‘sh",
            "Like bosgan videolaringiz shu yerda chiqadi."
        );

        return;
    }

    renderVideos(
        state.liked,
        container
    );
}

/* =========================================================
   WATCH PAGE
========================================================= */

async function openVideo(videoId) {
    if (!videoId) return;

    try {
        const videos =
            await getVideoDetails([
                videoId
            ]);

        const video =
            videos[0];

        if (!video) {
            showToast(
                "Video topilmadi."
            );
            return;
        }

        state.currentVideo =
            video;

        addToHistory(video);

        showPage("watchPage");

        fillWatchPage(video);

        const player =
            byId("youtubePlayer");

        if (player) {
            player.innerHTML = `
                <iframe
                    src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0"
                    title="${escapeHTML(
                        video.snippet?.title ||
                        "YouTube video"
                    )}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                ></iframe>
            `;
        }

        await loadRelatedVideos(
            video
        );

    } catch (error) {
        showAPIError(error);
    }
}

function fillWatchPage(video) {
    const snippet =
        video.snippet || {};

    const stats =
        video.statistics || {};

    const title =
        byId("watchTitle");

    const meta =
        byId("watchMeta");

    const channel =
        byId("watchChannelName");

    const avatar =
        byId("watchChannelAvatar");

    const subscribers =
        byId(
            "watchChannelSubscribers"
        );

    const description =
        byId("descriptionText");

    const descriptionViews =
        byId("descriptionViews");

    const descriptionDate =
        byId("descriptionDate");

    if (title) {
        title.textContent =
            snippet.title || "";
    }

    if (meta) {
        meta.textContent =
            `${formatViews(
                stats.viewCount || 0
            )} • ${formatDate(
                snippet.publishedAt
            )}`;
    }

    if (channel) {
        channel.textContent =
            snippet.channelTitle ||
            "";
    }

    if (avatar) {
        avatar.src =
            snippet.thumbnails?.default?.url ||
            "";
    }

    if (subscribers) {
        subscribers.textContent =
            "YouTube channel";
    }

    if (description) {
        description.textContent =
            snippet.description ||
            "";
    }

    if (descriptionViews) {
        descriptionViews.textContent =
            formatViews(
                stats.viewCount || 0
            );
    }

    if (descriptionDate) {
        descriptionDate.textContent =
            formatDate(
                snippet.publishedAt
            );
    }

    updateWatchButtons(
        video
    );

    updateSubscribeButton();
}

/* =========================================================
   RELATED
========================================================= */

async function loadRelatedVideos(
    video
) {
    const container =
        byId("relatedVideos");

    if (!container) return;

    const query =
        video?.snippet?.channelTitle ||
        video?.snippet?.title ||
        "";

    if (!query) return;

    try {
        const data =
            await searchYouTube(
                query,
                "",
                {
                    order: "relevance"
                }
            );

        const filtered =
            data.items.filter(
                (item) =>
                    getVideoId(item) !==
                    getVideoId(video)
            );

        container.innerHTML =
            filtered
                .slice(0, 12)
                .map(createVideoCard)
                .join("");

    } catch (error) {
        console.error(
            "Related videos:",
            error
        );
    }
}

/* =========================================================
   WATCH BUTTONS
========================================================= */

function updateWatchButtons(
    video
) {
    if (!video) return;

    const id =
        getVideoId(video);

    const likeButton =
        byId("likeVideoButton") ||
        byId("likeButton");

    const dislikeButton =
        byId("dislikeVideoButton") ||
        byId("dislikeButton");

    const saveButton =
        byId("saveVideoButton") ||
        byId("saveButton");

    const likeText =
        byId("likeText");

    const saveText =
        byId("saveText");

    if (likeButton) {
        likeButton.classList.toggle(
            "active",
            isLiked(id)
        );
    }

    if (likeText) {
        likeText.textContent =
            isLiked(id)
                ? "Liked"
                : "Like";
    }

    if (saveButton) {
        saveButton.classList.toggle(
            "active",
            isSaved(id)
        );
    }

    if (saveText) {
        saveText.textContent =
            isSaved(id)
                ? "Saved"
                : "Save";
    }

    if (dislikeButton) {
        dislikeButton.classList.remove(
            "active"
        );
    }
}

/* =========================================================
   SUBSCRIBE
========================================================= */

function isSubscribed(
    channelId
) {
    return state.subscriptions.includes(
        channelId
    );
}

function toggleSubscription() {
    const video =
        state.currentVideo;

    if (!video) return;

    const channelId =
        video.snippet?.channelId;

    if (!channelId) return;

    if (
        isSubscribed(channelId)
    ) {

        state.subscriptions =
            state.subscriptions.filter(
                (id) =>
                    id !== channelId
            );

        showToast(
            "Obuna bekor qilindi."
        );

    } else {

        state.subscriptions.push(
            channelId
        );

        showToast(
            "Obuna bo‘lindi 🔔"
        );
    }

    saveState();

    updateSubscribeButton();
}

function updateSubscribeButton() {
    const button =
        byId("subscribeButton");

    const channelId =
        state.currentVideo
            ?.snippet?.channelId;

    if (
        !button ||
        !channelId
    ) {
        return;
    }

    const subscribed =
        isSubscribed(
            channelId
        );

    button.classList.toggle(
        "active",
        subscribed
    );

    button.textContent =
        subscribed
            ? "Obuna bo‘lindi"
            : "Obuna bo‘lish";
}

/* =========================================================
   PLAYLIST
========================================================= */

function renderPlaylists() {
    const container =
        byId("playlistGrid") ||
        byId("playlistEmpty");

    if (!container) return;

    if (!state.playlists.length) {
        showEmpty(
            container,
            "Playlistlar bo‘sh",
            "Hali playlist yaratmagansiz."
        );

        return;
    }

    container.innerHTML =
        state.playlists
            .map(
                (playlist, index) => `
                    <div
                        class="playlist-card"
                        data-playlist-index="${index}"
                    >
                        <div class="playlist-cover">
                            📚
                        </div>

                        <h3>
                            ${escapeHTML(
                                playlist.name ||
                                "Playlist"
                            )}
                        </h3>

                        <p>
                            ${
                                playlist.videos?.length ||
                                0
                            } ta video
                        </p>
                    </div>
                `
            )
            .join("");
}

/* =========================================================
   TRENDING
========================================================= */

async function loadTrendingPage() {
    const container =
        byId("trendingGrid");

    if (!container) return;

    container.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <p>Trend videolar yuklanmoqda...</p>
        </div>
    `;

    try {
        const data =
            await youtubeRequest(
                "videos",
                {
                    part:
                        "snippet,contentDetails,statistics",
                    chart: "mostPopular",
                    regionCode:
                        CONFIG.REGION_CODE,
                    maxResults:
                        CONFIG.MAX_RESULTS
                }
            );

        renderVideos(
            data.items || [],
            container
        );

    } catch (error) {
        showAPIError(error);
    }
}

/* =========================================================
   CHANNELS
========================================================= */

function renderChannels() {
    const container =
        byId("channelsGrid");

    if (!container) return;

    if (!state.subscriptions.length) {
        showEmpty(
            container,
            "Kanallar",
            "Obuna bo‘lgan kanallaringiz shu yerda chiqadi."
        );

        return;
    }

    container.innerHTML =
        state.subscriptions
            .map(
                (id) => `
                    <div class="channel-card">
                        <div class="channel-avatar">
                            👤
                        </div>

                        <div>
                            <strong>
                                YouTube channel
                            </strong>

                            <p>
                                ${escapeHTML(id)}
                            </p>
                        </div>
                    </div>
                `
            )
            .join("");
}

/* =========================================================
   COMMENTS
========================================================= */

function renderComments(
    videoId
) {
    const container =
        byId("commentsList");

    if (!container) return;

    const comments =
        state.comments[videoId] ||
        [];

    if (!comments.length) {
        container.innerHTML = `
            <div class="no-comments">
                Hali comment yo‘q.
            </div>
        `;

        return;
    }

    container.innerHTML =
        comments
            .map(
                (comment) => `
                    <div class="comment-item">
                        <div class="comment-avatar">
                            👤
                        </div>

                        <div class="comment-body">
                            <strong>
                                ${escapeHTML(
                                    comment.name
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    comment.text
                                )}
                            </p>

                            <small>
                                ${escapeHTML(
                                    comment.date
                                )}
                            </small>
                        </div>
                    </div>
                `
            )
            .join("");
}

function submitComment(
    event
) {
    event.preventDefault();

    const input =
        byId("commentInput");

    if (
        !input ||
        !state.currentVideo
    ) {
        return;
    }

    const text =
        input.value.trim();

    if (!text) return;

    const videoId =
        getVideoId(
            state.currentVideo
        );

    if (!state.comments[videoId]) {
        state.comments[videoId] = [];
    }

    state.comments[videoId].unshift({
        name: "You",
        text,
        date: "just now"
    });

    input.value = "";

    saveState();

    renderComments(
        videoId
    );

    showToast(
        "Comment qo‘shildi."
    );
}

/* =========================================================
   SETTINGS
========================================================= */

function updateSettingsUI() {
    const toggle =
        byId("darkModeToggle");

    if (toggle) {
        toggle.checked =
            state.theme === "dark";
    }

    const language =
        byId("languageSelect");

    if (language) {
        language.value =
            localStorage.getItem(
                CONFIG.STORAGE_PREFIX +
                "language"
            ) || "uz";
    }
}

/* =========================================================
   THEME
========================================================= */

function applyTheme() {
    document.documentElement.dataset.theme =
        state.theme;

    document.body.classList.toggle(
        "light-theme",
        state.theme === "light"
    );

    const button =
        byId("themeButton");

    if (button) {
        button.textContent =
            state.theme === "dark"
                ? "☀️"
                : "🌙";
    }
}

function toggleTheme() {
    state.theme =
        state.theme === "dark"
            ? "light"
            : "dark";

    applyTheme();

    saveState();
}

/* =========================================================
   SEARCH SUGGESTIONS
========================================================= */

async function loadSuggestions(
    query
) {
    const container =
        byId("searchSuggestions");

    if (!container) return;

    query =
        String(query).trim();

    if (!query) {
        container.innerHTML = "";

        container.classList.remove(
            "active"
        );

        return;
    }

    const suggestions = [
        query,
        `${query} 2026`,
        `${query} tutorial`,
        `${query} music`,
        `${query} shorts`
    ];

    container.innerHTML =
        suggestions
            .map(
                (item) => `
                    <button
                        type="button"
                        class="suggestion-item"
                        data-query="${escapeHTML(item)}"
                    >
                        🔍
                        <span>
                            ${escapeHTML(item)}
                        </span>
                    </button>
                `
            )
            .join("");

    container.classList.add(
        "active"
    );
}

/* =========================================================
   VOICE SEARCH
========================================================= */

function startVoiceSearch() {
    const Recognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!Recognition) {
        showToast(
            "Voice search brauzeringizda mavjud emas."
        );

        return;
    }

    const recognition =
        new Recognition();

    recognition.lang =
        "uz-UZ";

    recognition.interimResults =
        false;

    recognition.onstart = () => {
        showToast(
            "Gapiring..."
        );
    };

    recognition.onresult =
        (event) => {
            const text =
                event.results[0][0]
                    .transcript;

            const input =
                byId("searchInput");

            if (input) {
                input.value =
                    text;
            }

            performSearch(text);
        };

    recognition.onerror =
        () => {
            showToast(
                "Voice searchda xatolik."
            );
        };

    recognition.start();
}

/* =========================================================
   HEADER
========================================================= */

function setupHeader() {
    const searchForm =
        byId("searchForm");

    const searchInput =
        byId("searchInput");

    const voiceButton =
        byId("voiceButton");

    const menuButton =
        byId("menuButton");

    const brandButton =
        byId("brandButton") ||
        byId("logoButton");

    const themeButton =
        byId("themeButton");

    if (searchForm) {
        searchForm.addEventListener(
            "submit",
            async (event) => {
                event.preventDefault();

                await performSearch(
                    searchInput?.value ||
                    ""
                );
            }
        );
    }

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            () => {
                clearTimeout(
                    state.searchTimer
                );

                state.searchTimer =
                    setTimeout(
                        () => {
                            loadSuggestions(
                                searchInput.value
                            );
                        },
                        250
                    );
            }
        );
    }

    if (voiceButton) {
        voiceButton.addEventListener(
            "click",
            startVoiceSearch
        );
    }

    if (menuButton) {
        menuButton.addEventListener(
            "click",
            toggleSidebar
        );
    }

    if (brandButton) {
        brandButton.addEventListener(
            "click",
            () => navigate("home")
        );
    }

    if (themeButton) {
        themeButton.addEventListener(
            "click",
            toggleTheme
        );
    }
}

/* =========================================================
   SIDEBAR
========================================================= */

function toggleSidebar() {
    const sidebar =
        byId("sidebar");

    const overlay =
        byId("mobileOverlay");

    if (!sidebar) return;

    sidebar.classList.toggle(
        "open"
    );

    if (overlay) {
        overlay.classList.toggle(
            "active"
        );
    }
}

function closeSidebar() {
    const sidebar =
        byId("sidebar");

    const overlay =
        byId("mobileOverlay");

    if (sidebar) {
        sidebar.classList.remove(
            "open"
        );
    }

    if (overlay) {
        overlay.classList.remove(
            "active"
        );
    }
}

/* =========================================================
   WATCH EVENTS
========================================================= */

function setupWatchButtons() {

    const likeButton =
        byId("likeVideoButton") ||
        byId("likeButton");

    const dislikeButton =
        byId("dislikeVideoButton") ||
        byId("dislikeButton");

    const shareButton =
        byId("shareVideoButton") ||
        byId("shareButton");

    const saveButton =
        byId("saveVideoButton") ||
        byId("saveButton");

    const subscribeButton =
        byId("subscribeButton");

    if (likeButton) {
        likeButton.addEventListener(
            "click",
            toggleLike
        );
    }

    if (dislikeButton) {
        dislikeButton.addEventListener(
            "click",
            () => {
                showToast(
                    "Dislike bosildi."
                );
            }
        );
    }

    if (shareButton) {
        shareButton.addEventListener(
            "click",
            shareCurrentVideo
        );
    }

    if (saveButton) {
        saveButton.addEventListener(
            "click",
            toggleWatchLater
        );
    }

    if (subscribeButton) {
        subscribeButton.addEventListener(
            "click",
            toggleSubscription
        );
    }

    const commentForm =
        byId("commentForm");

    if (commentForm) {
        commentForm.addEventListener(
            "submit",
            submitComment
        );
    }

    const backButton =
        byId("backButton");

    if (backButton) {
        backButton.addEventListener(
            "click",
            () => navigate("home")
        );
    }
}

/* =========================================================
   SHARE
========================================================= */

async function shareCurrentVideo() {
    const video =
        state.currentVideo;

    if (!video) return;

    const id =
        getVideoId(video);

    const url =
        `https://www.youtube.com/watch?v=${id}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title:
                    video.snippet?.title ||
                    "YouTube video",
                url
            });

            return;
        } catch (_) {}
    }

    try {
        await navigator.clipboard.writeText(
            url
        );

        showToast(
            "Video havolasi nusxalandi."
        );

    } catch (_) {
        showToast(url);
    }
}

/* =========================================================
   CLEAR SEARCH
========================================================= */

function clearSearch() {
    const input =
        byId("searchInput");

    if (input) {
        input.value = "";
        input.focus();
    }

    const suggestions =
        byId("searchSuggestions");

    if (suggestions) {
        suggestions.classList.remove(
            "active"
        );
    }

    state.query = "";
}

/* =========================================================
   LOAD MORE
========================================================= */

async function loadMoreVideos() {
    if (!state.nextPageToken) {
        showToast(
            "Boshqa video topilmadi."
        );

        return;
    }

    if (!state.query) return;

    const button =
        byId("loadMoreButton") ||
        document.querySelector(
            "[data-load-more]"
        );

    if (button) {
        button.disabled = true;
        button.textContent =
            "Yuklanmoqda...";
    }

    try {
        await performSearch(
            state.query,
            state.nextPageToken
        );
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                "Ko‘proq yuklash";
        }
    }
}

/* =========================================================
   TOP BUTTON
========================================================= */

function scrollTop() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

window.addEventListener(
    "scroll",
    () => {
        const button =
            byId("backTop");

        if (!button) return;

        button.classList.toggle(
            "show",
            window.scrollY > 500
        );
    }
);

/* =========================================================
   GLOBAL CLICK
========================================================= */

document.addEventListener(
    "click",
    async (event) => {

        const target =
            event.target;

        /* VIDEO CARD */

        const videoCard =
            target.closest(
                ".video-card"
            );

        if (
            videoCard &&
            !target.closest(
                ".thumbnail-menu"
            )
        ) {
            const id =
                videoCard.dataset.videoId;

            if (id) {
                await openVideo(id);
            }

            return;
        }

        /* SHORT */

        const shortCard =
            target.closest(
                ".short-card"
            );

        if (shortCard) {
            const id =
                shortCard.dataset.videoId;

            if (id) {
                await openVideo(id);
            }

            return;
        }

        /* SIDEBAR */

        const sidebarItem =
            target.closest(
                ".sidebar-item"
            );

        if (sidebarItem) {

            const page =
                sidebarItem.dataset.page;

            const category =
                sidebarItem.dataset.category;

            $$(".sidebar-item")
                .forEach(
                    (item) =>
                        item.classList.remove(
                            "active"
                        )
                );

            sidebarItem.classList.add(
                "active"
            );

            if (category) {
                await searchCategory(
                    category
                );

                return;
            }

            if (page) {
                await navigate(
                    page
                );

                return;
            }
        }

        /* CATEGORY CHIP */

        const categoryChip =
            target.closest(
                ".category-chip"
            );

        if (categoryChip) {
            const category =
                categoryChip.dataset.category ||
                categoryChip.textContent.trim();

            await searchCategory(
                category
            );

            return;
        }

        /* SUGGESTION */

        const suggestion =
            target.closest(
                ".suggestion-item"
            );

        if (suggestion) {

            const query =
                suggestion.dataset.query;

            const input =
                byId("searchInput");

            if (input) {
                input.value =
                    query;
            }

            await performSearch(
                query
            );

            return;
        }

        /* RETRY */

        const retry =
            target.closest(
                "#retryButton"
            );

        if (retry) {
            await navigate(
                state.page || "home"
            );

            return;
        }

        /* LOAD MORE */

        const loadMore =
            target.closest(
                "#loadMoreButton"
            ) ||
            target.closest(
                "[data-load-more]"
            );

        if (loadMore) {
            await loadMoreVideos();
            return;
        }

        /* CLEAR HISTORY */

        const clearHistoryButton =
            target.closest(
                "#clearHistoryButton"
            );

        if (clearHistoryButton) {
            clearHistory();
            return;
        }

        /* MOBILE OVERLAY */

        if (
            target.id ===
            "mobileOverlay"
        ) {
            closeSidebar();
        }
    }
);

/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    (event) => {

        const tag =
            document.activeElement
                ?.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }

        if (event.key === "/") {
            event.preventDefault();

            byId("searchInput")
                ?.focus();
        }

        if (event.key === "Escape") {
            closeSidebar();
        }
    }
);

/* =========================================================
   INIT
========================================================= */

async function init() {

    applyTheme();

    setupHeader();

    setupWatchButtons();

    /* Settings */

    const darkToggle =
        byId("darkModeToggle");

    if (darkToggle) {
        darkToggle.addEventListener(
            "change",
            () => {
                state.theme =
                    darkToggle.checked
                        ? "dark"
                        : "light";

                applyTheme();
                saveState();
            }
        );
    }

    /* API key */

    if (!hasAPIKey()) {
        showToast(
            "API keyni CONFIG.API_KEY ichiga qo‘ying."
        );

        return;
    }

    /* HOME — videolar shu yerda chiqadi */

    await navigate("home");
}

/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        init
    );
} else {
    init();
}

/* =========================================================
   GLOBAL
========================================================= */

window.RAUPOWYouTube = {
    state,
    navigate,
    searchYouTube,
    performSearch,
    openVideo,
    toggleLike,
    toggleWatchLater,
    toggleSubscription,
    toggleTheme
};
