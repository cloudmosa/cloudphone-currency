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

const dialog = _("about") as HTMLDialogElement;
const asOfDate = _("as-of-date") as HTMLElement;

function getCloudPhoneVersion() {
  try {
    if (navigator.userAgent.includes("Cloud Phone")) {
      return parseFloat(navigator.userAgent.split("Cloud Phone ")[1].split(" ")[0])
    }
  } catch (e) {
    console.warn(e);
  }

  return NaN;
}

function getKaiOSVersion() {
  try {
    if (navigator.userAgent.includes("KAIOS")) {
      return parseFloat(navigator.userAgent.split("KAIOS/")[1])
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

function handleBackEvent(ev: Event) {
  ev.preventDefault();
  hideAbout();
}

export function showAbout() {
  dialog.open = true;
  dialog.scrollTop = 0;
  dialog.focus();
  setHeaderText("About");
  hideInfoButton();
  hideCenterButton();
  window.addEventListener(BACK, handleBackEvent);
}

export function hideAbout() {
  dialog.open = false;
  updateHomeHeader();
  showInfoButton();
  focusHome();
  window.removeEventListener(BACK, handleBackEvent);
}
