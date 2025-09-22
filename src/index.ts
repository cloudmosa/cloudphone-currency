import { populateList } from "./pages/currencyList";
import { fetchUSDExchangeRates, formatDate } from "./api/exchangeRates";
import { setup } from "./input";
import "./components/currencyInput";
import "./index.css";
import { _ } from "./helpers/utils";

populateList();

const splash = _("splash") as HTMLDivElement;
const asOfDate = _("as-of-date") as HTMLElement;

fetchUSDExchangeRates()
  .then((rates) => {
    console.log(rates);
    if (!rates) return;

    // Update and format "as of" date
    asOfDate.innerText = formatDate(rates.date);

    // Clear splash screen and update UI
    setup(rates);
    requestAnimationFrame(() => splash.remove());
  })
  .catch((e) => console.warn(e));

document.documentElement.classList.remove("no-js");
