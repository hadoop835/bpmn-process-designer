import { isArray, isFunction, forEach } from "min-dash";

import {
  domify,
  query as domQuery,
  attr as domAttr,
  clear as domClear,
  classes as domClasses,
  matches as domMatches,
  delegate as domDelegate,
  event as domEvent
} from "min-dom";

var TOGGLE_SELECTOR = ".djs-palette-toggle";
var ENTRY_SELECTOR = ".entry";
var ELEMENT_SELECTOR = TOGGLE_SELECTOR + ", " + ENTRY_SELECTOR;

var PALETTE_OPEN_CLS = "open";
var PALETTE_TWO_COLUMN_CLS = "two-column";

var DEFAULT_PRIORITY = 1000;

/**
 * A palette containing modeling elements.
 */
export default function Palette(eventBus, canvas, elementFactory, create, paletteContainer, paletteEntries) {
  this._eventBus = eventBus;
  this._canvas = canvas;
  // 新增赋值
  this._entries = paletteEntries; // 传入的工具栏数据
  this._paletteContainer = paletteContainer; // 传入的工具栏容器
  this._elementFactory = elementFactory;
  this._create = create;

  var self = this;
  eventBus.on("tool-manager.update", function (event) {
    var tool = event.tool;

    self.updateToolHighlight(tool);
  });

  eventBus.on("i18n.changed", function () {
    self._update();
  });

  eventBus.on("diagram.init", function () {
    self._diagramInitialized = true;

    self._rebuild();
  });
}

Palette.$inject = [
  "eventBus",
  "canvas",
  "elementFactory",
  "create",
  "config.paletteContainer",
  "config.paletteEntries"
];

/**
 * Register a provider with the palette
 *
 * @param  {number} [priority=1000]
 * @param  {PaletteProvider} provider
 *
 * @example
 * const paletteProvider = {
 *   getPaletteEntries: function() {
 *     return function(entries) {
 *       return {
 *         ...entries,
 *         'entry-1': {
 *           label: 'My Entry',
 *           action: function() { alert("I have been clicked!"); }
 *         }
 *       };
 *     }
 *   }
 * };
 *
 * palette.registerProvider(800, paletteProvider);
 */
Palette.prototype.registerProvider = function (priority, provider) {
  if (!provider) {
    provider = priority;
    priority = DEFAULT_PRIORITY;
  }

  this._eventBus.on("palette.getProviders", priority, function (event) {
    event.providers.push(provider);
  });

  this._rebuild();
};

/**
 * Returns the palette entries
 *
 * @return {Object<string, PaletteEntryDescriptor>} map of entries
 */
Palette.prototype.getEntries = function () {
  var providers = this._getProviders();

  return providers.reduce(addPaletteEntries, {});
};

Palette.prototype._rebuild = function () {
  if (!this._diagramInitialized) {
    return;
  }

  var providers = this._getProviders();

  if (!providers.length) {
    return;
  }

  if (!this._container) {
    this._init();
  }

  this._update();
};

/**
 * Initialize
 */
Palette.prototype._init = function () {
  var self = this;

  var eventBus = this._eventBus;

  var parentContainer = this._getParentContainer();

  var container = (this._container = domify(Palette.HTML_MARKUP));

  parentContainer.appendChild(container);

  domDelegate.bind(container, ELEMENT_SELECTOR, "click", function (event) {
    var target = event.delegateTarget;

    if (domMatches(target, TOGGLE_SELECTOR)) {
      return self.toggle();
    }

    self.trigger("click", event);
  });

  // prevent drag propagation
  domEvent.bind(container, "mousedown", function (event) {
    event.stopPropagation();
  });

  // prevent drag propagation
  domDelegate.bind(container, ENTRY_SELECTOR, "dragstart", function (event) {
    self.trigger("dragstart", event);
  });

  eventBus.on("canvas.resized", this._layoutChanged, this);

  eventBus.fire("palette.create", {
    container: container
  });
};

Palette.prototype._getProviders = function (id) {
  var event = this._eventBus.createEvent({
    type: "palette.getProviders",
    providers: []
  });

  this._eventBus.fire(event);

  return event.providers;
};

/**
 * Update palette state.
 *
 * @param  {Object} [state] { open, twoColumn }
 */
Palette.prototype._toggleState = function (state) {
  state = state || {};

  var parent = this._getParentContainer();
  var container = this._container;

  var eventBus = this._eventBus;

  var twoColumn;

  var cls = domClasses(container);

  if ("twoColumn" in state) {
    twoColumn = state.twoColumn;
  } else {
    twoColumn = this._needsCollapse(parent.clientHeight, this._entries || {});
  }

  // always update two column
  cls.toggle(PALETTE_TWO_COLUMN_CLS, twoColumn);

  if ("open" in state) {
    cls.toggle(PALETTE_OPEN_CLS, state.open);
  }

  eventBus.fire("palette.changed", {
    twoColumn: twoColumn,
    open: this.isOpen()
  });
};

Palette.prototype._update = function () {
  var collapse_btn = domify('<div class="tool-collapse-btn"><i class="el-icon-arrow-left"></i></div>');
  collapse_btn.addEventListener("click", function () {
    debugger;
    const toolIconArrowLeft = domQuery(".el-icon-arrow-left", collapse_btn);
    const toolIconArrowRight = domQuery(".el-icon-arrow-right", collapse_btn);
    var paletteContainer = domQuery(".djs-palette", this._container);
    var entriesContainer = domQuery(".djs-palette-entries", this._container);
    if (toolIconArrowLeft) {
      toolIconArrowLeft.classList = ["el-icon-arrow-right"];
      paletteContainer.style.width = "0px";
      addClasses(entriesContainer, "collapsed");
    }
    if (toolIconArrowRight) {
      toolIconArrowRight.classList = ["el-icon-arrow-left"];
      paletteContainer.style.width = "180px";
      setTimeout(function () {
        removeClasses(entriesContainer, "collapsed");
      }, 100);
    }
  });
  this._container.appendChild(collapse_btn);
  var entriesContainer = domQuery(".djs-palette-entries", this._container);
  var entries = (this._entries = this.getEntries());
  domClear(entriesContainer);

  forEach(entries, function (entry, id) {
    var grouping = entry.group || "default";
    var groupName = entry.groupName || "default";
    var container = domQuery("[data-group=" + grouping + "]", entriesContainer);
    if (!container) {
      container = domify('<div class="group" data-group="' + grouping + '"></div>');

      const groupLabel = domify(
        `<div class="groupLabel"><label>&nbsp;</label><span title="${groupName}">${groupName}</span><i id="custom-palette-group-arrow" class="el-icon-arrow-down"></i></div></div>`
      );
      groupLabel.addEventListener("click", function () {
        const iconArrowDown = this.querySelector(".el-icon-arrow-down");
        const iconArrowLeft = this.querySelector(".el-icon-arrow-left");
        if (iconArrowDown) {
          iconArrowDown.classList = ["el-icon-arrow-left"];
          const entry = this.parentNode.querySelectorAll(".entry");
          forEach(entry, function (it) {
            it.style.display = "none";
          });
        }
        if (iconArrowLeft) {
          iconArrowLeft.classList = ["el-icon-arrow-down"];
          const entry = this.parentNode.querySelectorAll(".entry");
          forEach(entry, function (it) {
            it.style.display = "block";
          });
        }
      });
      container.appendChild(groupLabel);
      entriesContainer.appendChild(container);
    }

    var html =
      entry.html ||
      (entry.separator
        ? '<hr class="separator" style="border-bottom:0px solid" />'
        : '<div class="entry" draggable="true"></div>');

    var control = domify(html);
    container.appendChild(control);

    if (!entry.separator) {
      debugger;
      domAttr(control, "data-action", id);

      if (entry.title) {
        domAttr(control, "title", entry.title);
      }

      if (entry.className) {
        addClasses(control, entry.className);
      }

      if (entry.imageUrl) {
        control.appendChild(domify('<img src="' + entry.imageUrl + '">'));
      }
    }
  });

  // open after update
  this.open();
};

/**
 * Trigger an action available on the palette
 *
 * @param  {string} action
 * @param  {Event} event
 */
Palette.prototype.trigger = function (action, event, autoActivate) {
  var entries = this._entries;
  var elementFactory = this._elementFactory;
  var bpmnFactory = this._bpmnFactory;
  var model = this._model;
  var create = this._create;
  var entry;
  var handler;
  var originalEvent;
  var button = event.delegateTarget || event.target;

  if (!button) {
    return event.preventDefault();
  }

  entry = entries[domAttr(button, "data-action")];

  // when user clicks on the palette and not on an action
  if (!entry) {
    return;
  }

  handler = entry.action;

  originalEvent = event.originalEvent || event;
  // simple action (via callback function)
  if (isFunction(handler)) {
    if (action === "click") {
      handler(originalEvent, autoActivate, elementFactory, bpmnFactory, model, create);
    }
  } else {
    if (handler[action]) {
      handler[action](originalEvent, autoActivate, elementFactory, bpmnFactory, model, create);
    }
  }
  // silence other actions
  event.preventDefault();
};

Palette.prototype._layoutChanged = function () {
  this._toggleState({});
};

/**
 * Do we need to collapse to two columns?
 *
 * @param {number} availableHeight
 * @param {Object} entries
 *
 * @return {boolean}
 */
Palette.prototype._needsCollapse = function (availableHeight, entries) {
  // top margin + bottom toggle + bottom margin
  // implementors must override this method if they
  // change the palette styles
  var margin = 20 + 10 + 20;

  var entriesHeight = Object.keys(entries).length * 46;

  return availableHeight < entriesHeight + margin;
};

/**
 * Close the palette
 */
Palette.prototype.close = function () {
  this._toggleState({
    open: false,
    twoColumn: false
  });
};

/**
 * Open the palette
 */
Palette.prototype.open = function () {
  this._toggleState({ open: true });
};

Palette.prototype.toggle = function (open) {
  if (this.isOpen()) {
    this.close();
  } else {
    this.open();
  }
};

Palette.prototype.isActiveTool = function (tool) {
  return tool && this._activeTool === tool;
};

Palette.prototype.updateToolHighlight = function (name) {
  debugger;
  var entriesContainer, toolsContainer;

  if (!this._toolsContainer) {
    entriesContainer = domQuery(".djs-palette-entries", this._container);

    this._toolsContainer = domQuery("[data-group=tools]", entriesContainer);
  }

  toolsContainer = this._toolsContainer;

  forEach(toolsContainer.children, function (tool) {
    var actionName = tool.getAttribute("data-action");

    if (!actionName) {
      return;
    }

    var toolClasses = domClasses(tool);

    actionName = actionName.replace("-tool", "");

    if (toolClasses.contains("entry") && actionName === name) {
      toolClasses.add("highlighted-entry");
    } else {
      toolClasses.remove("highlighted-entry");
    }
  });
};

/**
 * Return true if the palette is opened.
 *
 * @example
 *
 * palette.open();
 *
 * if (palette.isOpen()) {
 *   // yes, we are open
 * }
 *
 * @return {boolean} true if palette is opened
 */
Palette.prototype.isOpen = function () {
  return domClasses(this._container).has(PALETTE_OPEN_CLS);
};

/**
 * Get container the palette lives in.
 *
 * @return {Element}
 */
Palette.prototype._getParentContainer = function () {
  return this._canvas.getContainer();
};

/* markup definition */

Palette.HTML_MARKUP =
  '<div class="djs-palette" style="width: 180px;transition: width .3s ease-in-out;height: calc(100% - 1px); border: 1px solid #e6ebf2;background: #fff; position: absolute;left: 0px;top: 0px;">' +
  '<div class="djs-palette-entries"></div>' +
  '<div class="djs-palette-toggle"></div>' +
  "</div>";

// helpers //////////////////////

function addClasses(element, classNames) {
  var classes = domClasses(element);

  var actualClassNames = isArray(classNames) ? classNames : classNames.split(/\s+/g);
  actualClassNames.forEach(function (cls) {
    classes.add(cls);
  });
}

function removeClasses(element, classNames) {
  var classes = domClasses(element);

  var actualClassNames = isArray(classNames) ? classNames : classNames.split(/\s+/g);
  actualClassNames.forEach(function (cls) {
    classes.remove(cls);
  });
}

function addPaletteEntries(entries, provider) {
  var entriesOrUpdater = provider.getPaletteEntries();

  if (isFunction(entriesOrUpdater)) {
    return entriesOrUpdater(entries);
  }

  forEach(entriesOrUpdater, function (entry, id) {
    entries[id] = entry;
  });

  return entries;
}
