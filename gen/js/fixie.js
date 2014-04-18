(function() {
  var Checkbox, DateEditor, Editor, PlainTextEditor, Preview, RichTextEditor, URLEditor, assert, bare_scrubber, checkQueue, convert_to, enqueue_children, find_command, handlebars_render, keep_children_scrubber, link_scrubber, render, scrub_link, verbose, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6,
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

  checkQueue = function(queue) {
    var el, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = queue.length; _i < _len; _i++) {
      el = queue[_i];
      if (!el.parentNode) {
        throw new Error('orphaned node in queue');
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  enqueue_children = function(el, queue) {
    var elChild, _i, _len, _ref;
    checkQueue(queue);
    if (el.children) {
      _ref = el.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elChild = _ref[_i];
        assert(queue.indexOf(elChild) === -1);
        queue.push(elChild);
      }
    }
  };

  scrub_link = function(link) {
    var bad_predicate, good_predicate, invalid_link_predicates, valid_link_predicates, _i, _j, _len, _len1;
    invalid_link_predicates = [/javascript/];
    valid_link_predicates = [/^https:\/\//, /^http:\/\//, /^\//];
    for (_i = 0, _len = invalid_link_predicates.length; _i < _len; _i++) {
      bad_predicate = invalid_link_predicates[_i];
      if (bad_predicate.test(link)) {
        console.log("scrub_link : warning : link " + link + " was scrubbed as invalid");
        return null;
      }
    }
    for (_j = 0, _len1 = valid_link_predicates.length; _j < _len1; _j++) {
      good_predicate = valid_link_predicates[_j];
      if (good_predicate.test(link)) {
        return link;
      }
    }
  };

  bare_scrubber = function(el, queue) {
    var i;
    enqueue_children(el, queue);
    i = el.attributes.length - 1;
    while (i >= 0) {
      el.removeAttributeNode(el.attributes.item(i));
      i = i - 1;
    }
    return el;
  };

  convert_to = function(newTagName) {
    return function(el, queue) {
      var childNodes, elChildNode, elNew, nodesToMove, _i, _j, _len, _len1;
      if (!el.parentNode) {
        throw new Error('orphaned node given to convert_to');
      }
      childNodes = el.childNodes;
      elNew = el.parentNode.insertBefore(document.createElement(newTagName), el);
      nodesToMove = [];
      for (_i = 0, _len = childNodes.length; _i < _len; _i++) {
        elChildNode = childNodes[_i];
        nodesToMove.push(elChildNode);
      }
      for (_j = 0, _len1 = nodesToMove.length; _j < _len1; _j++) {
        elChildNode = nodesToMove[_j];
        elNew.appendChild(elChildNode);
      }
      if (el.childNodes.length !== 0) {
        throw new Error('el.childNodes should be 0');
      }
      el.parentNode.removeChild(el);
      checkQueue(queue);
      return elNew;
    };
  };

  assert = function(expr) {
    if (!expr) {
      throw new Error('assertion failed');
    }
  };

  keep_children_scrubber = function(el, queue) {
    var childNodes, elInsertBefore, i;
    assert(queue.indexOf(el) === -1);
    checkQueue(queue);
    if (!el.parentNode) {
      throw new Error('orphaned node given to convert_to');
    }
    enqueue_children(el, queue);
    checkQueue(queue);
    childNodes = el.childNodes;
    elInsertBefore = el;
    if (childNodes) {
      i = childNodes.length - 1;
      while (i >= 0) {
        elInsertBefore = el.parentNode.insertBefore(childNodes[i], elInsertBefore);
        checkQueue(queue);
        i = i - 1;
      }
    }
    checkQueue(queue);
    el.parentNode.removeChild(el);
    checkQueue(queue);
    return null;
  };

  link_scrubber = function(attribute, scrub_link) {
    return function(el, queue) {
      var scrubbed_attr;
      scrubbed_attr = null;
      if (el.hasAttribute(attribute)) {
        scrubbed_attr = scrub_link(el.getAttribute(attribute));
      }
      bare_scrubber(el, queue);
      if (scrubbed_attr) {
        el.setAttribute(attribute, scrubbed_attr);
      }
    };
  };

  find_command = function(node) {
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttribute('data-fixie-cmd')) {
        return node.getAttribute('data-fixie-cmd');
      }
      node = node.parentNode;
    }
    return null;
  };

  Editor = (function(_super) {
    __extends(Editor, _super);

    function Editor() {
      this.on_edit = __bind(this.on_edit, this);
      this._on_edit_core = __bind(this._on_edit_core, this);
      this.clean_editor_content = __bind(this.clean_editor_content, this);
      this._clean_node_core = __bind(this._clean_node_core, this);
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
      var _this = this;
      this.listenTo(this.model, "synced", function() {
        return _this.el.style.backgroundColor = 'white';
      });
      this.listenTo(this.model, "validation-error", function(error) {
        if (error.field === _this.options.text) {
          return _this.displayError(error);
        }
      });
      return this.render();
    };

    Editor.prototype.cmd = function(cmd_name) {
      return console.log("Fixie.Editor : info : running command '" + cmd_name + "'");
    };

    Editor.prototype._clean_node_core = function(node, rules) {
      var el, firstChild, queue, tagName, tag_filter, tag_filters, _i, _len;
      if (!node) {
        return;
      }
      queue = [];
      while (node.childNodes.length > 0) {
        firstChild = node.childNodes[0];
        if (firstChild.nodeType === Node.ELEMENT_NODE && firstChild.tagName.toLowerCase() === 'br') {
          node.removeChild(firstChild);
        } else {
          break;
        }
      }
      enqueue_children(node, queue);
      while (queue.length > 0) {
        el = queue.pop();
        checkQueue(queue);
        tagName = el.tagName.toLowerCase();
        if (!(tagName in rules)) {
          keep_children_scrubber(el, queue);
        } else {
          tag_filters = rules[tagName];
          if (typeof tag_filters === 'function') {
            tag_filters = [tag_filters];
          }
          for (_i = 0, _len = tag_filters.length; _i < _len; _i++) {
            tag_filter = tag_filters[_i];
            if (typeof tag_filter !== 'function') {
              throw new Error('Fixie : error : found a tag_filter that wasn\'t a function');
            }
            el = tag_filter(el, queue);
          }
        }
        checkQueue(queue);
      }
    };

    Editor.prototype.clean_editor_content = function() {
      var content;
      content = this.$('.fixie-editor-content')[0];
      this._clean_node_core(content, _.result(this, 'rules'));
      return content.innerHTML;
    };

    Editor.prototype._on_edit_core = function() {
      var prop_set;
      console.log("Fixie.Editor : info : " + this.options.text + " was edited");
      prop_set = {};
      prop_set[this.options.text] = this.clean_editor_content();
      this.stopListening(this.model, "change:" + this.options.text);
      return this.model.set(prop_set);
    };

    Editor.prototype.on_edit = function() {
      if (this.edit_timer) {
        window.clearTimeout(this.edit_timer);
      }
      return this.edit_timer = window.setTimeout(this._on_edit_core, 250);
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
      if (!this.options.text) {
        throw new Error('Fixie.Preview : error : you must specify a "text" property name on Fixie.Preview instances');
      }
      this.el.innerHTML = model.get(this.options.text);
      return this;
    };

    Preview.prototype.initialize = function() {
      if (!this.el) {
        throw new Error('Couldn\'t find el');
      }
      this.listenTo(this.model, "change:" + this.options.text, this.render);
      return this.render();
    };

    return Preview;

  })(Backbone.View);

  URLEditor = (function(_super) {
    __extends(URLEditor, _super);

    function URLEditor() {
      this.initialize = __bind(this.initialize, this);
      this.render = __bind(this.render, this);
      this.on_link_edit = __bind(this.on_link_edit, this);
      this.events = __bind(this.events, this);
      _ref2 = URLEditor.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    URLEditor.prototype.template = 'fixie-url-editor';

    URLEditor.prototype.rules = {};

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
      prop_set[this.options.link_url] = (scrub_link(link)) || '';
      this.model.set(prop_set);
      return this.render();
    };

    URLEditor.prototype.render = function() {
      var context, template, template_result;
      template = (_.result(this.options, 'template')) || (_.result(this, 'template'));
      context = {
        link_url: this.model.get(this.options.link_url),
        text: this.model.get(this.options.text)
      };
      template_result = render(template, context);
      this.$el.html(template_result);
      return this;
    };

    URLEditor.prototype.initialize = function() {
      this.render();
      if (!this.model.has(this.options.text)) {
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
      _ref3 = PlainTextEditor.__super__.constructor.apply(this, arguments);
      return _ref3;
    }

    PlainTextEditor.prototype.template = 'fixie-plain-editor';

    PlainTextEditor.prototype.rules = {};

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
        text: this.model.get(this.options.text)
      };
      template_result = render(template, context);
      this.$el.html(template_result);
      this.listenToOnce(this.model, "change:" + this.options.text, this.render);
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
      _ref4 = RichTextEditor.__super__.constructor.apply(this, arguments);
      return _ref4;
    }

    RichTextEditor.prototype.template = 'fixie-rich-editor';

    RichTextEditor.prototype.rules = {
      'a': link_scrubber('href', scrub_link),
      'b': bare_scrubber,
      'i': bare_scrubber,
      'br': bare_scrubber,
      'p': bare_scrubber,
      'strong': bare_scrubber,
      'em': bare_scrubber,
      'ul': bare_scrubber,
      'ol': bare_scrubber,
      'li': bare_scrubber,
      'div': bare_scrubber
    };

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
      var link;
      if (typeof document !== "undefined" && document !== null ? document.queryCommandEnabled('createlink') : void 0) {
        link = scrub_link(window.prompt('Please enter a URL:', this.model.get(this.options.link_url)));
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
      var context, template, template_result, toolbar_item, _i, _len, _ref5;
      template = (_.result(this.options, 'template')) || (_.result(this, 'template'));
      context = {
        text: this.model.get(this.options.text)
      };
      template_result = render(template, context);
      this.$el.html(template_result);
      _ref5 = this.$('.fixie-toolbar-item');
      for (_i = 0, _len = _ref5.length; _i < _len; _i++) {
        toolbar_item = _ref5[_i];
        toolbar_item.onmousedown = function() {
          return event.preventDefault();
        };
      }
      this.listenToOnce(this.model, "change:" + this.options.text, this.render);
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
      this._on_edit_core = __bind(this._on_edit_core, this);
      _ref5 = DateEditor.__super__.constructor.apply(this, arguments);
      return _ref5;
    }

    DateEditor.prototype._on_edit_core = function() {
      var e, format, prop_set, val;
      console.log("Fixie.DateEditor : info : " + this.options.text + " was edited");
      try {
        format = this.options.format || 'iso';
        val = (new Date(this.clean_editor_content())).toISOString();
        if (format === 'date') {
          val = val.substring(0, 10);
        }
        prop_set = {};
        prop_set[this.options.text] = val;
        this.stopListening(this.model, "change:" + this.options.text);
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
      _ref6 = Checkbox.__super__.constructor.apply(this, arguments);
      return _ref6;
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

  this.Fixie = {
    PlainTextEditor: PlainTextEditor,
    RichTextEditor: RichTextEditor,
    DateEditor: DateEditor,
    URLEditor: URLEditor,
    Preview: Preview,
    Checkbox: Checkbox
  };

}).call(this);

/*
//@ sourceMappingURL=fixie.js.map
*/