import {
  findCurrency,
  getFormatter,
  getFractionDigits,
  USD,
} from "../data/currencies";
import { BACK } from "../helpers/events";

const DIGITS = new RegExp(/\d/);
const ONLY_DIGITS = new RegExp(/^[0-9]$/);
const NON_DECIMAL = new RegExp("[^0-9\\-\\:\\:DEC]", "g");
const TRUTHY = new Set(["true", "TRUE", "yes", "YES", "on", "ON"]);

const DEFAULT_DECIMAL_SEPARATOR = ".";
const DEFAULT_GROUP_SEPARATOR = ",";
const DEFAULT_CURRENCY_SYMBOL = "$";

const ALWAYS_ALLOWED = new Set([
  "Delete",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Tab",
  "Enter",
  "Escape",
]);

function updateFormatter(currencyCode: string) {
  const currency = findCurrency(currencyCode);

  let fmt: Intl.NumberFormat | undefined = undefined;
  try {
    if (currency) {
      fmt = getFormatter(currency);
    }
  } catch (e) {
    console.warn(e);
  } finally {
    if (fmt === undefined) {
      fmt = getFormatter(USD);
    }
  }

  const parts = fmt.formatToParts(123456.78);
  const decPart = parts.find((p) => p.type === "decimal");
  const grpPart = parts.find((p) => p.type === "group");

  return {
    fmt,
    decimalSeparator: decPart?.value ?? DEFAULT_DECIMAL_SEPARATOR,
    groupSeparator: grpPart?.value ?? DEFAULT_GROUP_SEPARATOR,
    currencySymbol: currency?.currencySymbol ?? DEFAULT_CURRENCY_SYMBOL,
  };
}

function formatNumberToCurrency(fmt: Intl.NumberFormat, number: number) {
  if (number === 0) number = 0; // avoid "-0"
  return fmt.format(number);
}

function toNormalizedNumericString(
  localized: string,
  currencySymbol: string,
  groupSeparator: string,
  decimalSeparator: string,
) {
  const placeholder = "::DEC::";
  let temp = localized
    .replace(currencySymbol, "")
    .replace(new RegExp("\\" + groupSeparator, "g"), "")
    .replace(decimalSeparator, placeholder);

  temp = temp.replace(NON_DECIMAL, "");
  temp = temp.replace(placeholder, DEFAULT_DECIMAL_SEPARATOR);
  return temp;
}

function countNumericCharsLeft(
  rawValue: string,
  caretPos: number,
  decimalSeparator: string,
) {
  const left = rawValue.slice(0, caretPos);
  let count = 0;
  for (let ch of left) {
    if (DIGITS.test(ch)) count++;
    else if (ch === decimalSeparator) count++;
    else if (ch === DEFAULT_DECIMAL_SEPARATOR) count++;
  }
  return count;
}

function numericPositionsInFormatted(
  formatted: string,
  decimalSeparator: string,
) {
  const positions: number[] = [];
  for (let i = 0, e = formatted.length; i < e; i++) {
    const ch = formatted[i];
    if (DIGITS.test(ch)) positions.push(i);
    else if (ch === decimalSeparator) positions.push(i);
    else if (ch === DEFAULT_DECIMAL_SEPARATOR) positions.push(i);
  }
  return positions;
}

export class CurrencyInput extends HTMLDivElement {
  // Allows input participate in form submission, validation,
  // and to be associated with <label> elements
  static formAssociated = true;
  static get observedAttributes() {
    return ["currency", "value", "disabled", "readonly", "id", "name"];
  }

  private _shadow: ShadowRoot;
  private _input: HTMLInputElement;

  private _currency: string = "USD";
  private _precision: number = 2;
  private _value: number = 0;

  private _fmt!: Intl.NumberFormat;
  private _decimalSeparator: string = DEFAULT_DECIMAL_SEPARATOR;
  private _groupSeparator: string = DEFAULT_GROUP_SEPARATOR;
  private _currencySymbol: string = DEFAULT_CURRENCY_SYMBOL;

  focus(options?: FocusOptions): void {
    this._input.focus(options);
  }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "closed", clonable: true });

    const styles = new CSSStyleSheet();

    styles.replaceSync(
      `:host{width:100%;height:100%;}input{all:unset;height:inherit;width:inherit;}input:focus{outline:none;}`,
    );

    this._shadow.adoptedStyleSheets = [styles];

    this._input = document.createElement("input");
    this._input.type = "text";
    this._input.inputMode = "decimal";

    // Important: this disables the fullscreen text input screen on Cloud Phone
    this._input.setAttribute("x-puffin-entersfullscreen", "off");

    this._shadow.appendChild(this._input);

    window.addEventListener(BACK, this._onBack);
  }

  connectedCallback() {
    this._upgradeProperty("value");
    this._upgradeProperty("currency");

    this._input.addEventListener("keydown", this._onKeyDown);
    this._input.addEventListener("input", this._onInput);
    this._input.addEventListener("blur", this._onBlur);

    this._updateFormatter();
    if (this.hasAttribute("value")) {
      this._value = Number(this.getAttribute("value")) || 0;
    }
    this._render();
  }

  disconnectedCallback() {
    this._input.removeEventListener("keydown", this._onKeyDown);
    this._input.removeEventListener("input", this._onInput);
    this._input.removeEventListener("blur", this._onBlur);
    window.removeEventListener(BACK, this._onBack);
  }

  _updatePrecision() {
    const currency = findCurrency(this.currency);
    if (currency) {
      this._precision = getFractionDigits(currency);
    }
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    if (oldValue === newValue) return;
    switch (name) {
      case "currency":
        this.currency = newValue || this._currency;
        this._updatePrecision();
        break;
      case "value":
        this.value = Number(newValue) || 0;
        break;
      case "disabled":
      case "readonly":
        this._input.toggleAttribute(name, TRUTHY.has(newValue || ""));
        break;
      case "name":
      case "id":
        // Delegate name and ID to child <input>
        if (newValue !== oldValue) {
          this._input[name] = newValue || "";
        }
        break;
    }
  }

  isFocused(): boolean {
    return (
      this.contains(document.activeElement) || this === document.activeElement
    );
  }

  get value() {
    return this._value;
  }

  set value(v: number) {
    const n = typeof v === "number" && !Number.isNaN(v) ? v : Number(v);
    if (Number.isNaN(n)) return;
    this._value = n;
    this.setAttribute("value", String(n));
    this._render();
    this._dispatchEvent("input");
  }

  get currency() {
    return this._currency;
  }

  set currency(code: string) {
    if (!code) return;
    this._currency = code;
    this.setAttribute("currency", code);
    this._updateFormatter();
    this._render();
  }

  private _upgradeProperty(prop: string) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = (this as any)[prop];
      delete (this as any)[prop];
      (this as any)[prop] = value;
    }
  }

  private _updateFormatter() {
    const { fmt, decimalSeparator, groupSeparator, currencySymbol } =
      updateFormatter(this._currency);
    this._fmt = fmt;
    this._decimalSeparator = decimalSeparator;
    this._groupSeparator = groupSeparator;
    this._currencySymbol = currencySymbol;
  }

  private _render(
    previousRawValue: string | null = null,
    previousCaret: number | null = null,
  ) {
    const formatted = formatNumberToCurrency(this._fmt, this._value);

    if (previousRawValue === null || previousCaret === null) {
      this._input.value = formatted;
      const numericPositions = numericPositionsInFormatted(
        formatted,
        this._decimalSeparator,
      );
      const pos = numericPositions.length
        ? numericPositions[numericPositions.length - 1] + 1
        : formatted.length;
      this._input.setSelectionRange(pos, pos);
      return;
    }

    const leftNumericCount = countNumericCharsLeft(
      previousRawValue,
      previousCaret,
      this._decimalSeparator,
    );
    const numericPos = numericPositionsInFormatted(
      formatted,
      this._decimalSeparator,
    );

    let newCaretPos: number;
    if (leftNumericCount <= 0) {
      newCaretPos = numericPos.length ? numericPos[0] : formatted.length;
    } else if (leftNumericCount >= numericPos.length) {
      newCaretPos = formatted.length;
    } else {
      newCaretPos = numericPos[leftNumericCount - 1] + 1;
    }

    this._input.value = formatted;
    newCaretPos = Math.max(0, Math.min(formatted.length, newCaretPos));
    this._input.setSelectionRange(newCaretPos, newCaretPos);
  }

  private _performBackspace() {
    const currentFormatted = this._input.value;
    let caretStart = this._input.selectionStart ?? 0;

    // Look one character back when deleting a decimal separator
    const previousCharacter = currentFormatted.substring(
      caretStart - 1,
      caretStart,
    );
    if (
      previousCharacter === this._decimalSeparator ||
      previousCharacter === DEFAULT_DECIMAL_SEPARATOR
    ) {
      caretStart = caretStart - 1;
    }

    // Normalize the current formatted value to get the numeric string
    let normalizedCurrent = toNormalizedNumericString(
      currentFormatted,
      this._currencySymbol,
      this._groupSeparator,
      this._decimalSeparator,
    );

    // Handle precision
    const parts = normalizedCurrent.split(DEFAULT_DECIMAL_SEPARATOR);
    if (parts.length > 1) {
      const intPart = parts.shift()!;
      const frac = parts.join("");
      normalizedCurrent = intPart + DEFAULT_DECIMAL_SEPARATOR + frac;
    }

    if (this._precision === 0) {
      normalizedCurrent =
        normalizedCurrent.split(this._decimalSeparator)[0] || "0";
    } else if (normalizedCurrent.includes(this._decimalSeparator)) {
      const [i, f] = normalizedCurrent.split(this._decimalSeparator);
      normalizedCurrent =
        i + this._decimalSeparator + f.slice(0, this._precision);
    }

    // TODO: consider case when there's a selection (caretStart !== caretEnd)
    // This isn't possible on Cloud Phone, so it's currently ignored

    // Count how many numeric characters are to the left of cursor
    const numericCharsLeft = countNumericCharsLeft(
      currentFormatted,
      caretStart,
      this._decimalSeparator,
    );

    // Delete the numeric character at that position
    if (numericCharsLeft > 0) {
      const chars = normalizedCurrent.split("");
      let numericIndex = 0;
      let deleteIndex = -1;

      for (let i = 0; i < chars.length; i++) {
        if (DIGITS.test(chars[i]) || chars[i] === this._decimalSeparator) {
          numericIndex++;
          if (numericIndex === numericCharsLeft) {
            deleteIndex = i;
            break;
          }
        }
      }

      if (deleteIndex >= 0) {
        chars.splice(deleteIndex, 1);
        normalizedCurrent = chars.join("") || "0";
      }
    }

    const newValue = parseFloat(normalizedCurrent) || 0;

    // Update value immediately
    this._value = newValue;
    this._input.value = String(newValue);
    this.setAttribute("value", String(newValue));

    // Render with cursor position context
    this._render(currentFormatted, Math.max(0, caretStart - 1));
    this._dispatchEvent("input");
  }

  private _onBack = (e: Event) => {
    // Ignore when not in focus
    const focused = this.isFocused();
    console.log("onBack", e, focused);
    if (!focused) return;

    // Prevent closing app when value isn't zero
    if (this.value !== 0) {
      e.preventDefault();
      this._performBackspace();
      return;
    }
  };

  private _onInput = (e: Event) => {
    const rawValue = ((e.target as HTMLInputElement) ?? this._input).value;
    const caret = this._input.selectionStart ?? 0;

    let norm = toNormalizedNumericString(
      rawValue,
      this._currencySymbol,
      this._groupSeparator,
      this._decimalSeparator,
    );

    const parts = norm.split(this._decimalSeparator);
    if (parts.length > 1) {
      const intPart = parts.shift()!;
      const frac = parts.join("");
      norm = intPart + this._decimalSeparator + frac;
    } else {
      norm = parts[0];
    }

    if (this._precision === 0) {
      norm = norm.split(this._decimalSeparator)[0] || "0";
    } else if (norm.includes(this._decimalSeparator)) {
      const [i, f] = norm.split(this._decimalSeparator);
      norm = i + this._decimalSeparator + f.slice(0, this._precision);
    }

    const number = Number(norm);
    if (Number.isNaN(number)) {
      this._render(rawValue, caret);
      return;
    }

    this._value = number;
    this.setAttribute("value", String(this._value));
    this._render(rawValue, caret);
    this._dispatchEvent("input");
  };

  private _onBlur = () => {
    this._render();
    this._dispatchEvent("change");
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    const allowedMeta = e.ctrlKey || e.metaKey || e.altKey;
    if (allowedMeta) return;

    const isRTL = (this.getAttribute("dir") || "").toLowerCase() === "rtl";

    // Handle arrow navigation across only numeric/decimal characters
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault(); // prevent browser default move
      const value = this._input.value;
      const start = this._currencySymbol.length;
      let pos = this._input.selectionStart ?? start;

      // Reversed for RTL
      if (e.key === "ArrowLeft" || isRTL) {
        // move left to the next numeric/decimal character
        pos = Math.max(start, pos - 1);
        while (
          pos > start &&
          !DIGITS.test(value[pos - 1]) &&
          value[pos - 1] !== this._decimalSeparator &&
          value[pos - 1] !== DEFAULT_DECIMAL_SEPARATOR
        ) {
          pos--;
        }
      } else {
        // ArrowRight (or ArrowLeft and RTL)
        pos = Math.min(value.length, pos + 1);
        while (
          pos < value.length &&
          !DIGITS.test(value[pos]) &&
          value[pos] !== this._decimalSeparator &&
          value[pos] !== DEFAULT_DECIMAL_SEPARATOR
        ) {
          pos++;
        }
      }

      this._input.setSelectionRange(pos, pos);
      return;
    }

    if (ALWAYS_ALLOWED.has(e.key)) return;

    const isDigit = ONLY_DIGITS.test(e.key);
    const isDot =
      e.key === this._decimalSeparator || e.key === DEFAULT_DECIMAL_SEPARATOR;

    if (isDigit) return;

    if (isDot) {
      if (
        this._precision === 0 ||
        this._input.value.includes(this._decimalSeparator) ||
        this._input.value.includes(DEFAULT_DECIMAL_SEPARATOR)
      ) {
        e.preventDefault();
      }
      return;
    }

    e.preventDefault();
  };

  private _dispatchEvent(name: string) {
    this.dispatchEvent(new Event(name, { bubbles: true }));
  }
}

// Register custom element
// https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements
customElements.define("currency-input", CurrencyInput, { extends: "div" });
