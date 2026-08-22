import React, { useState, useContext, useEffect, useRef } from "react";

import Wrapper from "./Wrapper";

import ContentState from "./context/ContentState";

const Content = () => {
  return (
    <div className="screenbolt-shadow-dom">
      <ContentState>
        <Wrapper />
      </ContentState>
      <style type="text/css">{`
			#screenbolt-ui, #screenbolt-ui div {
				background-color: unset;
				padding: unset;
				width: unset;
				box-shadow: unset;
				display: unset;
				margin: unset;
				border-radius: unset;
			}
			.screenbolt-outline {
				position: absolute;
				z-index: 99999999999;
				border: 2px solid #3080F8;
				outline-offset: -2px;
				pointer-events: none;
				border-radius: 5px!important;
			}
		.screenbolt-blur {
			filter: blur(10px)!important;
		}
			.screenbolt-shadow-dom * {
				transition: unset;
			}
			.screenbolt-shadow-dom .TooltipContent {
  border-radius: 30px!important;
	background-color: #29292F!important;
  padding: 10px 15px!important;
  font-size: 12px;
	margin-bottom: 10px!important;
	bottom: 100px;
  line-height: 1;
	font-family: 'Satoshi-Medium', sans-serif;
	z-index: 99999999!important;
  color: #FFF;
  box-shadow: hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px!important;
  user-select: none;
	transition: opacity 0.3 ease-in-out;
  will-change: transform, opacity;
	animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.screenbolt-shadow-dom .hide-tooltip {
	display: none!important;
}

.screenbolt-shadow-dom .tooltip-tall {
	margin-bottom: 20px;
}

.screenbolt-shadow-dom .tooltip-small {
	margin-bottom: 5px;
}

.screenbolt-shadow-dom .TooltipContent[data-state='delayed-open'][data-side='top'] {
	animation-name: screenbolt-slideDownAndFade;
}
.screenbolt-shadow-dom .TooltipContent[data-state='delayed-open'][data-side='right'] {
  animation-name: screenbolt-slideLeftAndFade;
}
.screenbolt-shadow-dom.TooltipContent[data-state='delayed-open'][data-side='bottom'] {
  animation-name: screenbolt-slideUpAndFade;
}
.screenbolt-shadow-dom.TooltipContent[data-state='delayed-open'][data-side='left'] {
  animation-name: screenbolt-slideRightAndFade;
}

@keyframes screenbolt-slideUpAndFade {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes screenbolt-slideRightAndFade {
  from { opacity: 0; transform: translateX(-2px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes screenbolt-slideDownAndFade {
  from { opacity: 0; transform: translateY(-2px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes screenbolt-slideLeftAndFade {
  from { opacity: 0; transform: translateX(2px); }
  to   { opacity: 1; transform: translateX(0); }
}

#screenbolt-ui [data-radix-popper-content-wrapper] { z-index: 999999999999!important; }

.screenbolt-shadow-dom .CanvasContainer {
	position: fixed;
	pointer-events: all!important;
	top: 0px!important;
	left: 0px!important;
	z-index: 99999999999!important;
}
.screenbolt-shadow-dom .canvas {
	position: fixed;
	top: 0px!important;
	left: 0px!important;
	z-index: 99999999999!important;
	background: transparent!important;
}
.screenbolt-shadow-dom .canvas-container {
	top: 0px!important;
	left: 0px!important;
	z-index: 99999999999;
	position: fixed!important;
	background: transparent!important;
}

.ScreenboltDropdownMenuContent {
	z-index: 99999999999!important;
  min-width: 200px;
  background-color: white;
  margin-top: 4px;
  margin-right: 8px;
  padding-top: 12px;
  padding-bottom: 12px;
  border-radius: 15px;
  font-family: 'Satoshi-Medium', sans-serif;
  color: #29292F;
  box-shadow: 0px 10px 38px -10px rgba(22, 23, 24, 0.35),
    0px 10px 20px -15px rgba(22, 23, 24, 0.2);
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}
.ScreenboltDropdownMenuContent[data-side="top"] {
  animation-name: screenbolt-slideDownAndFade;
}
.ScreenboltDropdownMenuContent[data-side="right"] {
  animation-name: screenbolt-slideLeftAndFade;
}
.ScreenboltDropdownMenuContent[data-side="bottom"] {
  animation-name: screenbolt-slideUpAndFade;
}
.ScreenboltDropdownMenuContent[data-side="left"] {
  animation-name: screenbolt-slideRightAndFade;
}
.ScreenboltItemIndicator {
  position: absolute;
  right: 12px;
  width: 18px;
  height: 18px;
  background: #3080F8;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ScreenboltDropdownMenuItem,
.ScreenboltDropdownMenuRadioItem {
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 5px;
  position: relative;
  padding-left: 22px;
  padding-right: 22px;
  user-select: none;
  outline: none;
}
.ScreenboltDropdownMenuItem:hover {
    background-color: #F6F7FB !important;
    cursor: pointer;
}
.ScreenboltDropdownMenuItem[data-disabled] {
  color: #6E7684 !important;
  cursor: not-allowed;
  background-color: #F6F7FB !important;
}

`}</style>
    </div>
  );
};

export default Content;
