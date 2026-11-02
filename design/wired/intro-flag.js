// The designer's own line, from the head of the page: marks the first paint for the opening
// sequence (intro.js) unless the visitor prefers reduced motion. Loaded synchronously in the
// head so the class is set before the first style is computed (decision 13).
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('intro')
