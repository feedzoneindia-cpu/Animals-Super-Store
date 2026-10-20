/** Joins conditional class names — tiny local alternative to a classnames dependency. */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
