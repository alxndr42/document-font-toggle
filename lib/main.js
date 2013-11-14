// "Allow pages..." preference
const PREF = 'browser.display.use_document_fonts';
// Backup of the preference at install time
const PREF_BACKUP = 'extensions.dft.backup_use_document_fonts';

const data = require('sdk/self').data;
const loc = require('sdk/l10n');
const prefs = require('sdk/preferences/service');
const prefs_local = require('sdk/simple-prefs');
const tabs = require('sdk/tabs');
const widgets = require('sdk/widget');
const URL = require('sdk/url').URL;

const Hostmap = require('./hostmap').Hostmap;

let widget = undefined;
// State to set when current host is not a preset
let open_state = undefined;
// State to set when current host is a preset
let preset_state = undefined;
// True if current host is a preset
let preset = undefined;
// Hostname to preset state map
let hostmap = undefined;

// Return tooltip text for the current state
const getTooltip = function () {
  let state = preset ? preset_state : open_state;
  let key = undefined;
  if (state === 0) {
    key = preset ? 'label_preset_disallow' : 'label_disallow';
  }
  else {
    key = preset ? 'label_preset_allow' : 'label_allow';
  }
  return loc.get(key);
};

// Return image URL for the current state
const getImage = function ()  {
  let state = preset ? preset_state : open_state;
  let key = undefined;
  if (state === 0) {
    key = preset ? 'button-preset-disallow.png' : 'button-disallow.png';
  }
  else {
    key = preset ? 'button-preset-allow.png' : 'button-allow.png';
  }
  return data.url(key);
};

// Update preference, widget tooltip and image
const update = function () {
  let state = preset ? preset_state : open_state;
  let current_state = prefs.get(PREF);
  if (state !== current_state) {
    prefs.set(PREF, state);
  }
  widget.tooltip = getTooltip();
  widget.contentURL = getImage();
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

  widget = widgets.Widget({
    id: 'dft-button',
    label: 'Document Font Toggle',
    tooltip: getTooltip(),
    contentURL: getImage(),
    onClick: function() { toggle(); }
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
