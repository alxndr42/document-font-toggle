const Hostmap = function () {
  let entries = {};
  let that = {};

  that.put = function (key, value) {
    entries[key] = {
      'regex': RegExp('^.*' + key.replace('.', '\\.') + '$', 'i'),
      'value': value
    };
  };

  that.get = function (key) {
    return entries[key];
  };

  that.remove = function (key) {
    delete entries[key];
  };

  that.match = function (hostname) {
    let value = undefined;
    for (let key in entries) {
      let entry = entries[key];
      if (entry.regex.test(hostname)) {
        value = entry.value;
        break;
      }
    }
    return value;
  };

  return that;
};

exports.Hostmap = Hostmap;
