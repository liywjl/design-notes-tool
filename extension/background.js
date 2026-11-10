const extensionApi = globalThis.browser ?? globalThis.chrome;
const SCRIPT_ID = 'design-notes';
const TOOL_FILES = ['mark-auto-load.js', 'design-notes.js'];

const enabledSites = async () => {
  const { origins = [] } = await extensionApi.permissions.getAll();
  return origins;
};

const registerToolOnEnabledSites = async () => {
  const registered = await extensionApi.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (registered.length) await extensionApi.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });

  const sites = await enabledSites();
  if (!sites.length) return;

  await extensionApi.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    matches: sites,
    js: TOOL_FILES,
    world: 'MAIN',
    runAt: 'document_idle',
    persistAcrossSessions: true
  }]);
};

let registration = Promise.resolve();
const refreshRegistration = () => {
  registration = registration.then(registerToolOnEnabledSites, registerToolOnEnabledSites);
  return registration;
};

const loadToolInOpenTabs = async (sites) => {
  const tabs = await extensionApi.tabs.query({ url: sites });
  const injections = tabs.map((tab) => extensionApi.scripting
    .executeScript({ target: { tabId: tab.id }, files: TOOL_FILES, world: 'MAIN' })
    .catch(() => null));
  await Promise.all(injections);
};

extensionApi.runtime.onInstalled.addListener(refreshRegistration);
extensionApi.runtime.onStartup.addListener(refreshRegistration);
extensionApi.permissions.onRemoved.addListener(refreshRegistration);
extensionApi.permissions.onAdded.addListener(async ({ origins = [] }) => {
  await refreshRegistration();
  await loadToolInOpenTabs(origins);
});
