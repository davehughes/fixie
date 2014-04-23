this["App"] = this["App"] || {};
this["App"]["Handlebars"] = this["App"]["Handlebars"] || {};

this["App"]["Handlebars"]["fixie-date-editor"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"fixie-editor-content\" contenteditable>";
  if (stack1 = helpers.text) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.text; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</div>\n\n";
  return buffer;
  });

this["App"]["Handlebars"]["fixie-fiddle-view"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"container fiddle-container\">\n    <div class=\"row\">\n        <h1>Fiddle with Fixie <i class=\"fa fa-gears\"></i></h1>\n        <section class=\"col-xs-6\">\n            <div id=\"raw-dom\" contenteditable></div>\n            <span class=\"section-label\">Raw DOM</span>\n        </section>\n\n        <section class=\"col-xs-6\">\n            <textarea id=\"raw-html\"/>\n            <span class=\"section-label\">Raw HTML</span>\n        </section>\n    </div>\n    <div class=\"row\">\n        <section class=\"col-xs-6\">\n            <div id=\"scrubbed-dom\"></div>\n            <span class=\"section-label\">Scrubbed DOM <i class=\"fa fa-lock\"></i></span>\n        </section>\n        <section class=\"col-xs-6\">\n            <div id=\"scrubbed-html\"/>\n            <span class=\"section-label\">Scrubbed HTML <i class=\"fa fa-lock\"></i></span>\n        </section>\n    </div>\n</div>\n";
  });

this["App"]["Handlebars"]["fixie-plain-editor"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"fixie-editor-content\" contenteditable>";
  if (stack1 = helpers.text) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.text; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</div>\n\n";
  return buffer;
  });

this["App"]["Handlebars"]["fixie-rich-editor"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function";


  buffer += "<div class=\"margin-toolbar-container\">\n	<div class=\"fixie-editor-content\" contenteditable>";
  if (stack1 = helpers.text) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.text; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</div>\n	<div class=\"margin-toolbar\">\n		<div class=\"fixie-editor-toolbar btn-group btn-group-vertical\">\n			<button class=\"btn btn-default fixie-toolbar-item\" data-fixie-cmd=\"bold\">\n                <i class=\"fa fa-bold icon-bold\"></i>\n            </button>\n			<button class=\"btn btn-default fixie-toolbar-item\" data-fixie-cmd=\"italic\">\n                <i class=\"fa fa-italic icon-italic\"></i>\n            </button>\n			<button class=\"btn btn-default fixie-toolbar-item\" data-fixie-cmd=\"insertOrderedList\">\n                <i class=\"fa fa-list-ol icon-list-ol\"></i>\n            </button>\n			<button class=\"btn btn-default fixie-toolbar-item\" data-fixie-cmd=\"insertUnorderedList\">\n                <i class=\"fa fa-list-ul icon-list-ul\"></i>\n            </button>\n			<button class=\"btn btn-default fixie-toolbar-item\" data-fixie-cmd=\"insertLink\">\n                <i class=\"fa fa-link icon-link\"></i>\n            </button>\n		</div>\n	</div>\n</div>\n\n";
  return buffer;
  });

this["App"]["Handlebars"]["fixie-url-editor"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<a class=\"fixie-url-editor fixie-editor-content\" href=\"";
  if (stack1 = helpers.link_url) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.link_url; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" contenteditable>";
  if (stack1 = helpers.text) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.text; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</a>\n<button class=\"btn btn-mini fixie-url-link-edit\">Edit Link...</button>\n\n";
  return buffer;
  });