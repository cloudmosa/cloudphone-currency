import {
  CURRENCIES,
  findCurrency,
  getCountryCode,
  guessCurrency,
} from "./data/currencies";
import { exchange, USDExchangeRateResponse } from "./api/exchangeRates";
import { CurrencyCode } from "./data/currency";
import { _ } from "./helpers/utils";
import {
  BACK,
  CURRENCIES_REVERSED,
  CurrenciesReversedEvent,
  CURRENCY_CHANGED,
  CURRENCY_SELECTED,
  CurrencyChangedEvent,
  CurrencySelectedEvent,
} from "./helpers/events";
import { selectCurrency, showCurrencyList } from "./pages/currencyList";
import { CurrencyInput } from "./components/currencyInput";
import { setHeaderText } from "./components/header";
import {
  hideCenterButton,
  setupAboutPage,
  showCenterButton,
} from "./components/softkeys";
import { getCountryForTimezone } from "./data/timezone";

type InputIndex = 1 | 2;

let focusIndex: InputIndex = 1;
let activeIndex: InputIndex = 1;
let currency1: CurrencyCode =
  (localStorage.getItem("currency1") as CurrencyCode) ?? "inr";
let currency2: CurrencyCode =
  ((localStorage.getItem("currency2") as CurrencyCode) ?? currency1 === "usd")
    ? "inr"
    : "usd";
let quantity1 = 0;
let quantity2 = 0;
let exchangeRates: USDExchangeRateResponse | null = null;

// Create and append custom elements (after registration)
const currencyContainer1 = _("currency-container1");
const currencyContainer2 = _("currency-container2");
const currencyInput1 = new CurrencyInput();
const currencyInput2 = new CurrencyInput();

[currencyInput1, currencyInput2].forEach((el, i) => {
  el.setAttribute("id", `currency${i + 1}`);
  el.setAttribute("name", `currency${i + 1}`);
  el.currency = i === 0 ? currency1 : currency2;
});

if (!localStorage.getItem("countryGuessed")) {
  localStorage.setItem("countryGuessed", "1");

  // Predict a country based on the user's time zone
  const guessedCountry = getCountryForTimezone(
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
  )?.id;

  console.log("Guessed Country", guessedCountry);

  if (guessedCountry) {
    console.log("CURRENCIES", CURRENCIES);
    const guessedCurrency = guessCurrency(guessedCountry);

    console.log("Guessed Currency", guessedCurrency);
    if (guessedCurrency) {
      currency1 = guessedCurrency.currencyCode;
      storeCurrency();
    }
  }
}

function storeCurrency() {
  localStorage.setItem("currency1", currency1);
  localStorage.setItem("currency2", currency2);
}

currencyContainer1?.appendChild(currencyInput1);
currencyContainer2?.appendChild(currencyInput2);

const currencyLabel1 = _("currency1-label") as HTMLLabelElement;
const currencyLabel2 = _("currency2-label") as HTMLLabelElement;
const reverseButton = _("reverse") as HTMLDivElement;

const stateMap = {
  1: () => ({
    input: currencyInput1,
    label: currencyLabel1,
    currency: currency1,
    quantity: quantity1,
  }),
  2: () => ({
    input: currencyInput2,
    label: currencyLabel2,
    currency: currency2,
    quantity: quantity2,
  }),
};

const setCurrencyState = (
  index: InputIndex,
  updates: Partial<{ currency: CurrencyCode; quantity: number }>,
) => {
  if (index === 1) {
    if (updates.currency) {
      currency1 = updates.currency;
      stateMap[index]().input.currency = currency1;
    }
    if (updates.quantity != null) quantity1 = updates.quantity;
  } else {
    if (updates.currency) {
      currency2 = updates.currency;
      stateMap[index]().input.currency = currency2;
    }
    if (updates.quantity != null) quantity2 = updates.quantity;
  }

  storeCurrency();
};

function updateUI() {
  if (!exchangeRates) return;
  const [sourceIdx, targetIdx] = [focusIndex, focusIndex === 1 ? 2 : 1];
  const source = stateMap[sourceIdx]();
  const target = stateMap[targetIdx as InputIndex]();
  const result = exchange(
    source.quantity,
    source.currency,
    target.currency,
    exchangeRates,
  );

  target.input.value = result;
  setCurrencyState(targetIdx as InputIndex, { quantity: result });
}

function handleInputChange(event: KeyboardEvent) {
  const input = event.currentTarget as CurrencyInput;

  switch (event.key) {
    case "ArrowDown":
      if (input === currencyInput1 && event.type === "keydown") {
        reverseButton.focus();
        hideCenterButton();
        event.preventDefault();
      }
      return;
    case "ArrowUp":
      if (input === currencyInput2 && event.type === "keydown") {
        reverseButton.focus();
        hideCenterButton();
        event.preventDefault();
      }
      return;
    case "Enter":
      if (event.type === "keyup") {
        activeIndex = focusIndex;
        openCurrencyDialog();
      }
      return;
    case "Backspace":
      // Exit app after Backspace when value is zero
      if (event.type === "keydown") {
        if (input.value === 0) {
          requestAnimationFrame(() => window.close());
        }
      }
      break;
  }

  const index = input === currencyInput1 ? 1 : 2;
  focusIndex = index;

  setCurrencyState(index, { quantity: input.value });
  updateUI();
}

function onBack(event: Event) {
  // Ignore CustomEvents
  if (!event.isTrusted || event instanceof CustomEvent) return;

  // Don't exit the app unless the value is zero
  const input = focusIndex === 1 ? currencyInput1 : currencyInput2;
  if (input.value !== 0) {
    event.preventDefault();
  }
}

const handleFocus = (e: FocusEvent) =>
  (focusIndex = e.currentTarget === currencyInput1 ? 1 : 2);

const handleBlur = (e: FocusEvent) => {
  const index = e.currentTarget === currencyInput1 ? 1 : 2;
  const { quantity, input } = stateMap[index]();
  input.value = quantity;
};

function updateLabel(label: HTMLLabelElement, code: CurrencyCode) {
  const currency = findCurrency(code);
  if (!currency) return;
  const country = getCountryCode(currency);
  label.innerHTML = `${code.toUpperCase()} <div><i class="fflag fflag-${country} ff-round ff-md">`;
}

export function updateHomeHeader() {
  // performance isn't a problem in CloudPhone :)
  const _currency1 = findCurrency(currency1)!;
  const _currency2 = findCurrency(currency2)!;

  setHeaderText(`${_currency1.currencySymbol} → ${_currency2.currencySymbol}`);
}

export function reverseCurrencies() {
  // Flip values
  [currency1, currency2] = [currency2, currency1];
  storeCurrency();
  [quantity1, quantity2] = [quantity2, quantity1];

  updateLabel(currencyLabel1, currency1);
  updateLabel(currencyLabel2, currency2);

  // Update input (if user has typed value)
  const hasInput = currencyInput1.value || currencyInput2.value;
  if (hasInput) {
    currencyInput1.value = quantity1;
    currencyInput2.value = quantity2;
  }

  currencyInput1.currency = currency1;
  currencyInput2.currency = currency2;

  updateHomeHeader();

  window.dispatchEvent(
    new CustomEvent<CurrenciesReversedEvent>(CURRENCIES_REVERSED, {
      detail: { currencies: [currency1, currency2] },
    }),
  );
}

function openCurrencyDialog() {
  // Don't allow selection of already-selected currencies
  selectCurrency(activeIndex === 1 ? currency2 : currency1);
  selectCurrency(activeIndex === 1 ? currency1 : currency2);
  showCurrencyList();
}

function onCurrencyLabelClick(e: Event) {
  activeIndex = e.currentTarget === currencyLabel1 ? 1 : 2;
  openCurrencyDialog();
}

function handleReverseButtonKeydown(e: KeyboardEvent) {
  const key = e.key;

  switch (key) {
    case "ArrowUp":
      e.preventDefault();
      currencyInput1.focus();
      showCenterButton();
      break;
    case "ArrowDown":
      e.preventDefault();
      currencyInput2.focus();
      showCenterButton();
      break;
    case "Enter":
      reverseCurrencies();
      break;
  }
}

function bindInputs() {
  [currencyInput1, currencyInput2].forEach((input) => {
    input.value = 0;
    input.addEventListener("keydown", handleInputChange);
    input.addEventListener("keyup", handleInputChange);
    input.addEventListener("focus", handleFocus);
    input.addEventListener("blur", handleBlur);
  });

  [currencyLabel1, currencyLabel2].forEach((label) =>
    label.addEventListener("click", onCurrencyLabelClick),
  );

  reverseButton.addEventListener("keydown", handleReverseButtonKeydown);
}

function onCurrencySelected(event: Event) {
  if (!(event instanceof CustomEvent)) return;
  const selected = event as CustomEventInit<CurrencySelectedEvent>;
  if (selected.detail) setCurrency(activeIndex, selected.detail.currency);
}

export function setCurrency(index: InputIndex, newCode: CurrencyCode) {
  setCurrencyState(index, { currency: newCode });
  updateLabel(stateMap[index]().label, newCode);
  updateUI();

  window.dispatchEvent(
    new CustomEvent<CurrencyChangedEvent>(CURRENCY_CHANGED, {
      detail: { index, currency: newCode },
    }),
  );
}

export function focusHome() {
  stateMap[focusIndex]().input.focus();
  showCenterButton();
}

export function setup(rates: USDExchangeRateResponse) {
  exchangeRates = rates;
  bindInputs();
  focusHome();
  setupAboutPage();
  updateLabel(currencyLabel1, currency1);
  updateLabel(currencyLabel2, currency2);
  window.addEventListener(CURRENCY_SELECTED, onCurrencySelected);
  window.addEventListener(BACK, onBack);
}

updateHomeHeader();
