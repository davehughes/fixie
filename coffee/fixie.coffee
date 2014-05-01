#
# Fixie.js
#
# Simple View plugin for in-place editing of Rich Text via Backbone model properties.
#
# See also:
# http://tifftiff.de/contenteditable/compliance_test.html
# https://developer.mozilla.org/en-US/docs/Rich-Text_Editing_in_Mozilla#Executing_Commands
#
verbose = false

handlebars_render = (template_name, context) ->
  template = App.Handlebars[template_name]
  if template
    if verbose
      console.log "Rendering template '#{template_name}'"
    output = template context
    return output
  else
    throw "Fixie : error : couldn't find template '#{template_name}'"

render = handlebars_render

assert = (expr) ->
  if not expr
    throw new Error 'assertion failed'

wrapConfigurableScrubber = (scrubber, default_opts={}) ->
  (el_or_opts) ->
    if _.isPlainObject(el_or_opts)
        opts = _.extend(default_opts, el_or_opts)
        return (el) => scrubber(el, opts)
    else
        el = el_or_opts
        return scrubber(el, default_opts)

scrubUrl = (url) ->
  invalid_url_predicates = [
    /javascript/  #  Danger!
  ]
  valid_url_predicates = [
    /^https:\/\// #  HTTPS
    /^http:\/\//  #  HTTP
    /^\//         #  same hostname absolute path and protocol-retaining URL (//foo.com/bar/baz)
  ]

  for bad_predicate in invalid_url_predicates
    if bad_predicate.test(url)
      console.log "scrubUrl : warning : url #{url} was scrubbed as invalid"
      return null
  for good_predicate in valid_url_predicates
    if good_predicate.test(url)
      return url

stripScrubber = (el) -> null

scrubAttributes = (el, opts) ->
  only = opts?.only
  if only? and not _.isArray(only)
    only = [only]

  except = opts?.except
  if except? and not _.isArray(except)
    except = [except]

  $el = $(el)
  attrNames = _.map el.attributes, (attr, idx) -> attr.name
  _.each attrNames, (attrName) ->
    if only and attrName not in only
      return
    else if except and attrName in except
      return
    else
      $el.removeAttr(attrName)
  return el
scrubAttributes = wrapConfigurableScrubber(scrubAttributes)
        
    
convertTagScrubber = (el, opts) ->
  $("<#{opts.tagName}>").append($(el).contents())
convertTagScrubber = wrapConfigurableScrubber(convertTagScrubber)


keepContentsScrubber = (el, opts) -> $(el).contents()
keepContentsScrubber = wrapConfigurableScrubber(keepContentsScrubber)


scrubLink = (el, opts) ->
  $el = $(el)
  rawAttr = $el.attr(opts.attribute)
  $el.attr(opts.attribute, opts.scrubUrlFunc(rawAttr))
scrubLink = wrapConfigurableScrubber scrubLink,
  attribute: 'href'
  scrubUrlFunc: scrubUrl

class Scrubber

  constructor: (@rules) ->
    @rules.default ?= keepContentsScrubber

  cleanNode: (node) =>
    if not node then return
    @cleanNodeInitial(node)
    return @cleanNodeBFS(node)

  cleanNodeInitial: (node) =>
    if not node then return

    _(node.children)
      .first((child) -> child.tagName.toLowerCase() is 'br')
      .each((child) -> child.remove())

  cleanNodeBFS: (node) =>
    tagFilters = @resolveFilters(node) 
    for filter in tagFilters
      next = filter(node)
      if next == node
        continue
      if not next
        $(node).remove()
        return null
      else
        $(node).replaceWith(next)
        _.each next, (n) => @cleanNodeBFS(n)
        return next

    _.each $(node).children(), (n) => @cleanNodeBFS(n)
    return node

  resolveFilters: (el) =>
    tagName = el.tagName.toLowerCase()
    tag_filters = @rules[tagName] or @rules.default
    if typeof tag_filters is 'function'
      tag_filters = [tag_filters]
    for tag_filter in tag_filters
      if typeof tag_filter isnt 'function'
        throw new Error 'Fixie : error : found a tag_filter that wasn\'t a function'
    return tag_filters
  

class Editor extends Backbone.View
  displayError: (error) =>
    @el.style.backgroundColor = '#ffbbbb'

  initialize: =>
    @onEdit = _.throttle(@onEdit, @options.editThrottle ? 250, {trailing: true})
    @listenTo @model, "synced", =>
      @el.style.backgroundColor = 'white'
    @listenTo @model, "validation-error", (error) =>
      if error.field is @options.property
        @displayError error
    do @render

  cmd: (cmd_name) =>
    console.log "Fixie.Editor : info : running command '#{cmd_name}'"

  cleanEditorContent: =>
    content = @$('.fixie-editor-content')[0]
    @scrubber.cleanNode(content)
    return content.innerHTML

  onEdit: =>
    console.log "Fixie.Editor : info : #{@options.property} was edited"
    @stopListening @model, "change:#{@options.property}"
    @model.set(@options.property, @cleanEditorContent())


class Preview extends Backbone.View
  render: =>
    if not @options.property
      throw new Error 'Fixie.Preview : error : you must specify a "text" property name on Fixie.Preview instances'
    @el.innerHTML = model.get @options.property
    @

  initialize: =>
    if not @el
        throw new Error 'Couldn\'t find el'
    @listenTo @model, "change:#{@options.property}", @render
    @render()

class TemplatePreview extends Preview
  render: =>
    if not @options.property
      throw new Error 'Fixie.Preview : error : you must specify a "text" property name on Fixie.Preview instances'
    template = model.get(@options.property)
    rendered = nunjucks.renderString(template, @options?.data or {})
    @el.innerHTML = rendered
    @

RuleSets = 
  PlainText: {}
  RichText:
    a: [scrubLink, scrubAttributes {except: 'href'}]
    b: scrubAttributes
    i: scrubAttributes
    br: scrubAttributes
    p: scrubAttributes
    strong: scrubAttributes
    em: scrubAttributes
    ul: scrubAttributes
    ol: scrubAttributes
    li: scrubAttributes
    div: scrubAttributes
    default: scrubAttributes

class URLEditor extends Editor
  template: 'fixie-url-editor'
  scrubber: new Scrubber(RuleSets.PlainText)
  events: =>
    'keyup .fixie-editor-content': @onEdit
    'paste .fixie-editor-content': @onEdit
    'click .fixie-url-link-edit': @on_link_edit
 
  on_link_edit: =>
    link = window.prompt 'Please enter a URL:', @model.get(@options.link_url)
    prop_set = {}
    prop_set[@options.link_url] = (scrubUrl link) or ''
    @model.set prop_set
    @render()

  render: =>
    template = (_.result @options, 'template') or (_.result @, 'template')
    context =
      link_url: @model.get(@options.link_url)
      text: @model.get(@options.property)
    template_result = render template, context
    @$el.html(template_result)
    @

  initialize: =>
    @render()
    if not @model.has(@options.property)
      @listenToOnce @model, 'change', @render

class PlainTextEditor extends Editor
  template: 'fixie-plain-editor'
  scrubber: new Scrubber(RuleSets.PlainText)
  events: =>
    'keyup .fixie-editor-content': @onEdit
    'paste .fixie-editor-content': @onEdit

  cleanEditorContent: =>
    $el = @$('.fixie-editor-content')
    content = $el.text()
    content = content.replace(/[\r\n]/g, ' ')
    while true
      len = content.length
      content = content.replace('  ', ' ')
      if len is content.length
        break
    htmlInEl = $el[0].innerHTML
    if htmlInEl.indexOf('<') isnt -1
      $el.text content
    return content

  render: =>
    template = (_.result @options, 'template') or (_.result @, 'template')
    context =
      text: @model.get(@options.property)
    template_result = render template, context
    @$el.html(template_result)
    @listenToOnce @model, "change:#{@options.property}", @render
    @

  initialize: =>
    super


class RichTextEditor extends Editor
  template: 'fixie-rich-editor'
  scrubber: new Scrubber(RuleSets.RichText)

  initialize: ->
    # TODO consider pre-scrubbing the HTML prior to rendering

  events: =>
    'click .fixie-toolbar-item': @execCmd
    'keyup .fixie-editor-content': @onEdit
    'paste .fixie-editor-content': @onEdit

  render: =>
    template = (_.result @options, 'template') or (_.result @, 'template')
    context =
      text: @model.get(@options.property)
    template_result = render template, context
    @$el.html(template_result)

    for toolbar_item in @$('.fixie-toolbar-item')
      toolbar_item.onmousedown = -> event.preventDefault()

    @listenToOnce @model, "change:#{@options.property}", @render
    @

  dispatch: (command) =>
    if document.execCommand
      if command and document.queryCommandEnabled command
        console.log "Fixie.Editor : info : running command '#{command}'"
        document.execCommand command
        @onEdit()
      else
        console.log "Fixie.Editor : info : command #{command} is currently not enabled."
    else
      throw new Error 'Fixie.Editor : error : browser support is not available for this operation'

  insertLink: =>
    if document?.queryCommandEnabled 'createlink'
      linkUrl = window.prompt('Please enter a URL:', @model.get(@options.link_url))
      link = scrubUrl(linkUrl)
      if link
        document.execCommand 'createlink', false, link
        @onEdit()
      else
        window.alert 'Please try again. Urls must begin with /, http://, or https://'
    console.log 'Fixie.Editor : info : createlink is not enabled'

  execCmd: =>
    dispatchTable =
      bold: @dispatch
      italic: @dispatch
      insertOrderedList: @dispatch
      insertUnorderedList: @dispatch
      insertLink: @insertLink

    commandName = $(event.target).closest('[data-fixie-cmd]').data('fixie-cmd')
    command = dispatchTable[commandName]

    if not command
      throw new Error "Fixie.Editor : error : unexepected fixie-cmd: #{commandName}"

    command(commandName)
    return false


class DateEditor extends PlainTextEditor
  onEdit: =>
    console.log "Fixie.DateEditor : info : #{@options.property} was edited"
    try
      format = @options.format or 'iso'
      val = (new Date(@cleanEditorContent())).toISOString()
      if format == 'date'
        val = val.substring(0, 10) # Grab the date part
      prop_set = {}
      prop_set[@options.property] = val
      @stopListening @model, "change:#{@options.property}"
      @model.set prop_set
    catch e
    return

class Checkbox extends Backbone.View
  render: =>
    checked = @model.get(@options.property)
    html = """
      <form onsubmit='event.preventDefault()'>
        <label class='fixie-checkbox'>
          <input type='checkbox' name='#{@options.property}' #{if checked then 'checked' else ''}>
          <span>&nbsp;#{@options.description or @options.property}</span>
        </label>
      </form>"""
    @$el.html html

    @

  detectChange: =>
    checked = @$('input').is(':checked')
    @model.set @options.property, checked

  events: =>
    "change input[type=checkbox]": 'detectChange'

  initialize: =>
    if not @el
        throw new Error "Couldn't find el"
    @listenTo @model, "change:#{@options.property}", @render
    @render()

# Interactive preview classes
class FiddleModel extends Backbone.Model
  
class FiddleView extends Backbone.View
  template: 'fixie-fiddle-view'
  events:
    "keyup #raw-dom": 'updateFromRawDOM'
    "keyup #raw-html": 'updateFromRawHTML'
  
  initialize: ->
    @scrubber = new Scrubber(RuleSets.RichText)
    @listenTo @model, "change:raw-dom", @rawDOMUpdated
    @listenTo @model, "change:raw-html", @rawHTMLUpdated
    @render()
  
  rawDOMUpdated: =>
    scrubbedSelection = $(@scrubber.cleanNode($("<div>#{@model.get('raw-dom')}</div>")[0]))
    @$('#raw-html').val(@model.get('raw-dom'))
    @$('#scrubbed-dom').empty().append(scrubbedSelection)
    scrubbedHTML = _.reduce(scrubbedSelection, ((acc, x) -> acc + x.outerHTML), '')
    @$('#scrubbed-html').text(scrubbedHTML)

  rawHTMLUpdated: =>
    rawHTML = @model.get('raw-html')

    scrubbedSelection = $(@scrubber.cleanNode($("<div>#{rawHTML}</div>")[0]))
    @$('#raw-dom').html(rawHTML)
    @$('#scrubbed-dom').empty().append(scrubbedSelection)
    scrubbedHTML = _.reduce(scrubbedSelection, ((acc, x) -> acc + x.outerHTML), '')
    @$('#scrubbed-html').text(scrubbedHTML)

  updateFromRawDOM: =>
    @model.set 'raw-dom', @$('#raw-dom').html()

  updateFromRawHTML: =>
    @model.set 'raw-html', @$('#raw-html').val()

  render: =>
    template = (_.result @options, 'template') or (_.result @, 'template')
    context =
        RuleSets: RuleSets
    template_result = render template, context
    @$el.html(template_result)
    @

@Fixie ?= {
  PlainTextEditor
  RichTextEditor
  DateEditor
  URLEditor
  Preview
  TemplatePreview
  Checkbox
  FiddleModel
  FiddleView
  RuleSets
}
