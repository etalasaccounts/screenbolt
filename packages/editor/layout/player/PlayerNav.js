import React, { useContext, useRef, useEffect } from "react";
import styles from "../../styles/player/_Nav.module.scss";
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

// Icons
import { ReactSVG } from "react-svg";

const URL = "/assets/";

const PlayerNav = () => {
 const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
 const contentStateRef = useRef(null);

 useEffect(() => {
  contentStateRef.current = contentState;
 }, [contentState]);

 // Same guard RightPanel's save action used: native mp4 only needs mp4ready,
 // a transcode also needs ffmpeg available.
 const isNativeMp4 = contentState.blob?.type === "video/mp4";
 const saveDisabled = isNativeMp4
  ? contentState.isFfmpegRunning || !contentState.mp4ready
  : contentState.isFfmpegRunning ||
   contentState.noffmpeg ||
   !contentState.mp4ready;

 return (
  <div className={styles.nav}>
   <div className={styles.navWrap}>
    <div
     onClick={() => {
      chrome.runtime.sendMessage({ type: "open-home" });
     }}
     aria-label="home"
     className={styles.navLeft}
    >
     <img src={URL + "editor/logo.svg"} alt="Screenbolt" className={styles.logo} />
    </div>
    <div className={styles.navRight}>
     <button
      className="button simpleButton blackButton"
      onClick={() => {
       chrome.runtime.sendMessage({ type: "open-home" });
      }}
     >
      {chrome.i18n.getMessage("cancelLabel")}
     </button>
     <button
      className="button primaryButton"
      disabled={saveDisabled}
      onClick={() => {
       if (!contentState.mp4ready) return;
       contentState.download();
      }}
     >
      <ReactSVG src={URL + "editor/icons/upload.svg"} />
      {contentState.downloading
       ? chrome.i18n.getMessage("downloadingLabel")
       : "Save to Screenbolt"}
     </button>
    </div>
   </div>
  </div>
 );
};

export default PlayerNav;
