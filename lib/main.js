const PREF = 'browser.display.use_document_fonts';
const PREF_BACKUP = 'extensions.dft.backup_use_document_fonts';

const data = require('sdk/self').data;
const loc = require('sdk/l10n');
const prefs = require('sdk/preferences/service');
const tabs = require('sdk/tabs');
const widgets = require('sdk/widget');
const URL = require('sdk/url').URL;

let widget = undefined;
let open_state = undefined;
let preset_state = undefined;
let preset = undefined;

const getTooltip = function () {
  let state = preset ? preset_state : open_state;
  return loc.get(state === 0 ? 'label_disallow' : 'label_allow');
};

const getImage = function ()  {
  let state = preset ? preset_state : open_state;
  if (!preset) {
    return data.url(state === 0 ? 'button-disallow.png' : 'button-allow.png');
  }
  else {
    return data.url('button-disabled.png');
  }
};

const update = function () {
  let state = preset ? preset_state : open_state;
  let current_state = prefs.get(PREF);
  if (state !== current_state) {
    prefs.set(PREF, state);
  }
  widget.tooltip = getTooltip();
  widget.contentURL = getImage();
};

const toggle = function () {
  if (!preset) {
    open_state = (open_state === 0 ? 1 : 0);
    update();
  }
};

const checkLocation = function (location) {
  let url = undefined;
  let state = undefined;
  try {
    url = URL(location);
    if (url.scheme === 'http' || url.scheme === 'https') {
      state = undefined;
    }
    if (state !== undefined) {
      preset_state = state;
      preset = true;
    }
    else {
      preset = false;
    }
  }
  catch (e) {
    console.log(e);
    preset = false;
  }
};

const tabListener = function (tab) {
  if (tab === tabs.activeTab) {
    checkLocation(tab.url);
    update();
  }
};

exports.main = function () {
  open_state = preset_state = prefs.get(PREF);
  preset = false;
  if (!prefs.has(PREF_BACKUP)) {
    prefs.set(PREF_BACKUP, open_state);
  }
  widget = widgets.Widget({
    id: 'dft-button',
    label: 'Document Font Toggle',
    tooltip: getTooltip(),
    contentURL: getImage(),
    onClick: function() { toggle(); }
  });
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
