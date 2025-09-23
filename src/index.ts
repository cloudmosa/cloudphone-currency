import { populateList } from "./pages/currencyList";
import { fetchUSDExchangeRates } from "./api/exchangeRates";
import { setup } from "./input";
import "./components/currencyInput";
import "./index.css";
import { _ } from "./helpers/utils";
import { setupAboutContent } from "./pages/about";

populateList();

const splash = _("splash") as HTMLDivElement;

fetchUSDExchangeRates()
  .then((rates) => {
    console.log(rates);
    if (!rates) return;

    // Clear splash screen and update UI
    setup(rates);
    setupAboutContent(rates.date);
    requestAnimationFrame(() => splash.remove());
  })
  .catch((e) => console.warn(e));

document.documentElement.classList.remove("no-js");
