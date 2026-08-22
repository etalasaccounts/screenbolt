import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import Plyr from "../player/PlyrWrapper";
import "../../styles/plyr.css";
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

const VideoPlayer = (props) => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const playerRef = useRef(null);
  const [url, setUrl] = useState(null);
  const [source, setSource] = useState(null);
  const [isSet, setIsSet] = useState(false);
  // Probed from the blob's intrinsic dimensions; a fixed "16:9" would
  // pillarbox recordings of square-ish tabs.
  const [videoRatio, setVideoRatio] = useState("16:9");

  useEffect(() => {
    if (
      playerRef.current &&
      playerRef.current.plyr &&
      contentState.updatePlayerTime
    ) {
      playerRef.current.plyr.currentTime = contentState.time;
    }
  }, [contentState.time]);

  const options = useMemo(
    () => ({
      controls: ["play", "mute", "captions", "settings", "pip", "fullscreen"],
      ratio: videoRatio,
      // Root-relative -- resolves against chrome-extension://<id>/... in the
      // extension and the site origin on web without a host-specific adapter.
      blankVideo: "/assets/blank.mp4",
      keyboard: {
        global: true,
      },
    }),
    [videoRatio]
  );

  useEffect(() => {
    if (!contentState.blob) return;
    const probeUrl = URL.createObjectURL(contentState.blob);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.src = probeUrl;
    const onMeta = () => {
      const w = probe.videoWidth;
      const h = probe.videoHeight;
      if (w > 0 && h > 0) setVideoRatio(`${w}:${h}`);
      cleanup();
    };
    const onErr = () => cleanup();
    const cleanup = () => {
      probe.removeEventListener("loadedmetadata", onMeta);
      probe.removeEventListener("error", onErr);
      URL.revokeObjectURL(probeUrl);
    };
    probe.addEventListener("loadedmetadata", onMeta);
    probe.addEventListener("error", onErr);
    return cleanup;
  }, [contentState.blob]);

  useEffect(() => {
    if (contentState.blob) {
      const objectURL = URL.createObjectURL(contentState.blob);
      setSource({
        type: "video",
        sources: [
          {
            src: objectURL,
            // Hardcoding "video/mp4" here mislabels a raw webm blob (the
            // apps/web recording flow's fast path -- see
            // ContentState.reconstructVideo's isFastWebm branch) as mp4,
            // which makes the browser refuse to play it (declared type on a
            // blob: URL <source> has to match the actual bytes) -- shows up
            // as a black frame with 0:00 duration and dead controls. Use
            // the blob's real type; it's only ever "video/mp4" or
            // "video/webm" by the time it reaches here (see
            // reconstructVideo's two fast-path branches), so this is a
            // strict improvement, not a behavior change for the real mp4
            // case this line originally covered.
            type: contentState.blob.type || "video/mp4",
          },
        ],
      });
      setUrl(objectURL);

      // if (playerRef.current && playerRef.current.plyr) {
      //   // Check when the video is playing, update the time in real time
      //   playerRef.current.plyr.on("timeupdate", () => {
      //     setContentState((prevContentState) => ({
      //       ...prevContentState,
      //       time: playerRef.current.plyr.currentTime,
      //       updatePlayerTime: false,
      //     }));
      //   });
      // }

      return () => {
        URL.revokeObjectURL(objectURL);

        // if (playerRef.current && playerRef.current.plyr) {
        //   playerRef.current.plyr.off("timeupdate");
        // }
      };
    }
  }, [contentState.blob, playerRef]);

  // Registration-time `playerRef.current.plyr` truthiness doesn't guarantee
  // it's still there when "timeupdate" actually fires -- the player can
  // unmount (blob/source change, view switch) while the event is in
  // flight, leaving playerRef.current null. Re-check inside the callback
  // itself rather than only at registration.
  const handleTimeUpdate = () => {
    if (!playerRef.current || !playerRef.current.plyr) return;
    setContentState((prevContentState) => ({
      ...prevContentState,
      time: playerRef.current.plyr.currentTime,
      updatePlayerTime: false,
    }));
  };

  useEffect(() => {
    if (playerRef.current && playerRef.current.plyr) {
      // Check when the video is playing, update the time in real time
      playerRef.current.plyr.on("timeupdate", handleTimeUpdate);
    }

    return () => {
      if (playerRef.current && playerRef.current.plyr) {
        playerRef.current.plyr.off("timeupdate", handleTimeUpdate);
      }
    };
  }, [playerRef]);

  const handleClick = () => {
    if (isSet) return;
    if (playerRef.current && playerRef.current.plyr) {
      setIsSet(true);
      playerRef.current.plyr.on("timeupdate", handleTimeUpdate);
    }
  };

  useEffect(() => {
    if (isSet) return;
    const handleKeyPress = (event) => {
      if (playerRef.current && playerRef.current.plyr) {
        setIsSet(true);
        playerRef.current.plyr.on("timeupdate", handleTimeUpdate);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isSet]);

  return (
    <div className="videoPlayer">
      <div className="playerWrap" onClick={handleClick}>
        {url && (
          <Plyr
            ref={playerRef}
            id="plyr-player"
            source={source}
            options={options}
          />
        )}
      </div>
      <style>
        {`
					.plyr {
						height: 90%!important;
					}
					@media (max-width: 900px) {
						.videoPlayer {
							height: 100%!important;
							top: 40px!important;
						}
						.playerWrap {
							height: calc(100% - 300px)!important;
						}
					`}
      </style>
    </div>
  );
};

export default VideoPlayer;
