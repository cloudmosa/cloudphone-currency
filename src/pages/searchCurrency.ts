import { hideInfoButton, setInfoButtonState } from "../components/softkeys";
import { CURRENCIES } from "../data/currencies";
import { Currency, CurrencyCode } from "../data/currency";
import { _ } from "../helpers/utils";
import {
  createListItem,
  onCurrencyClick,
  queryCurrencyCode,
  scrollIntoViewIfNeeded,
  selectCurrency as setSelectedCurrency,
} from "./currencyList";
import "./searchCurrency.css";

const dialog = _("search") as HTMLDialogElement;
const input = _("search-input") as HTMLInputElement;
const list = _("search-list") as HTMLOListElement;

let currentSearchText = "";
let selectedCurrencies: CurrencyCode[] = [];

function searchCurrencies(searchText: string) {
  return (a: Currency) => {
    // Prefix match
    const currencyCodeA = a.currencyCode.toLocaleLowerCase();
    if (currencyCodeA.startsWith(searchText)) return true;

    // Simple substring search
    return `${a.englishCurrencyName} ${a.localCurrencyName}`
      .toLocaleLowerCase()
      .includes(searchText);
  };
}

function sortCurrencies(searchText: string) {
  return (a: Currency, b: Currency) => {
    const currencyCodeA = a.currencyCode.toLocaleLowerCase();
    const currencyCodeB = b.currencyCode.toLocaleLowerCase();

    // Exact currency code match
    if (currencyCodeA === searchText) return -1;
    if (currencyCodeB === searchText) return 1;

    // Prefix currency code match
    if (currencyCodeA.startsWith(searchText)) return -1;
    if (currencyCodeB.startsWith(searchText)) return 1;

    return 0;
  };
}

function populateList() {
  const searchText = input.value.toLocaleLowerCase();

  // avoid having to re-render for the same query
  if (currentSearchText === searchText) return;

  list.innerHTML = "";
  if (!searchText) return;

  const searchResultsElement = CURRENCIES.filter(searchCurrencies(searchText))
    .sort(sortCurrencies(searchText))
    .map(createListItem)
    .reduce(
      (frag, item) => (frag.appendChild(item), frag),
      document.createDocumentFragment(),
    );

  selectedCurrencies.forEach((c) =>
    setSelectedCurrency(c, false, searchResultsElement),
  );

  list.append(searchResultsElement);
  currentSearchText = searchText;
}

export function selectCurrencies(currencies: CurrencyCode[]) {
  selectedCurrencies = currencies;
}

function handleInputKeydown(e: KeyboardEvent) {
  // simulate CloudPhone in dev environment
  if (import.meta.env.DEV) {
    if (e.key === "Enter") {
      const text = prompt("Enter Text", input.value) || "";
      input.value = text;
      input.dispatchEvent(new Event("input"));
      input.dispatchEvent(new Event("change"));
    }
  }

  if (e.key === "ArrowDown" && list.childElementCount) {
    // prevent scrolling
    e.preventDefault();
    (list.firstElementChild as HTMLLIElement).focus();
  }
}

function handleListKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLLIElement;
  if (e.key === "ArrowDown") {
    // prevent scrolling
    e.preventDefault();
    const next = target.nextElementSibling as HTMLLIElement;
    if (next) {
      scrollIntoViewIfNeeded(next);
      next.focus();
    }
  }

  if (e.key === "ArrowUp") {
    // prevent scrolling
    e.preventDefault();
    const next = target.previousElementSibling as HTMLLIElement;
    if (next) {
      scrollIntoViewIfNeeded(next);
      next.focus();
    } else {
      input.focus();
    }
  }
}

function handleListKeyUp(ev: KeyboardEvent) {
  const target = ev.target as HTMLLIElement;

  if (ev.key === "Enter") {
    const button = target.firstElementChild as HTMLDivElement;

    if (button.ariaDisabled !== "true") {
      requestAnimationFrame(() => {
        onCurrencyClick(queryCurrencyCode(button));
        hideSearch();
      });
    }
  }
}

function handleInputChange() {
  populateList();
}

export function showSearch() {
  input.addEventListener("keydown", handleInputKeydown);
  input.addEventListener("change", handleInputChange);
  input.addEventListener("input", handleInputChange);

  list.innerHTML = "";
  input.value = "";
  currentSearchText = "";

  list.addEventListener("keydown", handleListKeydown, true);
  list.addEventListener("keyup", handleListKeyUp, true);

  dialog.open = true;
  setInfoButtonState("search");
  hideInfoButton();

  // Automatically focus search input
  input.autofocus = true;
  requestAnimationFrame(() => input.focus());
}

export function hideSearch() {
  dialog.open = false;

  input.removeEventListener("keydown", handleInputKeydown);
  input.removeEventListener("change", handleInputChange);
  input.removeEventListener("input", handleInputChange);
  input.autofocus = false;

  list.removeEventListener("keydown", handleListKeydown, true);
  list.removeEventListener("keyup", handleListKeyUp, true);

  list.innerHTML = "";
  currentSearchText = "";
}
