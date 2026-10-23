// Inline script that sets the theme class and language before first paint, so there is no flash.
// Kept in a plain file so the server layout can read it as a string.
export const THEME_BOOT = `try{var t=localStorage.getItem("ccza.theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");var l=localStorage.getItem("ccza.lang");if(l)document.documentElement.lang=l;}catch(e){}`;
