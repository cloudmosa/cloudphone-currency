import { CURRENCIES, getCountryCode } from "../data/currencies";
import { Currency, CurrencyCode } from "../data/currency";
import {
  BACK,
  CURRENCY_SELECTED,
  CurrencySelectedEvent,
} from "../helpers/events";
import { _ } from "../helpers/utils";
import "./currencyList.css";
import { focusHome, updateHomeHeader } from "../input";
import { setHeaderText } from "../components/header";
import {
  getInfoButtonState,
  hideCenterButton,
  setInfoButtonState,
  showInfoButton,
} from "../components/softkeys";
import { hideSearch } from "./searchCurrency";

const dialog = _("choose-currency") as HTMLDialogElement;
const list = _("currency-list") as HTMLOListElement;
const template = _("currency-list-item") as HTMLTemplateElement;

export function scrollIntoViewIfNeeded(el: HTMLElement) {
  // scrollIntoViewIfNeeded is supported on chrome
  if (
    "scrollIntoViewIfNeeded" in el &&
    typeof el.scrollIntoViewIfNeeded === "function"
  ) {
    el.scrollIntoViewIfNeeded(false);
  } else {
    // fallback (firefox)
    el.scrollIntoView();
  }
}

const $ = <T extends Element>(selector: string, root: ParentNode) =>
  root.querySelector(selector) as T;

export function queryCurrencyCode(el: HTMLElement): CurrencyCode | undefined {
  while (el && !el.dataset.code && el.parentElement) el = el.parentElement;
  return el.dataset.code as CurrencyCode | undefined;
}

export function onCurrencyClick(currencyCode?: CurrencyCode) {
  if (currencyCode) {
    window.dispatchEvent(
      new CustomEvent<CurrencySelectedEvent>(CURRENCY_SELECTED, {
        detail: { currency: currencyCode },
      }),
    );
  }

  hideCurrencyList();
}

export function createListItem(currency: Currency) {
  const countryCode = getCountryCode(currency);
  const clone = template.content.cloneNode(true) as DocumentFragment;

  const li = $("li", clone) as HTMLLIElement;
  li.tabIndex = 0;

  const item = $(".currency-item", clone) as HTMLDivElement;
  item.dataset.code = currency.currencyCode;
  item.lang = currency.languageCode;

  $(".fflag", clone)?.classList.add(`fflag-${countryCode}`);
  $(".currency-symbol", clone).textContent = currency.currencySymbol.substring(
    0,
    1,
  );
  $(".currency-name span", clone).textContent = currency.localCurrencyName;
  $(".currency-code", clone).textContent = currency.currencyCode;

  return clone;
}

export function populateList() {
  const fragment = CURRENCIES.map(createListItem).reduce(
    (frag, item) => (frag.appendChild(item), frag),
    document.createDocumentFragment(),
  );

  list.append(fragment);
}

function unselectCurrency() {
  list
    .querySelectorAll<HTMLDivElement>("[aria-disabled=true]")
    .forEach((el) => {
      el.ariaDisabled = "false";
    });
}

export function selectCurrency(
  code: CurrencyCode,
  focus: boolean = true,
  currencyList: HTMLElement | DocumentFragment = list,
) {
  const el = currencyList.querySelector(
    `[data-code="${code}"]`,
  ) as HTMLDivElement | null;
  if (el) {
    el.ariaDisabled = "true";
    // wait until dialog is open
    if (focus) {
      queueMicrotask(() => {
        scrollIntoViewIfNeeded(el);
        el.parentElement!.focus();
      });
    }
  }
}

function handleBackEvent(ev: Event) {
  ev.preventDefault();
  if (getInfoButtonState() === "search") {
    requestAnimationFrame(hideSearch);
  }
  requestAnimationFrame(hideCurrencyList);
}

function handleKeydown(ev: KeyboardEvent) {
  const target = ev.target as HTMLLIElement;
  if (ev.key === "ArrowUp") {
    // prevent scroll
    ev.preventDefault();
    const el = (target.previousElementSibling ||
      target.parentElement!.lastElementChild) as HTMLLIElement;
    scrollIntoViewIfNeeded(el);
    el.focus();
  }

  if (ev.key === "ArrowDown") {
    ev.preventDefault();
    const el = (target.nextElementSibling ||
      target.parentElement!.firstElementChild) as HTMLLIElement;
    scrollIntoViewIfNeeded(el);
    el.focus();
  }
}

function handleKeyUp(ev: KeyboardEvent) {
  const target = ev.target as HTMLLIElement;

  if (ev.key === "Enter") {
    const button = target.firstElementChild as HTMLDivElement;

    // Disabled = already selected
    if (button.ariaDisabled !== "true") {
      requestAnimationFrame(() => {
        onCurrencyClick(queryCurrencyCode(button));
      });
    }
  }
}

export function marqueeOnFocus(ev: FocusEvent) {
  const target = ev.target as HTMLLIElement;

  if (target.tagName !== "LI") return;

  const el = $<HTMLDivElement>(".currency-name", target);
  const overflowing =
    el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;

  if (overflowing) target.classList.add("marquee");
}

export function removeMarqueeOnBlur(ev: FocusEvent) {
  const target = ev.target as HTMLLIElement;

  target.classList.remove("marquee");
}

export function isCurrencyListOpen() {
  return dialog.open === true;
}

export const showCurrencyList = () => {
  dialog.open = true;
  dialog.addEventListener("keydown", handleKeydown, true);
  dialog.addEventListener("keyup", handleKeyUp, true);
  dialog.addEventListener("focus", marqueeOnFocus, true);
  dialog.addEventListener("blur", removeMarqueeOnBlur, true);
  setHeaderText("Currency");
  showInfoButton();
  setInfoButtonState("list");
  hideCenterButton();
  window.addEventListener(BACK, handleBackEvent);
};

export const hideCurrencyList = () => {
  dialog.open = false;
  unselectCurrency();
  dialog.removeEventListener("keydown", handleKeydown, true);
  dialog.removeEventListener("keyup", handleKeyUp, true);
  dialog.removeEventListener("focus", marqueeOnFocus, true);
  dialog.removeEventListener("blur", removeMarqueeOnBlur, true);
  updateHomeHeader();
  showInfoButton();
  setInfoButtonState("");
  focusHome();
  window.removeEventListener(BACK, handleBackEvent);
};
