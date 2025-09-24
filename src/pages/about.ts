// import styles for dialog
import "./currencyList.css";
import "./about.css";
import { _ } from "../helpers/utils";
import { focusHome, updateHomeHeader } from "../input";
import { setHeaderText } from "../components/header";
import {
  hideCenterButton,
  hideInfoButton,
  showInfoButton,
} from "../components/softkeys";
import { BACK } from "../helpers/events";
import { version } from "../../package.json";
import { ExchangeRateDate, formatDate } from "../api/exchangeRates";
import { showToast } from "../components/toast";

const dialog = _("about") as HTMLDialogElement;
const asOfDate = _("as-of-date") as HTMLElement;

const TARGET_KEY = "Escape";
const REPEAT_COUNT = 7;

function getCloudPhoneVersion() {
  try {
    if (navigator.userAgent.includes("Cloud Phone")) {
      return parseFloat(
        navigator.userAgent.split("Cloud Phone ")[1].split(" ")[0],
      );
    }
  } catch (e) {
    console.warn(e);
  }

  return NaN;
}

function getKaiOSVersion() {
  try {
    if (navigator.userAgent.includes("KAIOS")) {
      return parseFloat(navigator.userAgent.split("KAIOS/")[1]);
    }
  } catch (e) {
    console.warn(e);
  }

  return NaN;
}

function getPlatform() {
  if (navigator.userAgent.includes("Cloud Phone")) {
    return "CP v" + getCloudPhoneVersion();
  }

  if (navigator.userAgent.includes("KAIOS")) {
    return "KAI v" + getKaiOSVersion();
  }

  return "Unknown";
}

export function setupAboutContent(rateDate: ExchangeRateDate) {
  // Update and format "as of" date
  asOfDate.innerText = formatDate(rateDate);

  // Add details to UI
  const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const paragraph = document.createElement("small");
  paragraph.innerHTML = `v${version} (${process.env.BUILD_HASH?.substring(0, 8)})<br />${getPlatform()}<br />${timeZone}`;
  dialog.firstElementChild?.appendChild(paragraph);
}

function onSoftLeftRepeat() {
  // Erase data to reset app
  localStorage.clear();

  showToast("Data Cleared!");
}

let consecutivePresses = 0;
let lastKeyPressed: string | null = null;

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === TARGET_KEY) {
    if (lastKeyPressed === TARGET_KEY) {
      consecutivePresses++;
    } else {
      consecutivePresses = 1;
    }
    lastKeyPressed = TARGET_KEY;

    if (consecutivePresses === REPEAT_COUNT) {
      onSoftLeftRepeat();
      consecutivePresses = 0;
    }
  } else {
    consecutivePresses = 0;
    lastKeyPressed = event.key;
  }
}

function handleBackEvent(ev: Event) {
  ev.preventDefault();
  requestAnimationFrame(hideAbout);
}

export function isAboutOpen() {
  return dialog.open === true;
}

export function showAbout() {
  dialog.open = true;
  dialog.scrollTop = 0;
  dialog.focus();
  setHeaderText("About");
  hideInfoButton();
  hideCenterButton();
  window.addEventListener(BACK, handleBackEvent);
  window.addEventListener("keyup", handleKeyDown);
}

export function hideAbout() {
  dialog.open = false;
  updateHomeHeader();
  showInfoButton();
  focusHome();
  window.removeEventListener(BACK, handleBackEvent);
  window.removeEventListener("keyup", handleKeyDown);
}
