const extensionApi = globalThis.browser ?? globalThis.chrome;

const BIN_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

const siteName = document.getElementById('site-name');
const state = document.getElementById('state');
const hint = document.getElementById('hint');
const toggle = document.getElementById('toggle');
const others = document.getElementById('others');
const otherSites = document.getElementById('other-sites');

const patternFor = (hostname) => `*://${hostname}/*`;
const hostnameOf = (pattern) => pattern.replace(/^[^:]+:\/\//, '').replace(/\/.*$/, '');

const enabledSites = async () => {
  const { origins = [] } = await extensionApi.permissions.getAll();
  return origins;
};

const currentTab = async () => {
  const [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const scriptableHostname = (tab) => {
  if (!tab?.url) return null;
  const url = new URL(tab.url);
  const isWebPage = url.protocol === 'http:' || url.protocol === 'https:';
  return isWebPage ? url.hostname : null;
};

const renderOtherSites = (sites, currentPattern) => {
  const rest = sites.filter((site) => site !== currentPattern);
  others.hidden = rest.length === 0;
  otherSites.replaceChildren(...rest.map((site) => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = hostnameOf(site);
    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.innerHTML = BIN_ICON;
    remove.title = `Turn off for ${hostnameOf(site)}`;
    remove.setAttribute('aria-label', remove.title);
    remove.onclick = async () => {
      await extensionApi.permissions.remove({ origins: [site] });
      render();
    };
    item.append(name, remove);
    return item;
  }));
};

const renderUnavailable = () => {
  siteName.textContent = 'This page';
  state.hidden = true;
  hint.textContent = "Browsers don't let extensions run here. Open your app's page and try again.";
  toggle.textContent = 'Turn on for this site';
  toggle.className = 'toggle primary';
  toggle.disabled = true;
};

const renderSite = (tab, hostname, isOn) => {
  siteName.textContent = hostname;
  state.hidden = false;
  state.textContent = isOn ? 'On' : 'Off';
  state.dataset.on = String(isOn);
  hint.textContent = isOn ? 'Loads on every refresh of this site.' : 'Load the tool here now and on every refresh.';
  toggle.disabled = false;
  toggle.className = isOn ? 'toggle' : 'toggle primary';
  toggle.textContent = isOn ? 'Turn off for this site' : 'Turn on for this site';
  toggle.onclick = isOn
    ? async () => {
      await extensionApi.permissions.remove({ origins: [patternFor(hostname)] });
      await extensionApi.tabs.reload(tab.id);
      render();
    }
    : () => extensionApi.permissions.request({ origins: [patternFor(hostname)] }).then(render);
};

const render = async () => {
  const [tab, sites] = await Promise.all([currentTab(), enabledSites()]);
  const hostname = scriptableHostname(tab);
  const currentPattern = hostname && patternFor(hostname);

  if (hostname) renderSite(tab, hostname, sites.includes(currentPattern));
  else renderUnavailable();

  renderOtherSites(sites, currentPattern);
};

render();
