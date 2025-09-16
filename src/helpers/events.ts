import { CurrencyCode } from "../data/currency";

export const CURRENCY_SELECTED = "currencySelected";
export const CURRENCY_CHANGED = "currencyChange";
export const CURRENCIES_REVERSED = "currenciesReversed";
export const BACK = "back";

export type CurrencySelectedEvent = {
  currency: CurrencyCode;
};

export type CurrencyChangedEvent = {
  index: number;
  currency: CurrencyCode;
};

export type CurrenciesReversedEvent = {
  currencies: [CurrencyCode, CurrencyCode];
};
