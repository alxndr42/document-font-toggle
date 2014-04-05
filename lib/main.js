// "Allow pages..." preference
const PREF = 'browser.display.use_document_fonts';
// Backup of the preference at install time
const PREF_BACKUP = 'extensions.dft.backup_use_document_fonts';

const data = require('sdk/self').data;
const prefs = require('sdk/preferences/service');
const prefs_local = require('sdk/simple-prefs');
const tabs = require('sdk/tabs');
const URL = require('sdk/url').URL;

const Hostmap = require('./hostmap').Hostmap;

// The button
let button = undefined;
// State to set when current host is not a preset
let open_state = undefined;
// State to set when current host is a preset
let preset_state = undefined;
// True if current host is a preset
let preset = undefined;
// Hostname to preset state map
let hostmap = undefined;

// Return icon URLs for the current state
const getIcons = function ()  {
  let state = preset ? preset_state : open_state;
  let key = undefined;
  let icon16 = undefined;
  let icon32 = undefined;
  if (state === 0) {
    key = preset ? 'button16-preset-disallow.png' : 'button16-disallow.png';
    icon16 = data.url(key);
    key = preset ? 'button32-preset-disallow.png' : 'button32-disallow.png';
    icon32 = data.url(key);
  }
  else {
    key = preset ? 'button16-preset-allow.png' : 'button16-allow.png';
    icon16 = data.url(key);
    key = preset ? 'button32-preset-allow.png' : 'button32-allow.png';
    icon32 = data.url(key);
  }
  return {
    "16": icon16,
    "32": icon32
  };
};

// Update preference and button icons
const update = function () {
  let state = preset ? preset_state : open_state;
  let current_state = prefs.get(PREF);
  if (state !== current_state) {
    prefs.set(PREF, state);
  }
  button.icon = getIcons();
};

// Toggle preference if current host is not a preset
const toggle = function () {
  if (!preset) {
    open_state = (open_state === 0 ? 1 : 0);
    update();
  }
};

// Check current host for preset status
const checkLocation = function (location) {
  let state = undefined;
  try {
    let url = URL(location);
    if (url.scheme) {
      let scheme = url.scheme.toLowerCase();
      if (scheme === 'http' || scheme === 'https') {
        state = hostmap.match(url.host);
      }
    }
  }
  catch (e) {
    console.log(e);
  }
  if (state !== undefined) {
    preset_state = state;
    preset = true;
  }
  else {
    preset = false;
  }
};

// Listen for activity on current tab
const tabListener = function (tab) {
  if (tab === tabs.activeTab) {
    checkLocation(tab.url);
    update();
  }
};

// Parse a list of hostnames and map them to the given state
const parsePreset = function (hostnames, state) {
  if (hostnames) {
    let values = hostnames.split(/[, ]/);
    for (let i = 0; i < values.length; i++) {
      if (values[i]) {
        hostmap.put(values[i], state);
      }
    }
  }
};

// Parse the hostname presets
const parsePresets = function () {
  hostmap = Hostmap();
  parsePreset(prefs_local.prefs.allow_hosts, 1);
  parsePreset(prefs_local.prefs.disallow_hosts, 0);
};

exports.main = function () {
  if (!prefs.has(PREF_BACKUP)) {
    let current_state = prefs.get(PREF);
    prefs.set(PREF_BACKUP, current_state);
    prefs_local.prefs.startup_state = current_state;
  }
  let startup_state = prefs_local.prefs.startup_state;
  prefs.set(PREF, startup_state);
  open_state = preset_state = startup_state;
  preset = false;
  parsePresets();

  var { ActionButton } = require('sdk/ui/button/action');
  button = ActionButton({
    id: 'dft-button',
    label: 'DFT',
    icon: getIcons(),
    onClick: toggle
  });

  prefs_local.on('allow_hosts', parsePresets);
  prefs_local.on('disallow_hosts', parsePresets);
  tabs.on('activate', tabListener);
  tabs.on('ready', tabListener);
  tabs.on('pageshow', tabListener);

  checkLocation(tabs.activeTab.url);
  update();
};

exports.onUnload = function (reason) {
  if (reason === 'disable' || reason === 'uninstall') {
    if (prefs.has(PREF_BACKUP)) {
      prefs.set(PREF, prefs.get(PREF_BACKUP));
      prefs.reset(PREF_BACKUP);
    }
  }
};
