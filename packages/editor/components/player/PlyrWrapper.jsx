import React, { useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import "../../styles/plyr.css";

// Replaces the real `plyr` library entirely with a plain native <video>,
// after extensive, source-level debugging of two different approaches to
// wiring Plyr up here (both documented in git history on this file) still
// left the video unplayable in this specific ported-into-Next.js context.
// Direct inspection of the constructed Plyr instance (via a temporary
// `window.__debugPlyr` handle) showed `this.type`/`this.provider` never
// getting set and `this.elements.container` staying null -- meaning
// Plyr's own constructor was silently returning partway through its
// internal `video`/`audio` type-detection switch statement, despite the
// target genuinely being a <video> element with a valid src. No thrown
// exception, no debug output (Plyr's debug logging is off by default),
// and every fix attempt that addressed a *different*, real, confirmed bug
// along the way (the "already setup" reconstruction trap; the async
// `.source =` setter race) still landed here. Given a plain native
// <video controls> already plays these exact same recordings correctly
// elsewhere in this app (the /watch/[id] page), and the actual `.plyr` API
// surface this codebase depends on turned out to be tiny (grep confirms
// only `.currentTime` get/set and `.on`/`.off("timeupdate", cb)`, both in
// VideoPlayer.jsx), the pragmatic fix is this thin facade: real playback
// via the browser's native controls, with just enough of a `.plyr`-shaped
// object to keep the two call sites that read `ref.current.plyr` working
// unchanged. Loses Plyr's custom-skinned control chrome; that's a real,
// visible trade-off, not a hidden one -- native controls are still fully
// functional (play/pause/seek/volume/fullscreen), just browser-styled
// instead of Screenbolt-styled.
const PlyrWrapper = forwardRef(function PlyrWrapper({ id, source, options }, ref) {
  const videoRef = useRef(null);
  const facadeRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return undefined;
    // Strict Mode double-invokes this mount effect in dev; clear any
    // previously appended <source> so it doesn't end up duplicated.
    videoRef.current.querySelectorAll("source").forEach((el) => el.remove());
    const src = source?.sources?.[0]?.src;
    const type = source?.sources?.[0]?.type;
    if (src) {
      videoRef.current.src = src;
      if (type) {
        const sourceEl = document.createElement("source");
        sourceEl.src = src;
        sourceEl.type = type;
        videoRef.current.appendChild(sourceEl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (source?.sources?.[0]?.src && videoRef.current && videoRef.current.src !== source.sources[0].src) {
      videoRef.current.src = source.sources[0].src;
      videoRef.current.load();
    }
  }, [source]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    facadeRef.current = {
      get currentTime() {
        return el.currentTime;
      },
      set currentTime(t) {
        el.currentTime = t;
      },
      on(event, cb) {
        el.addEventListener(event, cb);
      },
      off(event, cb) {
        el.removeEventListener(event, cb);
      },
      get duration() {
        return el.duration;
      },
      get paused() {
        return el.paused;
      },
      play: () => el.play(),
      pause: () => el.pause(),
    };
    return () => {
      facadeRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({ get plyr() { return facadeRef.current; } }), []);

  return (
    <video
      ref={videoRef}
      id={id}
      className="plyr-react plyr screenbolt-native-video"
      playsInline
      controls
      style={{ width: "100%", height: "100%", background: "#000" }}
    />
  );
});

export default PlyrWrapper;
