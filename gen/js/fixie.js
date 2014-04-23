(function() {
  var Checkbox, DateEditor, Editor, FiddleModel, FiddleView, PlainTextEditor, Preview, RichTextEditor, RuleSets, Scrubber, TemplatePreview, URLEditor, assert, convertTagScrubber, find_command, handlebars_render, keepContentsScrubber, render, scrubAttributes, scrubLink, scrubUrl, stripScrubber, verbose, wrapConfigurableScrubber, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  verbose = false;

  handlebars_render = function(template_name, context) {
    var output, template;
    template = App.Handlebars[template_name];
    if (template) {
      if (verbose) {
        console.log("Rendering template '" + template_name + "'");
      }
      output = template(context);
      return output;
    } else {
      throw "Fixie : error : couldn't find template '" + template_name + "'";
    }
  };

  render = handlebars_render;

  assert = function(expr) {
    if (!expr) {
      throw new Error('assertion failed');
    }
  };

  wrapConfigurableScrubber = function(scrubber, default_opts) {
    if (default_opts == null) {
      default_opts = {};
    }
    return function(el_or_opts) {
      var el, opts,
        _this = this;
      if (_.isPlainObject(el_or_opts)) {
        opts = _.extend(default_opts, el_or_opts);
        return function(el) {
          return scrubber(el, opts);
        };
      } else {
        el = el_or_opts;
        return scrubber(el, default_opts);
      }
    };
  };

  scrubUrl = function(url) {
    var bad_predicate, good_predicate, invalid_url_predicates, valid_url_predicates, _i, _j, _len, _len1;
    invalid_url_predicates = [/javascript/];
    valid_url_predicates = [/^https:\/\//, /^http:\/\//, /^\//];
    for (_i = 0, _len = invalid_url_predicates.length; _i < _len; _i++) {
      bad_predicate = invalid_url_predicates[_i];
      if (bad_predicate.test(url)) {
        console.log("scrubUrl : warning : url " + url + " was scrubbed as invalid");
        return null;
      }
    }
    for (_j = 0, _len1 = valid_url_predicates.length; _j < _len1; _j++) {
      good_predicate = valid_url_predicates[_j];
      if (good_predicate.test(url)) {
        return url;
      }
    }
  };

  stripScrubber = function(el) {
    return null;
  };

  scrubAttributes = function(el, opts) {
    var $el, attrNames, exceptions, _ref;
    exceptions = (_ref = opts != null ? opts.except : void 0) != null ? _ref : [];
    $el = $(el);
    attrNames = _.map(el.attributes, function(attr, idx) {
      return attr.name;
    });
    _.each(attrNames, function(attrName) {
      if (__indexOf.call(exceptions, attrName) >= 0) {

      } else {
        return $el.removeAttr(attrName);
      }
    });
    return el;
  };

  scrubAttributes = wrapConfigurableScrubber(scrubAttributes);

  convertTagScrubber = function(el, opts) {
    return $("<" + opts.tagName + ">").append($(el).contents());
  };

  convertTagScrubber = wrapConfigurableScrubber(convertTagScrubber);

  keepContentsScrubber = function(el, opts) {
    return $(el).children();
  };

  keepContentsScrubber = wrapConfigurableScrubber(keepContentsScrubber);

  scrubLink = function(el, opts) {
    var $el, rawAttr;
    $el = $(el);
    rawAttr = $el.attr(opts.attribute);
    return $el.attr(opts.attribute, opts.scrubUrlFunc(rawAttr));
  };

  scrubLink = wrapConfigurableScrubber(scrubLink, {
    attribute: 'href',
    scrubUrlFunc: scrubUrl
  });

  find_command = function(node) {
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttribute('data-fixie-cmd')) {
        return node.getAttribute('data-fixie-cmd');
      }
      node = node.parentNode;
    }
    return null;
  };

  Scrubber = (function() {
    function Scrubber(rules) {
      var _base;
      this.rules = rules;
      this.resolveFilters = __bind(this.resolveFilters, this);
      this.cleanNodeBFS = __bind(this.cleanNodeBFS, this);
      this.cleanNodeInitial = __bind(this.cleanNodeInitial, this);
      this.cleanNode = __bind(this.cleanNode, this);
      if ((_base = this.rules)["default"] == null) {
        _base["default"] = keepContentsScrubber;
      }
    }

    Scrubber.prototype.cleanNode = function(node) {
      if (!node) {
        return;
      }
      this.cleanNodeInitial(node);
      return this.cleanNodeBFS(node);
    };

    Scrubber.prototype.cleanNodeInitial = function(node) {
      if (!node) {
        return;
      }
      return _(node.children).first(function(child) {
        return child.tagName.toLowerCase() === 'br';
      }).each(function(child) {
        return child.remove();
      });
    };

    Scrubber.prototype.cleanNodeBFS = function(node) {
      var filter, next, tagFilters, _i, _len,
        _this = this;
      tagFilters = this.resolveFilters(node);
      for (_i = 0, _len = tagFilters.length; _i < _len; _i++) {
        filter = tagFilters[_i];
        next = filter(node);
        if (next === node) {
          continue;
        }
        if (!next) {
          $(node).remove();
          return null;
        } else {
          $(node).replaceWith(next);
          _.each(next, function(n) {
            return _this.cleanNodeBFS(n);
          });
          return next;
        }
      }
      _.each($(node).children(), function(n) {
        return _this.cleanNodeBFS(n);
      });
      return $(node).children();
    };

    Scrubber.prototype.resolveFilters = function(el) {
      var tagName, tag_filter, tag_filters, _i, _len;
      tagName = el.tagName.toLowerCase();
      tag_filters = this.rules[tagName] || this.rules["default"];
      if (typeof tag_filters === 'function') {
        tag_filters = [tag_filters];
      }
      for (_i = 0, _len = tag_filters.length; _i < _len; _i++) {
        tag_filter = tag_filters[_i];
        if (typeof tag_filter !== 'function') {
          throw new Error('Fixie : error : found a tag_filter that wasn\'t a function');
        }
      }
      return tag_filters;
    };

    return Scrubber;

  })();

  Editor = (function(_super) {
    __extends(Editor, _super);

    function Editor() {
      this.on_edit = __bind(this.on_edit, this);
      this.clean_editor_content = __bind(this.clean_editor_content, this);
      this.cmd = __bind(this.cmd, this);
      this.initialize = __bind(this.initialize, this);
      this.displayError = __bind(this.displayError, this);
      _ref = Editor.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Editor.prototype.displayError = function(error) {
      return this.el.style.backgroundColor = '#ffbbbb';
    };

    Editor.prototype.initialize = function() {
      var _ref1,
        _this = this;
      this.on_edit = _.throttle(this.on_edit, (_ref1 = this.options.editThrottle) != null ? _ref1 : 250, {
        trailing: true
      });
      this.listenTo(this.model, "synced", function() {
        return _this.el.style.backgroundColor = 'white';
      });
      this.listenTo(this.model, "validation-error", function(error) {
        if (error.field === _this.options.property) {
          return _this.displayError(error);
        }
      });
      return this.render();
    };

    Editor.prototype.cmd = function(cmd_name) {
      return console.log("Fixie.Editor : info : running command '" + cmd_name + "'");
    };

    Editor.prototype.clean_editor_content = function() {
      var content;
      content = this.$('.fixie-editor-content')[0];
      this.scrubber.cleanNode(content);
      return content.innerHTML;
    };

    Editor.prototype.on_edit = function() {
      console.log("Fixie.Editor : info : " + this.options.property + " was edited");
      this.stopListening(this.model, "change:" + this.options.property);
      return this.model.set(this.options.property, this.clean_editor_content());
    };

    return Editor;

  })(Backbone.View);

  Preview = (function(_super) {
    __extends(Preview, _super);

    function Preview() {
      this.initialize = __bind(this.initialize, this);
      this.render = __bind(this.render, this);
      _ref1 = Preview.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    Preview.prototype.render = function() {
      if (!this.options.property) {
        throw new Error('Fixie.Preview : error : you must specify a "text" property name on Fixie.Preview instances');
      }
      this.el.innerHTML = model.get(this.options.property);
      return this;
    };

    Preview.prototype.initialize = function() {
      if (!this.el) {
        throw new Error('Couldn\'t find el');
      }
      this.listenTo(this.model, "change:" + this.options.property, this.render);
      return this.render();
    };

    return Preview;

  })(Backbone.View);

  TemplatePreview = (function(_super) {
    __extends(TemplatePreview, _super);

    function TemplatePreview() {
      this.render = __bind(this.render, this);
      _ref2 = TemplatePreview.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    TemplatePreview.prototype.render = function() {
      var rendered, template, _ref3;
      if (!this.options.property) {
        throw new Error('Fixie.Preview : error : you must specify a "text" property name on Fixie.Preview instances');
      }
      template = model.get(this.options.property);
      rendered = nunjucks.renderString(template, ((_ref3 = this.options) != null ? _ref3.data : void 0) || {});
      this.el.innerHTML = rendered;
      return this;
    };

    return TemplatePreview;

  })(Preview);

  RuleSets = {
    PlainText: {},
    RichText: {
      a: [
        scrubLink, scrubAttributes({
          except: 'href'
        })
      ],
      b: scrubAttributes,
      i: scrubAttributes,
      br: scrubAttributes,
      p: scrubAttributes,
      strong: scrubAttributes,
      em: scrubAttributes,
      ul: scrubAttributes,
      ol: scrubAttributes,
      li: scrubAttributes,
      div: scrubAttributes,
      h3: convertTagScrubber({
        tagName: 'h1'
      }),
      "default": scrubAttributes
    }
  };

  URLEditor = (function(_super) {
    __extends(URLEditor, _super);

    function URLEditor() {
      this.initialize = __bind(this.initialize, this);
      this.render = __bind(this.render, this);
      this.on_link_edit = __bind(this.on_link_edit, this);
      this.events = __bind(this.events, this);
      _ref3 = URLEditor.__super__.constructor.apply(this, arguments);
      return _ref3;
    }

    URLEditor.prototype.template = 'fixie-url-editor';

    URLEditor.prototype.scrubber = new Scrubber(RuleSets.PlainText);

    URLEditor.prototype.events = function() {
      return {
        'keyup .fixie-editor-content': this.on_edit,
        'paste .fixie-editor-content': this.on_edit,
        'click .fixie-url-link-edit': this.on_link_edit
      };
    };

    URLEditor.prototype.on_link_edit = function() {
      var link, prop_set;
      link = window.prompt('Please enter a URL:', this.model.get(this.options.link_url));
      prop_set = {};
      prop_set[this.options.link_url] = (scrubUrl(link)) || '';
      this.model.set(prop_set);
      return this.render();
    };

    URLEditor.prototype.render = function() {
      var context, template, template_result;
      template = (_.result(this.options, 'template')) || (_.result(this, 'template'));
      context = {
        link_url: this.model.get(this.options.link_url),
        text: this.model.get(this.options.property)
      };
      template_result = render(template, context);
      this.$el.html(template_result);
      return this;
    };

    URLEditor.prototype.initialize = function() {
      this.render();
      if (!this.model.has(this.options.property)) {
        return this.listenToOnce(this.model, 'change', this.render);
      }
    };

    return URLEditor;

  })(Editor);

  PlainTextEditor = (function(_super) {
    __extends(PlainTextEditor, _super);

    function PlainTextEditor() {
      this.initialize = __bind(this.initialize, this);
      this.render = __bind(this.render, this);
      this.clean_editor_content = __bind(this.clean_editor_content, this);
      this.events = __bind(this.events, this);
      _ref4 = PlainTextEditor.__super__.constructor.apply(this, arguments);
      return _ref4;
    }

    PlainTextEditor.prototype.template = 'fixie-plain-editor';

    PlainTextEditor.prototype.scrubber = new Scrubber(RuleSets.PlainText);

    PlainTextEditor.prototype.events = function() {
      return {
        'keyup .fixie-editor-content': this.on_edit,
        'paste .fixie-editor-content': this.on_edit
      };
    };

    PlainTextEditor.prototype.clean_editor_content = function() {
      var $el, content, htmlInEl, len;
      $el = this.$('.fixie-editor-content');
      content = $el.text();
      content = content.replace(/[\r\n]/g, ' ');
      while (true) {
        len = content.length;
        content = content.replace('  ', ' ');
        if (len === content.length) {
          break;
        }
      }
      htmlInEl = $el[0].innerHTML;
      if (htmlInEl.indexOf('<') !== -1) {
        $el.text(content);
      }
      return content;
    };

    PlainTextEditor.prototype.render = function() {
      var context, template, template_result;
      template = (_.result(this.options, 'template')) || (_.result(this, 'template'));
      context = {
        text: this.model.get(this.options.property)
      };
      template_result = render(template, context);
      this.$el.html(template_result);
      this.listenToOnce(this.model, "change:" + this.options.property, this.render);
      return this;
    };

    PlainTextEditor.prototype.initialize = function() {
      return PlainTextEditor.__super__.initialize.apply(this, arguments);
    };

    return PlainTextEditor;

  })(Editor);

  RichTextEditor = (function(_super) {
    __extends(RichTextEditor, _super);

    function RichTextEditor() {
      this.initialize = __bind(this.initialize, this);
      this.render = __bind(this.render, this);
      this.events = __bind(this.events, this);
      this.exec_cmd = __bind(this.exec_cmd, this);
      this.insertLink = __bind(this.insertLink, this);
      this.dispatch = __bind(this.dispatch, this);
      _ref5 = RichTextEditor.__super__.constructor.apply(this, arguments);
      return _ref5;
    }

    RichTextEditor.prototype.template = 'fixie-rich-editor';

    RichTextEditor.prototype.scrubber = new Scrubber(RuleSets.RichText);

    RichTextEditor.prototype.dispatch = function(command) {
      if (document.execCommand) {
        if (command && document.queryCommandEnabled(command)) {
          console.log("Fixie.Editor : info : running command '" + command + "'");
          document.execCommand(command);
          return this.on_edit();
        } else {
          return console.log("Fixie.Editor : info : command " + command + " is currently not enabled.");
        }
      } else {
        throw new Error('Fixie.Editor : error : browser support is not available for this operation');
      }
    };

    RichTextEditor.prototype.insertLink = function() {
      var link, linkUrl;
      if (typeof document !== "undefined" && document !== null ? document.queryCommandEnabled('createlink') : void 0) {
        linkUrl = window.prompt('Please enter a URL:', this.model.get(this.options.link_url));
        link = scrubUrl(linkUrl);
        if (link) {
          document.execCommand('createlink', false, link);
          this.on_edit();
        } else {
          window.alert('Please try again. Urls must begin with /, http://, or https://');
        }
      }
      return console.log('Fixie.Editor : info : createlink is not enabled');
    };

    RichTextEditor.prototype.exec_cmd = function() {
      var cmd_dispatch, command, dispatch;
      cmd_dispatch = {
        bold: this.dispatch,
        italic: this.dispatch,
        insertOrderedList: this.dispatch,
        insertUnorderedList: this.dispatch,
        insertLink: this.insertLink
      };
      command = find_command(event.target);
      if (command in cmd_dispatch) {
        dispatch = cmd_dispatch[command](command);
      } else {
        throw new Error('Fixie.Editor : error : unexepected fixie-cmd');
      }
      return false;
    };

    RichTextEditor.prototype.events = function() {
      return {
        'click .fixie-toolbar-item': this.exec_cmd,
        'keyup .fixie-editor-content': this.on_edit,
        'paste .fixie-editor-content': this.on_edit
      };
    };

    RichTextEditor.prototype.render = function() {
      var context, template, template_result, toolbar_item, _i, _len, _ref6;
      template = (_.result(this.options, 'template')) || (_.result(this, 'template'));
      context = {
        text: this.model.get(this.options.property)
      };
      template_result = render(template, context);
      this.$el.html(template_result);
      _ref6 = this.$('.fixie-toolbar-item');
      for (_i = 0, _len = _ref6.length; _i < _len; _i++) {
        toolbar_item = _ref6[_i];
        toolbar_item.onmousedown = function() {
          return event.preventDefault();
        };
      }
      this.listenToOnce(this.model, "change:" + this.options.property, this.render);
      return this;
    };

    RichTextEditor.prototype.initialize = function() {
      return RichTextEditor.__super__.initialize.apply(this, arguments);
    };

    return RichTextEditor;

  })(Editor);

  DateEditor = (function(_super) {
    __extends(DateEditor, _super);

    function DateEditor() {
      this.on_edit = __bind(this.on_edit, this);
      _ref6 = DateEditor.__super__.constructor.apply(this, arguments);
      return _ref6;
    }

    DateEditor.prototype.on_edit = function() {
      var e, format, prop_set, val;
      console.log("Fixie.DateEditor : info : " + this.options.property + " was edited");
      try {
        format = this.options.format || 'iso';
        val = (new Date(this.clean_editor_content())).toISOString();
        if (format === 'date') {
          val = val.substring(0, 10);
        }
        prop_set = {};
        prop_set[this.options.property] = val;
        this.stopListening(this.model, "change:" + this.options.property);
        this.model.set(prop_set);
      } catch (_error) {
        e = _error;
      }
    };

    return DateEditor;

  })(PlainTextEditor);

  Checkbox = (function(_super) {
    __extends(Checkbox, _super);

    function Checkbox() {
      this.initialize = __bind(this.initialize, this);
      this.events = __bind(this.events, this);
      this.detectChange = __bind(this.detectChange, this);
      this.render = __bind(this.render, this);
      _ref7 = Checkbox.__super__.constructor.apply(this, arguments);
      return _ref7;
    }

    Checkbox.prototype.render = function() {
      var checked, html;
      checked = this.model.get(this.options.property);
      html = "<form onsubmit='event.preventDefault()'>\n  <label class='fixie-checkbox'>\n    <input type='checkbox' name='" + this.options.property + "' " + (checked ? 'checked' : '') + ">\n    <span>&nbsp;" + (this.options.description || this.options.property) + "</span>\n  </label>\n</form>";
      this.$el.html(html);
      return this;
    };

    Checkbox.prototype.detectChange = function() {
      var checked;
      checked = this.$('input').is(':checked');
      return this.model.set(this.options.property, checked);
    };

    Checkbox.prototype.events = function() {
      return {
        "change input[type=checkbox]": 'detectChange'
      };
    };

    Checkbox.prototype.initialize = function() {
      if (!this.el) {
        throw new Error("Couldn't find el");
      }
      this.listenTo(this.model, "change:" + this.options.property, this.render);
      return this.render();
    };

    return Checkbox;

  })(Backbone.View);

  FiddleModel = (function(_super) {
    __extends(FiddleModel, _super);

    function FiddleModel() {
      _ref8 = FiddleModel.__super__.constructor.apply(this, arguments);
      return _ref8;
    }

    return FiddleModel;

  })(Backbone.Model);

  FiddleView = (function(_super) {
    __extends(FiddleView, _super);

    function FiddleView() {
      this.render = __bind(this.render, this);
      this.updateFromRawHTML = __bind(this.updateFromRawHTML, this);
      this.updateFromRawDOM = __bind(this.updateFromRawDOM, this);
      this.rawHTMLUpdated = __bind(this.rawHTMLUpdated, this);
      this.rawDOMUpdated = __bind(this.rawDOMUpdated, this);
      _ref9 = FiddleView.__super__.constructor.apply(this, arguments);
      return _ref9;
    }

    FiddleView.prototype.template = 'fixie-fiddle-view';

    FiddleView.prototype.events = {
      "keyup #raw-dom": 'updateFromRawDOM',
      "keyup #raw-html": 'updateFromRawHTML'
    };

    FiddleView.prototype.initialize = function() {
      this.scrubber = new Scrubber(RuleSets.RichText);
      this.listenTo(this.model, "change:raw-dom", this.rawDOMUpdated);
      this.listenTo(this.model, "change:raw-html", this.rawHTMLUpdated);
      return this.render();
    };

    FiddleView.prototype.rawDOMUpdated = function() {
      var scrubbedSelection;
      scrubbedSelection = $(this.scrubber.cleanNode($("<div>" + (this.model.get('raw-dom')) + "</div>")[0]));
      this.$('#raw-html').val(this.model.get('raw-dom'));
      this.$('#scrubbed-dom').empty().append(scrubbedSelection);
      return this.$('#scrubbed-html').text(scrubbedSelection.html());
    };

    FiddleView.prototype.rawHTMLUpdated = function() {
      var rawHTML, scrubbedSelection;
      rawHTML = this.model.get('raw-html');
      scrubbedSelection = $(this.scrubber.cleanNode($("<div>" + rawHTML + "</div>")[0]));
      this.$('#raw-dom').html(rawHTML);
      this.$('#scrubbed-dom').empty().append(scrubbedSelection);
      return this.$('#scrubbed-html').text(scrubbedSelection.html());
    };

    FiddleView.prototype.updateFromRawDOM = function() {
      return this.model.set('raw-dom', this.$('#raw-dom').html());
    };

    FiddleView.prototype.updateFromRawHTML = function() {
      return this.model.set('raw-html', this.$('#raw-html').val());
    };

    FiddleView.prototype.render = function() {
      var context, template, template_result;
      template = (_.result(this.options, 'template')) || (_.result(this, 'template'));
      context = {
        RuleSets: RuleSets
      };
      template_result = render(template, context);
      this.$el.html(template_result);
      return this;
    };

    return FiddleView;

  })(Backbone.View);

  if (this.Fixie == null) {
    this.Fixie = {
      PlainTextEditor: PlainTextEditor,
      RichTextEditor: RichTextEditor,
      DateEditor: DateEditor,
      URLEditor: URLEditor,
      Preview: Preview,
      TemplatePreview: TemplatePreview,
      Checkbox: Checkbox,
      FiddleModel: FiddleModel,
      FiddleView: FiddleView,
      RuleSets: RuleSets
    };
  }

}).call(this);
