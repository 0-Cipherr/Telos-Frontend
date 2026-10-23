let locks = 0;
let previousOverflow = "";

/**
 * Shared body scroll lock. Nested dialogs (e.g. a tx confirmer on top of the
 * create-vault modal) increment the same counter, so closing one dialog never
 * leaves the page stuck with `overflow: hidden`.
 */
export function lockBodyScroll(): () => void {
  if (locks === 0) previousOverflow = document.body.style.overflow;
  locks += 1;
  document.body.style.overflow = "hidden";

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) document.body.style.overflow = previousOverflow;
  };
}
