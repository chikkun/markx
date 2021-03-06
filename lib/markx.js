var aug = require('aug');
var read = require('./utils/read');
var markdown = require('./utils/markdown');
var resistance = require('resistance');
var ejs = require('ejs');


var defaults = function(done, options) {

  var def = {
    highlight: true
  };

  options = aug({}, def, options);

  if (!options.input) {
    return done(new Error('input must be set'));
  }

  done(null, options);
};

var readInput = function(done, options) {
  read(options.input, function(err, str) {

    // Check the file for YAML front matter
    // and pick up Abbreviation words
    var lines = str.trim().split('\n');
    if ( /^\-+/.test(lines[0]) ) {//added ^ by chikkun
      // Accumulate data
      var data = [];
      for (var i = 1, n = lines.length; i < n; i++) {
        if ( /^\-+/.test(lines[i]) ) {//added ^ by chikkun
          break;
        }
        data.push(lines[i]);
      }
      // Parse data
      var frontMatter = {};
      for (var j = 0; j < data.length; j++) {
        var line = data[j].split(':');
        var param = line[0].trim();
        var value = line[1].trim();
        frontMatter[param] = value;
      }
      // Remove front matter from file string
      lines = lines.splice(i + 1);
      // Check for line breaks at the end of the file
      var breakAtEnd = /\n$/.test(str) ? '\n' : '';
      str = lines.join('\n').replace(/^\s+/g, '') + breakAtEnd;
      // Attach data to the options object
      options.data = aug({}, frontMatter, options.data);
    }
      //added by chikkun
    if ( /\|+/.test(lines[0]) ) {
      // Abbrev data
      var abb = [];
      for (var i = 1, n = lines.length; i < n; i++) {
        if ( /\|+/.test(lines[i]) ) {
          break;
        }
        abb.push(lines[i]);
      }
      // Parse data
      var abbMatter = {};
      for (var j = 0; j < abb.length; j++) {
        var abbs = abb[j].split(':');
        var pa = abbs[0].trim();
        var va = abbs[1].trim();
        abbMatter[pa] = va;
      }
      // Remove abbrev matter from file string
      lines = lines.splice(i + 1);
      var breakAtEnd = /\n$/.test(str) ? '\n' : '';
      str = lines.join('\n').replace(/^\s+/g, '') + breakAtEnd;
      options.abbrev = abbMatter;
    }

    options.input = str;
    done(err, options);
  });
};

var convertMarkdown = function(done, options) {
  markdown(options.input, options.highlight, function(err, results) {
    var abbs = options.abbrev;
    if (abbs){
        for(var ab in abbs) {
            var reg = new RegExp("\\|" +ab + "\\|", "g");
	    results = results.replace(reg, abbs[ab]);
	}
    }
    options.markdown = results;
    done(err, options);
  });
};

var processTemplate = function(done, options) {
  if (options.template) {
    read(options.template, function(err, str) {
      if (err) {
        done(err);
      }
      var data = options.data || {};
      data.body = options.markdown;
      options.output = ejs.render(str, data);
      done(null, options);
    });
  } else {
    options.output = options.markdown;
    done(null, options);
  }
};

var output = function(done, options) {
  done(null, options.output);
};

var markx = function(options, callback) {
  callback = callback || function() {};

  resistance()
    .queue([options])
    .use(defaults)
    .use(readInput)
    .use(convertMarkdown)
    .use(processTemplate)
    .use(output)
    .end(callback);
};


module.exports = markx;
