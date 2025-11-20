// msstart-ads.js
// Minimal helpers with Unity callbacks + globals for .jslib
(function () {
    let interstitial = null;
    let rewarded = null;
    let unityReceiver = "MSStartAdapter"; // GameObject to receive SendMessage calls

    function sdk() {
        if (typeof $msstart === "undefined") throw new Error("MSStart SDK not available");
        return $msstart;
    }

    function send(method) {
        if (typeof gameInstance !== "undefined" && gameInstance.SendMessage) {
            gameInstance.SendMessage(unityReceiver, method);
        }
    }

    async function loadInterstitial() {
        try { interstitial = await sdk().loadAdsAsync(); console.log("[MSStart] Interstitial loaded"); }
        catch (e) { console.warn("[MSStart] Interstitial load failed", e); }
    }

    async function loadRewarded() {
        try { rewarded = await sdk().loadAdsAsync(true); console.log("[MSStart] Rewarded loaded"); }
        catch (e) { console.warn("[MSStart] Rewarded load failed", e); }
    }

    async function showInterstitial() {
        if (!interstitial) { console.warn("[MSStart] Interstitial not loaded"); return; }

        send("MuteAudio");
        
        try {
            const ad = await sdk().showAdsAsync(interstitial.instanceId);
            await ad.showAdsCompletedAsync;
            console.log("[MSStart] Interstitial completed");
        } catch (e) {
            console.warn("[MSStart] Interstitial show error", e);
            // No Unity callback needed here typically, but you can add one if desired
        }
        finally {
            // Always unmute and queue next load
            send("UnmuteAudio");
            loadInterstitial();
        }
    }

    async function showRewarded() {
        if (!rewarded) { console.warn("[MSStart] Rewarded not loaded"); send("OnRewardedAdFailed"); return; }

        // Mute before ad starts
        send("MuteAudio");

        try {
            const ad = await sdk().showAdsAsync(rewarded.instanceId);
            await ad.showAdsCompletedAsync;
            console.log("[MSStart] Rewarded completed");
            // Notify Unity reward has been earned
            send("OnRewardedAdComplete");
        } catch (e) {
            // Treat any rejection as skipped/failed; try to distinguish if SDK exposes codes
            console.warn("[MSStart] Rewarded skipped/failed", e);
            // Separate hooks so you can handle differently, plus a combined one
            send("OnRewardedAdSkipped");
            send("OnRewardedAdFailed");
            send("OnRewardedAdSkippedOrFailed");
        } finally {
            // Always unmute and queue next load
            send("UnmuteAudio");
            loadRewarded();
        }
    }

    function preloadAll() {
        if (typeof $msstart !== "undefined") {
            loadInterstitial(); loadRewarded();
        } else {
            // Retry once the page fully loads if SDK wasn’t ready
            window.addEventListener("load", () => {
                if (typeof $msstart !== "undefined") { loadInterstitial(); loadRewarded(); }
            }, { once: true });
        }
    }

    function isRewardedLoaded() {
        return !!rewarded;
    }

    // Public API
    window.MSStartAds = {
        preload: preloadAll,
        showInterstitial,
        showRewarded,
        isRewardedLoaded,
        setUnityReceiver: function (name) { unityReceiver = name || unityReceiver; }
    };

    // Globals for .jslib (so C# can call without SendMessage)
    window._MSStart_ShowInterstitial = showInterstitial;
    window._MSStart_ShowRewarded = showRewarded;
    window._MSStart_IsRewardedLoaded = () => isRewardedLoaded() ? 1 : 0;
    window._MSStart_PreloadAll = preloadAll;
})();
