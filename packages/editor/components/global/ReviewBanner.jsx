import React, { useContext, useEffect, useState } from "react";
import { ContentStateContext } from "../../context/ContentState";

const ReviewBanner = () => {
  const [contentState, setContentState] = useContext(ContentStateContext);

  const previewParam = new URLSearchParams(window.location.search).get(
    "reviewPreview",
  );
  const isPreview = previewParam !== null;

  const [step, setStep] = useState(
    previewParam === "review" || previewParam === "feedback"
      ? previewParam
      : "ask",
  );

  const send = (msg) => {
    if (!isPreview) chrome.runtime.sendMessage(msg);
  };

  useEffect(() => {
    if (!window.__screenboltReviewShownSent) {
      window.__screenboltReviewShownSent = true;
      send({ type: "review-prompt-action", action: "shown" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setContentState((prev) => ({ ...prev, reviewPrompt: false }));
  };

  const t = (key, fallback) => chrome.i18n.getMessage(key) || fallback;

  if (step === "ask") {
    return (
      <div className="review-toast">
        <span className="review-toast-text">
          {t("reviewAskTitle", "How's Screenbolt working for you?")}
        </span>
        <span className="review-toast-divider" />
        <div className="review-toast-thumbs">
          <button
            className="review-toast-thumb"
            title={t("reviewAskGood", "Going well")}
            aria-label={t("reviewAskGood", "Going well")}
            onClick={() => setStep("review")}
          >
            👍
          </button>
          <button
            className="review-toast-thumb"
            title={t("reviewAskBad", "Not great")}
            aria-label={t("reviewAskBad", "Not great")}
            onClick={() => setStep("feedback")}
          >
            👎
          </button>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="review-toast review-toast--card">
        <div className="review-toast-body">
          <div className="review-toast-title">
            {t("reviewThanksTitle", "You just made my day!")}
          </div>
          <div className="review-toast-message">
            {t(
              "reviewThanksDescription",
              "We're a small team building Screenbolt, and we're actively maintaining the free extension.\n\nIf Screenbolt has helped you, leaving a quick review is one of the best ways to support it ❤️",
            )
              .split("\n\n")
              .map((paragraph, i) => (
                <p key={i} className="review-toast-paragraph">
                  {paragraph}
                </p>
              ))}
          </div>
        </div>
        <div className="review-toast-actions">
          <button
            className="review-toast-btn review-toast-btn--ghost"
            onClick={() => {
              send({ type: "review-prompt-action", action: "later" });
              close();
            }}
          >
            {t("reviewThanksLater", "Maybe later")}
          </button>
          <button
            className="review-toast-btn review-toast-btn--primary"
            onClick={() => {
              send({ type: "review-prompt-action", action: "reviewed" });
              send({ type: "review-webstore" });
              close();
            }}
          >
            {t("reviewThanksButton", "Leave a review")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-toast review-toast--card">
      <div className="review-toast-body">
        <div className="review-toast-title">
          {t("reviewSorryTitle", "Sorry to hear that")}
        </div>
        <div className="review-toast-message">
          {t(
            "reviewSorryDescription",
            "We're a small team building Screenbolt, and we read every message ourselves. Tell us what went wrong and we'll do our best to fix it.",
          )}
        </div>
      </div>
      <div className="review-toast-actions">
        <button
          className="review-toast-btn review-toast-btn--ghost"
          onClick={() => {
            send({ type: "review-prompt-action", action: "dismiss" });
            close();
          }}
        >
          {t("reviewSorryDismiss", "No thanks")}
        </button>
        <button
          className="review-toast-btn review-toast-btn--primary"
          onClick={() => {
            send({ type: "review-prompt-action", action: "feedback" });
            send({ type: "review-feedback" });
            close();
          }}
        >
          {t("reviewSorryButton", "Send feedback")}
        </button>
      </div>
    </div>
  );
};

export default ReviewBanner;
