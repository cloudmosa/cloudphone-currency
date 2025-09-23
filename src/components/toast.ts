import { _ } from "../helpers/utils";

const toast = _("toast") as HTMLElement;

const DEFAULT_TOAST_DURATION = 4000; // ms

export function hideToast() {
  toast.setAttribute("aria-disabled", "true");
  toast.classList.remove("show");
}

export function showToast(
  message: string,
  durationMs: number = DEFAULT_TOAST_DURATION,
) {
  toast.innerText = message;
  toast.removeAttribute("aria-disabled");
  toast.classList.add("show");

  setTimeout(hideToast, durationMs);
}
