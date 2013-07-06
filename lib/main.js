const PREF = 'browser.display.use_document_fonts';

const data = require('sdk/self').data;
const loc = require('sdk/l10n');
const prefs = require('sdk/preferences/service');
const widgets = require('sdk/widget');

let widget = undefined;
let state = 0;

const getTooltip = function () {
  return loc.get(state === 0 ? 'label_disallow' : 'label_allow');
};

const getImage = function ()  {
  return data.url(state === 0 ? 'button-disallow.png' : 'button-allow.png');
};

const toggle = function() {
  state = (state === 0 ? 1 : 0);
  widget.tooltip = getTooltip();
  widget.contentURL = getImage();
  prefs.set(PREF, state);
};

exports.main = function () {
  state = prefs.get(PREF, 0);
  widget = widgets.Widget({
    id: 'dft-button',
    label: 'Document Font Toggle',
    tooltip: getTooltip(),
    contentURL: getImage(),
    onClick: function() { toggle(); }
  });
};
