import React from "react";
import { Icon, addIcon } from "@iconify/react";

// Self-contained Solar icon data (subset). The content script is injected into
// arbitrary third-party pages, so icons must not be fetched from the Iconify
// API at runtime (blocked by page CSP / no network guarantee). We register the
// ~50 glyphs actually used below with addIcon() at import time and render via
// <Icon icon="solar:..." /> — pixel-identical to the design mockup
// (apps/extension/docs/control-ui-design.html).
//
// Component names + props are unchanged from the previous react-svg-based
// implementation so call sites elsewhere need no edits.

const SOLAR_ICONS = {
  // cursor & effects
  "cursor-linear":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5744 19.1999L12.6361 15.2616L11.4334 16.4643C10.2022 17.6955 9.58656 18.3111 8.92489 18.1658C8.26322 18.0204 7.96225 17.2035 7.3603 15.5696L5.3527 10.1205C4.15187 6.86106 3.55146 5.23136 4.39141 4.39141C5.23136 3.55146 6.86106 4.15187 10.1205 5.35271L15.5696 7.3603C17.2035 7.96225 18.0204 8.26322 18.1658 8.92489C18.3111 9.58656 17.6955 10.2022 16.4643 11.4334L15.2616 12.6361L19.1999 16.5744C19.6077 16.9821 19.8116 17.186 19.9058 17.4135C20.0314 17.7168 20.0314 18.0575 19.9058 18.3608C19.8116 18.5882 19.6077 18.7921 19.1999 19.1999C18.7921 19.6077 18.5882 19.8116 18.3608 19.9058C18.0575 20.0314 17.7168 20.0314 17.4135 19.9058C17.186 19.8116 16.9821 19.6077 16.5744 19.1999Z"/>',
  "target-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"/><path stroke-linecap="round" d="M2 12L5 12M19 12L22 12M12 22L12 19M12 5L12 2"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 12H12H14M12 14L12 12L12 10"/></g>',
  "radial-blur-linear":
    '<path fill="none" stroke="currentColor" stroke-width="1.5" d="M8.5 8.5L4.25 4.25M8.5 15.5L4.25 19.75M15.5 8.5L19.75 4.25M15.5 15.5L19.75 19.75M12 2V5.5M12 18.5V22M2 12H5.5M18.5 12H22"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.5"/>',

  // recording controls
  "pause-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2C7.88562 2 8.82843 2 9.41421 2.58579C10 3.17157 10 4.11438 10 6V18C10 19.8856 10 20.8284 9.41421 21.4142C8.82843 22 7.88562 22 6 22C4.11438 22 3.17157 22 2.58579 21.4142C2 20.8284 2 19.8856 2 18V6Z"/><path d="M14 6C14 4.11438 14 3.17157 14.5858 2.58579C15.1716 2 16.1144 2 18 2C19.8856 2 20.8284 2 21.4142 2.58579C22 3.17157 22 4.11438 22 6V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22C16.1144 22 15.1716 22 14.5858 21.4142C14 20.8284 14 19.8856 14 18V6Z"/></g>',
  "play-linear":
    '<path fill="none" stroke="currentColor" stroke-width="1.5" d="M20.4086 9.35258C22.5305 10.5065 22.5305 13.4935 20.4086 14.6474L7.59662 21.6145C5.53435 22.736 3 21.2763 3 18.9671L3 5.0329C3 2.72368 5.53435 1.26402 7.59661 2.38548L20.4086 9.35258Z"/>',
  "stop-circle-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12C8 10.1144 8 9.17157 8.58579 8.58579C9.17157 8 10.1144 8 12 8C13.8856 8 14.8284 8 15.4142 8.58579C16 9.17157 16 10.1144 16 12C16 13.8856 16 14.8284 15.4142 15.4142C14.8284 16 13.8856 16 12 16C10.1144 16 9.17157 16 8.58579 15.4142C8 14.8284 8 13.8856 8 12Z"/></g>',
  "restart-linear":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 8.05026L17.6569 7.34315C14.5327 4.21896 9.46734 4.21896 6.34315 7.34315C3.21895 10.4673 3.21895 15.5327 6.34315 18.6569C9.46734 21.7811 14.5327 21.7811 17.6569 18.6569C19.4737 16.84 20.234 14.3668 19.9377 12.0005M18.364 3.80762V8.05026H14.1213"/>',

  // media toggles
  "microphone-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V11C17 13.7614 14.7614 16 12 16C9.23858 16 7 13.7614 7 11V8Z"/><path stroke-linecap="round" d="M13 8L17 8M13 11L17 11M20 10V11C20 15.4183 16.4183 19 12 19C7.58172 19 4 15.4183 4 11V10M12 19V22"/></g>',
  "videocamera-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 11.5C2 8.21252 2 6.56878 2.90796 5.46243C3.07418 5.25989 3.25989 5.07418 3.46243 4.90796C4.56878 4 6.21252 4 9.5 4C12.7875 4 14.4312 4 15.5376 4.90796C15.7401 5.07418 15.9258 5.25989 16.092 5.46243C17 6.56878 17 8.21252 17 11.5V12.5C17 15.7875 17 17.4312 16.092 18.5376C15.9258 18.7401 15.7401 18.9258 15.5376 19.092C14.4312 20 12.7875 20 9.5 20C6.21252 20 4.56878 20 3.46243 19.092C3.25989 18.9258 3.07418 18.7401 2.90796 18.5376C2 17.4312 2 15.7875 2 12.5V11.5Z"/><path stroke-linecap="round" d="M17 9.5L22 7V17L17 14.5"/></g>',
  "monitor-linear":
    '<path fill="none" stroke="currentColor" stroke-width="1.5" d="M2 8C2 6.11438 2 5.17157 2.58579 4.58579C3.17157 4 4.11438 4 6 4H18C19.8856 4 20.8284 4 21.4142 4.58579C22 5.17157 22 6.11438 22 8V13C22 14.8856 22 15.8284 21.4142 16.4142C20.8284 17 19.8856 17 18 17H13"/><path stroke-linecap="round" stroke-width="1.5" d="M8 21H16M12 17V21"/>',

  // drawing tools
  "pen-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" d="M4 22H20"/><path d="M13.8881 3.66293L14.6296 2.92142C15.8581 1.69286 17.85 1.69286 19.0786 2.92142C20.3071 4.14999 20.3071 6.14188 19.0786 7.37044L18.3371 8.11195M13.8881 3.66293C13.8881 3.66293 13.9807 5.23862 15.3711 6.62894C16.7614 8.01926 18.3371 8.11195 18.3371 8.11195M13.8881 3.66293L7.07106 10.4799C6.60933 10.9416 6.37846 11.1725 6.17992 11.4271C5.94571 11.7273 5.74491 12.0522 5.58107 12.396C5.44219 12.6874 5.33894 12.9972 5.13245 13.6167L4.25745 16.2417M4.25745 16.2417L4.04356 16.8833C3.94194 17.1882 4.02128 17.5243 4.2485 17.7515C4.47573 17.9787 4.81182 18.0581 5.11667 17.9564L5.75834 17.7426L8.38334 16.8675C9.00282 16.6611 9.31256 16.5578 9.60398 16.4189C9.94775 16.2551 10.2727 16.0543 10.5729 15.8201C10.8275 15.6215 11.0584 15.3907 11.5201 14.9289L18.3371 8.11195M5.75834 17.7426L4.25745 16.2417"/></g>',
  "eraser-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.7713 17.314L6.68596 10.2287M11.4096 5.50506C13.0796 3.83502 13.9146 3 14.9522 3C15.9899 3 16.8249 3.83502 18.4949 5.50506C20.165 7.1751 21 8.01012 21 9.04776C21 10.0854 20.165 10.9204 18.4949 12.5904L12.5904 18.4949C10.9204 20.165 10.0854 21 9.04776 21C8.01012 21 7.1751 20.165 5.50506 18.4949C3.83502 16.8249 3 15.9899 3 14.9522C3 13.9146 3.83502 13.0796 5.50506 11.4096L11.4096 5.50506Z"/><path stroke-linecap="round" d="M9 21H21"/></g>',
  "text-format-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M12 3H8C6.11438 3 5.17157 3 4.58579 3.58579C4 4.17157 4 5.11438 4 7V7.95M12 3H16C17.8856 3 18.8284 3 19.4142 3.58579C20 4.17157 20 5.11438 20 7V7.95M12 3V21"/><path d="M7 21H17"/></g>',
  "gallery-add-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2"/><path d="M2 12.5001L3.75159 10.9675C4.66286 10.1702 6.03628 10.2159 6.89249 11.0721L11.1822 15.3618C11.8694 16.0491 12.9512 16.1428 13.7464 15.5839L14.0446 15.3744C14.7368 14.8907 15.6944 14.9158 16.3548 15.4333L18.5 17.1M12 2V7M12 7H17"/><circle cx="16" cy="8" r="2"/></g>',
  "undo-left-linear":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7H15C16.8692 7 17.8039 7 18.5 7.40193C18.9561 7.66523 19.3348 8.04394 19.5981 8.49999C20 9.19615 20 10.1308 20 12C20 13.8692 20 14.8038 19.5981 15.5C19.3348 15.9561 18.9561 16.3348 18.5 16.5981C17.8039 17 16.8692 17 15 17H8.00001M7 10L4 7L7 4"/>',
  "undo-right-linear":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7H9.00001C7.13077 7 6.19615 7 5.5 7.40193C5.04395 7.66523 4.66524 8.04394 4.40193 8.49999C4 9.19615 4 10.1308 4 12C4 13.8692 4 14.8038 4.40192 15.5C4.66523 15.9561 5.04394 16.3348 5.5 16.5981C6.19615 17 7.13077 17 9 17H16M17 10L20 7L17 4"/>',
  "trash-bin-trash-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" d="M20.5001 6H3.5"/><path stroke-linecap="round" d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5"/><path stroke-linecap="round" d="M9.5 11L10 16M14.5 11L14 16"/><path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6"/></g>',
  "scaling-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M11 2C6.94493 2.0073 4.8215 2.10686 3.46447 3.46389C2 4.92835 2 7.28538 2 11.9994C2 16.7135 2 19.0705 3.46447 20.535C4.92893 21.9994 7.28596 21.9994 12 21.9994C16.714 21.9994 19.0711 21.9994 20.5355 20.535C21.8926 19.1779 21.9921 17.0545 21.9994 12.9994"/><path stroke-linejoin="round" d="M13 11L22 2M22 7.34375V2H16.6562"/></g>',
  "magic-wand-linear":
    '<g fill="none" stroke="currentColor"><path stroke-width="1.5" d="M3.84453 7.92226C2.71849 6.79623 2.71849 4.97056 3.84453 3.84453C4.97056 2.71849 6.79623 2.71849 7.92226 3.84453L20.1555 16.0777C21.2815 17.2038 21.2815 19.0294 20.1555 20.1555C19.0294 21.2815 17.2038 21.2815 16.0777 20.1555L3.84453 7.92226Z"/><path stroke-linecap="round" stroke-width="1.5" d="M6 10L10 6"/><path d="M16.1 2.30719C16.261 1.8976 16.8385 1.8976 16.9994 2.30719L17.4298 3.40247C17.479 3.52752 17.5776 3.62651 17.7022 3.67583L18.7934 4.1078C19.2015 4.26934 19.2015 4.849 18.7934 5.01054L17.7022 5.44252C17.5776 5.49184 17.479 5.59082 17.4298 5.71587L16.9995 6.81115C16.8385 7.22074 16.261 7.22074 16.1 6.81116L15.6697 5.71587C15.6205 5.59082 15.5219 5.49184 15.3973 5.44252L14.3061 5.01054C13.898 4.849 13.898 4.26934 14.3061 4.1078L15.3973 3.67583C15.5219 3.62651 15.6205 3.52752 15.6697 3.40247L16.1 2.30719Z"/></g>',
  "pipette-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4L20 10M14 4L11 7M14 4C14 4 12.5 4.5 11.5 5.5M20 10L17 7M20 10C20 10 19.5 11.5 18.5 12.5M17 7L11.5 5.5M11.5 5.5L14.5 8.5L11.5 5.5Z"/><path d="M4 20L8.5 15.5M5.5 12L12 18.5L14 16.5L9 11.5M9 11.5L7.5 13M9 11.5L3 17.5L4 20L6.5 19L9 11.5Z"/></g>',

  // settings & chrome
  "settings-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7.84308 3.80211C9.8718 2.6007 10.8862 2 12 2C13.1138 2 14.1282 2.6007 16.1569 3.80211L16.8431 4.20846C18.8718 5.40987 19.8862 6.01057 20.4431 7C21 7.98943 21 9.19084 21 11.5937V12.4063C21 14.8092 21 16.0106 20.4431 17C19.8862 17.9894 18.8718 18.5901 16.8431 19.7915L16.1569 20.1979C14.1282 21.3993 13.1138 22 12 22C10.8862 22 9.8718 21.3993 7.84308 20.1979L7.15692 19.7915C5.1282 18.5901 4.11384 17.9894 3.55692 17C3 16.0106 3 14.8092 3 12.4063V11.5937C3 9.19084 3 7.98943 3.55692 7C4.11384 6.01057 5.1282 5.40987 7.15692 4.20846L7.84308 3.80211Z"/><circle cx="12" cy="12" r="3"/></g>',
  "menu-dots-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></g>',
  "link-circle-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M10.0464 14C8.54044 12.4882 8.67609 9.90087 10.3494 8.22108L15.197 3.35462C16.8703 1.67483 19.4476 1.53865 20.9536 3.05046C22.4596 4.56228 22.3239 7.14956 20.6506 8.82935L18.2268 11.2626"/><path d="M13.9536 10C15.4596 11.5118 15.3239 14.0991 13.6506 15.7789L11.2268 18.2121L8.80299 20.6454C7.12969 22.3252 4.55237 22.4613 3.0464 20.9495C1.54043 19.4377 1.67609 16.8504 3.34939 15.1706L5.77323 12.7373"/></g>',
  "check-circle-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8.5 12.5L10.5 14.5L15.5 9.5"/></g>',
  "download-minimalistic-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M12 3V14M12 14L15 11M12 14L9 11"/><path d="M5 18H19"/></g>',
  "scissors-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M2 3.5L22 21.5M2 21.5L22 3.5M9 6.5C9 8.15685 10.3431 9.5 12 9.5M9 6.5C9 4.84315 10.3431 3.5 12 3.5M9 6.5C9 4.84315 7.65685 3.5 6 3.5C4.34315 3.5 3 4.84315 3 6.5C3 8.15685 4.34315 9.5 6 9.5M15 17.5C15 15.8431 13.6569 14.5 12 14.5M15 17.5C15 19.1569 13.6569 20.5 12 20.5M15 17.5C15 19.1569 16.3431 20.5 18 20.5C19.6569 20.5 21 19.1569 21 17.5C21 15.8431 19.6569 14.5 18 14.5"/></g>',
  "share-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M3 11V16.5C3 19.538 5.462 22 8.5 22H15.5C18.538 22 21 19.538 21 16.5V11"/><path d="M8 7L12 3L16 7M12 3V15"/></g>',
  "copy-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z"/><path d="M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5"/></g>',
  "arrow-up-linear":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 20L12 4M6 10L12 4L18 10"/>',
  "arrow-right-up-linear":
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M18 6H9M18 6V15"/>',
  "pip-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M11 21H10C6.22876 21 4.34315 21 3.17157 19.8284C2 18.6569 2 16.7712 2 13V11C2 7.22876 2 5.34315 3.17157 4.17157C4.34315 3 6.22876 3 10 3H14C17.7712 3 19.6569 3 20.8284 4.17157C22 5.34315 22 7.22876 22 11"/><path d="M13 17C13 15.1144 13 14.1716 13.5858 13.5858C14.1716 13 15.1144 13 17 13H18C19.8856 13 20.8284 13 21.4142 13.5858C22 14.1716 22 15.1144 22 17V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22H17C15.1144 22 14.1716 22 13.5858 21.4142C13 20.8284 13 19.8856 13 18V17Z"/></g>',
  "info-circle-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 17V11M12 8H12.01"/></g>',
  "question-circle-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 9.5C9 8.11929 10.1193 7 11.5 7H12.5C13.8807 7 15 8.11929 15 9.5C15 10.5 14.5 11.1 13.5 11.8C12.7 12.4 12 13 12 14.5M12 17.5H12.01"/></g>',

  // misc: camera bubble, alert, more
  "flip-horizontal-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 18.1136V5.88641C2 4.18426 2 3.33319 2.54242 3.05405C3.08484 2.77491 3.77738 3.26959 5.16247 4.25894L6.74371 5.3884C7.35957 5.8283 7.6675 6.04825 7.83375 6.3713C8 6.69435 8 7.07277 8 7.8296V16.1705C8 16.9273 8 17.3057 7.83375 17.6288C7.6675 17.9518 7.35957 18.1718 6.74372 18.6117L5.16248 19.7411C3.77738 20.7305 3.08484 21.2251 2.54242 20.946C2 20.6669 2 19.8158 2 18.1136Z"/><path d="M22 18.1136V5.88641C22 4.18426 22 3.33319 21.4576 3.05405C20.9152 2.77491 20.2226 3.26959 18.8375 4.25894L17.2563 5.3884C16.6404 5.8283 16.3325 6.04825 16.1662 6.3713C16 6.69435 16 7.07277 16 7.8296V16.1705C16 16.9273 16 17.3057 16.1662 17.6288C16.3325 17.9518 16.6404 18.1718 17.2563 18.6117L18.8375 19.7411C20.2226 20.7305 20.9152 21.2251 21.4576 20.946C22 20.6669 22 19.8158 22 18.1136Z"/><path stroke-linecap="round" d="M12 14V10M12 6V2M12 22V18"/></g>',
  "danger-circle-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 8V12M12 16H12.01"/></g>',
  "crop-linear":
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M22 19H13C9.22876 19 7.34315 19 6.17157 17.8284C5 16.6569 5 14.7712 5 11V2"/><path d="M8 5H11C14.7712 5 16.6569 5 17.8284 6.17157C19 7.34315 19 9.22876 19 13V16M2 5H5M19 19V22"/></g>',
  "camera-minimalistic-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12C2 8.25027 2 6.3754 2.95491 5.06107C3.26331 4.6366 3.6366 4.26331 4.06107 3.95491C5.3754 3 7.25027 3 11 3H13C16.7497 3 18.6246 3 19.9389 3.95491C20.3634 4.26331 20.7367 4.6366 21.0451 5.06107C22 6.3754 22 8.25027 22 12C22 15.7497 22 17.6246 21.0451 18.9389C20.7367 19.3634 20.3634 19.7367 19.9389 20.0451C18.6246 21 16.7497 21 13 21H11C7.25027 21 5.3754 21 4.06107 20.0451C3.6366 19.7367 3.26331 19.3634 2.95491 18.9389C2 17.6246 2 15.7497 2 12Z"/><circle cx="12" cy="12" r="4"/></g>',
  "close-circle-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5"/></g>',
  "volume-linear":
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 10V14H7L11 17V7L7 10H4Z"/><path stroke-linecap="round" d="M14 9C15.5 10.5 15.5 13.5 14 15M16.5 7C19.5 9.5 19.5 14.5 16.5 17"/></g>',
};

// Register the subset once at import time. addIcon is synchronous and stores
// the body in the in-memory registry; <Icon> then renders without any network.
for (const [name, body] of Object.entries(SOLAR_ICONS)) {
  addIcon(`solar:${name}`, { body, width: 24, height: 24 });
}

// Shape glyphs rendered as plain inline SVG (Solar has no bare
// rectangle/circle/triangle outline glyphs). Kept identical to the original
// extension's geometry, but re-tinted to currentColor so the existing
// `svg { color }` rules keep working.
const ShapeRect = ({ filled, ...props }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} {...props}>
    <rect width="12" height="12" x="2" y="2" stroke="currentColor" strokeWidth="2" rx="1" />
  </svg>
);
const ShapeCircle = ({ filled, ...props }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} {...props}>
    <rect width="12" height="12" x="2" y="2" stroke="currentColor" strokeWidth="2" rx="6" />
  </svg>
);
const ShapeTriangle = ({ filled, ...props }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} {...props}>
    <path
      stroke="currentColor"
      strokeWidth="2"
      d="M9.299 3.25a1.5 1.5 0 0 0-2.598 0l-4.33 7.5A1.5 1.5 0 0 0 3.67 13h8.66a1.5 1.5 0 0 0 1.3-2.25l-4.331-7.5Z"
    />
  </svg>
);
// Stroke-weight dots (plain circles, 1/2/3 thickness). The original extension used
// filled circles of radius 2/4/6.
const StrokeDot = ({ r, ...props }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" {...props}>
    <circle cx="9" cy="9" r={r} />
  </svg>
);
// Grab handle (6-dot drag grip). Solar's grip-lines isn't linear; keep the
// original 6-dot glyph as inline SVG for a stable drag affordance.
const GrabDots = (props) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
    <rect width="3" height="3" x="4" y="3.48" rx="1.5" />
    <rect width="3" height="3" x="10" y="3.48" rx="1.5" />
    <rect width="3" height="3" x="4" y="9.48" rx="1.5" />
    <rect width="3" height="3" x="10" y="9.48" rx="1.5" />
  </svg>
);

// Stable named exports (same names/props as before). Every component forwards
// width/height/className/style to the underlying <Icon>/<svg>.
const mk = (icon, Cmp = Icon) => {
  const Component = (props) => {
    if (Cmp === Icon) {
      return <Icon icon={`solar:${icon}`} width={props.width} height={props.height} style={props.style} />;
    }
    return <Cmp {...props} />;
  };
  return Component;
};

export const GrabIcon = (props) => <GrabDots {...props} />;
export const StopIcon = mk("stop-circle-linear");
export const DrawIcon = mk("pen-linear");
export const PauseIcon = mk("pause-linear");
export const ResumeIcon = mk("play-linear");
export const CursorIcon = mk("cursor-linear");
export const CommentIcon = mk("question-circle-linear");
export const MicIcon = mk("microphone-linear");
export const MoreIcon = mk("menu-dots-linear");
export const RestartIcon = mk("restart-linear");
export const DiscardIcon = mk("trash-bin-trash-linear");
export const EyeDropperIcon = mk("pipette-linear");
export const Stroke1Icon = (props) => <StrokeDot r={2} {...props} />;
export const Stroke2Icon = (props) => <StrokeDot r={4} {...props} />;
export const Stroke3Icon = (props) => <StrokeDot r={6} {...props} />;
export const TargetCursorIcon = mk("target-linear");
export const HighlightCursorIcon = mk("target-linear");
export const HideCursorIcon = mk("crop-linear");
export const TextIcon = mk("text-format-linear");
export const ArrowIcon = mk("arrow-up-linear");
export const EraserIcon = mk("eraser-linear");
export const PenIcon = mk("pen-linear");
export const ShapeIcon = mk("scaling-linear");
export const SelectIcon = mk("crop-linear");
export const UndoIcon = mk("undo-left-linear");
export const RedoIcon = mk("undo-right-linear");
export const ImageIcon = mk("gallery-add-linear");
export const TransformIcon = mk("scaling-linear");
export const HighlighterIcon = mk("radial-blur-linear");
export const RectangleIcon = (props) => <ShapeRect {...props} />;
export const CircleIcon = (props) => <ShapeCircle {...props} />;
export const TriangleIcon = (props) => <ShapeTriangle {...props} />;
export const RectangleFilledIcon = (props) => <ShapeRect filled {...props} />;
export const CircleFilledIcon = (props) => <ShapeCircle filled {...props} />;
export const TriangleFilledIcon = (props) => <ShapeTriangle filled {...props} />;
export const TrashIcon = mk("trash-bin-trash-linear");
export const VideoOffIcon = mk("videocamera-linear");
export const CameraCloseIcon = mk("close-circle-linear");
export const CameraMoreIcon = mk("menu-dots-linear");
export const CameraResizeIcon = mk("scaling-linear");
export const CameraIcon = mk("videocamera-linear");
export const BlurIcon = mk("radial-blur-linear");
export const AlertIcon = mk("danger-circle-linear");
export const TimeIcon = mk("check-circle-linear");
export const SpotlightCursorIcon = mk("target-linear");
export const Pip = mk("pip-linear");
export const CloseIconPopup = mk("close-circle-linear");
export const GrabIconPopup = (props) => <GrabDots {...props} />;
export const OnboardingArrow = mk("arrow-up-linear");
export const NoInternet = mk("danger-circle-linear");
export const CloseButtonToolbar = mk("close-circle-linear");
export const HelpIconPopup = mk("question-circle-linear");
export const MoreIconPopup = mk("menu-dots-linear");
export const AudioIcon = mk("volume-linear");
export const NotSupportedIcon = mk("danger-circle-linear");
