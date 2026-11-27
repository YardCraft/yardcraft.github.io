function followLegacyLink() {
  const target = document.getElementById(location.hash.slice(1));
  const link = target?.querySelector('a[data-legacy]');
  if (link) location.replace(link.href);
}

followLegacyLink();
window.addEventListener('hashchange', followLegacyLink);
