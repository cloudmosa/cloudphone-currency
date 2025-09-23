import { showAbout } from "../pages/about";
import "./softkeys.css";
import { _ } from "../helpers/utils";
import { showSearch } from "../pages/searchCurrency";
import { ABOUT, BACK, SEARCH } from "../helpers/events";
import { dispatchInputEvent } from "../input";

const footer = _("cp-softkeys") as HTMLElement;
const infoButton = footer.firstElementChild as HTMLDivElement;
const centerButton = infoButton.nextElementSibling as HTMLDivElement;

const ENTER_EVENT = { key: "Enter", code: "Enter", keyCode: 13, which: 13 };

function attachSoftKeyClickEvents() {
  infoButton.addEventListener("click", onSoftLeftClick);
  centerButton.addEventListener("click", onCenterClick);

  // Replicate the Back functionality with a click (this breaks focus)
  const backButton = footer.lastElementChild as HTMLDivElement;
  backButton.onclick = () => {
    window.dispatchEvent(new CustomEvent(BACK, { cancelable: true }));
  };
}

attachSoftKeyClickEvents();

export function showInfoButton() {
  infoButton.ariaDisabled = "false";
}

export function hideInfoButton() {
  infoButton.ariaDisabled = "true";
}

export function showCenterButton() {
  centerButton.ariaDisabled = "false";
}

export function hideCenterButton() {
  centerButton.ariaDisabled = "true";
}

export function setInfoButtonState(state: string) {
  infoButton.dataset.state = state;
}

export function getInfoButtonState() {
  return infoButton.dataset.state || "";
}

function onSoftLeftClick() {
  if (infoButton.dataset.state === "list") {
    showSearch();
    window.dispatchEvent(new CustomEvent(SEARCH));
    return;
  }

  if (infoButton.ariaDisabled !== "true") {
    showAbout();
    window.dispatchEvent(new CustomEvent(ABOUT));
    return;
  }
}

function onCenterClick() {
  console.log("onCenterClick");
  dispatchInputEvent(new KeyboardEvent("keydown", ENTER_EVENT));
  dispatchInputEvent(new KeyboardEvent("keyup", ENTER_EVENT));
}

function handleKeydown(ev: KeyboardEvent) {
  if (ev.key === "Escape") {
    onSoftLeftClick();
  }
}

export function setupAboutPage() {
  window.addEventListener("keydown", handleKeydown);
}
