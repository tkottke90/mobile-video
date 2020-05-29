/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const directives = new WeakMap();
/**
 * Brands a function as a directive factory function so that lit-html will call
 * the function during template rendering, rather than passing as a value.
 *
 * A _directive_ is a function that takes a Part as an argument. It has the
 * signature: `(part: Part) => void`.
 *
 * A directive _factory_ is a function that takes arguments for data and
 * configuration and returns a directive. Users of directive usually refer to
 * the directive factory as the directive. For example, "The repeat directive".
 *
 * Usually a template author will invoke a directive factory in their template
 * with relevant arguments, which will then return a directive function.
 *
 * Here's an example of using the `repeat()` directive factory that takes an
 * array and a function to render an item:
 *
 * ```js
 * html`<ul><${repeat(items, (item) => html`<li>${item}</li>`)}</ul>`
 * ```
 *
 * When `repeat` is invoked, it returns a directive function that closes over
 * `items` and the template function. When the outer template is rendered, the
 * return directive function is called with the Part for the expression.
 * `repeat` then performs it's custom logic to render multiple items.
 *
 * @param f The directive factory function. Must be a function that returns a
 * function of the signature `(part: Part) => void`. The returned function will
 * be called with the part object.
 *
 * @example
 *
 * import {directive, html} from 'lit-html';
 *
 * const immutable = directive((v) => (part) => {
 *   if (part.value !== v) {
 *     part.setValue(v)
 *   }
 * });
 */
const directive = (f) => ((...args) => {
    const d = f(...args);
    directives.set(d, true);
    return d;
});
const isDirective = (o) => {
    return typeof o === 'function' && directives.has(o);
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * True if the custom elements polyfill is in use.
 */
const isCEPolyfill = typeof window !== 'undefined' &&
    window.customElements != null &&
    window.customElements.polyfillWrapFlushCallback !==
        undefined;
/**
 * Removes nodes, starting from `start` (inclusive) to `end` (exclusive), from
 * `container`.
 */
const removeNodes = (container, start, end = null) => {
    while (start !== end) {
        const n = start.nextSibling;
        container.removeChild(start);
        start = n;
    }
};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = {};
/**
 * A sentinel value that signals a NodePart to fully clear its content.
 */
const nothing = {};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An expression marker with embedded unique key to avoid collision with
 * possible text in templates.
 */
const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
/**
 * An expression marker used text-positions, multi-binding attributes, and
 * attributes with markup-like text values.
 */
const nodeMarker = `<!--${marker}-->`;
const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
/**
 * Suffix appended to all bound attribute names.
 */
const boundAttributeSuffix = '$lit$';
/**
 * An updatable Template that tracks the location of dynamic parts.
 */
class Template {
    constructor(result, element) {
        this.parts = [];
        this.element = element;
        const nodesToRemove = [];
        const stack = [];
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(element.content, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        // Keeps track of the last index associated with a part. We try to delete
        // unnecessary nodes, but we never want to associate two different parts
        // to the same index. They must have a constant node between.
        let lastPartIndex = 0;
        let index = -1;
        let partIndex = 0;
        const { strings, values: { length } } = result;
        while (partIndex < length) {
            const node = walker.nextNode();
            if (node === null) {
                // We've exhausted the content inside a nested template element.
                // Because we still have parts (the outer for-loop), we know:
                // - There is a template in the stack
                // - The walker will find a nextNode outside the template
                walker.currentNode = stack.pop();
                continue;
            }
            index++;
            if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                if (node.hasAttributes()) {
                    const attributes = node.attributes;
                    const { length } = attributes;
                    // Per
                    // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                    // attributes are not guaranteed to be returned in document order.
                    // In particular, Edge/IE can return them out of order, so we cannot
                    // assume a correspondence between part index and attribute index.
                    let count = 0;
                    for (let i = 0; i < length; i++) {
                        if (endsWith(attributes[i].name, boundAttributeSuffix)) {
                            count++;
                        }
                    }
                    while (count-- > 0) {
                        // Get the template literal section leading up to the first
                        // expression in this attribute
                        const stringForPart = strings[partIndex];
                        // Find the attribute name
                        const name = lastAttributeNameRegex.exec(stringForPart)[2];
                        // Find the corresponding attribute
                        // All bound attributes have had a suffix added in
                        // TemplateResult#getHTML to opt out of special attribute
                        // handling. To look up the attribute value we also need to add
                        // the suffix.
                        const attributeLookupName = name.toLowerCase() + boundAttributeSuffix;
                        const attributeValue = node.getAttribute(attributeLookupName);
                        node.removeAttribute(attributeLookupName);
                        const statics = attributeValue.split(markerRegex);
                        this.parts.push({ type: 'attribute', index, name, strings: statics });
                        partIndex += statics.length - 1;
                    }
                }
                if (node.tagName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
            }
            else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                const data = node.data;
                if (data.indexOf(marker) >= 0) {
                    const parent = node.parentNode;
                    const strings = data.split(markerRegex);
                    const lastIndex = strings.length - 1;
                    // Generate a new text node for each literal section
                    // These nodes are also used as the markers for node parts
                    for (let i = 0; i < lastIndex; i++) {
                        let insert;
                        let s = strings[i];
                        if (s === '') {
                            insert = createMarker();
                        }
                        else {
                            const match = lastAttributeNameRegex.exec(s);
                            if (match !== null && endsWith(match[2], boundAttributeSuffix)) {
                                s = s.slice(0, match.index) + match[1] +
                                    match[2].slice(0, -boundAttributeSuffix.length) + match[3];
                            }
                            insert = document.createTextNode(s);
                        }
                        parent.insertBefore(insert, node);
                        this.parts.push({ type: 'node', index: ++index });
                    }
                    // If there's no text, we must insert a comment to mark our place.
                    // Else, we can trust it will stick around after cloning.
                    if (strings[lastIndex] === '') {
                        parent.insertBefore(createMarker(), node);
                        nodesToRemove.push(node);
                    }
                    else {
                        node.data = strings[lastIndex];
                    }
                    // We have a part for each match found
                    partIndex += lastIndex;
                }
            }
            else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
                if (node.data === marker) {
                    const parent = node.parentNode;
                    // Add a new marker node to be the startNode of the Part if any of
                    // the following are true:
                    //  * We don't have a previousSibling
                    //  * The previousSibling is already the start of a previous part
                    if (node.previousSibling === null || index === lastPartIndex) {
                        index++;
                        parent.insertBefore(createMarker(), node);
                    }
                    lastPartIndex = index;
                    this.parts.push({ type: 'node', index });
                    // If we don't have a nextSibling, keep this node so we have an end.
                    // Else, we can remove it to save future costs.
                    if (node.nextSibling === null) {
                        node.data = '';
                    }
                    else {
                        nodesToRemove.push(node);
                        index--;
                    }
                    partIndex++;
                }
                else {
                    let i = -1;
                    while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
                        // Comment node has a binding marker inside, make an inactive part
                        // The binding won't work, but subsequent bindings will
                        // TODO (justinfagnani): consider whether it's even worth it to
                        // make bindings in comments work
                        this.parts.push({ type: 'node', index: -1 });
                        partIndex++;
                    }
                }
            }
        }
        // Remove text binding nodes after the walk to not disturb the TreeWalker
        for (const n of nodesToRemove) {
            n.parentNode.removeChild(n);
        }
    }
}
const endsWith = (str, suffix) => {
    const index = str.length - suffix.length;
    return index >= 0 && str.slice(index) === suffix;
};
const isTemplatePartActive = (part) => part.index !== -1;
// Allows `document.createComment('')` to be renamed for a
// small manual size-savings.
const createMarker = () => document.createComment('');
/**
 * This regex extracts the attribute name preceding an attribute-position
 * expression. It does this by matching the syntax allowed for attributes
 * against the string literal directly preceding the expression, assuming that
 * the expression is in an attribute-value position.
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \x09\x0a\x0c\x0d" are HTML space characters:
 * https://www.w3.org/TR/html5/infrastructure.html#space-characters
 *
 * "\0-\x1F\x7F-\x9F" are Unicode control characters, which includes every
 * space character except " ".
 *
 * So an attribute is:
 *  * The name: any character except a control character, space character, ('),
 *    ("), ">", "=", or "/"
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const lastAttributeNameRegex = 
// eslint-disable-next-line no-control-regex
/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An instance of a `Template` that can be attached to the DOM and updated
 * with new values.
 */
class TemplateInstance {
    constructor(template, processor, options) {
        this.__parts = [];
        this.template = template;
        this.processor = processor;
        this.options = options;
    }
    update(values) {
        let i = 0;
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.setValue(values[i]);
            }
            i++;
        }
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.commit();
            }
        }
    }
    _clone() {
        // There are a number of steps in the lifecycle of a template instance's
        // DOM fragment:
        //  1. Clone - create the instance fragment
        //  2. Adopt - adopt into the main document
        //  3. Process - find part markers and create parts
        //  4. Upgrade - upgrade custom elements
        //  5. Update - set node, attribute, property, etc., values
        //  6. Connect - connect to the document. Optional and outside of this
        //     method.
        //
        // We have a few constraints on the ordering of these steps:
        //  * We need to upgrade before updating, so that property values will pass
        //    through any property setters.
        //  * We would like to process before upgrading so that we're sure that the
        //    cloned fragment is inert and not disturbed by self-modifying DOM.
        //  * We want custom elements to upgrade even in disconnected fragments.
        //
        // Given these constraints, with full custom elements support we would
        // prefer the order: Clone, Process, Adopt, Upgrade, Update, Connect
        //
        // But Safari does not implement CustomElementRegistry#upgrade, so we
        // can not implement that order and still have upgrade-before-update and
        // upgrade disconnected fragments. So we instead sacrifice the
        // process-before-upgrade constraint, since in Custom Elements v1 elements
        // must not modify their light DOM in the constructor. We still have issues
        // when co-existing with CEv0 elements like Polymer 1, and with polyfills
        // that don't strictly adhere to the no-modification rule because shadow
        // DOM, which may be created in the constructor, is emulated by being placed
        // in the light DOM.
        //
        // The resulting order is on native is: Clone, Adopt, Upgrade, Process,
        // Update, Connect. document.importNode() performs Clone, Adopt, and Upgrade
        // in one step.
        //
        // The Custom Elements v1 polyfill supports upgrade(), so the order when
        // polyfilled is the more ideal: Clone, Process, Adopt, Upgrade, Update,
        // Connect.
        const fragment = isCEPolyfill ?
            this.template.element.content.cloneNode(true) :
            document.importNode(this.template.element.content, true);
        const stack = [];
        const parts = this.template.parts;
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        let partIndex = 0;
        let nodeIndex = 0;
        let part;
        let node = walker.nextNode();
        // Loop through all the nodes and parts of a template
        while (partIndex < parts.length) {
            part = parts[partIndex];
            if (!isTemplatePartActive(part)) {
                this.__parts.push(undefined);
                partIndex++;
                continue;
            }
            // Progress the tree walker until we find our next part's node.
            // Note that multiple parts may share the same node (attribute parts
            // on a single element), so this loop may not run at all.
            while (nodeIndex < part.index) {
                nodeIndex++;
                if (node.nodeName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
                if ((node = walker.nextNode()) === null) {
                    // We've exhausted the content inside a nested template element.
                    // Because we still have parts (the outer for-loop), we know:
                    // - There is a template in the stack
                    // - The walker will find a nextNode outside the template
                    walker.currentNode = stack.pop();
                    node = walker.nextNode();
                }
            }
            // We've arrived at our part's node.
            if (part.type === 'node') {
                const part = this.processor.handleTextExpression(this.options);
                part.insertAfterNode(node.previousSibling);
                this.__parts.push(part);
            }
            else {
                this.__parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
            }
            partIndex++;
        }
        if (isCEPolyfill) {
            document.adoptNode(fragment);
            customElements.upgrade(fragment);
        }
        return fragment;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const commentMarker = ` ${marker} `;
/**
 * The return type of `html`, which holds a Template and the values from
 * interpolated expressions.
 */
class TemplateResult {
    constructor(strings, values, type, processor) {
        this.strings = strings;
        this.values = values;
        this.type = type;
        this.processor = processor;
    }
    /**
     * Returns a string of HTML used to create a `<template>` element.
     */
    getHTML() {
        const l = this.strings.length - 1;
        let html = '';
        let isCommentBinding = false;
        for (let i = 0; i < l; i++) {
            const s = this.strings[i];
            // For each binding we want to determine the kind of marker to insert
            // into the template source before it's parsed by the browser's HTML
            // parser. The marker type is based on whether the expression is in an
            // attribute, text, or comment position.
            //   * For node-position bindings we insert a comment with the marker
            //     sentinel as its text content, like <!--{{lit-guid}}-->.
            //   * For attribute bindings we insert just the marker sentinel for the
            //     first binding, so that we support unquoted attribute bindings.
            //     Subsequent bindings can use a comment marker because multi-binding
            //     attributes must be quoted.
            //   * For comment bindings we insert just the marker sentinel so we don't
            //     close the comment.
            //
            // The following code scans the template source, but is *not* an HTML
            // parser. We don't need to track the tree structure of the HTML, only
            // whether a binding is inside a comment, and if not, if it appears to be
            // the first binding in an attribute.
            const commentOpen = s.lastIndexOf('<!--');
            // We're in comment position if we have a comment open with no following
            // comment close. Because <-- can appear in an attribute value there can
            // be false positives.
            isCommentBinding = (commentOpen > -1 || isCommentBinding) &&
                s.indexOf('-->', commentOpen + 1) === -1;
            // Check to see if we have an attribute-like sequence preceding the
            // expression. This can match "name=value" like structures in text,
            // comments, and attribute values, so there can be false-positives.
            const attributeMatch = lastAttributeNameRegex.exec(s);
            if (attributeMatch === null) {
                // We're only in this branch if we don't have a attribute-like
                // preceding sequence. For comments, this guards against unusual
                // attribute values like <div foo="<!--${'bar'}">. Cases like
                // <!-- foo=${'bar'}--> are handled correctly in the attribute branch
                // below.
                html += s + (isCommentBinding ? commentMarker : nodeMarker);
            }
            else {
                // For attributes we use just a marker sentinel, and also append a
                // $lit$ suffix to the name to opt-out of attribute-specific parsing
                // that IE and Edge do for style and certain SVG attributes.
                html += s.substr(0, attributeMatch.index) + attributeMatch[1] +
                    attributeMatch[2] + boundAttributeSuffix + attributeMatch[3] +
                    marker;
            }
        }
        html += this.strings[l];
        return html;
    }
    getTemplateElement() {
        const template = document.createElement('template');
        template.innerHTML = this.getHTML();
        return template;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const isPrimitive = (value) => {
    return (value === null ||
        !(typeof value === 'object' || typeof value === 'function'));
};
const isIterable = (value) => {
    return Array.isArray(value) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !!(value && value[Symbol.iterator]);
};
/**
 * Writes attribute values to the DOM for a group of AttributeParts bound to a
 * single attribute. The value is only set once even if there are multiple parts
 * for an attribute.
 */
class AttributeCommitter {
    constructor(element, name, strings) {
        this.dirty = true;
        this.element = element;
        this.name = name;
        this.strings = strings;
        this.parts = [];
        for (let i = 0; i < strings.length - 1; i++) {
            this.parts[i] = this._createPart();
        }
    }
    /**
     * Creates a single part. Override this to create a differnt type of part.
     */
    _createPart() {
        return new AttributePart(this);
    }
    _getValue() {
        const strings = this.strings;
        const l = strings.length - 1;
        let text = '';
        for (let i = 0; i < l; i++) {
            text += strings[i];
            const part = this.parts[i];
            if (part !== undefined) {
                const v = part.value;
                if (isPrimitive(v) || !isIterable(v)) {
                    text += typeof v === 'string' ? v : String(v);
                }
                else {
                    for (const t of v) {
                        text += typeof t === 'string' ? t : String(t);
                    }
                }
            }
        }
        text += strings[l];
        return text;
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            this.element.setAttribute(this.name, this._getValue());
        }
    }
}
/**
 * A Part that controls all or part of an attribute value.
 */
class AttributePart {
    constructor(committer) {
        this.value = undefined;
        this.committer = committer;
    }
    setValue(value) {
        if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
            this.value = value;
            // If the value is a not a directive, dirty the committer so that it'll
            // call setAttribute. If the value is a directive, it'll dirty the
            // committer if it calls setValue().
            if (!isDirective(value)) {
                this.committer.dirty = true;
            }
        }
    }
    commit() {
        while (isDirective(this.value)) {
            const directive = this.value;
            this.value = noChange;
            directive(this);
        }
        if (this.value === noChange) {
            return;
        }
        this.committer.commit();
    }
}
/**
 * A Part that controls a location within a Node tree. Like a Range, NodePart
 * has start and end locations and can set and update the Nodes between those
 * locations.
 *
 * NodeParts support several value types: primitives, Nodes, TemplateResults,
 * as well as arrays and iterables of those types.
 */
class NodePart {
    constructor(options) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.options = options;
    }
    /**
     * Appends this part into a container.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendInto(container) {
        this.startNode = container.appendChild(createMarker());
        this.endNode = container.appendChild(createMarker());
    }
    /**
     * Inserts this part after the `ref` node (between `ref` and `ref`'s next
     * sibling). Both `ref` and its next sibling must be static, unchanging nodes
     * such as those that appear in a literal section of a template.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterNode(ref) {
        this.startNode = ref;
        this.endNode = ref.nextSibling;
    }
    /**
     * Appends this part into a parent part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendIntoPart(part) {
        part.__insert(this.startNode = createMarker());
        part.__insert(this.endNode = createMarker());
    }
    /**
     * Inserts this part after the `ref` part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterPart(ref) {
        ref.__insert(this.startNode = createMarker());
        this.endNode = ref.endNode;
        ref.endNode = this.startNode;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        if (this.startNode.parentNode === null) {
            return;
        }
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        const value = this.__pendingValue;
        if (value === noChange) {
            return;
        }
        if (isPrimitive(value)) {
            if (value !== this.value) {
                this.__commitText(value);
            }
        }
        else if (value instanceof TemplateResult) {
            this.__commitTemplateResult(value);
        }
        else if (value instanceof Node) {
            this.__commitNode(value);
        }
        else if (isIterable(value)) {
            this.__commitIterable(value);
        }
        else if (value === nothing) {
            this.value = nothing;
            this.clear();
        }
        else {
            // Fallback, will render the string representation
            this.__commitText(value);
        }
    }
    __insert(node) {
        this.endNode.parentNode.insertBefore(node, this.endNode);
    }
    __commitNode(value) {
        if (this.value === value) {
            return;
        }
        this.clear();
        this.__insert(value);
        this.value = value;
    }
    __commitText(value) {
        const node = this.startNode.nextSibling;
        value = value == null ? '' : value;
        // If `value` isn't already a string, we explicitly convert it here in case
        // it can't be implicitly converted - i.e. it's a symbol.
        const valueAsString = typeof value === 'string' ? value : String(value);
        if (node === this.endNode.previousSibling &&
            node.nodeType === 3 /* Node.TEXT_NODE */) {
            // If we only have a single text node between the markers, we can just
            // set its value, rather than replacing it.
            // TODO(justinfagnani): Can we just check if this.value is primitive?
            node.data = valueAsString;
        }
        else {
            this.__commitNode(document.createTextNode(valueAsString));
        }
        this.value = value;
    }
    __commitTemplateResult(value) {
        const template = this.options.templateFactory(value);
        if (this.value instanceof TemplateInstance &&
            this.value.template === template) {
            this.value.update(value.values);
        }
        else {
            // Make sure we propagate the template processor from the TemplateResult
            // so that we use its syntax extension, etc. The template factory comes
            // from the render function options so that it can control template
            // caching and preprocessing.
            const instance = new TemplateInstance(template, value.processor, this.options);
            const fragment = instance._clone();
            instance.update(value.values);
            this.__commitNode(fragment);
            this.value = instance;
        }
    }
    __commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If _value is an array, then the previous render was of an
        // iterable and _value will contain the NodeParts from the previous
        // render. If _value is not an array, clear this part and make a new
        // array for NodeParts.
        if (!Array.isArray(this.value)) {
            this.value = [];
            this.clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this.value;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            // Try to reuse an existing part
            itemPart = itemParts[partIndex];
            // If no existing part, create a new one
            if (itemPart === undefined) {
                itemPart = new NodePart(this.options);
                itemParts.push(itemPart);
                if (partIndex === 0) {
                    itemPart.appendIntoPart(this);
                }
                else {
                    itemPart.insertAfterPart(itemParts[partIndex - 1]);
                }
            }
            itemPart.setValue(item);
            itemPart.commit();
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
            this.clear(itemPart && itemPart.endNode);
        }
    }
    clear(startNode = this.startNode) {
        removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
    }
}
/**
 * Implements a boolean attribute, roughly as defined in the HTML
 * specification.
 *
 * If the value is truthy, then the attribute is present with a value of
 * ''. If the value is falsey, the attribute is removed.
 */
class BooleanAttributePart {
    constructor(element, name, strings) {
        this.value = undefined;
        this.__pendingValue = undefined;
        if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
            throw new Error('Boolean attributes can only contain a single expression');
        }
        this.element = element;
        this.name = name;
        this.strings = strings;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const value = !!this.__pendingValue;
        if (this.value !== value) {
            if (value) {
                this.element.setAttribute(this.name, '');
            }
            else {
                this.element.removeAttribute(this.name);
            }
            this.value = value;
        }
        this.__pendingValue = noChange;
    }
}
/**
 * Sets attribute values for PropertyParts, so that the value is only set once
 * even if there are multiple parts for a property.
 *
 * If an expression controls the whole property value, then the value is simply
 * assigned to the property under control. If there are string literals or
 * multiple expressions, then the strings are expressions are interpolated into
 * a string first.
 */
class PropertyCommitter extends AttributeCommitter {
    constructor(element, name, strings) {
        super(element, name, strings);
        this.single =
            (strings.length === 2 && strings[0] === '' && strings[1] === '');
    }
    _createPart() {
        return new PropertyPart(this);
    }
    _getValue() {
        if (this.single) {
            return this.parts[0].value;
        }
        return super._getValue();
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.element[this.name] = this._getValue();
        }
    }
}
class PropertyPart extends AttributePart {
}
// Detect event listener options support. If the `capture` property is read
// from the options object, then options are supported. If not, then the third
// argument to add/removeEventListener is interpreted as the boolean capture
// value so we should only pass the `capture` property.
let eventOptionsSupported = false;
// Wrap into an IIFE because MS Edge <= v41 does not support having try/catch
// blocks right into the body of a module
(() => {
    try {
        const options = {
            get capture() {
                eventOptionsSupported = true;
                return false;
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.addEventListener('test', options, options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.removeEventListener('test', options, options);
    }
    catch (_e) {
        // event options not supported
    }
})();
class EventPart {
    constructor(element, eventName, eventContext) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.element = element;
        this.eventName = eventName;
        this.eventContext = eventContext;
        this.__boundHandleEvent = (e) => this.handleEvent(e);
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const newListener = this.__pendingValue;
        const oldListener = this.value;
        const shouldRemoveListener = newListener == null ||
            oldListener != null &&
                (newListener.capture !== oldListener.capture ||
                    newListener.once !== oldListener.once ||
                    newListener.passive !== oldListener.passive);
        const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        if (shouldAddListener) {
            this.__options = getOptions(newListener);
            this.element.addEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        this.value = newListener;
        this.__pendingValue = noChange;
    }
    handleEvent(event) {
        if (typeof this.value === 'function') {
            this.value.call(this.eventContext || this.element, event);
        }
        else {
            this.value.handleEvent(event);
        }
    }
}
// We copy options because of the inconsistent behavior of browsers when reading
// the third argument of add/removeEventListener. IE11 doesn't support options
// at all. Chrome 41 only reads `capture` if the argument is an object.
const getOptions = (o) => o &&
    (eventOptionsSupported ?
        { capture: o.capture, passive: o.passive, once: o.once } :
        o.capture);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Creates Parts when a template is instantiated.
 */
class DefaultTemplateProcessor {
    /**
     * Create parts for an attribute-position binding, given the event, attribute
     * name, and string literals.
     *
     * @param element The element containing the binding
     * @param name  The attribute name
     * @param strings The string literals. There are always at least two strings,
     *   event for fully-controlled bindings with a single expression.
     */
    handleAttributeExpressions(element, name, strings, options) {
        const prefix = name[0];
        if (prefix === '.') {
            const committer = new PropertyCommitter(element, name.slice(1), strings);
            return committer.parts;
        }
        if (prefix === '@') {
            return [new EventPart(element, name.slice(1), options.eventContext)];
        }
        if (prefix === '?') {
            return [new BooleanAttributePart(element, name.slice(1), strings)];
        }
        const committer = new AttributeCommitter(element, name, strings);
        return committer.parts;
    }
    /**
     * Create parts for a text-position binding.
     * @param templateFactory
     */
    handleTextExpression(options) {
        return new NodePart(options);
    }
}
const defaultTemplateProcessor = new DefaultTemplateProcessor();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * The default TemplateFactory which caches Templates keyed on
 * result.type and result.strings.
 */
function templateFactory(result) {
    let templateCache = templateCaches.get(result.type);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(result.type, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    // If the TemplateStringsArray is new, generate a key from the strings
    // This key is shared between all templates with identical content
    const key = result.strings.join(marker);
    // Check if we already have a Template for this key
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        // If we have not seen this key before, create a new Template
        template = new Template(result, result.getTemplateElement());
        // Cache the Template for this key
        templateCache.keyString.set(key, template);
    }
    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
}
const templateCaches = new Map();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const parts = new WeakMap();
/**
 * Renders a template result or other value to a container.
 *
 * To update a container with new values, reevaluate the template literal and
 * call `render` with the new result.
 *
 * @param result Any value renderable by NodePart - typically a TemplateResult
 *     created by evaluating a template tag like `html` or `svg`.
 * @param container A DOM parent to render to. The entire contents are either
 *     replaced, or efficiently updated if the same result type was previous
 *     rendered there.
 * @param options RenderOptions for the entire render tree rendered to this
 *     container. Render options must *not* change between renders to the same
 *     container, as those changes will not effect previously rendered DOM.
 */
const render = (result, container, options) => {
    let part = parts.get(container);
    if (part === undefined) {
        removeNodes(container, container.firstChild);
        parts.set(container, part = new NodePart(Object.assign({ templateFactory }, options)));
        part.appendInto(container);
    }
    part.setValue(result);
    part.commit();
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
// TODO(justinfagnani): inject version number at build time
if (typeof window !== 'undefined') {
    (window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.2.1');
}
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */
const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const walkerNodeFilter = 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */;
/**
 * Removes the list of nodes from a Template safely. In addition to removing
 * nodes from the Template, the Template part indices are updated to match
 * the mutated Template DOM.
 *
 * As the template is walked the removal state is tracked and
 * part indices are adjusted as needed.
 *
 * div
 *   div#1 (remove) <-- start removing (removing node is div#1)
 *     div
 *       div#2 (remove)  <-- continue removing (removing node is still div#1)
 *         div
 * div <-- stop removing since previous sibling is the removing node (div#1,
 * removed 4 nodes)
 */
function removeNodesFromTemplate(template, nodesToRemove) {
    const { element: { content }, parts } = template;
    const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
    let partIndex = nextActiveIndexInTemplateParts(parts);
    let part = parts[partIndex];
    let nodeIndex = -1;
    let removeCount = 0;
    const nodesToRemoveInTemplate = [];
    let currentRemovingNode = null;
    while (walker.nextNode()) {
        nodeIndex++;
        const node = walker.currentNode;
        // End removal if stepped past the removing node
        if (node.previousSibling === currentRemovingNode) {
            currentRemovingNode = null;
        }
        // A node to remove was found in the template
        if (nodesToRemove.has(node)) {
            nodesToRemoveInTemplate.push(node);
            // Track node we're removing
            if (currentRemovingNode === null) {
                currentRemovingNode = node;
            }
        }
        // When removing, increment count by which to adjust subsequent part indices
        if (currentRemovingNode !== null) {
            removeCount++;
        }
        while (part !== undefined && part.index === nodeIndex) {
            // If part is in a removed node deactivate it by setting index to -1 or
            // adjust the index as needed.
            part.index = currentRemovingNode !== null ? -1 : part.index - removeCount;
            // go to the next active part.
            partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
            part = parts[partIndex];
        }
    }
    nodesToRemoveInTemplate.forEach((n) => n.parentNode.removeChild(n));
}
const countNodes = (node) => {
    let count = (node.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */) ? 0 : 1;
    const walker = document.createTreeWalker(node, walkerNodeFilter, null, false);
    while (walker.nextNode()) {
        count++;
    }
    return count;
};
const nextActiveIndexInTemplateParts = (parts, startIndex = -1) => {
    for (let i = startIndex + 1; i < parts.length; i++) {
        const part = parts[i];
        if (isTemplatePartActive(part)) {
            return i;
        }
    }
    return -1;
};
/**
 * Inserts the given node into the Template, optionally before the given
 * refNode. In addition to inserting the node into the Template, the Template
 * part indices are updated to match the mutated Template DOM.
 */
function insertNodeIntoTemplate(template, node, refNode = null) {
    const { element: { content }, parts } = template;
    // If there's no refNode, then put node at end of template.
    // No part indices need to be shifted in this case.
    if (refNode === null || refNode === undefined) {
        content.appendChild(node);
        return;
    }
    const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
    let partIndex = nextActiveIndexInTemplateParts(parts);
    let insertCount = 0;
    let walkerIndex = -1;
    while (walker.nextNode()) {
        walkerIndex++;
        const walkerNode = walker.currentNode;
        if (walkerNode === refNode) {
            insertCount = countNodes(node);
            refNode.parentNode.insertBefore(node, refNode);
        }
        while (partIndex !== -1 && parts[partIndex].index === walkerIndex) {
            // If we've inserted the node, simply adjust all subsequent parts
            if (insertCount > 0) {
                while (partIndex !== -1) {
                    parts[partIndex].index += insertCount;
                    partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
                }
                return;
            }
            partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
        }
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// Get a key to lookup in `templateCaches`.
const getTemplateCacheKey = (type, scopeName) => `${type}--${scopeName}`;
let compatibleShadyCSSVersion = true;
if (typeof window.ShadyCSS === 'undefined') {
    compatibleShadyCSSVersion = false;
}
else if (typeof window.ShadyCSS.prepareTemplateDom === 'undefined') {
    console.warn(`Incompatible ShadyCSS version detected. ` +
        `Please update to at least @webcomponents/webcomponentsjs@2.0.2 and ` +
        `@webcomponents/shadycss@1.3.1.`);
    compatibleShadyCSSVersion = false;
}
/**
 * Template factory which scopes template DOM using ShadyCSS.
 * @param scopeName {string}
 */
const shadyTemplateFactory = (scopeName) => (result) => {
    const cacheKey = getTemplateCacheKey(result.type, scopeName);
    let templateCache = templateCaches.get(cacheKey);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(cacheKey, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    const key = result.strings.join(marker);
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        const element = result.getTemplateElement();
        if (compatibleShadyCSSVersion) {
            window.ShadyCSS.prepareTemplateDom(element, scopeName);
        }
        template = new Template(result, element);
        templateCache.keyString.set(key, template);
    }
    templateCache.stringsArray.set(result.strings, template);
    return template;
};
const TEMPLATE_TYPES = ['html', 'svg'];
/**
 * Removes all style elements from Templates for the given scopeName.
 */
const removeStylesFromLitTemplates = (scopeName) => {
    TEMPLATE_TYPES.forEach((type) => {
        const templates = templateCaches.get(getTemplateCacheKey(type, scopeName));
        if (templates !== undefined) {
            templates.keyString.forEach((template) => {
                const { element: { content } } = template;
                // IE 11 doesn't support the iterable param Set constructor
                const styles = new Set();
                Array.from(content.querySelectorAll('style')).forEach((s) => {
                    styles.add(s);
                });
                removeNodesFromTemplate(template, styles);
            });
        }
    });
};
const shadyRenderSet = new Set();
/**
 * For the given scope name, ensures that ShadyCSS style scoping is performed.
 * This is done just once per scope name so the fragment and template cannot
 * be modified.
 * (1) extracts styles from the rendered fragment and hands them to ShadyCSS
 * to be scoped and appended to the document
 * (2) removes style elements from all lit-html Templates for this scope name.
 *
 * Note, <style> elements can only be placed into templates for the
 * initial rendering of the scope. If <style> elements are included in templates
 * dynamically rendered to the scope (after the first scope render), they will
 * not be scoped and the <style> will be left in the template and rendered
 * output.
 */
const prepareTemplateStyles = (scopeName, renderedDOM, template) => {
    shadyRenderSet.add(scopeName);
    // If `renderedDOM` is stamped from a Template, then we need to edit that
    // Template's underlying template element. Otherwise, we create one here
    // to give to ShadyCSS, which still requires one while scoping.
    const templateElement = !!template ? template.element : document.createElement('template');
    // Move styles out of rendered DOM and store.
    const styles = renderedDOM.querySelectorAll('style');
    const { length } = styles;
    // If there are no styles, skip unnecessary work
    if (length === 0) {
        // Ensure prepareTemplateStyles is called to support adding
        // styles via `prepareAdoptedCssText` since that requires that
        // `prepareTemplateStyles` is called.
        //
        // ShadyCSS will only update styles containing @apply in the template
        // given to `prepareTemplateStyles`. If no lit Template was given,
        // ShadyCSS will not be able to update uses of @apply in any relevant
        // template. However, this is not a problem because we only create the
        // template for the purpose of supporting `prepareAdoptedCssText`,
        // which doesn't support @apply at all.
        window.ShadyCSS.prepareTemplateStyles(templateElement, scopeName);
        return;
    }
    const condensedStyle = document.createElement('style');
    // Collect styles into a single style. This helps us make sure ShadyCSS
    // manipulations will not prevent us from being able to fix up template
    // part indices.
    // NOTE: collecting styles is inefficient for browsers but ShadyCSS
    // currently does this anyway. When it does not, this should be changed.
    for (let i = 0; i < length; i++) {
        const style = styles[i];
        style.parentNode.removeChild(style);
        condensedStyle.textContent += style.textContent;
    }
    // Remove styles from nested templates in this scope.
    removeStylesFromLitTemplates(scopeName);
    // And then put the condensed style into the "root" template passed in as
    // `template`.
    const content = templateElement.content;
    if (!!template) {
        insertNodeIntoTemplate(template, condensedStyle, content.firstChild);
    }
    else {
        content.insertBefore(condensedStyle, content.firstChild);
    }
    // Note, it's important that ShadyCSS gets the template that `lit-html`
    // will actually render so that it can update the style inside when
    // needed (e.g. @apply native Shadow DOM case).
    window.ShadyCSS.prepareTemplateStyles(templateElement, scopeName);
    const style = content.querySelector('style');
    if (window.ShadyCSS.nativeShadow && style !== null) {
        // When in native Shadow DOM, ensure the style created by ShadyCSS is
        // included in initially rendered output (`renderedDOM`).
        renderedDOM.insertBefore(style.cloneNode(true), renderedDOM.firstChild);
    }
    else if (!!template) {
        // When no style is left in the template, parts will be broken as a
        // result. To fix this, we put back the style node ShadyCSS removed
        // and then tell lit to remove that node from the template.
        // There can be no style in the template in 2 cases (1) when Shady DOM
        // is in use, ShadyCSS removes all styles, (2) when native Shadow DOM
        // is in use ShadyCSS removes the style if it contains no content.
        // NOTE, ShadyCSS creates its own style so we can safely add/remove
        // `condensedStyle` here.
        content.insertBefore(condensedStyle, content.firstChild);
        const removes = new Set();
        removes.add(condensedStyle);
        removeNodesFromTemplate(template, removes);
    }
};
/**
 * Extension to the standard `render` method which supports rendering
 * to ShadowRoots when the ShadyDOM (https://github.com/webcomponents/shadydom)
 * and ShadyCSS (https://github.com/webcomponents/shadycss) polyfills are used
 * or when the webcomponentsjs
 * (https://github.com/webcomponents/webcomponentsjs) polyfill is used.
 *
 * Adds a `scopeName` option which is used to scope element DOM and stylesheets
 * when native ShadowDOM is unavailable. The `scopeName` will be added to
 * the class attribute of all rendered DOM. In addition, any style elements will
 * be automatically re-written with this `scopeName` selector and moved out
 * of the rendered DOM and into the document `<head>`.
 *
 * It is common to use this render method in conjunction with a custom element
 * which renders a shadowRoot. When this is done, typically the element's
 * `localName` should be used as the `scopeName`.
 *
 * In addition to DOM scoping, ShadyCSS also supports a basic shim for css
 * custom properties (needed only on older browsers like IE11) and a shim for
 * a deprecated feature called `@apply` that supports applying a set of css
 * custom properties to a given location.
 *
 * Usage considerations:
 *
 * * Part values in `<style>` elements are only applied the first time a given
 * `scopeName` renders. Subsequent changes to parts in style elements will have
 * no effect. Because of this, parts in style elements should only be used for
 * values that will never change, for example parts that set scope-wide theme
 * values or parts which render shared style elements.
 *
 * * Note, due to a limitation of the ShadyDOM polyfill, rendering in a
 * custom element's `constructor` is not supported. Instead rendering should
 * either done asynchronously, for example at microtask timing (for example
 * `Promise.resolve()`), or be deferred until the first time the element's
 * `connectedCallback` runs.
 *
 * Usage considerations when using shimmed custom properties or `@apply`:
 *
 * * Whenever any dynamic changes are made which affect
 * css custom properties, `ShadyCSS.styleElement(element)` must be called
 * to update the element. There are two cases when this is needed:
 * (1) the element is connected to a new parent, (2) a class is added to the
 * element that causes it to match different custom properties.
 * To address the first case when rendering a custom element, `styleElement`
 * should be called in the element's `connectedCallback`.
 *
 * * Shimmed custom properties may only be defined either for an entire
 * shadowRoot (for example, in a `:host` rule) or via a rule that directly
 * matches an element with a shadowRoot. In other words, instead of flowing from
 * parent to child as do native css custom properties, shimmed custom properties
 * flow only from shadowRoots to nested shadowRoots.
 *
 * * When using `@apply` mixing css shorthand property names with
 * non-shorthand names (for example `border` and `border-width`) is not
 * supported.
 */
const render$1 = (result, container, options) => {
    if (!options || typeof options !== 'object' || !options.scopeName) {
        throw new Error('The `scopeName` option is required.');
    }
    const scopeName = options.scopeName;
    const hasRendered = parts.has(container);
    const needsScoping = compatibleShadyCSSVersion &&
        container.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */ &&
        !!container.host;
    // Handle first render to a scope specially...
    const firstScopeRender = needsScoping && !shadyRenderSet.has(scopeName);
    // On first scope render, render into a fragment; this cannot be a single
    // fragment that is reused since nested renders can occur synchronously.
    const renderContainer = firstScopeRender ? document.createDocumentFragment() : container;
    render(result, renderContainer, Object.assign({ templateFactory: shadyTemplateFactory(scopeName) }, options));
    // When performing first scope render,
    // (1) We've rendered into a fragment so that there's a chance to
    // `prepareTemplateStyles` before sub-elements hit the DOM
    // (which might cause them to render based on a common pattern of
    // rendering in a custom element's `connectedCallback`);
    // (2) Scope the template with ShadyCSS one time only for this scope.
    // (3) Render the fragment into the container and make sure the
    // container knows its `part` is the one we just rendered. This ensures
    // DOM will be re-used on subsequent renders.
    if (firstScopeRender) {
        const part = parts.get(renderContainer);
        parts.delete(renderContainer);
        // ShadyCSS might have style sheets (e.g. from `prepareAdoptedCssText`)
        // that should apply to `renderContainer` even if the rendered value is
        // not a TemplateInstance. However, it will only insert scoped styles
        // into the document if `prepareTemplateStyles` has already been called
        // for the given scope name.
        const template = part.value instanceof TemplateInstance ?
            part.value.template :
            undefined;
        prepareTemplateStyles(scopeName, renderContainer, template);
        removeNodes(container, container.firstChild);
        container.appendChild(renderContainer);
        parts.set(container, part);
    }
    // After elements have hit the DOM, update styling if this is the
    // initial render to this container.
    // This is needed whenever dynamic changes are made so it would be
    // safest to do every render; however, this would regress performance
    // so we leave it up to the user to call `ShadyCSS.styleElement`
    // for dynamic changes.
    if (!hasRendered && needsScoping) {
        window.ShadyCSS.styleElement(container.host);
    }
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
var _a;
/**
 * When using Closure Compiler, JSCompiler_renameProperty(property, object) is
 * replaced at compile time by the munged name for object[property]. We cannot
 * alias this function, so we have to use a small shim that has the same
 * behavior when not compiling.
 */
window.JSCompiler_renameProperty =
    (prop, _obj) => prop;
const defaultConverter = {
    toAttribute(value, type) {
        switch (type) {
            case Boolean:
                return value ? '' : null;
            case Object:
            case Array:
                // if the value is `null` or `undefined` pass this through
                // to allow removing/no change behavior.
                return value == null ? value : JSON.stringify(value);
        }
        return value;
    },
    fromAttribute(value, type) {
        switch (type) {
            case Boolean:
                return value !== null;
            case Number:
                return value === null ? null : Number(value);
            case Object:
            case Array:
                return JSON.parse(value);
        }
        return value;
    }
};
/**
 * Change function that returns true if `value` is different from `oldValue`.
 * This method is used as the default for a property's `hasChanged` function.
 */
const notEqual = (value, old) => {
    // This ensures (old==NaN, value==NaN) always returns false
    return old !== value && (old === old || value === value);
};
const defaultPropertyDeclaration = {
    attribute: true,
    type: String,
    converter: defaultConverter,
    reflect: false,
    hasChanged: notEqual
};
const STATE_HAS_UPDATED = 1;
const STATE_UPDATE_REQUESTED = 1 << 2;
const STATE_IS_REFLECTING_TO_ATTRIBUTE = 1 << 3;
const STATE_IS_REFLECTING_TO_PROPERTY = 1 << 4;
/**
 * The Closure JS Compiler doesn't currently have good support for static
 * property semantics where "this" is dynamic (e.g.
 * https://github.com/google/closure-compiler/issues/3177 and others) so we use
 * this hack to bypass any rewriting by the compiler.
 */
const finalized = 'finalized';
/**
 * Base element class which manages element properties and attributes. When
 * properties change, the `update` method is asynchronously called. This method
 * should be supplied by subclassers to render updates as desired.
 */
class UpdatingElement extends HTMLElement {
    constructor() {
        super();
        this._updateState = 0;
        this._instanceProperties = undefined;
        // Initialize to an unresolved Promise so we can make sure the element has
        // connected before first update.
        this._updatePromise = new Promise((res) => this._enableUpdatingResolver = res);
        /**
         * Map with keys for any properties that have changed since the last
         * update cycle with previous values.
         */
        this._changedProperties = new Map();
        /**
         * Map with keys of properties that should be reflected when updated.
         */
        this._reflectingProperties = undefined;
        this.initialize();
    }
    /**
     * Returns a list of attributes corresponding to the registered properties.
     * @nocollapse
     */
    static get observedAttributes() {
        // note: piggy backing on this to ensure we're finalized.
        this.finalize();
        const attributes = [];
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        this._classProperties.forEach((v, p) => {
            const attr = this._attributeNameForProperty(p, v);
            if (attr !== undefined) {
                this._attributeToPropertyMap.set(attr, p);
                attributes.push(attr);
            }
        });
        return attributes;
    }
    /**
     * Ensures the private `_classProperties` property metadata is created.
     * In addition to `finalize` this is also called in `createProperty` to
     * ensure the `@property` decorator can add property metadata.
     */
    /** @nocollapse */
    static _ensureClassProperties() {
        // ensure private storage for property declarations.
        if (!this.hasOwnProperty(JSCompiler_renameProperty('_classProperties', this))) {
            this._classProperties = new Map();
            // NOTE: Workaround IE11 not supporting Map constructor argument.
            const superProperties = Object.getPrototypeOf(this)._classProperties;
            if (superProperties !== undefined) {
                superProperties.forEach((v, k) => this._classProperties.set(k, v));
            }
        }
    }
    /**
     * Creates a property accessor on the element prototype if one does not exist
     * and stores a PropertyDeclaration for the property with the given options.
     * The property setter calls the property's `hasChanged` property option
     * or uses a strict identity check to determine whether or not to request
     * an update.
     *
     * This method may be overridden to customize properties; however,
     * when doing so, it's important to call `super.createProperty` to ensure
     * the property is setup correctly. This method calls
     * `getPropertyDescriptor` internally to get a descriptor to install.
     * To customize what properties do when they are get or set, override
     * `getPropertyDescriptor`. To customize the options for a property,
     * implement `createProperty` like this:
     *
     * static createProperty(name, options) {
     *   options = Object.assign(options, {myOption: true});
     *   super.createProperty(name, options);
     * }
     *
     * @nocollapse
     */
    static createProperty(name, options = defaultPropertyDeclaration) {
        // Note, since this can be called by the `@property` decorator which
        // is called before `finalize`, we ensure storage exists for property
        // metadata.
        this._ensureClassProperties();
        this._classProperties.set(name, options);
        // Do not generate an accessor if the prototype already has one, since
        // it would be lost otherwise and that would never be the user's intention;
        // Instead, we expect users to call `requestUpdate` themselves from
        // user-defined accessors. Note that if the super has an accessor we will
        // still overwrite it
        if (options.noAccessor || this.prototype.hasOwnProperty(name)) {
            return;
        }
        const key = typeof name === 'symbol' ? Symbol() : `__${name}`;
        const descriptor = this.getPropertyDescriptor(name, key, options);
        if (descriptor !== undefined) {
            Object.defineProperty(this.prototype, name, descriptor);
        }
    }
    /**
     * Returns a property descriptor to be defined on the given named property.
     * If no descriptor is returned, the property will not become an accessor.
     * For example,
     *
     *   class MyElement extends LitElement {
     *     static getPropertyDescriptor(name, key, options) {
     *       const defaultDescriptor =
     *           super.getPropertyDescriptor(name, key, options);
     *       const setter = defaultDescriptor.set;
     *       return {
     *         get: defaultDescriptor.get,
     *         set(value) {
     *           setter.call(this, value);
     *           // custom action.
     *         },
     *         configurable: true,
     *         enumerable: true
     *       }
     *     }
     *   }
     *
     * @nocollapse
     */
    static getPropertyDescriptor(name, key, _options) {
        return {
            // tslint:disable-next-line:no-any no symbol in index
            get() {
                return this[key];
            },
            set(value) {
                const oldValue = this[name];
                this[key] = value;
                this._requestUpdate(name, oldValue);
            },
            configurable: true,
            enumerable: true
        };
    }
    /**
     * Returns the property options associated with the given property.
     * These options are defined with a PropertyDeclaration via the `properties`
     * object or the `@property` decorator and are registered in
     * `createProperty(...)`.
     *
     * Note, this method should be considered "final" and not overridden. To
     * customize the options for a given property, override `createProperty`.
     *
     * @nocollapse
     * @final
     */
    static getPropertyOptions(name) {
        return this._classProperties && this._classProperties.get(name) ||
            defaultPropertyDeclaration;
    }
    /**
     * Creates property accessors for registered properties and ensures
     * any superclasses are also finalized.
     * @nocollapse
     */
    static finalize() {
        // finalize any superclasses
        const superCtor = Object.getPrototypeOf(this);
        if (!superCtor.hasOwnProperty(finalized)) {
            superCtor.finalize();
        }
        this[finalized] = true;
        this._ensureClassProperties();
        // initialize Map populated in observedAttributes
        this._attributeToPropertyMap = new Map();
        // make any properties
        // Note, only process "own" properties since this element will inherit
        // any properties defined on the superClass, and finalization ensures
        // the entire prototype chain is finalized.
        if (this.hasOwnProperty(JSCompiler_renameProperty('properties', this))) {
            const props = this.properties;
            // support symbols in properties (IE11 does not support this)
            const propKeys = [
                ...Object.getOwnPropertyNames(props),
                ...(typeof Object.getOwnPropertySymbols === 'function') ?
                    Object.getOwnPropertySymbols(props) :
                    []
            ];
            // This for/of is ok because propKeys is an array
            for (const p of propKeys) {
                // note, use of `any` is due to TypeSript lack of support for symbol in
                // index types
                // tslint:disable-next-line:no-any no symbol in index
                this.createProperty(p, props[p]);
            }
        }
    }
    /**
     * Returns the property name for the given attribute `name`.
     * @nocollapse
     */
    static _attributeNameForProperty(name, options) {
        const attribute = options.attribute;
        return attribute === false ?
            undefined :
            (typeof attribute === 'string' ?
                attribute :
                (typeof name === 'string' ? name.toLowerCase() : undefined));
    }
    /**
     * Returns true if a property should request an update.
     * Called when a property value is set and uses the `hasChanged`
     * option for the property if present or a strict identity check.
     * @nocollapse
     */
    static _valueHasChanged(value, old, hasChanged = notEqual) {
        return hasChanged(value, old);
    }
    /**
     * Returns the property value for the given attribute value.
     * Called via the `attributeChangedCallback` and uses the property's
     * `converter` or `converter.fromAttribute` property option.
     * @nocollapse
     */
    static _propertyValueFromAttribute(value, options) {
        const type = options.type;
        const converter = options.converter || defaultConverter;
        const fromAttribute = (typeof converter === 'function' ? converter : converter.fromAttribute);
        return fromAttribute ? fromAttribute(value, type) : value;
    }
    /**
     * Returns the attribute value for the given property value. If this
     * returns undefined, the property will *not* be reflected to an attribute.
     * If this returns null, the attribute will be removed, otherwise the
     * attribute will be set to the value.
     * This uses the property's `reflect` and `type.toAttribute` property options.
     * @nocollapse
     */
    static _propertyValueToAttribute(value, options) {
        if (options.reflect === undefined) {
            return;
        }
        const type = options.type;
        const converter = options.converter;
        const toAttribute = converter && converter.toAttribute ||
            defaultConverter.toAttribute;
        return toAttribute(value, type);
    }
    /**
     * Performs element initialization. By default captures any pre-set values for
     * registered properties.
     */
    initialize() {
        this._saveInstanceProperties();
        // ensures first update will be caught by an early access of
        // `updateComplete`
        this._requestUpdate();
    }
    /**
     * Fixes any properties set on the instance before upgrade time.
     * Otherwise these would shadow the accessor and break these properties.
     * The properties are stored in a Map which is played back after the
     * constructor runs. Note, on very old versions of Safari (<=9) or Chrome
     * (<=41), properties created for native platform properties like (`id` or
     * `name`) may not have default values set in the element constructor. On
     * these browsers native properties appear on instances and therefore their
     * default value will overwrite any element default (e.g. if the element sets
     * this.id = 'id' in the constructor, the 'id' will become '' since this is
     * the native platform default).
     */
    _saveInstanceProperties() {
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        this.constructor
            ._classProperties.forEach((_v, p) => {
            if (this.hasOwnProperty(p)) {
                const value = this[p];
                delete this[p];
                if (!this._instanceProperties) {
                    this._instanceProperties = new Map();
                }
                this._instanceProperties.set(p, value);
            }
        });
    }
    /**
     * Applies previously saved instance properties.
     */
    _applyInstanceProperties() {
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        // tslint:disable-next-line:no-any
        this._instanceProperties.forEach((v, p) => this[p] = v);
        this._instanceProperties = undefined;
    }
    connectedCallback() {
        // Ensure first connection completes an update. Updates cannot complete
        // before connection.
        this.enableUpdating();
    }
    enableUpdating() {
        if (this._enableUpdatingResolver !== undefined) {
            this._enableUpdatingResolver();
            this._enableUpdatingResolver = undefined;
        }
    }
    /**
     * Allows for `super.disconnectedCallback()` in extensions while
     * reserving the possibility of making non-breaking feature additions
     * when disconnecting at some point in the future.
     */
    disconnectedCallback() {
    }
    /**
     * Synchronizes property values when attributes change.
     */
    attributeChangedCallback(name, old, value) {
        if (old !== value) {
            this._attributeToProperty(name, value);
        }
    }
    _propertyToAttribute(name, value, options = defaultPropertyDeclaration) {
        const ctor = this.constructor;
        const attr = ctor._attributeNameForProperty(name, options);
        if (attr !== undefined) {
            const attrValue = ctor._propertyValueToAttribute(value, options);
            // an undefined value does not change the attribute.
            if (attrValue === undefined) {
                return;
            }
            // Track if the property is being reflected to avoid
            // setting the property again via `attributeChangedCallback`. Note:
            // 1. this takes advantage of the fact that the callback is synchronous.
            // 2. will behave incorrectly if multiple attributes are in the reaction
            // stack at time of calling. However, since we process attributes
            // in `update` this should not be possible (or an extreme corner case
            // that we'd like to discover).
            // mark state reflecting
            this._updateState = this._updateState | STATE_IS_REFLECTING_TO_ATTRIBUTE;
            if (attrValue == null) {
                this.removeAttribute(attr);
            }
            else {
                this.setAttribute(attr, attrValue);
            }
            // mark state not reflecting
            this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_ATTRIBUTE;
        }
    }
    _attributeToProperty(name, value) {
        // Use tracking info to avoid deserializing attribute value if it was
        // just set from a property setter.
        if (this._updateState & STATE_IS_REFLECTING_TO_ATTRIBUTE) {
            return;
        }
        const ctor = this.constructor;
        // Note, hint this as an `AttributeMap` so closure clearly understands
        // the type; it has issues with tracking types through statics
        // tslint:disable-next-line:no-unnecessary-type-assertion
        const propName = ctor._attributeToPropertyMap.get(name);
        if (propName !== undefined) {
            const options = ctor.getPropertyOptions(propName);
            // mark state reflecting
            this._updateState = this._updateState | STATE_IS_REFLECTING_TO_PROPERTY;
            this[propName] =
                // tslint:disable-next-line:no-any
                ctor._propertyValueFromAttribute(value, options);
            // mark state not reflecting
            this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_PROPERTY;
        }
    }
    /**
     * This private version of `requestUpdate` does not access or return the
     * `updateComplete` promise. This promise can be overridden and is therefore
     * not free to access.
     */
    _requestUpdate(name, oldValue) {
        let shouldRequestUpdate = true;
        // If we have a property key, perform property update steps.
        if (name !== undefined) {
            const ctor = this.constructor;
            const options = ctor.getPropertyOptions(name);
            if (ctor._valueHasChanged(this[name], oldValue, options.hasChanged)) {
                if (!this._changedProperties.has(name)) {
                    this._changedProperties.set(name, oldValue);
                }
                // Add to reflecting properties set.
                // Note, it's important that every change has a chance to add the
                // property to `_reflectingProperties`. This ensures setting
                // attribute + property reflects correctly.
                if (options.reflect === true &&
                    !(this._updateState & STATE_IS_REFLECTING_TO_PROPERTY)) {
                    if (this._reflectingProperties === undefined) {
                        this._reflectingProperties = new Map();
                    }
                    this._reflectingProperties.set(name, options);
                }
            }
            else {
                // Abort the request if the property should not be considered changed.
                shouldRequestUpdate = false;
            }
        }
        if (!this._hasRequestedUpdate && shouldRequestUpdate) {
            this._updatePromise = this._enqueueUpdate();
        }
    }
    /**
     * Requests an update which is processed asynchronously. This should
     * be called when an element should update based on some state not triggered
     * by setting a property. In this case, pass no arguments. It should also be
     * called when manually implementing a property setter. In this case, pass the
     * property `name` and `oldValue` to ensure that any configured property
     * options are honored. Returns the `updateComplete` Promise which is resolved
     * when the update completes.
     *
     * @param name {PropertyKey} (optional) name of requesting property
     * @param oldValue {any} (optional) old value of requesting property
     * @returns {Promise} A Promise that is resolved when the update completes.
     */
    requestUpdate(name, oldValue) {
        this._requestUpdate(name, oldValue);
        return this.updateComplete;
    }
    /**
     * Sets up the element to asynchronously update.
     */
    async _enqueueUpdate() {
        this._updateState = this._updateState | STATE_UPDATE_REQUESTED;
        try {
            // Ensure any previous update has resolved before updating.
            // This `await` also ensures that property changes are batched.
            await this._updatePromise;
        }
        catch (e) {
            // Ignore any previous errors. We only care that the previous cycle is
            // done. Any error should have been handled in the previous update.
        }
        const result = this.performUpdate();
        // If `performUpdate` returns a Promise, we await it. This is done to
        // enable coordinating updates with a scheduler. Note, the result is
        // checked to avoid delaying an additional microtask unless we need to.
        if (result != null) {
            await result;
        }
        return !this._hasRequestedUpdate;
    }
    get _hasRequestedUpdate() {
        return (this._updateState & STATE_UPDATE_REQUESTED);
    }
    get hasUpdated() {
        return (this._updateState & STATE_HAS_UPDATED);
    }
    /**
     * Performs an element update. Note, if an exception is thrown during the
     * update, `firstUpdated` and `updated` will not be called.
     *
     * You can override this method to change the timing of updates. If this
     * method is overridden, `super.performUpdate()` must be called.
     *
     * For instance, to schedule updates to occur just before the next frame:
     *
     * ```
     * protected async performUpdate(): Promise<unknown> {
     *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
     *   super.performUpdate();
     * }
     * ```
     */
    performUpdate() {
        // Mixin instance properties once, if they exist.
        if (this._instanceProperties) {
            this._applyInstanceProperties();
        }
        let shouldUpdate = false;
        const changedProperties = this._changedProperties;
        try {
            shouldUpdate = this.shouldUpdate(changedProperties);
            if (shouldUpdate) {
                this.update(changedProperties);
            }
            else {
                this._markUpdated();
            }
        }
        catch (e) {
            // Prevent `firstUpdated` and `updated` from running when there's an
            // update exception.
            shouldUpdate = false;
            // Ensure element can accept additional updates after an exception.
            this._markUpdated();
            throw e;
        }
        if (shouldUpdate) {
            if (!(this._updateState & STATE_HAS_UPDATED)) {
                this._updateState = this._updateState | STATE_HAS_UPDATED;
                this.firstUpdated(changedProperties);
            }
            this.updated(changedProperties);
        }
    }
    _markUpdated() {
        this._changedProperties = new Map();
        this._updateState = this._updateState & ~STATE_UPDATE_REQUESTED;
    }
    /**
     * Returns a Promise that resolves when the element has completed updating.
     * The Promise value is a boolean that is `true` if the element completed the
     * update without triggering another update. The Promise result is `false` if
     * a property was set inside `updated()`. If the Promise is rejected, an
     * exception was thrown during the update.
     *
     * To await additional asynchronous work, override the `_getUpdateComplete`
     * method. For example, it is sometimes useful to await a rendered element
     * before fulfilling this Promise. To do this, first await
     * `super._getUpdateComplete()`, then any subsequent state.
     *
     * @returns {Promise} The Promise returns a boolean that indicates if the
     * update resolved without triggering another update.
     */
    get updateComplete() {
        return this._getUpdateComplete();
    }
    /**
     * Override point for the `updateComplete` promise.
     *
     * It is not safe to override the `updateComplete` getter directly due to a
     * limitation in TypeScript which means it is not possible to call a
     * superclass getter (e.g. `super.updateComplete.then(...)`) when the target
     * language is ES5 (https://github.com/microsoft/TypeScript/issues/338).
     * This method should be overridden instead. For example:
     *
     *   class MyElement extends LitElement {
     *     async _getUpdateComplete() {
     *       await super._getUpdateComplete();
     *       await this._myChild.updateComplete;
     *     }
     *   }
     */
    _getUpdateComplete() {
        return this._updatePromise;
    }
    /**
     * Controls whether or not `update` should be called when the element requests
     * an update. By default, this method always returns `true`, but this can be
     * customized to control when to update.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    shouldUpdate(_changedProperties) {
        return true;
    }
    /**
     * Updates the element. This method reflects property values to attributes.
     * It can be overridden to render and keep updated element DOM.
     * Setting properties inside this method will *not* trigger
     * another update.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    update(_changedProperties) {
        if (this._reflectingProperties !== undefined &&
            this._reflectingProperties.size > 0) {
            // Use forEach so this works even if for/of loops are compiled to for
            // loops expecting arrays
            this._reflectingProperties.forEach((v, k) => this._propertyToAttribute(k, this[k], v));
            this._reflectingProperties = undefined;
        }
        this._markUpdated();
    }
    /**
     * Invoked whenever the element is updated. Implement to perform
     * post-updating tasks via DOM APIs, for example, focusing an element.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    updated(_changedProperties) {
    }
    /**
     * Invoked when the element is first updated. Implement to perform one time
     * work on the element after update.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    firstUpdated(_changedProperties) {
    }
}
_a = finalized;
/**
 * Marks class as having finished creating properties.
 */
UpdatingElement[_a] = true;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const legacyCustomElement = (tagName, clazz) => {
    window.customElements.define(tagName, clazz);
    // Cast as any because TS doesn't recognize the return type as being a
    // subtype of the decorated class when clazz is typed as
    // `Constructor<HTMLElement>` for some reason.
    // `Constructor<HTMLElement>` is helpful to make sure the decorator is
    // applied to elements however.
    // tslint:disable-next-line:no-any
    return clazz;
};
const standardCustomElement = (tagName, descriptor) => {
    const { kind, elements } = descriptor;
    return {
        kind,
        elements,
        // This callback is called once the class is otherwise fully defined
        finisher(clazz) {
            window.customElements.define(tagName, clazz);
        }
    };
};
/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * ```
 * @customElement('my-element')
 * class MyElement {
 *   render() {
 *     return html``;
 *   }
 * }
 * ```
 *
 * @param tagName The name of the custom element to define.
 */
const customElement = (tagName) => (classOrDescriptor) => (typeof classOrDescriptor === 'function') ?
    legacyCustomElement(tagName, classOrDescriptor) :
    standardCustomElement(tagName, classOrDescriptor);
const standardProperty = (options, element) => {
    // When decorating an accessor, pass it through and add property metadata.
    // Note, the `hasOwnProperty` check in `createProperty` ensures we don't
    // stomp over the user's accessor.
    if (element.kind === 'method' && element.descriptor &&
        !('value' in element.descriptor)) {
        return Object.assign(Object.assign({}, element), { finisher(clazz) {
                clazz.createProperty(element.key, options);
            } });
    }
    else {
        // createProperty() takes care of defining the property, but we still
        // must return some kind of descriptor, so return a descriptor for an
        // unused prototype field. The finisher calls createProperty().
        return {
            kind: 'field',
            key: Symbol(),
            placement: 'own',
            descriptor: {},
            // When @babel/plugin-proposal-decorators implements initializers,
            // do this instead of the initializer below. See:
            // https://github.com/babel/babel/issues/9260 extras: [
            //   {
            //     kind: 'initializer',
            //     placement: 'own',
            //     initializer: descriptor.initializer,
            //   }
            // ],
            initializer() {
                if (typeof element.initializer === 'function') {
                    this[element.key] = element.initializer.call(this);
                }
            },
            finisher(clazz) {
                clazz.createProperty(element.key, options);
            }
        };
    }
};
const legacyProperty = (options, proto, name) => {
    proto.constructor
        .createProperty(name, options);
};
/**
 * A property decorator which creates a LitElement property which reflects a
 * corresponding attribute value. A `PropertyDeclaration` may optionally be
 * supplied to configure property features.
 *
 * This decorator should only be used for public fields. Private or protected
 * fields should use the internalProperty decorator.
 *
 * @example
 *
 *     class MyElement {
 *       @property({ type: Boolean })
 *       clicked = false;
 *     }
 *
 * @ExportDecoratedItems
 */
function property(options) {
    // tslint:disable-next-line:no-any decorator
    return (protoOrDescriptor, name) => (name !== undefined) ?
        legacyProperty(options, protoOrDescriptor, name) :
        standardProperty(options, protoOrDescriptor);
}
/**
 * A property decorator that converts a class property into a getter that
 * executes a querySelector on the element's renderRoot.
 *
 * @param selector A DOMString containing one or more selectors to match.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector
 *
 * @example
 *
 *     class MyElement {
 *       @query('#first')
 *       first;
 *
 *       render() {
 *         return html`
 *           <div id="first"></div>
 *           <div id="second"></div>
 *         `;
 *       }
 *     }
 *
 */
function query(selector) {
    return (protoOrDescriptor, 
    // tslint:disable-next-line:no-any decorator
    name) => {
        const descriptor = {
            get() {
                return this.renderRoot.querySelector(selector);
            },
            enumerable: true,
            configurable: true,
        };
        return (name !== undefined) ?
            legacyQuery(descriptor, protoOrDescriptor, name) :
            standardQuery(descriptor, protoOrDescriptor);
    };
}
const legacyQuery = (descriptor, proto, name) => {
    Object.defineProperty(proto, name, descriptor);
};
const standardQuery = (descriptor, element) => ({
    kind: 'method',
    placement: 'prototype',
    key: element.key,
    descriptor,
});
const standardEventOptions = (options, element) => {
    return Object.assign(Object.assign({}, element), { finisher(clazz) {
            Object.assign(clazz.prototype[element.key], options);
        } });
};
const legacyEventOptions = 
// tslint:disable-next-line:no-any legacy decorator
(options, proto, name) => {
    Object.assign(proto[name], options);
};
/**
 * Adds event listener options to a method used as an event listener in a
 * lit-html template.
 *
 * @param options An object that specifies event listener options as accepted by
 * `EventTarget#addEventListener` and `EventTarget#removeEventListener`.
 *
 * Current browsers support the `capture`, `passive`, and `once` options. See:
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Parameters
 *
 * @example
 *
 *     class MyElement {
 *       clicked = false;
 *
 *       render() {
 *         return html`
 *           <div @click=${this._onClick}`>
 *             <button></button>
 *           </div>
 *         `;
 *       }
 *
 *       @eventOptions({capture: true})
 *       _onClick(e) {
 *         this.clicked = true;
 *       }
 *     }
 */
function eventOptions(options) {
    // Return value typed as any to prevent TypeScript from complaining that
    // standard decorator function signature does not match TypeScript decorator
    // signature
    // TODO(kschaaf): unclear why it was only failing on this decorator and not
    // the others
    return ((protoOrDescriptor, name) => (name !== undefined) ?
        legacyEventOptions(options, protoOrDescriptor, name) :
        standardEventOptions(options, protoOrDescriptor));
}

/**
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/
const supportsAdoptingStyleSheets = ('adoptedStyleSheets' in Document.prototype) &&
    ('replace' in CSSStyleSheet.prototype);
const constructionToken = Symbol();
class CSSResult {
    constructor(cssText, safeToken) {
        if (safeToken !== constructionToken) {
            throw new Error('CSSResult is not constructable. Use `unsafeCSS` or `css` instead.');
        }
        this.cssText = cssText;
    }
    // Note, this is a getter so that it's lazy. In practice, this means
    // stylesheets are not created until the first element instance is made.
    get styleSheet() {
        if (this._styleSheet === undefined) {
            // Note, if `adoptedStyleSheets` is supported then we assume CSSStyleSheet
            // is constructable.
            if (supportsAdoptingStyleSheets) {
                this._styleSheet = new CSSStyleSheet();
                this._styleSheet.replaceSync(this.cssText);
            }
            else {
                this._styleSheet = null;
            }
        }
        return this._styleSheet;
    }
    toString() {
        return this.cssText;
    }
}
const textFromCSSResult = (value) => {
    if (value instanceof CSSResult) {
        return value.cssText;
    }
    else if (typeof value === 'number') {
        return value;
    }
    else {
        throw new Error(`Value passed to 'css' function must be a 'css' function result: ${value}. Use 'unsafeCSS' to pass non-literal values, but
            take care to ensure page security.`);
    }
};
/**
 * Template tag which which can be used with LitElement's `style` property to
 * set element styles. For security reasons, only literal string values may be
 * used. To incorporate non-literal values `unsafeCSS` may be used inside a
 * template string part.
 */
const css = (strings, ...values) => {
    const cssText = values.reduce((acc, v, idx) => acc + textFromCSSResult(v) + strings[idx + 1], strings[0]);
    return new CSSResult(cssText, constructionToken);
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for LitElement usage.
// TODO(justinfagnani): inject version number at build time
(window['litElementVersions'] || (window['litElementVersions'] = []))
    .push('2.3.1');
/**
 * Sentinal value used to avoid calling lit-html's render function when
 * subclasses do not implement `render`
 */
const renderNotImplemented = {};
class LitElement extends UpdatingElement {
    /**
     * Return the array of styles to apply to the element.
     * Override this method to integrate into a style management system.
     *
     * @nocollapse
     */
    static getStyles() {
        return this.styles;
    }
    /** @nocollapse */
    static _getUniqueStyles() {
        // Only gather styles once per class
        if (this.hasOwnProperty(JSCompiler_renameProperty('_styles', this))) {
            return;
        }
        // Take care not to call `this.getStyles()` multiple times since this
        // generates new CSSResults each time.
        // TODO(sorvell): Since we do not cache CSSResults by input, any
        // shared styles will generate new stylesheet objects, which is wasteful.
        // This should be addressed when a browser ships constructable
        // stylesheets.
        const userStyles = this.getStyles();
        if (userStyles === undefined) {
            this._styles = [];
        }
        else if (Array.isArray(userStyles)) {
            // De-duplicate styles preserving the _last_ instance in the set.
            // This is a performance optimization to avoid duplicated styles that can
            // occur especially when composing via subclassing.
            // The last item is kept to try to preserve the cascade order with the
            // assumption that it's most important that last added styles override
            // previous styles.
            const addStyles = (styles, set) => styles.reduceRight((set, s) => 
            // Note: On IE set.add() does not return the set
            Array.isArray(s) ? addStyles(s, set) : (set.add(s), set), set);
            // Array.from does not work on Set in IE, otherwise return
            // Array.from(addStyles(userStyles, new Set<CSSResult>())).reverse()
            const set = addStyles(userStyles, new Set());
            const styles = [];
            set.forEach((v) => styles.unshift(v));
            this._styles = styles;
        }
        else {
            this._styles = [userStyles];
        }
    }
    /**
     * Performs element initialization. By default this calls `createRenderRoot`
     * to create the element `renderRoot` node and captures any pre-set values for
     * registered properties.
     */
    initialize() {
        super.initialize();
        this.constructor._getUniqueStyles();
        this.renderRoot =
            this.createRenderRoot();
        // Note, if renderRoot is not a shadowRoot, styles would/could apply to the
        // element's getRootNode(). While this could be done, we're choosing not to
        // support this now since it would require different logic around de-duping.
        if (window.ShadowRoot && this.renderRoot instanceof window.ShadowRoot) {
            this.adoptStyles();
        }
    }
    /**
     * Returns the node into which the element should render and by default
     * creates and returns an open shadowRoot. Implement to customize where the
     * element's DOM is rendered. For example, to render into the element's
     * childNodes, return `this`.
     * @returns {Element|DocumentFragment} Returns a node into which to render.
     */
    createRenderRoot() {
        return this.attachShadow({ mode: 'open' });
    }
    /**
     * Applies styling to the element shadowRoot using the `static get styles`
     * property. Styling will apply using `shadowRoot.adoptedStyleSheets` where
     * available and will fallback otherwise. When Shadow DOM is polyfilled,
     * ShadyCSS scopes styles and adds them to the document. When Shadow DOM
     * is available but `adoptedStyleSheets` is not, styles are appended to the
     * end of the `shadowRoot` to [mimic spec
     * behavior](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
     */
    adoptStyles() {
        const styles = this.constructor._styles;
        if (styles.length === 0) {
            return;
        }
        // There are three separate cases here based on Shadow DOM support.
        // (1) shadowRoot polyfilled: use ShadyCSS
        // (2) shadowRoot.adoptedStyleSheets available: use it.
        // (3) shadowRoot.adoptedStyleSheets polyfilled: append styles after
        // rendering
        if (window.ShadyCSS !== undefined && !window.ShadyCSS.nativeShadow) {
            window.ShadyCSS.ScopingShim.prepareAdoptedCssText(styles.map((s) => s.cssText), this.localName);
        }
        else if (supportsAdoptingStyleSheets) {
            this.renderRoot.adoptedStyleSheets =
                styles.map((s) => s.styleSheet);
        }
        else {
            // This must be done after rendering so the actual style insertion is done
            // in `update`.
            this._needsShimAdoptedStyleSheets = true;
        }
    }
    connectedCallback() {
        super.connectedCallback();
        // Note, first update/render handles styleElement so we only call this if
        // connected after first update.
        if (this.hasUpdated && window.ShadyCSS !== undefined) {
            window.ShadyCSS.styleElement(this);
        }
    }
    /**
     * Updates the element. This method reflects property values to attributes
     * and calls `render` to render DOM via lit-html. Setting properties inside
     * this method will *not* trigger another update.
     * @param _changedProperties Map of changed properties with old values
     */
    update(changedProperties) {
        // Setting properties in `render` should not trigger an update. Since
        // updates are allowed after super.update, it's important to call `render`
        // before that.
        const templateResult = this.render();
        super.update(changedProperties);
        // If render is not implemented by the component, don't call lit-html render
        if (templateResult !== renderNotImplemented) {
            this.constructor
                .render(templateResult, this.renderRoot, { scopeName: this.localName, eventContext: this });
        }
        // When native Shadow DOM is used but adoptedStyles are not supported,
        // insert styling after rendering to ensure adoptedStyles have highest
        // priority.
        if (this._needsShimAdoptedStyleSheets) {
            this._needsShimAdoptedStyleSheets = false;
            this.constructor._styles.forEach((s) => {
                const style = document.createElement('style');
                style.textContent = s.cssText;
                this.renderRoot.appendChild(style);
            });
        }
    }
    /**
     * Invoked on each update to perform rendering tasks. This method may return
     * any value renderable by lit-html's NodePart - typically a TemplateResult.
     * Setting properties inside this method will *not* trigger the element to
     * update.
     */
    render() {
        return renderNotImplemented;
    }
}
/**
 * Ensure this class is marked as `finalized` as an optimization ensuring
 * it will not needlessly try to `finalize`.
 *
 * Note this property name is a string to prevent breaking Closure JS Compiler
 * optimizations. See updating-element.ts for more information.
 */
LitElement['finalized'] = true;
/**
 * Render method used to render the value to the element's DOM.
 * @param result The value to render.
 * @param container Node into which to render.
 * @param options Element name.
 * @nocollapse
 */
LitElement.render = render$1;

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const style = css `:host{font-family:var(--mdc-icon-font, "Material Icons");font-weight:normal;font-style:normal;font-size:var(--mdc-icon-size, 24px);line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-moz-osx-font-smoothing:grayscale;font-feature-settings:"liga"}`;

let Icon = class Icon extends LitElement {
    render() {
        return html `<slot></slot>`;
    }
};
Icon.styles = style;
Icon = __decorate([
    customElement('mwc-icon')
], Icon);

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * Determine whether the current browser supports passive event listeners, and
 * if so, use them.
 */
function applyPassive(globalObj) {
    if (globalObj === void 0) { globalObj = window; }
    return supportsPassiveOption(globalObj) ?
        { passive: true } :
        false;
}
function supportsPassiveOption(globalObj) {
    if (globalObj === void 0) { globalObj = window; }
    // See
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
    var passiveSupported = false;
    try {
        var options = {
            // This function will be called when the browser
            // attempts to access the passive property.
            get passive() {
                passiveSupported = true;
                return false;
            }
        };
        var handler = function () { };
        globalObj.document.addEventListener('test', handler, options);
        globalObj.document.removeEventListener('test', handler, options);
    }
    catch (err) {
        passiveSupported = false;
    }
    return passiveSupported;
}

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
function matches(element, selector) {
    var nativeMatches = element.matches
        || element.webkitMatchesSelector
        || element.msMatchesSelector;
    return nativeMatches.call(element, selector);
}

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCFoundation = /** @class */ (function () {
    function MDCFoundation(adapter) {
        if (adapter === void 0) { adapter = {}; }
        this.adapter_ = adapter;
    }
    Object.defineProperty(MDCFoundation, "cssClasses", {
        get: function () {
            // Classes extending MDCFoundation should implement this method to return an object which exports every
            // CSS class the foundation class needs as a property. e.g. {ACTIVE: 'mdc-component--active'}
            return {};
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFoundation, "strings", {
        get: function () {
            // Classes extending MDCFoundation should implement this method to return an object which exports all
            // semantic strings as constants. e.g. {ARIA_ROLE: 'tablist'}
            return {};
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFoundation, "numbers", {
        get: function () {
            // Classes extending MDCFoundation should implement this method to return an object which exports all
            // of its semantic numbers as constants. e.g. {ANIMATION_DELAY_MS: 350}
            return {};
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFoundation, "defaultAdapter", {
        get: function () {
            // Classes extending MDCFoundation may choose to implement this getter in order to provide a convenient
            // way of viewing the necessary methods of an adapter. In the future, this could also be used for adapter
            // validation.
            return {};
        },
        enumerable: true,
        configurable: true
    });
    MDCFoundation.prototype.init = function () {
        // Subclasses should override this method to perform initialization routines (registering events, etc.)
    };
    MDCFoundation.prototype.destroy = function () {
        // Subclasses should override this method to perform de-initialization routines (de-registering events, etc.)
    };
    return MDCFoundation;
}());

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses = {
    // Ripple is a special case where the "root" component is really a "mixin" of sorts,
    // given that it's an 'upgrade' to an existing component. That being said it is the root
    // CSS class that all other CSS classes derive from.
    BG_FOCUSED: 'mdc-ripple-upgraded--background-focused',
    FG_ACTIVATION: 'mdc-ripple-upgraded--foreground-activation',
    FG_DEACTIVATION: 'mdc-ripple-upgraded--foreground-deactivation',
    ROOT: 'mdc-ripple-upgraded',
    UNBOUNDED: 'mdc-ripple-upgraded--unbounded',
};
var strings = {
    VAR_FG_SCALE: '--mdc-ripple-fg-scale',
    VAR_FG_SIZE: '--mdc-ripple-fg-size',
    VAR_FG_TRANSLATE_END: '--mdc-ripple-fg-translate-end',
    VAR_FG_TRANSLATE_START: '--mdc-ripple-fg-translate-start',
    VAR_LEFT: '--mdc-ripple-left',
    VAR_TOP: '--mdc-ripple-top',
};
var numbers = {
    DEACTIVATION_TIMEOUT_MS: 225,
    FG_DEACTIVATION_MS: 150,
    INITIAL_ORIGIN_SCALE: 0.6,
    PADDING: 10,
    TAP_DELAY_MS: 300,
};

/**
 * Stores result from supportsCssVariables to avoid redundant processing to
 * detect CSS custom variable support.
 */
var supportsCssVariables_;
function supportsCssVariables(windowObj, forceRefresh) {
    if (forceRefresh === void 0) { forceRefresh = false; }
    var CSS = windowObj.CSS;
    var supportsCssVars = supportsCssVariables_;
    if (typeof supportsCssVariables_ === 'boolean' && !forceRefresh) {
        return supportsCssVariables_;
    }
    var supportsFunctionPresent = CSS && typeof CSS.supports === 'function';
    if (!supportsFunctionPresent) {
        return false;
    }
    var explicitlySupportsCssVars = CSS.supports('--css-vars', 'yes');
    // See: https://bugs.webkit.org/show_bug.cgi?id=154669
    // See: README section on Safari
    var weAreFeatureDetectingSafari10plus = (CSS.supports('(--css-vars: yes)') &&
        CSS.supports('color', '#00000000'));
    supportsCssVars =
        explicitlySupportsCssVars || weAreFeatureDetectingSafari10plus;
    if (!forceRefresh) {
        supportsCssVariables_ = supportsCssVars;
    }
    return supportsCssVars;
}
function getNormalizedEventCoords(evt, pageOffset, clientRect) {
    if (!evt) {
        return { x: 0, y: 0 };
    }
    var x = pageOffset.x, y = pageOffset.y;
    var documentX = x + clientRect.left;
    var documentY = y + clientRect.top;
    var normalizedX;
    var normalizedY;
    // Determine touch point relative to the ripple container.
    if (evt.type === 'touchstart') {
        var touchEvent = evt;
        normalizedX = touchEvent.changedTouches[0].pageX - documentX;
        normalizedY = touchEvent.changedTouches[0].pageY - documentY;
    }
    else {
        var mouseEvent = evt;
        normalizedX = mouseEvent.pageX - documentX;
        normalizedY = mouseEvent.pageY - documentY;
    }
    return { x: normalizedX, y: normalizedY };
}

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
// Activation events registered on the root element of each instance for activation
var ACTIVATION_EVENT_TYPES = [
    'touchstart', 'pointerdown', 'mousedown', 'keydown',
];
// Deactivation events registered on documentElement when a pointer-related down event occurs
var POINTER_DEACTIVATION_EVENT_TYPES = [
    'touchend', 'pointerup', 'mouseup', 'contextmenu',
];
// simultaneous nested activations
var activatedTargets = [];
var MDCRippleFoundation = /** @class */ (function (_super) {
    __extends(MDCRippleFoundation, _super);
    function MDCRippleFoundation(adapter) {
        var _this = _super.call(this, __assign({}, MDCRippleFoundation.defaultAdapter, adapter)) || this;
        _this.activationAnimationHasEnded_ = false;
        _this.activationTimer_ = 0;
        _this.fgDeactivationRemovalTimer_ = 0;
        _this.fgScale_ = '0';
        _this.frame_ = { width: 0, height: 0 };
        _this.initialSize_ = 0;
        _this.layoutFrame_ = 0;
        _this.maxRadius_ = 0;
        _this.unboundedCoords_ = { left: 0, top: 0 };
        _this.activationState_ = _this.defaultActivationState_();
        _this.activationTimerCallback_ = function () {
            _this.activationAnimationHasEnded_ = true;
            _this.runDeactivationUXLogicIfReady_();
        };
        _this.activateHandler_ = function (e) { return _this.activate_(e); };
        _this.deactivateHandler_ = function () { return _this.deactivate_(); };
        _this.focusHandler_ = function () { return _this.handleFocus(); };
        _this.blurHandler_ = function () { return _this.handleBlur(); };
        _this.resizeHandler_ = function () { return _this.layout(); };
        return _this;
    }
    Object.defineProperty(MDCRippleFoundation, "cssClasses", {
        get: function () {
            return cssClasses;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRippleFoundation, "strings", {
        get: function () {
            return strings;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRippleFoundation, "numbers", {
        get: function () {
            return numbers;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRippleFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClass: function () { return undefined; },
                browserSupportsCssVars: function () { return true; },
                computeBoundingRect: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                containsEventTarget: function () { return true; },
                deregisterDocumentInteractionHandler: function () { return undefined; },
                deregisterInteractionHandler: function () { return undefined; },
                deregisterResizeHandler: function () { return undefined; },
                getWindowPageOffset: function () { return ({ x: 0, y: 0 }); },
                isSurfaceActive: function () { return true; },
                isSurfaceDisabled: function () { return true; },
                isUnbounded: function () { return true; },
                registerDocumentInteractionHandler: function () { return undefined; },
                registerInteractionHandler: function () { return undefined; },
                registerResizeHandler: function () { return undefined; },
                removeClass: function () { return undefined; },
                updateCssVariable: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCRippleFoundation.prototype.init = function () {
        var _this = this;
        var supportsPressRipple = this.supportsPressRipple_();
        this.registerRootHandlers_(supportsPressRipple);
        if (supportsPressRipple) {
            var _a = MDCRippleFoundation.cssClasses, ROOT_1 = _a.ROOT, UNBOUNDED_1 = _a.UNBOUNDED;
            requestAnimationFrame(function () {
                _this.adapter_.addClass(ROOT_1);
                if (_this.adapter_.isUnbounded()) {
                    _this.adapter_.addClass(UNBOUNDED_1);
                    // Unbounded ripples need layout logic applied immediately to set coordinates for both shade and ripple
                    _this.layoutInternal_();
                }
            });
        }
    };
    MDCRippleFoundation.prototype.destroy = function () {
        var _this = this;
        if (this.supportsPressRipple_()) {
            if (this.activationTimer_) {
                clearTimeout(this.activationTimer_);
                this.activationTimer_ = 0;
                this.adapter_.removeClass(MDCRippleFoundation.cssClasses.FG_ACTIVATION);
            }
            if (this.fgDeactivationRemovalTimer_) {
                clearTimeout(this.fgDeactivationRemovalTimer_);
                this.fgDeactivationRemovalTimer_ = 0;
                this.adapter_.removeClass(MDCRippleFoundation.cssClasses.FG_DEACTIVATION);
            }
            var _a = MDCRippleFoundation.cssClasses, ROOT_2 = _a.ROOT, UNBOUNDED_2 = _a.UNBOUNDED;
            requestAnimationFrame(function () {
                _this.adapter_.removeClass(ROOT_2);
                _this.adapter_.removeClass(UNBOUNDED_2);
                _this.removeCssVars_();
            });
        }
        this.deregisterRootHandlers_();
        this.deregisterDeactivationHandlers_();
    };
    /**
     * @param evt Optional event containing position information.
     */
    MDCRippleFoundation.prototype.activate = function (evt) {
        this.activate_(evt);
    };
    MDCRippleFoundation.prototype.deactivate = function () {
        this.deactivate_();
    };
    MDCRippleFoundation.prototype.layout = function () {
        var _this = this;
        if (this.layoutFrame_) {
            cancelAnimationFrame(this.layoutFrame_);
        }
        this.layoutFrame_ = requestAnimationFrame(function () {
            _this.layoutInternal_();
            _this.layoutFrame_ = 0;
        });
    };
    MDCRippleFoundation.prototype.setUnbounded = function (unbounded) {
        var UNBOUNDED = MDCRippleFoundation.cssClasses.UNBOUNDED;
        if (unbounded) {
            this.adapter_.addClass(UNBOUNDED);
        }
        else {
            this.adapter_.removeClass(UNBOUNDED);
        }
    };
    MDCRippleFoundation.prototype.handleFocus = function () {
        var _this = this;
        requestAnimationFrame(function () {
            return _this.adapter_.addClass(MDCRippleFoundation.cssClasses.BG_FOCUSED);
        });
    };
    MDCRippleFoundation.prototype.handleBlur = function () {
        var _this = this;
        requestAnimationFrame(function () {
            return _this.adapter_.removeClass(MDCRippleFoundation.cssClasses.BG_FOCUSED);
        });
    };
    /**
     * We compute this property so that we are not querying information about the client
     * until the point in time where the foundation requests it. This prevents scenarios where
     * client-side feature-detection may happen too early, such as when components are rendered on the server
     * and then initialized at mount time on the client.
     */
    MDCRippleFoundation.prototype.supportsPressRipple_ = function () {
        return this.adapter_.browserSupportsCssVars();
    };
    MDCRippleFoundation.prototype.defaultActivationState_ = function () {
        return {
            activationEvent: undefined,
            hasDeactivationUXRun: false,
            isActivated: false,
            isProgrammatic: false,
            wasActivatedByPointer: false,
            wasElementMadeActive: false,
        };
    };
    /**
     * supportsPressRipple Passed from init to save a redundant function call
     */
    MDCRippleFoundation.prototype.registerRootHandlers_ = function (supportsPressRipple) {
        var _this = this;
        if (supportsPressRipple) {
            ACTIVATION_EVENT_TYPES.forEach(function (evtType) {
                _this.adapter_.registerInteractionHandler(evtType, _this.activateHandler_);
            });
            if (this.adapter_.isUnbounded()) {
                this.adapter_.registerResizeHandler(this.resizeHandler_);
            }
        }
        this.adapter_.registerInteractionHandler('focus', this.focusHandler_);
        this.adapter_.registerInteractionHandler('blur', this.blurHandler_);
    };
    MDCRippleFoundation.prototype.registerDeactivationHandlers_ = function (evt) {
        var _this = this;
        if (evt.type === 'keydown') {
            this.adapter_.registerInteractionHandler('keyup', this.deactivateHandler_);
        }
        else {
            POINTER_DEACTIVATION_EVENT_TYPES.forEach(function (evtType) {
                _this.adapter_.registerDocumentInteractionHandler(evtType, _this.deactivateHandler_);
            });
        }
    };
    MDCRippleFoundation.prototype.deregisterRootHandlers_ = function () {
        var _this = this;
        ACTIVATION_EVENT_TYPES.forEach(function (evtType) {
            _this.adapter_.deregisterInteractionHandler(evtType, _this.activateHandler_);
        });
        this.adapter_.deregisterInteractionHandler('focus', this.focusHandler_);
        this.adapter_.deregisterInteractionHandler('blur', this.blurHandler_);
        if (this.adapter_.isUnbounded()) {
            this.adapter_.deregisterResizeHandler(this.resizeHandler_);
        }
    };
    MDCRippleFoundation.prototype.deregisterDeactivationHandlers_ = function () {
        var _this = this;
        this.adapter_.deregisterInteractionHandler('keyup', this.deactivateHandler_);
        POINTER_DEACTIVATION_EVENT_TYPES.forEach(function (evtType) {
            _this.adapter_.deregisterDocumentInteractionHandler(evtType, _this.deactivateHandler_);
        });
    };
    MDCRippleFoundation.prototype.removeCssVars_ = function () {
        var _this = this;
        var rippleStrings = MDCRippleFoundation.strings;
        var keys = Object.keys(rippleStrings);
        keys.forEach(function (key) {
            if (key.indexOf('VAR_') === 0) {
                _this.adapter_.updateCssVariable(rippleStrings[key], null);
            }
        });
    };
    MDCRippleFoundation.prototype.activate_ = function (evt) {
        var _this = this;
        if (this.adapter_.isSurfaceDisabled()) {
            return;
        }
        var activationState = this.activationState_;
        if (activationState.isActivated) {
            return;
        }
        // Avoid reacting to follow-on events fired by touch device after an already-processed user interaction
        var previousActivationEvent = this.previousActivationEvent_;
        var isSameInteraction = previousActivationEvent && evt !== undefined && previousActivationEvent.type !== evt.type;
        if (isSameInteraction) {
            return;
        }
        activationState.isActivated = true;
        activationState.isProgrammatic = evt === undefined;
        activationState.activationEvent = evt;
        activationState.wasActivatedByPointer = activationState.isProgrammatic ? false : evt !== undefined && (evt.type === 'mousedown' || evt.type === 'touchstart' || evt.type === 'pointerdown');
        var hasActivatedChild = evt !== undefined && activatedTargets.length > 0 && activatedTargets.some(function (target) { return _this.adapter_.containsEventTarget(target); });
        if (hasActivatedChild) {
            // Immediately reset activation state, while preserving logic that prevents touch follow-on events
            this.resetActivationState_();
            return;
        }
        if (evt !== undefined) {
            activatedTargets.push(evt.target);
            this.registerDeactivationHandlers_(evt);
        }
        activationState.wasElementMadeActive = this.checkElementMadeActive_(evt);
        if (activationState.wasElementMadeActive) {
            this.animateActivation_();
        }
        requestAnimationFrame(function () {
            // Reset array on next frame after the current event has had a chance to bubble to prevent ancestor ripples
            activatedTargets = [];
            if (!activationState.wasElementMadeActive
                && evt !== undefined
                && (evt.key === ' ' || evt.keyCode === 32)) {
                // If space was pressed, try again within an rAF call to detect :active, because different UAs report
                // active states inconsistently when they're called within event handling code:
                // - https://bugs.chromium.org/p/chromium/issues/detail?id=635971
                // - https://bugzilla.mozilla.org/show_bug.cgi?id=1293741
                // We try first outside rAF to support Edge, which does not exhibit this problem, but will crash if a CSS
                // variable is set within a rAF callback for a submit button interaction (#2241).
                activationState.wasElementMadeActive = _this.checkElementMadeActive_(evt);
                if (activationState.wasElementMadeActive) {
                    _this.animateActivation_();
                }
            }
            if (!activationState.wasElementMadeActive) {
                // Reset activation state immediately if element was not made active.
                _this.activationState_ = _this.defaultActivationState_();
            }
        });
    };
    MDCRippleFoundation.prototype.checkElementMadeActive_ = function (evt) {
        return (evt !== undefined && evt.type === 'keydown') ? this.adapter_.isSurfaceActive() : true;
    };
    MDCRippleFoundation.prototype.animateActivation_ = function () {
        var _this = this;
        var _a = MDCRippleFoundation.strings, VAR_FG_TRANSLATE_START = _a.VAR_FG_TRANSLATE_START, VAR_FG_TRANSLATE_END = _a.VAR_FG_TRANSLATE_END;
        var _b = MDCRippleFoundation.cssClasses, FG_DEACTIVATION = _b.FG_DEACTIVATION, FG_ACTIVATION = _b.FG_ACTIVATION;
        var DEACTIVATION_TIMEOUT_MS = MDCRippleFoundation.numbers.DEACTIVATION_TIMEOUT_MS;
        this.layoutInternal_();
        var translateStart = '';
        var translateEnd = '';
        if (!this.adapter_.isUnbounded()) {
            var _c = this.getFgTranslationCoordinates_(), startPoint = _c.startPoint, endPoint = _c.endPoint;
            translateStart = startPoint.x + "px, " + startPoint.y + "px";
            translateEnd = endPoint.x + "px, " + endPoint.y + "px";
        }
        this.adapter_.updateCssVariable(VAR_FG_TRANSLATE_START, translateStart);
        this.adapter_.updateCssVariable(VAR_FG_TRANSLATE_END, translateEnd);
        // Cancel any ongoing activation/deactivation animations
        clearTimeout(this.activationTimer_);
        clearTimeout(this.fgDeactivationRemovalTimer_);
        this.rmBoundedActivationClasses_();
        this.adapter_.removeClass(FG_DEACTIVATION);
        // Force layout in order to re-trigger the animation.
        this.adapter_.computeBoundingRect();
        this.adapter_.addClass(FG_ACTIVATION);
        this.activationTimer_ = setTimeout(function () { return _this.activationTimerCallback_(); }, DEACTIVATION_TIMEOUT_MS);
    };
    MDCRippleFoundation.prototype.getFgTranslationCoordinates_ = function () {
        var _a = this.activationState_, activationEvent = _a.activationEvent, wasActivatedByPointer = _a.wasActivatedByPointer;
        var startPoint;
        if (wasActivatedByPointer) {
            startPoint = getNormalizedEventCoords(activationEvent, this.adapter_.getWindowPageOffset(), this.adapter_.computeBoundingRect());
        }
        else {
            startPoint = {
                x: this.frame_.width / 2,
                y: this.frame_.height / 2,
            };
        }
        // Center the element around the start point.
        startPoint = {
            x: startPoint.x - (this.initialSize_ / 2),
            y: startPoint.y - (this.initialSize_ / 2),
        };
        var endPoint = {
            x: (this.frame_.width / 2) - (this.initialSize_ / 2),
            y: (this.frame_.height / 2) - (this.initialSize_ / 2),
        };
        return { startPoint: startPoint, endPoint: endPoint };
    };
    MDCRippleFoundation.prototype.runDeactivationUXLogicIfReady_ = function () {
        var _this = this;
        // This method is called both when a pointing device is released, and when the activation animation ends.
        // The deactivation animation should only run after both of those occur.
        var FG_DEACTIVATION = MDCRippleFoundation.cssClasses.FG_DEACTIVATION;
        var _a = this.activationState_, hasDeactivationUXRun = _a.hasDeactivationUXRun, isActivated = _a.isActivated;
        var activationHasEnded = hasDeactivationUXRun || !isActivated;
        if (activationHasEnded && this.activationAnimationHasEnded_) {
            this.rmBoundedActivationClasses_();
            this.adapter_.addClass(FG_DEACTIVATION);
            this.fgDeactivationRemovalTimer_ = setTimeout(function () {
                _this.adapter_.removeClass(FG_DEACTIVATION);
            }, numbers.FG_DEACTIVATION_MS);
        }
    };
    MDCRippleFoundation.prototype.rmBoundedActivationClasses_ = function () {
        var FG_ACTIVATION = MDCRippleFoundation.cssClasses.FG_ACTIVATION;
        this.adapter_.removeClass(FG_ACTIVATION);
        this.activationAnimationHasEnded_ = false;
        this.adapter_.computeBoundingRect();
    };
    MDCRippleFoundation.prototype.resetActivationState_ = function () {
        var _this = this;
        this.previousActivationEvent_ = this.activationState_.activationEvent;
        this.activationState_ = this.defaultActivationState_();
        // Touch devices may fire additional events for the same interaction within a short time.
        // Store the previous event until it's safe to assume that subsequent events are for new interactions.
        setTimeout(function () { return _this.previousActivationEvent_ = undefined; }, MDCRippleFoundation.numbers.TAP_DELAY_MS);
    };
    MDCRippleFoundation.prototype.deactivate_ = function () {
        var _this = this;
        var activationState = this.activationState_;
        // This can happen in scenarios such as when you have a keyup event that blurs the element.
        if (!activationState.isActivated) {
            return;
        }
        var state = __assign({}, activationState);
        if (activationState.isProgrammatic) {
            requestAnimationFrame(function () { return _this.animateDeactivation_(state); });
            this.resetActivationState_();
        }
        else {
            this.deregisterDeactivationHandlers_();
            requestAnimationFrame(function () {
                _this.activationState_.hasDeactivationUXRun = true;
                _this.animateDeactivation_(state);
                _this.resetActivationState_();
            });
        }
    };
    MDCRippleFoundation.prototype.animateDeactivation_ = function (_a) {
        var wasActivatedByPointer = _a.wasActivatedByPointer, wasElementMadeActive = _a.wasElementMadeActive;
        if (wasActivatedByPointer || wasElementMadeActive) {
            this.runDeactivationUXLogicIfReady_();
        }
    };
    MDCRippleFoundation.prototype.layoutInternal_ = function () {
        var _this = this;
        this.frame_ = this.adapter_.computeBoundingRect();
        var maxDim = Math.max(this.frame_.height, this.frame_.width);
        // Surface diameter is treated differently for unbounded vs. bounded ripples.
        // Unbounded ripple diameter is calculated smaller since the surface is expected to already be padded appropriately
        // to extend the hitbox, and the ripple is expected to meet the edges of the padded hitbox (which is typically
        // square). Bounded ripples, on the other hand, are fully expected to expand beyond the surface's longest diameter
        // (calculated based on the diagonal plus a constant padding), and are clipped at the surface's border via
        // `overflow: hidden`.
        var getBoundedRadius = function () {
            var hypotenuse = Math.sqrt(Math.pow(_this.frame_.width, 2) + Math.pow(_this.frame_.height, 2));
            return hypotenuse + MDCRippleFoundation.numbers.PADDING;
        };
        this.maxRadius_ = this.adapter_.isUnbounded() ? maxDim : getBoundedRadius();
        // Ripple is sized as a fraction of the largest dimension of the surface, then scales up using a CSS scale transform
        var initialSize = Math.floor(maxDim * MDCRippleFoundation.numbers.INITIAL_ORIGIN_SCALE);
        // Unbounded ripple size should always be even number to equally center align.
        if (this.adapter_.isUnbounded() && initialSize % 2 !== 0) {
            this.initialSize_ = initialSize - 1;
        }
        else {
            this.initialSize_ = initialSize;
        }
        this.fgScale_ = "" + this.maxRadius_ / this.initialSize_;
        this.updateLayoutCssVars_();
    };
    MDCRippleFoundation.prototype.updateLayoutCssVars_ = function () {
        var _a = MDCRippleFoundation.strings, VAR_FG_SIZE = _a.VAR_FG_SIZE, VAR_LEFT = _a.VAR_LEFT, VAR_TOP = _a.VAR_TOP, VAR_FG_SCALE = _a.VAR_FG_SCALE;
        this.adapter_.updateCssVariable(VAR_FG_SIZE, this.initialSize_ + "px");
        this.adapter_.updateCssVariable(VAR_FG_SCALE, this.fgScale_);
        if (this.adapter_.isUnbounded()) {
            this.unboundedCoords_ = {
                left: Math.round((this.frame_.width / 2) - (this.initialSize_ / 2)),
                top: Math.round((this.frame_.height / 2) - (this.initialSize_ / 2)),
            };
            this.adapter_.updateCssVariable(VAR_LEFT, this.unboundedCoords_.left + "px");
            this.adapter_.updateCssVariable(VAR_TOP, this.unboundedCoords_.top + "px");
        }
    };
    return MDCRippleFoundation;
}(MDCFoundation));

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const style$1 = css `@keyframes mdc-ripple-fg-radius-in{from{animation-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transform:translate(var(--mdc-ripple-fg-translate-start, 0)) scale(1)}to{transform:translate(var(--mdc-ripple-fg-translate-end, 0)) scale(var(--mdc-ripple-fg-scale, 1))}}@keyframes mdc-ripple-fg-opacity-in{from{animation-timing-function:linear;opacity:0}to{opacity:var(--mdc-ripple-fg-opacity, 0)}}@keyframes mdc-ripple-fg-opacity-out{from{animation-timing-function:linear;opacity:var(--mdc-ripple-fg-opacity, 0)}to{opacity:0}}`;

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const supportsCssVariablesWin = supportsCssVariables(window);
// NOTE: This is a workaround for
// https://bugs.webkit.org/show_bug.cgi?id=173027. Since keyframes on
// pseudo-elements (:after) are not supported in Shadow DOM, we put the keyframe
// style into the <head> element.
const isSafari = navigator.userAgent.match(/Safari/);
let didApplyRippleStyle = false;
const applyRippleStyle = () => {
    didApplyRippleStyle = true;
    const styleElement = document.createElement('style');
    const part = new NodePart({ templateFactory });
    part.appendInto(styleElement);
    part.setValue(style$1);
    part.commit();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.head.appendChild(styleElement);
};
/**
 * Applied a ripple to the node specified by {surfaceNode}.
 * @param options {RippleNodeOptions}
 */
const rippleNode = (options) => {
    if (isSafari && !didApplyRippleStyle) {
        applyRippleStyle();
    }
    // TODO(sorvell): This directive requires bringing css yourself. We probably
    // need to do this because of ShadyCSS, but on Safari, the keyframes styling
    // must be global. Perhaps this directive could fix that.
    const surfaceNode = options.surfaceNode;
    const interactionNode = options.interactionNode || surfaceNode;
    // only style interaction node if not in the same root
    if (interactionNode.getRootNode() !== surfaceNode.getRootNode()) {
        if (interactionNode.style.position === '') {
            interactionNode.style.position = 'relative';
        }
    }
    const adapter = {
        browserSupportsCssVars: () => supportsCssVariablesWin,
        isUnbounded: () => options.unbounded === undefined ? true : options.unbounded,
        isSurfaceActive: () => matches(interactionNode, ':active'),
        isSurfaceDisabled: () => Boolean(interactionNode.hasAttribute('disabled')),
        addClass: (className) => surfaceNode.classList.add(className),
        removeClass: (className) => surfaceNode.classList.remove(className),
        containsEventTarget: (target) => interactionNode.contains(target),
        registerInteractionHandler: (type, handler) => interactionNode.addEventListener(type, handler, applyPassive()),
        deregisterInteractionHandler: (type, handler) => interactionNode.removeEventListener(type, handler, applyPassive()),
        registerDocumentInteractionHandler: (evtType, handler) => 
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        document.documentElement.addEventListener(evtType, handler, applyPassive()),
        deregisterDocumentInteractionHandler: (evtType, handler) => 
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        document.documentElement.removeEventListener(evtType, handler, applyPassive()),
        registerResizeHandler: (handler) => window.addEventListener('resize', handler),
        deregisterResizeHandler: (handler) => window.removeEventListener('resize', handler),
        updateCssVariable: (varName, value) => surfaceNode.style.setProperty(varName, value),
        computeBoundingRect: () => surfaceNode.getBoundingClientRect(),
        getWindowPageOffset: () => ({ x: window.pageXOffset, y: window.pageYOffset }),
    };
    const rippleFoundation = new MDCRippleFoundation(adapter);
    rippleFoundation.init();
    return rippleFoundation;
};
const rippleInteractionNodes = new WeakMap();
/**
 * A directive that applies a Material ripple to a part node. The directive
 * should be applied to a PropertyPart.
 * @param options {RippleOptions}
 */
const ripple = directive((options = {}) => (part) => {
    const surfaceNode = part.committer.element;
    const interactionNode = options.interactionNode || surfaceNode;
    let rippleFoundation = part.value;
    // if the interaction node changes, destroy and invalidate the foundation.
    const existingInteractionNode = rippleInteractionNodes.get(rippleFoundation);
    if (existingInteractionNode !== undefined &&
        existingInteractionNode !== interactionNode) {
        rippleFoundation.destroy();
        rippleFoundation = noChange;
    }
    // make the ripple, if needed
    if (rippleFoundation === noChange) {
        rippleFoundation =
            rippleNode(Object.assign({}, options, { surfaceNode }));
        rippleInteractionNodes.set(rippleFoundation, interactionNode);
        part.setValue(rippleFoundation);
        // otherwise update settings as needed.
    }
    else {
        if (options.unbounded !== undefined) {
            rippleFoundation
                .setUnbounded(options.unbounded);
        }
        if (options.disabled !== undefined) {
            rippleFoundation
                .setUnbounded(options.disabled);
        }
    }
    if (options.active === true) {
        rippleFoundation.activate();
    }
    else if (options.active === false) {
        rippleFoundation.deactivate();
    }
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IE11 doesn't support classList on SVG elements, so we emulate it with a Set
class ClassList {
    constructor(element) {
        this.classes = new Set();
        this.changed = false;
        this.element = element;
        const classList = (element.getAttribute('class') || '').split(/\s+/);
        for (const cls of classList) {
            this.classes.add(cls);
        }
    }
    add(cls) {
        this.classes.add(cls);
        this.changed = true;
    }
    remove(cls) {
        this.classes.delete(cls);
        this.changed = true;
    }
    commit() {
        if (this.changed) {
            let classString = '';
            this.classes.forEach((cls) => classString += cls + ' ');
            this.element.setAttribute('class', classString);
        }
    }
}
/**
 * Stores the ClassInfo object applied to a given AttributePart.
 * Used to unset existing values when a new ClassInfo object is applied.
 */
const previousClassesCache = new WeakMap();
/**
 * A directive that applies CSS classes. This must be used in the `class`
 * attribute and must be the only part used in the attribute. It takes each
 * property in the `classInfo` argument and adds the property name to the
 * element's `class` if the property value is truthy; if the property value is
 * falsey, the property name is removed from the element's `class`. For example
 * `{foo: bar}` applies the class `foo` if the value of `bar` is truthy.
 * @param classInfo {ClassInfo}
 */
const classMap = directive((classInfo) => (part) => {
    if (!(part instanceof AttributePart) || (part instanceof PropertyPart) ||
        part.committer.name !== 'class' || part.committer.parts.length > 1) {
        throw new Error('The `classMap` directive must be used in the `class` attribute ' +
            'and must be the only part in the attribute.');
    }
    const { committer } = part;
    const { element } = committer;
    let previousClasses = previousClassesCache.get(part);
    if (previousClasses === undefined) {
        // Write static classes once
        // Use setAttribute() because className isn't a string on SVG elements
        element.setAttribute('class', committer.strings.join(' '));
        previousClassesCache.set(part, previousClasses = new Set());
    }
    const classList = (element.classList || new ClassList(element));
    // Remove old classes that no longer apply
    // We use forEach() instead of for-of so that re don't require down-level
    // iteration.
    previousClasses.forEach((name) => {
        if (!(name in classInfo)) {
            classList.remove(name);
            previousClasses.delete(name);
        }
    });
    // Add or remove classes based on their classMap value
    for (const name in classInfo) {
        const value = classInfo[name];
        if (value != previousClasses.has(name)) {
            // We explicitly want a loose truthy check of `value` because it seems
            // more convenient that '' and 0 are skipped.
            if (value) {
                classList.add(name);
                previousClasses.add(name);
            }
            else {
                classList.remove(name);
                previousClasses.delete(name);
            }
        }
    }
    if (typeof classList.commit === 'function') {
        classList.commit();
    }
});

class ButtonBase extends LitElement {
    constructor() {
        super(...arguments);
        this.raised = false;
        this.unelevated = false;
        this.outlined = false;
        this.dense = false;
        this.disabled = false;
        this.trailingIcon = false;
        this.fullwidth = false;
        this.icon = '';
        this.label = '';
    }
    createRenderRoot() {
        return this.attachShadow({ mode: 'open', delegatesFocus: true });
    }
    focus() {
        const buttonElement = this.buttonElement;
        if (buttonElement) {
            const ripple = buttonElement.ripple;
            if (ripple) {
                ripple.handleFocus();
            }
            buttonElement.focus();
        }
    }
    blur() {
        const buttonElement = this.buttonElement;
        if (buttonElement) {
            const ripple = buttonElement.ripple;
            if (ripple) {
                ripple.handleBlur();
            }
            buttonElement.blur();
        }
    }
    render() {
        const classes = {
            'mdc-button--raised': this.raised,
            'mdc-button--unelevated': this.unelevated,
            'mdc-button--outlined': this.outlined,
            'mdc-button--dense': this.dense,
        };
        return html `
      <button
          id="button"
          class="mdc-button ${classMap(classes)}"
          ?disabled="${this.disabled}"
          aria-label="${this.label || this.icon}">
        <div class="mdc-button__ripple"></div>
        <span class="leading-icon">
          <slot name="icon">
            ${this.icon && !this.trailingIcon ? this.renderIcon(this.icon) : ''}
          </slot>
        </span>
        <span class="mdc-button__label">${this.label}</span>
        <slot></slot>
        <span class="trailing-icon">
          <slot name="trailingIcon">
            ${this.icon && this.trailingIcon ? this.renderIcon(this.icon) : ''}
          </slot>
        </span>
      </button>`;
    }
    renderIcon(icon) {
        return html `
      <mwc-icon class="mdc-button__icon">
        ${icon}
      </mwc-icon>`;
    }
    firstUpdated() {
        this.buttonElement.ripple =
            rippleNode({ surfaceNode: this.buttonElement, unbounded: false });
    }
}
__decorate([
    property({ type: Boolean })
], ButtonBase.prototype, "raised", void 0);
__decorate([
    property({ type: Boolean })
], ButtonBase.prototype, "unelevated", void 0);
__decorate([
    property({ type: Boolean })
], ButtonBase.prototype, "outlined", void 0);
__decorate([
    property({ type: Boolean })
], ButtonBase.prototype, "dense", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], ButtonBase.prototype, "disabled", void 0);
__decorate([
    property({ type: Boolean })
], ButtonBase.prototype, "trailingIcon", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], ButtonBase.prototype, "fullwidth", void 0);
__decorate([
    property({ type: String })
], ButtonBase.prototype, "icon", void 0);
__decorate([
    property({ type: String })
], ButtonBase.prototype, "label", void 0);
__decorate([
    query('#button')
], ButtonBase.prototype, "buttonElement", void 0);

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const style$2 = css `.mdc-touch-target-wrapper{display:inline}.mdc-elevation-overlay{position:absolute;border-radius:inherit;opacity:0;pointer-events:none;transition:opacity 280ms cubic-bezier(0.4, 0, 0.2, 1);background-color:#fff}.mdc-button{-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;font-family:Roboto, sans-serif;font-family:var(--mdc-typography-button-font-family, var(--mdc-typography-font-family, Roboto, sans-serif));font-size:.875rem;font-size:var(--mdc-typography-button-font-size, 0.875rem);line-height:2.25rem;line-height:var(--mdc-typography-button-line-height, 2.25rem);font-weight:500;font-weight:var(--mdc-typography-button-font-weight, 500);letter-spacing:.0892857143em;letter-spacing:var(--mdc-typography-button-letter-spacing, 0.0892857143em);text-decoration:none;text-decoration:var(--mdc-typography-button-text-decoration, none);text-transform:uppercase;text-transform:var(--mdc-typography-button-text-transform, uppercase);padding:0 8px 0 8px;position:relative;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:64px;border:none;outline:none;line-height:inherit;user-select:none;-webkit-appearance:none;overflow:visible;vertical-align:middle;border-radius:4px}.mdc-button .mdc-elevation-overlay{width:100%;height:100%;top:0;left:0}.mdc-button::-moz-focus-inner{padding:0;border:0}.mdc-button:active{outline:none}.mdc-button:hover{cursor:pointer}.mdc-button:disabled{cursor:default;pointer-events:none}.mdc-button .mdc-button__ripple{border-radius:4px}.mdc-button:not(:disabled){background-color:transparent}.mdc-button:disabled{background-color:transparent}.mdc-button .mdc-button__icon{margin-left:0;margin-right:8px;display:inline-block;width:18px;height:18px;font-size:18px;vertical-align:top}[dir=rtl] .mdc-button .mdc-button__icon,.mdc-button .mdc-button__icon[dir=rtl]{margin-left:8px;margin-right:0}.mdc-button .mdc-button__touch{position:absolute;top:50%;right:0;height:48px;left:0;transform:translateY(-50%)}.mdc-button:not(:disabled){color:#6200ee;color:var(--mdc-theme-primary, #6200ee)}.mdc-button:disabled{color:rgba(0,0,0,.38)}.mdc-button__label+.mdc-button__icon{margin-left:8px;margin-right:0}[dir=rtl] .mdc-button__label+.mdc-button__icon,.mdc-button__label+.mdc-button__icon[dir=rtl]{margin-left:0;margin-right:8px}svg.mdc-button__icon{fill:currentColor}.mdc-button--raised .mdc-button__icon,.mdc-button--unelevated .mdc-button__icon,.mdc-button--outlined .mdc-button__icon{margin-left:-4px;margin-right:8px}[dir=rtl] .mdc-button--raised .mdc-button__icon,.mdc-button--raised .mdc-button__icon[dir=rtl],[dir=rtl] .mdc-button--unelevated .mdc-button__icon,.mdc-button--unelevated .mdc-button__icon[dir=rtl],[dir=rtl] .mdc-button--outlined .mdc-button__icon,.mdc-button--outlined .mdc-button__icon[dir=rtl]{margin-left:8px;margin-right:-4px}.mdc-button--raised .mdc-button__label+.mdc-button__icon,.mdc-button--unelevated .mdc-button__label+.mdc-button__icon,.mdc-button--outlined .mdc-button__label+.mdc-button__icon{margin-left:8px;margin-right:-4px}[dir=rtl] .mdc-button--raised .mdc-button__label+.mdc-button__icon,.mdc-button--raised .mdc-button__label+.mdc-button__icon[dir=rtl],[dir=rtl] .mdc-button--unelevated .mdc-button__label+.mdc-button__icon,.mdc-button--unelevated .mdc-button__label+.mdc-button__icon[dir=rtl],[dir=rtl] .mdc-button--outlined .mdc-button__label+.mdc-button__icon,.mdc-button--outlined .mdc-button__label+.mdc-button__icon[dir=rtl]{margin-left:-4px;margin-right:8px}.mdc-button--raised,.mdc-button--unelevated{padding:0 16px 0 16px}.mdc-button--raised:not(:disabled),.mdc-button--unelevated:not(:disabled){background-color:#6200ee;background-color:var(--mdc-theme-primary, #6200ee)}.mdc-button--raised:not(:disabled),.mdc-button--unelevated:not(:disabled){color:#fff;color:var(--mdc-theme-on-primary, #fff)}.mdc-button--raised:disabled,.mdc-button--unelevated:disabled{background-color:rgba(0,0,0,.12)}.mdc-button--raised:disabled,.mdc-button--unelevated:disabled{color:rgba(0,0,0,.38)}.mdc-button--raised{box-shadow:0px 3px 1px -2px rgba(0, 0, 0, 0.2),0px 2px 2px 0px rgba(0, 0, 0, 0.14),0px 1px 5px 0px rgba(0,0,0,.12);transition:box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1)}.mdc-button--raised:hover,.mdc-button--raised:focus{box-shadow:0px 2px 4px -1px rgba(0, 0, 0, 0.2),0px 4px 5px 0px rgba(0, 0, 0, 0.14),0px 1px 10px 0px rgba(0,0,0,.12)}.mdc-button--raised:active{box-shadow:0px 5px 5px -3px rgba(0, 0, 0, 0.2),0px 8px 10px 1px rgba(0, 0, 0, 0.14),0px 3px 14px 2px rgba(0,0,0,.12)}.mdc-button--raised:disabled{box-shadow:0px 0px 0px 0px rgba(0, 0, 0, 0.2),0px 0px 0px 0px rgba(0, 0, 0, 0.14),0px 0px 0px 0px rgba(0,0,0,.12)}.mdc-button--outlined{padding:0 15px 0 15px;border-width:1px;border-style:solid}.mdc-button--outlined .mdc-button__ripple{top:-1px;left:-1px;border:1px solid transparent}.mdc-button--outlined:not(:disabled){border-color:rgba(0,0,0,.12)}.mdc-button--outlined:disabled{border-color:rgba(0,0,0,.12)}.mdc-button--touch{margin-top:6px;margin-bottom:6px}@keyframes mdc-ripple-fg-radius-in{from{animation-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transform:translate(var(--mdc-ripple-fg-translate-start, 0)) scale(1)}to{transform:translate(var(--mdc-ripple-fg-translate-end, 0)) scale(var(--mdc-ripple-fg-scale, 1))}}@keyframes mdc-ripple-fg-opacity-in{from{animation-timing-function:linear;opacity:0}to{opacity:var(--mdc-ripple-fg-opacity, 0)}}@keyframes mdc-ripple-fg-opacity-out{from{animation-timing-function:linear;opacity:var(--mdc-ripple-fg-opacity, 0)}to{opacity:0}}.mdc-button{--mdc-ripple-fg-size: 0;--mdc-ripple-left: 0;--mdc-ripple-top: 0;--mdc-ripple-fg-scale: 1;--mdc-ripple-fg-translate-end: 0;--mdc-ripple-fg-translate-start: 0;-webkit-tap-highlight-color:rgba(0,0,0,0)}.mdc-button .mdc-button__ripple::before,.mdc-button .mdc-button__ripple::after{position:absolute;border-radius:50%;opacity:0;pointer-events:none;content:""}.mdc-button .mdc-button__ripple::before{transition:opacity 15ms linear,background-color 15ms linear;z-index:1}.mdc-button.mdc-ripple-upgraded .mdc-button__ripple::before{transform:scale(var(--mdc-ripple-fg-scale, 1))}.mdc-button.mdc-ripple-upgraded .mdc-button__ripple::after{top:0;left:0;transform:scale(0);transform-origin:center center}.mdc-button.mdc-ripple-upgraded--unbounded .mdc-button__ripple::after{top:var(--mdc-ripple-top, 0);left:var(--mdc-ripple-left, 0)}.mdc-button.mdc-ripple-upgraded--foreground-activation .mdc-button__ripple::after{animation:mdc-ripple-fg-radius-in 225ms forwards,mdc-ripple-fg-opacity-in 75ms forwards}.mdc-button.mdc-ripple-upgraded--foreground-deactivation .mdc-button__ripple::after{animation:mdc-ripple-fg-opacity-out 150ms;transform:translate(var(--mdc-ripple-fg-translate-end, 0)) scale(var(--mdc-ripple-fg-scale, 1))}.mdc-button .mdc-button__ripple::before,.mdc-button .mdc-button__ripple::after{top:calc(50% - 100%);left:calc(50% - 100%);width:200%;height:200%}.mdc-button.mdc-ripple-upgraded .mdc-button__ripple::after{width:var(--mdc-ripple-fg-size, 100%);height:var(--mdc-ripple-fg-size, 100%)}.mdc-button .mdc-button__ripple::before,.mdc-button .mdc-button__ripple::after{background-color:#6200ee;background-color:var(--mdc-theme-primary, #6200ee)}.mdc-button:hover .mdc-button__ripple::before{opacity:.04}.mdc-button.mdc-ripple-upgraded--background-focused .mdc-button__ripple::before,.mdc-button:not(.mdc-ripple-upgraded):focus .mdc-button__ripple::before{transition-duration:75ms;opacity:.12}.mdc-button:not(.mdc-ripple-upgraded) .mdc-button__ripple::after{transition:opacity 150ms linear}.mdc-button:not(.mdc-ripple-upgraded):active .mdc-button__ripple::after{transition-duration:75ms;opacity:.12}.mdc-button.mdc-ripple-upgraded{--mdc-ripple-fg-opacity: 0.12}.mdc-button .mdc-button__ripple{position:absolute;box-sizing:content-box;width:100%;height:100%;overflow:hidden}.mdc-button:not(.mdc-button--outlined) .mdc-button__ripple{top:0;left:0}.mdc-button--raised .mdc-button__ripple::before,.mdc-button--raised .mdc-button__ripple::after,.mdc-button--unelevated .mdc-button__ripple::before,.mdc-button--unelevated .mdc-button__ripple::after{background-color:#fff;background-color:var(--mdc-theme-on-primary, #fff)}.mdc-button--raised:hover .mdc-button__ripple::before,.mdc-button--unelevated:hover .mdc-button__ripple::before{opacity:.08}.mdc-button--raised.mdc-ripple-upgraded--background-focused .mdc-button__ripple::before,.mdc-button--raised:not(.mdc-ripple-upgraded):focus .mdc-button__ripple::before,.mdc-button--unelevated.mdc-ripple-upgraded--background-focused .mdc-button__ripple::before,.mdc-button--unelevated:not(.mdc-ripple-upgraded):focus .mdc-button__ripple::before{transition-duration:75ms;opacity:.24}.mdc-button--raised:not(.mdc-ripple-upgraded) .mdc-button__ripple::after,.mdc-button--unelevated:not(.mdc-ripple-upgraded) .mdc-button__ripple::after{transition:opacity 150ms linear}.mdc-button--raised:not(.mdc-ripple-upgraded):active .mdc-button__ripple::after,.mdc-button--unelevated:not(.mdc-ripple-upgraded):active .mdc-button__ripple::after{transition-duration:75ms;opacity:.24}.mdc-button--raised.mdc-ripple-upgraded,.mdc-button--unelevated.mdc-ripple-upgraded{--mdc-ripple-fg-opacity: 0.24}.mdc-button{height:36px}.trailing-icon ::slotted(*),.trailing-icon .mdc-button__icon,.leading-icon ::slotted(*),.leading-icon .mdc-button__icon{margin-left:0;margin-right:8px;display:inline-block;width:18px;height:18px;font-size:18px;vertical-align:top}[dir=rtl] .trailing-icon ::slotted(*),.trailing-icon ::slotted(*)[dir=rtl],[dir=rtl] .trailing-icon .mdc-button__icon,.trailing-icon .mdc-button__icon[dir=rtl],[dir=rtl] .leading-icon ::slotted(*),.leading-icon ::slotted(*)[dir=rtl],[dir=rtl] .leading-icon .mdc-button__icon,.leading-icon .mdc-button__icon[dir=rtl]{margin-left:8px;margin-right:0}.trailing-icon ::slotted(*),.trailing-icon .mdc-button__icon{margin-left:8px;margin-right:0}[dir=rtl] .trailing-icon ::slotted(*),.trailing-icon ::slotted(*)[dir=rtl],[dir=rtl] .trailing-icon .mdc-button__icon,.trailing-icon .mdc-button__icon[dir=rtl]{margin-left:0;margin-right:8px}.mdc-button--raised{box-shadow:var(--mdc-button-raised-box-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12))}.mdc-button--raised:hover,.mdc-button--raised:focus{box-shadow:var(--mdc-button-raised-box-shadow-hover, 0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12))}.mdc-button--raised:active{box-shadow:var(--mdc-button-raised-box-shadow-active, 0px 5px 5px -3px rgba(0, 0, 0, 0.2), 0px 8px 10px 1px rgba(0, 0, 0, 0.14), 0px 3px 14px 2px rgba(0, 0, 0, 0.12))}.mdc-button--raised:disabled{box-shadow:var(--mdc-button-raised-box-shadow-disabled, 0px 0px 0px 0px rgba(0, 0, 0, 0.2), 0px 0px 0px 0px rgba(0, 0, 0, 0.14), 0px 0px 0px 0px rgba(0, 0, 0, 0.12))}:host{display:inline-flex;outline:none;vertical-align:top}:host([disabled]){pointer-events:none}:host([fullwidth]){width:100%}.mdc-button{flex:auto;overflow:hidden;padding:0 var(--mdc-button-horizontal-padding, 8px) 0 var(--mdc-button-horizontal-padding, 8px)}.mdc-button.mdc-button--raised,.mdc-button.mdc-button--unelevated{padding:0 var(--mdc-button-horizontal-padding, 16px) 0 var(--mdc-button-horizontal-padding, 16px)}.mdc-button.mdc-button--outlined{padding:0 calc(var(--mdc-button-horizontal-padding, 16px) - var(--mdc-button-outline-width, 1px)) 0 calc(var(--mdc-button-horizontal-padding, 16px) - var(--mdc-button-outline-width, 1px));border-width:var(--mdc-button-outline-width, 1px);border-color:var(--mdc-button-outline-color, var(--mdc-theme-primary, #6200ee))}.mdc-button.mdc-button--dense{height:28px;margin-top:0;margin-bottom:0}.mdc-button.mdc-button--dense .mdc-button__touch{display:none}.mdc-button .mdc-button__ripple{border-radius:0}:host([disabled]) .mdc-button.mdc-button--raised,:host([disabled]) .mdc-button.mdc-button--unelevated{background-color:var(--mdc-button-disabled-fill-color, rgba(0, 0, 0, 0.12));color:var(--mdc-button-disabled-ink-color, rgba(0, 0, 0, 0.38))}:host([disabled]) .mdc-button:not(.mdc-button--raised):not(.mdc-button--unelevated){color:var(--mdc-button-disabled-ink-color, rgba(0, 0, 0, 0.38))}:host([disabled]) .mdc-button.mdc-button--outlined{border-color:var(--mdc-button-disabled-ink-color, rgba(0, 0, 0, 0.38));border-color:var(--mdc-button-disabled-outline-color, var(--mdc-button-disabled-ink-color, rgba(0, 0, 0, 0.38)))}`;

let Button = class Button extends ButtonBase {
};
Button.styles = style$2;
Button = __decorate([
    customElement('mwc-button')
], Button);

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
function addHasRemoveClass(element) {
    return {
        addClass: (className) => {
            element.classList.add(className);
        },
        removeClass: (className) => {
            element.classList.remove(className);
        },
        hasClass: (className) => element.classList.contains(className),
    };
}
const fn = () => { };
const optionsBlock = {
    get passive() {
        return false;
    }
};
document.addEventListener('x', fn, optionsBlock);
document.removeEventListener('x', fn);

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
class BaseElement extends LitElement {
    /**
     * Create and attach the MDC Foundation to the instance
     */
    createFoundation() {
        if (this.mdcFoundation !== undefined) {
            this.mdcFoundation.destroy();
        }
        if (this.mdcFoundationClass) {
            this.mdcFoundation = new this.mdcFoundationClass(this.createAdapter());
            this.mdcFoundation.init();
        }
    }
    firstUpdated() {
        this.createFoundation();
    }
}

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$1 = {
    ACTIVE: 'mdc-tab-indicator--active',
    FADE: 'mdc-tab-indicator--fade',
    NO_TRANSITION: 'mdc-tab-indicator--no-transition',
};
var strings$1 = {
    CONTENT_SELECTOR: '.mdc-tab-indicator__content',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabIndicatorFoundation = /** @class */ (function (_super) {
    __extends(MDCTabIndicatorFoundation, _super);
    function MDCTabIndicatorFoundation(adapter) {
        return _super.call(this, __assign({}, MDCTabIndicatorFoundation.defaultAdapter, adapter)) || this;
    }
    Object.defineProperty(MDCTabIndicatorFoundation, "cssClasses", {
        get: function () {
            return cssClasses$1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabIndicatorFoundation, "strings", {
        get: function () {
            return strings$1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabIndicatorFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                computeContentClientRect: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                setContentStyleProperty: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCTabIndicatorFoundation.prototype.computeContentClientRect = function () {
        return this.adapter_.computeContentClientRect();
    };
    return MDCTabIndicatorFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/* istanbul ignore next: subclass is not a branch statement */
var MDCFadingTabIndicatorFoundation = /** @class */ (function (_super) {
    __extends(MDCFadingTabIndicatorFoundation, _super);
    function MDCFadingTabIndicatorFoundation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCFadingTabIndicatorFoundation.prototype.activate = function () {
        this.adapter_.addClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
    };
    MDCFadingTabIndicatorFoundation.prototype.deactivate = function () {
        this.adapter_.removeClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
    };
    return MDCFadingTabIndicatorFoundation;
}(MDCTabIndicatorFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/* istanbul ignore next: subclass is not a branch statement */
var MDCSlidingTabIndicatorFoundation = /** @class */ (function (_super) {
    __extends(MDCSlidingTabIndicatorFoundation, _super);
    function MDCSlidingTabIndicatorFoundation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCSlidingTabIndicatorFoundation.prototype.activate = function (previousIndicatorClientRect) {
        // Early exit if no indicator is present to handle cases where an indicator
        // may be activated without a prior indicator state
        if (!previousIndicatorClientRect) {
            this.adapter_.addClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
            return;
        }
        // This animation uses the FLIP approach. You can read more about it at the link below:
        // https://aerotwist.com/blog/flip-your-animations/
        // Calculate the dimensions based on the dimensions of the previous indicator
        var currentClientRect = this.computeContentClientRect();
        var widthDelta = previousIndicatorClientRect.width / currentClientRect.width;
        var xPosition = previousIndicatorClientRect.left - currentClientRect.left;
        this.adapter_.addClass(MDCTabIndicatorFoundation.cssClasses.NO_TRANSITION);
        this.adapter_.setContentStyleProperty('transform', "translateX(" + xPosition + "px) scaleX(" + widthDelta + ")");
        // Force repaint before updating classes and transform to ensure the transform properly takes effect
        this.computeContentClientRect();
        this.adapter_.removeClass(MDCTabIndicatorFoundation.cssClasses.NO_TRANSITION);
        this.adapter_.addClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
        this.adapter_.setContentStyleProperty('transform', '');
    };
    MDCSlidingTabIndicatorFoundation.prototype.deactivate = function () {
        this.adapter_.removeClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
    };
    return MDCSlidingTabIndicatorFoundation;
}(MDCTabIndicatorFoundation));

class TabIndicatorBase extends BaseElement {
    constructor() {
        super(...arguments);
        this.icon = '';
        this.fade = false;
    }
    get mdcFoundationClass() {
        return this.fade ? MDCFadingTabIndicatorFoundation :
            MDCSlidingTabIndicatorFoundation;
    }
    render() {
        const contentClasses = {
            'mdc-tab-indicator__content--icon': this.icon,
            'material-icons': this.icon,
            'mdc-tab-indicator__content--underline': !this.icon,
        };
        return html `
      <span class="mdc-tab-indicator ${classMap({
            'mdc-tab-indicator--fade': this.fade
        })}">
        <span class="mdc-tab-indicator__content ${classMap(contentClasses)}">${this.icon}</span>
      </span>
      `;
    }
    updated(changedProperties) {
        if (changedProperties.has('fade')) {
            this.createFoundation();
        }
    }
    createAdapter() {
        return Object.assign(Object.assign({}, addHasRemoveClass(this.mdcRoot)), { computeContentClientRect: () => this.contentElement.getBoundingClientRect(), setContentStyleProperty: (prop, value) => this.contentElement.style.setProperty(prop, value) });
    }
    computeContentClientRect() {
        return this.mdcFoundation.computeContentClientRect();
    }
    activate(previousIndicatorClientRect) {
        this.mdcFoundation.activate(previousIndicatorClientRect);
    }
    deactivate() {
        this.mdcFoundation.deactivate();
    }
}
__decorate([
    query('.mdc-tab-indicator')
], TabIndicatorBase.prototype, "mdcRoot", void 0);
__decorate([
    query('.mdc-tab-indicator__content')
], TabIndicatorBase.prototype, "contentElement", void 0);
__decorate([
    property()
], TabIndicatorBase.prototype, "icon", void 0);
__decorate([
    property({ type: Boolean })
], TabIndicatorBase.prototype, "fade", void 0);

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const style$3 = css `.mdc-tab-indicator{display:flex;position:absolute;top:0;left:0;justify-content:center;width:100%;height:100%;pointer-events:none;z-index:1}.mdc-tab-indicator .mdc-tab-indicator__content--underline{border-color:#6200ee;border-color:var(--mdc-theme-primary, #6200ee)}.mdc-tab-indicator .mdc-tab-indicator__content--icon{color:#018786;color:var(--mdc-theme-secondary, #018786)}.mdc-tab-indicator .mdc-tab-indicator__content--underline{border-top-width:2px}.mdc-tab-indicator .mdc-tab-indicator__content--icon{height:34px;font-size:34px}.mdc-tab-indicator__content{transform-origin:left;opacity:0}.mdc-tab-indicator__content--underline{align-self:flex-end;box-sizing:border-box;width:100%;border-top-style:solid}.mdc-tab-indicator__content--icon{align-self:center;margin:0 auto}.mdc-tab-indicator--active .mdc-tab-indicator__content{opacity:1}.mdc-tab-indicator .mdc-tab-indicator__content{transition:250ms transform cubic-bezier(0.4, 0, 0.2, 1)}.mdc-tab-indicator--no-transition .mdc-tab-indicator__content{transition:none}.mdc-tab-indicator--fade .mdc-tab-indicator__content{transition:150ms opacity linear}.mdc-tab-indicator--active.mdc-tab-indicator--fade .mdc-tab-indicator__content{transition-delay:100ms}.material-icons{font-family:var(--mdc-icon-font, "Material Icons");font-weight:normal;font-style:normal;font-size:var(--mdc-icon-size, 24px);line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-moz-osx-font-smoothing:grayscale;font-feature-settings:"liga"}`;

let TabIndicator = class TabIndicator extends TabIndicatorBase {
};
TabIndicator.styles = style$3;
TabIndicator = __decorate([
    customElement('mwc-tab-indicator')
], TabIndicator);

const observer = (observer) => 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(proto, propName) => {
    // if we haven't wrapped `updated` in this class, do so
    if (!proto.constructor._observers) {
        proto.constructor._observers = new Map();
        const userUpdated = proto.updated;
        proto.updated = function (changedProperties) {
            userUpdated.call(this, changedProperties);
            changedProperties.forEach((v, k) => {
                const observer = this.constructor._observers.get(k);
                if (observer !== undefined) {
                    observer.call(this, this[k], v);
                }
            });
        };
        // clone any existing observers (superclasses)
    }
    else if (!proto.constructor.hasOwnProperty('_observers')) {
        const observers = proto.constructor._observers;
        proto.constructor._observers = new Map();
        observers.forEach(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (v, k) => proto.constructor._observers.set(k, v));
    }
    // set this method
    proto.constructor._observers.set(propName, observer);
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$2 = {
    ACTIVE: 'mdc-tab--active',
};
var strings$2 = {
    ARIA_SELECTED: 'aria-selected',
    CONTENT_SELECTOR: '.mdc-tab__content',
    INTERACTED_EVENT: 'MDCTab:interacted',
    RIPPLE_SELECTOR: '.mdc-tab__ripple',
    TABINDEX: 'tabIndex',
    TAB_INDICATOR_SELECTOR: '.mdc-tab-indicator',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabFoundation = /** @class */ (function (_super) {
    __extends(MDCTabFoundation, _super);
    function MDCTabFoundation(adapter) {
        var _this = _super.call(this, __assign({}, MDCTabFoundation.defaultAdapter, adapter)) || this;
        _this.focusOnActivate_ = true;
        return _this;
    }
    Object.defineProperty(MDCTabFoundation, "cssClasses", {
        get: function () {
            return cssClasses$2;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabFoundation, "strings", {
        get: function () {
            return strings$2;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                hasClass: function () { return false; },
                setAttr: function () { return undefined; },
                activateIndicator: function () { return undefined; },
                deactivateIndicator: function () { return undefined; },
                notifyInteracted: function () { return undefined; },
                getOffsetLeft: function () { return 0; },
                getOffsetWidth: function () { return 0; },
                getContentOffsetLeft: function () { return 0; },
                getContentOffsetWidth: function () { return 0; },
                focus: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCTabFoundation.prototype.handleClick = function () {
        // It's up to the parent component to keep track of the active Tab and
        // ensure we don't activate a Tab that's already active.
        this.adapter_.notifyInteracted();
    };
    MDCTabFoundation.prototype.isActive = function () {
        return this.adapter_.hasClass(cssClasses$2.ACTIVE);
    };
    /**
     * Sets whether the tab should focus itself when activated
     */
    MDCTabFoundation.prototype.setFocusOnActivate = function (focusOnActivate) {
        this.focusOnActivate_ = focusOnActivate;
    };
    /**
     * Activates the Tab
     */
    MDCTabFoundation.prototype.activate = function (previousIndicatorClientRect) {
        this.adapter_.addClass(cssClasses$2.ACTIVE);
        this.adapter_.setAttr(strings$2.ARIA_SELECTED, 'true');
        this.adapter_.setAttr(strings$2.TABINDEX, '0');
        this.adapter_.activateIndicator(previousIndicatorClientRect);
        if (this.focusOnActivate_) {
            this.adapter_.focus();
        }
    };
    /**
     * Deactivates the Tab
     */
    MDCTabFoundation.prototype.deactivate = function () {
        // Early exit
        if (!this.isActive()) {
            return;
        }
        this.adapter_.removeClass(cssClasses$2.ACTIVE);
        this.adapter_.setAttr(strings$2.ARIA_SELECTED, 'false');
        this.adapter_.setAttr(strings$2.TABINDEX, '-1');
        this.adapter_.deactivateIndicator();
    };
    /**
     * Returns the dimensions of the Tab
     */
    MDCTabFoundation.prototype.computeDimensions = function () {
        var rootWidth = this.adapter_.getOffsetWidth();
        var rootLeft = this.adapter_.getOffsetLeft();
        var contentWidth = this.adapter_.getContentOffsetWidth();
        var contentLeft = this.adapter_.getContentOffsetLeft();
        return {
            contentLeft: rootLeft + contentLeft,
            contentRight: rootLeft + contentLeft + contentWidth,
            rootLeft: rootLeft,
            rootRight: rootLeft + rootWidth,
        };
    };
    return MDCTabFoundation;
}(MDCFoundation));

// used for generating unique id for each tab
let tabIdCounter = 0;
class TabBase extends BaseElement {
    constructor() {
        super(...arguments);
        this.mdcFoundationClass = MDCTabFoundation;
        this.label = '';
        this.icon = '';
        this.hasImageIcon = false;
        this.isFadingIndicator = false;
        this.minWidth = false;
        this.isMinWidthIndicator = false;
        this.indicatorIcon = '';
        this.stacked = false;
        this.focusOnActivate = true;
        this._active = false;
    }
    get active() {
        return this._active;
    }
    _handleClick() {
        this.mdcFoundation.handleClick();
    }
    createRenderRoot() {
        return this.attachShadow({ mode: 'open', delegatesFocus: true });
    }
    connectedCallback() {
        this.dir = document.dir;
        super.connectedCallback();
    }
    firstUpdated() {
        super.firstUpdated();
        // create an unique id
        this.id = this.id || `mdc-tab-${++tabIdCounter}`;
    }
    render() {
        const classes = {
            'mdc-tab--min-width': this.minWidth,
            'mdc-tab--stacked': this.stacked,
        };
        let iconTemplate = html ``;
        if (this.hasImageIcon || this.icon) {
            // NOTE: MUST be on same line as spaces will cause vert alignment issues
            // in IE
            iconTemplate = html `
        <span class="mdc-tab__icon material-icons"><slot name="icon">${this.icon}</slot></span>`;
        }
        let labelTemplate = html ``;
        if (this.label) {
            labelTemplate = html `
        <span class="mdc-tab__text-label">${this.label}</span>`;
        }
        const rippleDirective = ripple({
            interactionNode: this,
            unbounded: false,
        });
        return html `
      <button
        @click="${this._handleClick}"
        class="mdc-tab ${classMap(classes)}"
        role="tab"
        aria-selected="false"
        tabindex="-1">
        <span class="mdc-tab__content">
          ${iconTemplate}
          ${labelTemplate}
          ${this.isMinWidthIndicator ? this.renderIndicator() : ''}
        </span>
        ${this.isMinWidthIndicator ? '' : this.renderIndicator()}
        <span class="mdc-tab__ripple" .ripple="${rippleDirective}"></span>
      </button>`;
    }
    renderIndicator() {
        return html `<mwc-tab-indicator
        .icon="${this.indicatorIcon}"
        .fade="${this.isFadingIndicator}"></mwc-tab-indicator>`;
    }
    createAdapter() {
        return Object.assign(Object.assign({}, addHasRemoveClass(this.mdcRoot)), { setAttr: (attr, value) => this.mdcRoot.setAttribute(attr, value), activateIndicator: (previousIndicatorClientRect) => this._tabIndicator
                .activate(previousIndicatorClientRect), deactivateIndicator: () => this._tabIndicator.deactivate(), notifyInteracted: () => this.dispatchEvent(new CustomEvent(MDCTabFoundation.strings.INTERACTED_EVENT, {
                detail: { tabId: this.id },
                bubbles: true,
                composed: true,
                cancelable: true,
            })), getOffsetLeft: () => this.offsetLeft, getOffsetWidth: () => this.mdcRoot.offsetWidth, getContentOffsetLeft: () => this._contentElement.offsetLeft, getContentOffsetWidth: () => this._contentElement.offsetWidth, focus: () => this.mdcRoot.focus() });
    }
    activate(clientRect) {
        this.mdcFoundation.activate(clientRect);
        this.setActive(this.mdcFoundation.isActive());
    }
    deactivate() {
        this.mdcFoundation.deactivate();
        this.setActive(this.mdcFoundation.isActive());
    }
    setActive(newValue) {
        const oldValue = this.active;
        if (oldValue !== newValue) {
            this._active = newValue;
            this.requestUpdate('active', oldValue);
        }
    }
    computeDimensions() {
        return this.mdcFoundation.computeDimensions();
    }
    computeIndicatorClientRect() {
        return this.tabIndicator.computeContentClientRect();
    }
    // NOTE: needed only for ShadyDOM where delegatesFocus is not implemented
    focus() {
        this.mdcRoot.focus();
    }
}
__decorate([
    query('.mdc-tab')
], TabBase.prototype, "mdcRoot", void 0);
__decorate([
    query('mwc-tab-indicator')
], TabBase.prototype, "tabIndicator", void 0);
__decorate([
    property()
], TabBase.prototype, "label", void 0);
__decorate([
    property()
], TabBase.prototype, "icon", void 0);
__decorate([
    property({ type: Boolean })
], TabBase.prototype, "hasImageIcon", void 0);
__decorate([
    property({ type: Boolean })
], TabBase.prototype, "isFadingIndicator", void 0);
__decorate([
    property({ type: Boolean })
], TabBase.prototype, "minWidth", void 0);
__decorate([
    property({ type: Boolean })
], TabBase.prototype, "isMinWidthIndicator", void 0);
__decorate([
    property({ type: Boolean, reflect: true, attribute: 'active' })
], TabBase.prototype, "active", null);
__decorate([
    property()
], TabBase.prototype, "indicatorIcon", void 0);
__decorate([
    property({ type: Boolean })
], TabBase.prototype, "stacked", void 0);
__decorate([
    observer(async function (value) {
        await this.updateComplete;
        this.mdcFoundation.setFocusOnActivate(value);
    }),
    property({ type: Boolean })
], TabBase.prototype, "focusOnActivate", void 0);
__decorate([
    query('mwc-tab-indicator')
], TabBase.prototype, "_tabIndicator", void 0);
__decorate([
    query('.mdc-tab__content')
], TabBase.prototype, "_contentElement", void 0);

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const style$4 = css `.mdc-tab{-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;font-family:Roboto, sans-serif;font-family:var(--mdc-typography-button-font-family, var(--mdc-typography-font-family, Roboto, sans-serif));font-size:.875rem;font-size:var(--mdc-typography-button-font-size, 0.875rem);line-height:2.25rem;line-height:var(--mdc-typography-button-line-height, 2.25rem);font-weight:500;font-weight:var(--mdc-typography-button-font-weight, 500);letter-spacing:.0892857143em;letter-spacing:var(--mdc-typography-button-letter-spacing, 0.0892857143em);text-decoration:none;text-decoration:var(--mdc-typography-button-text-decoration, none);text-transform:uppercase;text-transform:var(--mdc-typography-button-text-transform, uppercase);padding-right:24px;padding-left:24px;position:relative;display:flex;flex:1 0 auto;justify-content:center;box-sizing:border-box;margin:0;padding-top:0;padding-bottom:0;border:none;outline:none;background:none;text-align:center;white-space:nowrap;cursor:pointer;-webkit-appearance:none;z-index:1}.mdc-tab .mdc-tab__text-label{color:rgba(0,0,0,.6)}.mdc-tab .mdc-tab__icon{color:rgba(0,0,0,.54);fill:currentColor}.mdc-tab::-moz-focus-inner{padding:0;border:0}.mdc-tab--min-width{flex:0 1 auto}.mdc-tab__content{position:relative;display:flex;align-items:center;justify-content:center;height:inherit;pointer-events:none}.mdc-tab__text-label{transition:150ms color linear;display:inline-block;line-height:1;z-index:2}.mdc-tab__icon{transition:150ms color linear;width:24px;height:24px;font-size:24px;z-index:2}.mdc-tab--stacked .mdc-tab__content{flex-direction:column;align-items:center;justify-content:center}.mdc-tab--stacked .mdc-tab__text-label{padding-top:6px;padding-bottom:4px}.mdc-tab--active .mdc-tab__text-label{color:#6200ee;color:var(--mdc-theme-primary, #6200ee)}.mdc-tab--active .mdc-tab__icon{color:#6200ee;color:var(--mdc-theme-primary, #6200ee);fill:currentColor}.mdc-tab--active .mdc-tab__text-label,.mdc-tab--active .mdc-tab__icon{transition-delay:100ms}.mdc-tab:not(.mdc-tab--stacked) .mdc-tab__icon+.mdc-tab__text-label{padding-left:8px;padding-right:0}[dir=rtl] .mdc-tab:not(.mdc-tab--stacked) .mdc-tab__icon+.mdc-tab__text-label,.mdc-tab:not(.mdc-tab--stacked) .mdc-tab__icon+.mdc-tab__text-label[dir=rtl]{padding-left:0;padding-right:8px}@keyframes mdc-ripple-fg-radius-in{from{animation-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transform:translate(var(--mdc-ripple-fg-translate-start, 0)) scale(1)}to{transform:translate(var(--mdc-ripple-fg-translate-end, 0)) scale(var(--mdc-ripple-fg-scale, 1))}}@keyframes mdc-ripple-fg-opacity-in{from{animation-timing-function:linear;opacity:0}to{opacity:var(--mdc-ripple-fg-opacity, 0)}}@keyframes mdc-ripple-fg-opacity-out{from{animation-timing-function:linear;opacity:var(--mdc-ripple-fg-opacity, 0)}to{opacity:0}}.mdc-tab__ripple{--mdc-ripple-fg-size: 0;--mdc-ripple-left: 0;--mdc-ripple-top: 0;--mdc-ripple-fg-scale: 1;--mdc-ripple-fg-translate-end: 0;--mdc-ripple-fg-translate-start: 0;-webkit-tap-highlight-color:rgba(0,0,0,0);position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden}.mdc-tab__ripple::before,.mdc-tab__ripple::after{position:absolute;border-radius:50%;opacity:0;pointer-events:none;content:""}.mdc-tab__ripple::before{transition:opacity 15ms linear,background-color 15ms linear;z-index:1}.mdc-tab__ripple.mdc-ripple-upgraded::before{transform:scale(var(--mdc-ripple-fg-scale, 1))}.mdc-tab__ripple.mdc-ripple-upgraded::after{top:0;left:0;transform:scale(0);transform-origin:center center}.mdc-tab__ripple.mdc-ripple-upgraded--unbounded::after{top:var(--mdc-ripple-top, 0);left:var(--mdc-ripple-left, 0)}.mdc-tab__ripple.mdc-ripple-upgraded--foreground-activation::after{animation:mdc-ripple-fg-radius-in 225ms forwards,mdc-ripple-fg-opacity-in 75ms forwards}.mdc-tab__ripple.mdc-ripple-upgraded--foreground-deactivation::after{animation:mdc-ripple-fg-opacity-out 150ms;transform:translate(var(--mdc-ripple-fg-translate-end, 0)) scale(var(--mdc-ripple-fg-scale, 1))}.mdc-tab__ripple::before,.mdc-tab__ripple::after{top:calc(50% - 100%);left:calc(50% - 100%);width:200%;height:200%}.mdc-tab__ripple.mdc-ripple-upgraded::after{width:var(--mdc-ripple-fg-size, 100%);height:var(--mdc-ripple-fg-size, 100%)}.mdc-tab__ripple::before,.mdc-tab__ripple::after{background-color:#6200ee;background-color:var(--mdc-theme-primary, #6200ee)}.mdc-tab__ripple:hover::before{opacity:.04}.mdc-tab__ripple.mdc-ripple-upgraded--background-focused::before,.mdc-tab__ripple:not(.mdc-ripple-upgraded):focus::before{transition-duration:75ms;opacity:.12}.mdc-tab__ripple:not(.mdc-ripple-upgraded)::after{transition:opacity 150ms linear}.mdc-tab__ripple:not(.mdc-ripple-upgraded):active::after{transition-duration:75ms;opacity:.12}.mdc-tab__ripple.mdc-ripple-upgraded{--mdc-ripple-fg-opacity: 0.12}.material-icons{font-family:var(--mdc-icon-font, "Material Icons");font-weight:normal;font-style:normal;font-size:var(--mdc-icon-size, 24px);line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-moz-osx-font-smoothing:grayscale;font-feature-settings:"liga"}:host{outline:none;flex:1 0 auto;display:flex;justify-content:center}.mdc-tab{height:var(--mdc-tab-height, 48px);margin-left:0;margin-right:0;padding-right:var(--mdc-tab-horizontal-padding, 24px);padding-left:var(--mdc-tab-horizontal-padding, 24px)}.mdc-tab--stacked{height:var(--mdc-tab-stacked-height, 72px)}.mdc-tab::-moz-focus-inner{border:0}.mdc-tab:not(.mdc-tab--stacked) .mdc-tab__icon+.mdc-tab__text-label{padding-left:8px;padding-right:0}[dir=rtl] .mdc-tab:not(.mdc-tab--stacked) .mdc-tab__icon+.mdc-tab__text-label,.mdc-tab:not(.mdc-tab--stacked) .mdc-tab__icon+.mdc-tab__text-label[dir=rtl]{padding-left:0;padding-right:8px}.mdc-tab:not(.mdc-tab--active) .mdc-tab__text-label{color:var(--mdc-tab-text-label-color-default, rgba(0, 0, 0, 0.6))}.mdc-tab:not(.mdc-tab--active) .mdc-tab__icon{color:var(--mdc-tab-color-default, rgba(0, 0, 0, 0.54))}:host,.mdc-tab__ripple{border-radius:var(--mdc-tab-border-radius, 0px)}`;

let Tab = class Tab extends TabBase {
};
Tab.styles = style$4;
Tab = __decorate([
    customElement('mwc-tab')
], Tab);

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$3 = {
    ANIMATING: 'mdc-tab-scroller--animating',
    SCROLL_AREA_SCROLL: 'mdc-tab-scroller__scroll-area--scroll',
    SCROLL_TEST: 'mdc-tab-scroller__test',
};
var strings$3 = {
    AREA_SELECTOR: '.mdc-tab-scroller__scroll-area',
    CONTENT_SELECTOR: '.mdc-tab-scroller__scroll-content',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerRTL = /** @class */ (function () {
    function MDCTabScrollerRTL(adapter) {
        this.adapter_ = adapter;
    }
    return MDCTabScrollerRTL;
}());

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerRTLDefault = /** @class */ (function (_super) {
    __extends(MDCTabScrollerRTLDefault, _super);
    function MDCTabScrollerRTLDefault() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabScrollerRTLDefault.prototype.getScrollPositionRTL = function () {
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        var right = this.calculateScrollEdges_().right;
        // Scroll values on most browsers are ints instead of floats so we round
        return Math.round(right - currentScrollLeft);
    };
    MDCTabScrollerRTLDefault.prototype.scrollToRTL = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(edges.right - scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: clampedScrollLeft - currentScrollLeft,
        };
    };
    MDCTabScrollerRTLDefault.prototype.incrementScrollRTL = function (scrollX) {
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(currentScrollLeft - scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: clampedScrollLeft - currentScrollLeft,
        };
    };
    MDCTabScrollerRTLDefault.prototype.getAnimatingScrollPosition = function (scrollX) {
        return scrollX;
    };
    MDCTabScrollerRTLDefault.prototype.calculateScrollEdges_ = function () {
        var contentWidth = this.adapter_.getScrollContentOffsetWidth();
        var rootWidth = this.adapter_.getScrollAreaOffsetWidth();
        return {
            left: 0,
            right: contentWidth - rootWidth,
        };
    };
    MDCTabScrollerRTLDefault.prototype.clampScrollValue_ = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        return Math.min(Math.max(edges.left, scrollX), edges.right);
    };
    return MDCTabScrollerRTLDefault;
}(MDCTabScrollerRTL));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerRTLNegative = /** @class */ (function (_super) {
    __extends(MDCTabScrollerRTLNegative, _super);
    function MDCTabScrollerRTLNegative() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabScrollerRTLNegative.prototype.getScrollPositionRTL = function (translateX) {
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        return Math.round(translateX - currentScrollLeft);
    };
    MDCTabScrollerRTLNegative.prototype.scrollToRTL = function (scrollX) {
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(-scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: clampedScrollLeft - currentScrollLeft,
        };
    };
    MDCTabScrollerRTLNegative.prototype.incrementScrollRTL = function (scrollX) {
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(currentScrollLeft - scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: clampedScrollLeft - currentScrollLeft,
        };
    };
    MDCTabScrollerRTLNegative.prototype.getAnimatingScrollPosition = function (scrollX, translateX) {
        return scrollX - translateX;
    };
    MDCTabScrollerRTLNegative.prototype.calculateScrollEdges_ = function () {
        var contentWidth = this.adapter_.getScrollContentOffsetWidth();
        var rootWidth = this.adapter_.getScrollAreaOffsetWidth();
        return {
            left: rootWidth - contentWidth,
            right: 0,
        };
    };
    MDCTabScrollerRTLNegative.prototype.clampScrollValue_ = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        return Math.max(Math.min(edges.right, scrollX), edges.left);
    };
    return MDCTabScrollerRTLNegative;
}(MDCTabScrollerRTL));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerRTLReverse = /** @class */ (function (_super) {
    __extends(MDCTabScrollerRTLReverse, _super);
    function MDCTabScrollerRTLReverse() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabScrollerRTLReverse.prototype.getScrollPositionRTL = function (translateX) {
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        // Scroll values on most browsers are ints instead of floats so we round
        return Math.round(currentScrollLeft - translateX);
    };
    MDCTabScrollerRTLReverse.prototype.scrollToRTL = function (scrollX) {
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: currentScrollLeft - clampedScrollLeft,
        };
    };
    MDCTabScrollerRTLReverse.prototype.incrementScrollRTL = function (scrollX) {
        var currentScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(currentScrollLeft + scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: currentScrollLeft - clampedScrollLeft,
        };
    };
    MDCTabScrollerRTLReverse.prototype.getAnimatingScrollPosition = function (scrollX, translateX) {
        return scrollX + translateX;
    };
    MDCTabScrollerRTLReverse.prototype.calculateScrollEdges_ = function () {
        var contentWidth = this.adapter_.getScrollContentOffsetWidth();
        var rootWidth = this.adapter_.getScrollAreaOffsetWidth();
        return {
            left: contentWidth - rootWidth,
            right: 0,
        };
    };
    MDCTabScrollerRTLReverse.prototype.clampScrollValue_ = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        return Math.min(Math.max(edges.right, scrollX), edges.left);
    };
    return MDCTabScrollerRTLReverse;
}(MDCTabScrollerRTL));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerFoundation = /** @class */ (function (_super) {
    __extends(MDCTabScrollerFoundation, _super);
    function MDCTabScrollerFoundation(adapter) {
        var _this = _super.call(this, __assign({}, MDCTabScrollerFoundation.defaultAdapter, adapter)) || this;
        /**
         * Controls whether we should handle the transitionend and interaction events during the animation.
         */
        _this.isAnimating_ = false;
        return _this;
    }
    Object.defineProperty(MDCTabScrollerFoundation, "cssClasses", {
        get: function () {
            return cssClasses$3;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabScrollerFoundation, "strings", {
        get: function () {
            return strings$3;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabScrollerFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                eventTargetMatchesSelector: function () { return false; },
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                addScrollAreaClass: function () { return undefined; },
                setScrollAreaStyleProperty: function () { return undefined; },
                setScrollContentStyleProperty: function () { return undefined; },
                getScrollContentStyleValue: function () { return ''; },
                setScrollAreaScrollLeft: function () { return undefined; },
                getScrollAreaScrollLeft: function () { return 0; },
                getScrollContentOffsetWidth: function () { return 0; },
                getScrollAreaOffsetWidth: function () { return 0; },
                computeScrollAreaClientRect: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                computeScrollContentClientRect: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                computeHorizontalScrollbarHeight: function () { return 0; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCTabScrollerFoundation.prototype.init = function () {
        // Compute horizontal scrollbar height on scroller with overflow initially hidden, then update overflow to scroll
        // and immediately adjust bottom margin to avoid the scrollbar initially appearing before JS runs.
        var horizontalScrollbarHeight = this.adapter_.computeHorizontalScrollbarHeight();
        this.adapter_.setScrollAreaStyleProperty('margin-bottom', -horizontalScrollbarHeight + 'px');
        this.adapter_.addScrollAreaClass(MDCTabScrollerFoundation.cssClasses.SCROLL_AREA_SCROLL);
    };
    /**
     * Computes the current visual scroll position
     */
    MDCTabScrollerFoundation.prototype.getScrollPosition = function () {
        if (this.isRTL_()) {
            return this.computeCurrentScrollPositionRTL_();
        }
        var currentTranslateX = this.calculateCurrentTranslateX_();
        var scrollLeft = this.adapter_.getScrollAreaScrollLeft();
        return scrollLeft - currentTranslateX;
    };
    /**
     * Handles interaction events that occur during transition
     */
    MDCTabScrollerFoundation.prototype.handleInteraction = function () {
        // Early exit if we aren't animating
        if (!this.isAnimating_) {
            return;
        }
        // Prevent other event listeners from handling this event
        this.stopScrollAnimation_();
    };
    /**
     * Handles the transitionend event
     */
    MDCTabScrollerFoundation.prototype.handleTransitionEnd = function (evt) {
        // Early exit if we aren't animating or the event was triggered by a different element.
        var evtTarget = evt.target;
        if (!this.isAnimating_ ||
            !this.adapter_.eventTargetMatchesSelector(evtTarget, MDCTabScrollerFoundation.strings.CONTENT_SELECTOR)) {
            return;
        }
        this.isAnimating_ = false;
        this.adapter_.removeClass(MDCTabScrollerFoundation.cssClasses.ANIMATING);
    };
    /**
     * Increment the scroll value by the scrollXIncrement using animation.
     * @param scrollXIncrement The value by which to increment the scroll position
     */
    MDCTabScrollerFoundation.prototype.incrementScroll = function (scrollXIncrement) {
        // Early exit for non-operational increment values
        if (scrollXIncrement === 0) {
            return;
        }
        this.animate_(this.getIncrementScrollOperation_(scrollXIncrement));
    };
    /**
     * Increment the scroll value by the scrollXIncrement without animation.
     * @param scrollXIncrement The value by which to increment the scroll position
     */
    MDCTabScrollerFoundation.prototype.incrementScrollImmediate = function (scrollXIncrement) {
        // Early exit for non-operational increment values
        if (scrollXIncrement === 0) {
            return;
        }
        var operation = this.getIncrementScrollOperation_(scrollXIncrement);
        if (operation.scrollDelta === 0) {
            return;
        }
        this.stopScrollAnimation_();
        this.adapter_.setScrollAreaScrollLeft(operation.finalScrollPosition);
    };
    /**
     * Scrolls to the given scrollX value
     */
    MDCTabScrollerFoundation.prototype.scrollTo = function (scrollX) {
        if (this.isRTL_()) {
            return this.scrollToRTL_(scrollX);
        }
        this.scrollTo_(scrollX);
    };
    /**
     * @return Browser-specific {@link MDCTabScrollerRTL} instance.
     */
    MDCTabScrollerFoundation.prototype.getRTLScroller = function () {
        if (!this.rtlScrollerInstance_) {
            this.rtlScrollerInstance_ = this.rtlScrollerFactory_();
        }
        return this.rtlScrollerInstance_;
    };
    /**
     * @return translateX value from a CSS matrix transform function string.
     */
    MDCTabScrollerFoundation.prototype.calculateCurrentTranslateX_ = function () {
        var transformValue = this.adapter_.getScrollContentStyleValue('transform');
        // Early exit if no transform is present
        if (transformValue === 'none') {
            return 0;
        }
        // The transform value comes back as a matrix transformation in the form
        // of `matrix(a, b, c, d, tx, ty)`. We only care about tx (translateX) so
        // we're going to grab all the parenthesized values, strip out tx, and
        // parse it.
        var match = /\((.+?)\)/.exec(transformValue);
        if (!match) {
            return 0;
        }
        var matrixParams = match[1];
        // tslint:disable-next-line:ban-ts-ignore "Unused vars" should be a linter warning, not a compiler error.
        // @ts-ignore These unused variables should retain their semantic names for clarity.
        var _a = __read(matrixParams.split(','), 6), a = _a[0], b = _a[1], c = _a[2], d = _a[3], tx = _a[4], ty = _a[5];
        return parseFloat(tx); // tslint:disable-line:ban
    };
    /**
     * Calculates a safe scroll value that is > 0 and < the max scroll value
     * @param scrollX The distance to scroll
     */
    MDCTabScrollerFoundation.prototype.clampScrollValue_ = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        return Math.min(Math.max(edges.left, scrollX), edges.right);
    };
    MDCTabScrollerFoundation.prototype.computeCurrentScrollPositionRTL_ = function () {
        var translateX = this.calculateCurrentTranslateX_();
        return this.getRTLScroller().getScrollPositionRTL(translateX);
    };
    MDCTabScrollerFoundation.prototype.calculateScrollEdges_ = function () {
        var contentWidth = this.adapter_.getScrollContentOffsetWidth();
        var rootWidth = this.adapter_.getScrollAreaOffsetWidth();
        return {
            left: 0,
            right: contentWidth - rootWidth,
        };
    };
    /**
     * Internal scroll method
     * @param scrollX The new scroll position
     */
    MDCTabScrollerFoundation.prototype.scrollTo_ = function (scrollX) {
        var currentScrollX = this.getScrollPosition();
        var safeScrollX = this.clampScrollValue_(scrollX);
        var scrollDelta = safeScrollX - currentScrollX;
        this.animate_({
            finalScrollPosition: safeScrollX,
            scrollDelta: scrollDelta,
        });
    };
    /**
     * Internal RTL scroll method
     * @param scrollX The new scroll position
     */
    MDCTabScrollerFoundation.prototype.scrollToRTL_ = function (scrollX) {
        var animation = this.getRTLScroller().scrollToRTL(scrollX);
        this.animate_(animation);
    };
    /**
     * Internal method to compute the increment scroll operation values.
     * @param scrollX The desired scroll position increment
     * @return MDCTabScrollerAnimation with the sanitized values for performing the scroll operation.
     */
    MDCTabScrollerFoundation.prototype.getIncrementScrollOperation_ = function (scrollX) {
        if (this.isRTL_()) {
            return this.getRTLScroller().incrementScrollRTL(scrollX);
        }
        var currentScrollX = this.getScrollPosition();
        var targetScrollX = scrollX + currentScrollX;
        var safeScrollX = this.clampScrollValue_(targetScrollX);
        var scrollDelta = safeScrollX - currentScrollX;
        return {
            finalScrollPosition: safeScrollX,
            scrollDelta: scrollDelta,
        };
    };
    /**
     * Animates the tab scrolling
     * @param animation The animation to apply
     */
    MDCTabScrollerFoundation.prototype.animate_ = function (animation) {
        var _this = this;
        // Early exit if translateX is 0, which means there's no animation to perform
        if (animation.scrollDelta === 0) {
            return;
        }
        this.stopScrollAnimation_();
        // This animation uses the FLIP approach.
        // Read more here: https://aerotwist.com/blog/flip-your-animations/
        this.adapter_.setScrollAreaScrollLeft(animation.finalScrollPosition);
        this.adapter_.setScrollContentStyleProperty('transform', "translateX(" + animation.scrollDelta + "px)");
        // Force repaint
        this.adapter_.computeScrollAreaClientRect();
        requestAnimationFrame(function () {
            _this.adapter_.addClass(MDCTabScrollerFoundation.cssClasses.ANIMATING);
            _this.adapter_.setScrollContentStyleProperty('transform', 'none');
        });
        this.isAnimating_ = true;
    };
    /**
     * Stops scroll animation
     */
    MDCTabScrollerFoundation.prototype.stopScrollAnimation_ = function () {
        this.isAnimating_ = false;
        var currentScrollPosition = this.getAnimatingScrollPosition_();
        this.adapter_.removeClass(MDCTabScrollerFoundation.cssClasses.ANIMATING);
        this.adapter_.setScrollContentStyleProperty('transform', 'translateX(0px)');
        this.adapter_.setScrollAreaScrollLeft(currentScrollPosition);
    };
    /**
     * Gets the current scroll position during animation
     */
    MDCTabScrollerFoundation.prototype.getAnimatingScrollPosition_ = function () {
        var currentTranslateX = this.calculateCurrentTranslateX_();
        var scrollLeft = this.adapter_.getScrollAreaScrollLeft();
        if (this.isRTL_()) {
            return this.getRTLScroller().getAnimatingScrollPosition(scrollLeft, currentTranslateX);
        }
        return scrollLeft - currentTranslateX;
    };
    /**
     * Determines the RTL Scroller to use
     */
    MDCTabScrollerFoundation.prototype.rtlScrollerFactory_ = function () {
        // Browsers have three different implementations of scrollLeft in RTL mode,
        // dependent on the browser. The behavior is based off the max LTR
        // scrollLeft value and 0.
        //
        // * Default scrolling in RTL *
        //    - Left-most value: 0
        //    - Right-most value: Max LTR scrollLeft value
        //
        // * Negative scrolling in RTL *
        //    - Left-most value: Negated max LTR scrollLeft value
        //    - Right-most value: 0
        //
        // * Reverse scrolling in RTL *
        //    - Left-most value: Max LTR scrollLeft value
        //    - Right-most value: 0
        //
        // We use those principles below to determine which RTL scrollLeft
        // behavior is implemented in the current browser.
        var initialScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        this.adapter_.setScrollAreaScrollLeft(initialScrollLeft - 1);
        var newScrollLeft = this.adapter_.getScrollAreaScrollLeft();
        // If the newScrollLeft value is negative,then we know that the browser has
        // implemented negative RTL scrolling, since all other implementations have
        // only positive values.
        if (newScrollLeft < 0) {
            // Undo the scrollLeft test check
            this.adapter_.setScrollAreaScrollLeft(initialScrollLeft);
            return new MDCTabScrollerRTLNegative(this.adapter_);
        }
        var rootClientRect = this.adapter_.computeScrollAreaClientRect();
        var contentClientRect = this.adapter_.computeScrollContentClientRect();
        var rightEdgeDelta = Math.round(contentClientRect.right - rootClientRect.right);
        // Undo the scrollLeft test check
        this.adapter_.setScrollAreaScrollLeft(initialScrollLeft);
        // By calculating the clientRect of the root element and the clientRect of
        // the content element, we can determine how much the scroll value changed
        // when we performed the scrollLeft subtraction above.
        if (rightEdgeDelta === newScrollLeft) {
            return new MDCTabScrollerRTLReverse(this.adapter_);
        }
        return new MDCTabScrollerRTLDefault(this.adapter_);
    };
    MDCTabScrollerFoundation.prototype.isRTL_ = function () {
        return this.adapter_.getScrollContentStyleValue('direction') === 'rtl';
    };
    return MDCTabScrollerFoundation;
}(MDCFoundation));

class TabScrollerBase extends BaseElement {
    constructor() {
        super(...arguments);
        this.mdcFoundationClass = MDCTabScrollerFoundation;
        this._scrollbarHeight = -1;
    }
    _handleInteraction() {
        this.mdcFoundation.handleInteraction();
    }
    _handleTransitionEnd(e) {
        this.mdcFoundation.handleTransitionEnd(e);
    }
    render() {
        return html `
      <div class="mdc-tab-scroller">
        <div class="mdc-tab-scroller__scroll-area"
            @wheel="${this._handleInteraction}"
            @touchstart="${this._handleInteraction}"
            @pointerdown="${this._handleInteraction}"
            @mousedown="${this._handleInteraction}"
            @keydown="${this._handleInteraction}"
            @transitionend="${this._handleTransitionEnd}">
          <div class="mdc-tab-scroller__scroll-content"><slot></slot></div>
        </div>
      </div>
      `;
    }
    createAdapter() {
        return Object.assign(Object.assign({}, addHasRemoveClass(this.mdcRoot)), { eventTargetMatchesSelector: (evtTarget, selector) => matches(evtTarget, selector), addScrollAreaClass: (className) => this.scrollAreaElement.classList.add(className), setScrollAreaStyleProperty: (prop, value) => this.scrollAreaElement.style.setProperty(prop, value), setScrollContentStyleProperty: (prop, value) => this.scrollContentElement.style.setProperty(prop, value), getScrollContentStyleValue: (propName) => window.getComputedStyle(this.scrollContentElement)
                .getPropertyValue(propName), setScrollAreaScrollLeft: (scrollX) => this.scrollAreaElement.scrollLeft = scrollX, getScrollAreaScrollLeft: () => this.scrollAreaElement.scrollLeft, getScrollContentOffsetWidth: () => this.scrollContentElement.offsetWidth, getScrollAreaOffsetWidth: () => this.scrollAreaElement.offsetWidth, computeScrollAreaClientRect: () => this.scrollAreaElement.getBoundingClientRect(), computeScrollContentClientRect: () => this.scrollContentElement.getBoundingClientRect(), computeHorizontalScrollbarHeight: () => {
                if (this._scrollbarHeight === -1) {
                    this.scrollAreaElement.style.overflowX = 'scroll';
                    this._scrollbarHeight = this.scrollAreaElement.offsetHeight -
                        this.scrollAreaElement.clientHeight;
                    this.scrollAreaElement.style.overflowX = '';
                }
                return this._scrollbarHeight;
            } });
    }
    /**
     * Returns the current visual scroll position
     * @return {number}
     */
    getScrollPosition() {
        return this.mdcFoundation.getScrollPosition();
    }
    /**
     * Returns the width of the scroll content
     * @return {number}
     */
    getScrollContentWidth() {
        return this.scrollContentElement.offsetWidth;
    }
    /**
     * Increments the scroll value by the given amount
     * @param {number} scrollXIncrement The pixel value by which to increment the
     *     scroll value
     */
    incrementScrollPosition(scrollXIncrement) {
        this.mdcFoundation.incrementScroll(scrollXIncrement);
    }
    /**
     * Scrolls to the given pixel position
     * @param {number} scrollX The pixel value to scroll to
     */
    scrollToPosition(scrollX) {
        this.mdcFoundation.scrollTo(scrollX);
    }
}
__decorate([
    query('.mdc-tab-scroller')
], TabScrollerBase.prototype, "mdcRoot", void 0);
__decorate([
    query('.mdc-tab-scroller__scroll-area')
], TabScrollerBase.prototype, "scrollAreaElement", void 0);
__decorate([
    query('.mdc-tab-scroller__scroll-content')
], TabScrollerBase.prototype, "scrollContentElement", void 0);
__decorate([
    eventOptions({ passive: true })
], TabScrollerBase.prototype, "_handleInteraction", null);

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const style$5 = css `.mdc-tab-scroller{overflow-y:hidden}.mdc-tab-scroller.mdc-tab-scroller--animating .mdc-tab-scroller__scroll-content{transition:250ms transform cubic-bezier(0.4, 0, 0.2, 1)}.mdc-tab-scroller__test{position:absolute;top:-9999px;width:100px;height:100px;overflow-x:scroll}.mdc-tab-scroller__scroll-area{-webkit-overflow-scrolling:touch;display:flex;overflow-x:hidden}.mdc-tab-scroller__scroll-area::-webkit-scrollbar,.mdc-tab-scroller__test::-webkit-scrollbar{display:none}.mdc-tab-scroller__scroll-area--scroll{overflow-x:scroll}.mdc-tab-scroller__scroll-content{position:relative;display:flex;flex:1 0 auto;transform:none;will-change:transform}.mdc-tab-scroller--align-start .mdc-tab-scroller__scroll-content{justify-content:flex-start}.mdc-tab-scroller--align-end .mdc-tab-scroller__scroll-content{justify-content:flex-end}.mdc-tab-scroller--align-center .mdc-tab-scroller__scroll-content{justify-content:center}.mdc-tab-scroller--animating .mdc-tab-scroller__scroll-area{-webkit-overflow-scrolling:auto}:host{display:flex}.mdc-tab-scroller{flex:1}`;

let TabScroller = class TabScroller extends TabScrollerBase {
};
TabScroller.styles = style$5;
TabScroller = __decorate([
    customElement('mwc-tab-scroller')
], TabScroller);

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$4 = {
    ARROW_LEFT_KEY: 'ArrowLeft',
    ARROW_RIGHT_KEY: 'ArrowRight',
    END_KEY: 'End',
    ENTER_KEY: 'Enter',
    HOME_KEY: 'Home',
    SPACE_KEY: 'Space',
    TAB_ACTIVATED_EVENT: 'MDCTabBar:activated',
    TAB_SCROLLER_SELECTOR: '.mdc-tab-scroller',
    TAB_SELECTOR: '.mdc-tab',
};
var numbers$1 = {
    ARROW_LEFT_KEYCODE: 37,
    ARROW_RIGHT_KEYCODE: 39,
    END_KEYCODE: 35,
    ENTER_KEYCODE: 13,
    EXTRA_SCROLL_AMOUNT: 20,
    HOME_KEYCODE: 36,
    SPACE_KEYCODE: 32,
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var ACCEPTABLE_KEYS = new Set();
// IE11 has no support for new Set with iterable so we need to initialize this by hand
ACCEPTABLE_KEYS.add(strings$4.ARROW_LEFT_KEY);
ACCEPTABLE_KEYS.add(strings$4.ARROW_RIGHT_KEY);
ACCEPTABLE_KEYS.add(strings$4.END_KEY);
ACCEPTABLE_KEYS.add(strings$4.HOME_KEY);
ACCEPTABLE_KEYS.add(strings$4.ENTER_KEY);
ACCEPTABLE_KEYS.add(strings$4.SPACE_KEY);
var KEYCODE_MAP = new Map();
// IE11 has no support for new Map with iterable so we need to initialize this by hand
KEYCODE_MAP.set(numbers$1.ARROW_LEFT_KEYCODE, strings$4.ARROW_LEFT_KEY);
KEYCODE_MAP.set(numbers$1.ARROW_RIGHT_KEYCODE, strings$4.ARROW_RIGHT_KEY);
KEYCODE_MAP.set(numbers$1.END_KEYCODE, strings$4.END_KEY);
KEYCODE_MAP.set(numbers$1.HOME_KEYCODE, strings$4.HOME_KEY);
KEYCODE_MAP.set(numbers$1.ENTER_KEYCODE, strings$4.ENTER_KEY);
KEYCODE_MAP.set(numbers$1.SPACE_KEYCODE, strings$4.SPACE_KEY);
var MDCTabBarFoundation = /** @class */ (function (_super) {
    __extends(MDCTabBarFoundation, _super);
    function MDCTabBarFoundation(adapter) {
        var _this = _super.call(this, __assign({}, MDCTabBarFoundation.defaultAdapter, adapter)) || this;
        _this.useAutomaticActivation_ = false;
        return _this;
    }
    Object.defineProperty(MDCTabBarFoundation, "strings", {
        get: function () {
            return strings$4;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabBarFoundation, "numbers", {
        get: function () {
            return numbers$1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabBarFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                scrollTo: function () { return undefined; },
                incrementScroll: function () { return undefined; },
                getScrollPosition: function () { return 0; },
                getScrollContentWidth: function () { return 0; },
                getOffsetWidth: function () { return 0; },
                isRTL: function () { return false; },
                setActiveTab: function () { return undefined; },
                activateTabAtIndex: function () { return undefined; },
                deactivateTabAtIndex: function () { return undefined; },
                focusTabAtIndex: function () { return undefined; },
                getTabIndicatorClientRectAtIndex: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                getTabDimensionsAtIndex: function () { return ({ rootLeft: 0, rootRight: 0, contentLeft: 0, contentRight: 0 }); },
                getPreviousActiveTabIndex: function () { return -1; },
                getFocusedTabIndex: function () { return -1; },
                getIndexOfTabById: function () { return -1; },
                getTabListLength: function () { return 0; },
                notifyTabActivated: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Switches between automatic and manual activation modes.
     * See https://www.w3.org/TR/wai-aria-practices/#tabpanel for examples.
     */
    MDCTabBarFoundation.prototype.setUseAutomaticActivation = function (useAutomaticActivation) {
        this.useAutomaticActivation_ = useAutomaticActivation;
    };
    MDCTabBarFoundation.prototype.activateTab = function (index) {
        var previousActiveIndex = this.adapter_.getPreviousActiveTabIndex();
        if (!this.indexIsInRange_(index) || index === previousActiveIndex) {
            return;
        }
        var previousClientRect;
        if (previousActiveIndex !== -1) {
            this.adapter_.deactivateTabAtIndex(previousActiveIndex);
            previousClientRect = this.adapter_.getTabIndicatorClientRectAtIndex(previousActiveIndex);
        }
        this.adapter_.activateTabAtIndex(index, previousClientRect);
        this.scrollIntoView(index);
        this.adapter_.notifyTabActivated(index);
    };
    MDCTabBarFoundation.prototype.handleKeyDown = function (evt) {
        // Get the key from the event
        var key = this.getKeyFromEvent_(evt);
        // Early exit if the event key isn't one of the keyboard navigation keys
        if (key === undefined) {
            return;
        }
        // Prevent default behavior for movement keys, but not for activation keys, since :active is used to apply ripple
        if (!this.isActivationKey_(key)) {
            evt.preventDefault();
        }
        if (this.useAutomaticActivation_) {
            if (this.isActivationKey_(key)) {
                return;
            }
            var index = this.determineTargetFromKey_(this.adapter_.getPreviousActiveTabIndex(), key);
            this.adapter_.setActiveTab(index);
            this.scrollIntoView(index);
        }
        else {
            var focusedTabIndex = this.adapter_.getFocusedTabIndex();
            if (this.isActivationKey_(key)) {
                this.adapter_.setActiveTab(focusedTabIndex);
            }
            else {
                var index = this.determineTargetFromKey_(focusedTabIndex, key);
                this.adapter_.focusTabAtIndex(index);
                this.scrollIntoView(index);
            }
        }
    };
    /**
     * Handles the MDCTab:interacted event
     */
    MDCTabBarFoundation.prototype.handleTabInteraction = function (evt) {
        this.adapter_.setActiveTab(this.adapter_.getIndexOfTabById(evt.detail.tabId));
    };
    /**
     * Scrolls the tab at the given index into view
     * @param index The tab index to make visible
     */
    MDCTabBarFoundation.prototype.scrollIntoView = function (index) {
        // Early exit if the index is out of range
        if (!this.indexIsInRange_(index)) {
            return;
        }
        // Always scroll to 0 if scrolling to the 0th index
        if (index === 0) {
            return this.adapter_.scrollTo(0);
        }
        // Always scroll to the max value if scrolling to the Nth index
        // MDCTabScroller.scrollTo() will never scroll past the max possible value
        if (index === this.adapter_.getTabListLength() - 1) {
            return this.adapter_.scrollTo(this.adapter_.getScrollContentWidth());
        }
        if (this.isRTL_()) {
            return this.scrollIntoViewRTL_(index);
        }
        this.scrollIntoView_(index);
    };
    /**
     * Private method for determining the index of the destination tab based on what key was pressed
     * @param origin The original index from which to determine the destination
     * @param key The name of the key
     */
    MDCTabBarFoundation.prototype.determineTargetFromKey_ = function (origin, key) {
        var isRTL = this.isRTL_();
        var maxIndex = this.adapter_.getTabListLength() - 1;
        var shouldGoToEnd = key === strings$4.END_KEY;
        var shouldDecrement = key === strings$4.ARROW_LEFT_KEY && !isRTL || key === strings$4.ARROW_RIGHT_KEY && isRTL;
        var shouldIncrement = key === strings$4.ARROW_RIGHT_KEY && !isRTL || key === strings$4.ARROW_LEFT_KEY && isRTL;
        var index = origin;
        if (shouldGoToEnd) {
            index = maxIndex;
        }
        else if (shouldDecrement) {
            index -= 1;
        }
        else if (shouldIncrement) {
            index += 1;
        }
        else {
            index = 0;
        }
        if (index < 0) {
            index = maxIndex;
        }
        else if (index > maxIndex) {
            index = 0;
        }
        return index;
    };
    /**
     * Calculates the scroll increment that will make the tab at the given index visible
     * @param index The index of the tab
     * @param nextIndex The index of the next tab
     * @param scrollPosition The current scroll position
     * @param barWidth The width of the Tab Bar
     */
    MDCTabBarFoundation.prototype.calculateScrollIncrement_ = function (index, nextIndex, scrollPosition, barWidth) {
        var nextTabDimensions = this.adapter_.getTabDimensionsAtIndex(nextIndex);
        var relativeContentLeft = nextTabDimensions.contentLeft - scrollPosition - barWidth;
        var relativeContentRight = nextTabDimensions.contentRight - scrollPosition;
        var leftIncrement = relativeContentRight - numbers$1.EXTRA_SCROLL_AMOUNT;
        var rightIncrement = relativeContentLeft + numbers$1.EXTRA_SCROLL_AMOUNT;
        if (nextIndex < index) {
            return Math.min(leftIncrement, 0);
        }
        return Math.max(rightIncrement, 0);
    };
    /**
     * Calculates the scroll increment that will make the tab at the given index visible in RTL
     * @param index The index of the tab
     * @param nextIndex The index of the next tab
     * @param scrollPosition The current scroll position
     * @param barWidth The width of the Tab Bar
     * @param scrollContentWidth The width of the scroll content
     */
    MDCTabBarFoundation.prototype.calculateScrollIncrementRTL_ = function (index, nextIndex, scrollPosition, barWidth, scrollContentWidth) {
        var nextTabDimensions = this.adapter_.getTabDimensionsAtIndex(nextIndex);
        var relativeContentLeft = scrollContentWidth - nextTabDimensions.contentLeft - scrollPosition;
        var relativeContentRight = scrollContentWidth - nextTabDimensions.contentRight - scrollPosition - barWidth;
        var leftIncrement = relativeContentRight + numbers$1.EXTRA_SCROLL_AMOUNT;
        var rightIncrement = relativeContentLeft - numbers$1.EXTRA_SCROLL_AMOUNT;
        if (nextIndex > index) {
            return Math.max(leftIncrement, 0);
        }
        return Math.min(rightIncrement, 0);
    };
    /**
     * Determines the index of the adjacent tab closest to either edge of the Tab Bar
     * @param index The index of the tab
     * @param tabDimensions The dimensions of the tab
     * @param scrollPosition The current scroll position
     * @param barWidth The width of the tab bar
     */
    MDCTabBarFoundation.prototype.findAdjacentTabIndexClosestToEdge_ = function (index, tabDimensions, scrollPosition, barWidth) {
        /**
         * Tabs are laid out in the Tab Scroller like this:
         *
         *    Scroll Position
         *    +---+
         *    |   |   Bar Width
         *    |   +-----------------------------------+
         *    |   |                                   |
         *    |   V                                   V
         *    |   +-----------------------------------+
         *    V   |             Tab Scroller          |
         *    +------------+--------------+-------------------+
         *    |    Tab     |      Tab     |        Tab        |
         *    +------------+--------------+-------------------+
         *        |                                   |
         *        +-----------------------------------+
         *
         * To determine the next adjacent index, we look at the Tab root left and
         * Tab root right, both relative to the scroll position. If the Tab root
         * left is less than 0, then we know it's out of view to the left. If the
         * Tab root right minus the bar width is greater than 0, we know the Tab is
         * out of view to the right. From there, we either increment or decrement
         * the index.
         */
        var relativeRootLeft = tabDimensions.rootLeft - scrollPosition;
        var relativeRootRight = tabDimensions.rootRight - scrollPosition - barWidth;
        var relativeRootDelta = relativeRootLeft + relativeRootRight;
        var leftEdgeIsCloser = relativeRootLeft < 0 || relativeRootDelta < 0;
        var rightEdgeIsCloser = relativeRootRight > 0 || relativeRootDelta > 0;
        if (leftEdgeIsCloser) {
            return index - 1;
        }
        if (rightEdgeIsCloser) {
            return index + 1;
        }
        return -1;
    };
    /**
     * Determines the index of the adjacent tab closest to either edge of the Tab Bar in RTL
     * @param index The index of the tab
     * @param tabDimensions The dimensions of the tab
     * @param scrollPosition The current scroll position
     * @param barWidth The width of the tab bar
     * @param scrollContentWidth The width of the scroller content
     */
    MDCTabBarFoundation.prototype.findAdjacentTabIndexClosestToEdgeRTL_ = function (index, tabDimensions, scrollPosition, barWidth, scrollContentWidth) {
        var rootLeft = scrollContentWidth - tabDimensions.rootLeft - barWidth - scrollPosition;
        var rootRight = scrollContentWidth - tabDimensions.rootRight - scrollPosition;
        var rootDelta = rootLeft + rootRight;
        var leftEdgeIsCloser = rootLeft > 0 || rootDelta > 0;
        var rightEdgeIsCloser = rootRight < 0 || rootDelta < 0;
        if (leftEdgeIsCloser) {
            return index + 1;
        }
        if (rightEdgeIsCloser) {
            return index - 1;
        }
        return -1;
    };
    /**
     * Returns the key associated with a keydown event
     * @param evt The keydown event
     */
    MDCTabBarFoundation.prototype.getKeyFromEvent_ = function (evt) {
        if (ACCEPTABLE_KEYS.has(evt.key)) {
            return evt.key;
        }
        return KEYCODE_MAP.get(evt.keyCode);
    };
    MDCTabBarFoundation.prototype.isActivationKey_ = function (key) {
        return key === strings$4.SPACE_KEY || key === strings$4.ENTER_KEY;
    };
    /**
     * Returns whether a given index is inclusively between the ends
     * @param index The index to test
     */
    MDCTabBarFoundation.prototype.indexIsInRange_ = function (index) {
        return index >= 0 && index < this.adapter_.getTabListLength();
    };
    /**
     * Returns the view's RTL property
     */
    MDCTabBarFoundation.prototype.isRTL_ = function () {
        return this.adapter_.isRTL();
    };
    /**
     * Scrolls the tab at the given index into view for left-to-right user agents.
     * @param index The index of the tab to scroll into view
     */
    MDCTabBarFoundation.prototype.scrollIntoView_ = function (index) {
        var scrollPosition = this.adapter_.getScrollPosition();
        var barWidth = this.adapter_.getOffsetWidth();
        var tabDimensions = this.adapter_.getTabDimensionsAtIndex(index);
        var nextIndex = this.findAdjacentTabIndexClosestToEdge_(index, tabDimensions, scrollPosition, barWidth);
        if (!this.indexIsInRange_(nextIndex)) {
            return;
        }
        var scrollIncrement = this.calculateScrollIncrement_(index, nextIndex, scrollPosition, barWidth);
        this.adapter_.incrementScroll(scrollIncrement);
    };
    /**
     * Scrolls the tab at the given index into view in RTL
     * @param index The tab index to make visible
     */
    MDCTabBarFoundation.prototype.scrollIntoViewRTL_ = function (index) {
        var scrollPosition = this.adapter_.getScrollPosition();
        var barWidth = this.adapter_.getOffsetWidth();
        var tabDimensions = this.adapter_.getTabDimensionsAtIndex(index);
        var scrollWidth = this.adapter_.getScrollContentWidth();
        var nextIndex = this.findAdjacentTabIndexClosestToEdgeRTL_(index, tabDimensions, scrollPosition, barWidth, scrollWidth);
        if (!this.indexIsInRange_(nextIndex)) {
            return;
        }
        var scrollIncrement = this.calculateScrollIncrementRTL_(index, nextIndex, scrollPosition, barWidth, scrollWidth);
        this.adapter_.incrementScroll(scrollIncrement);
    };
    return MDCTabBarFoundation;
}(MDCFoundation));

class TabBarBase extends BaseElement {
    constructor() {
        super(...arguments);
        this.mdcFoundationClass = MDCTabBarFoundation;
        this.activeIndex = 0;
        this._previousActiveIndex = -1;
    }
    _handleTabInteraction(e) {
        this.mdcFoundation.handleTabInteraction(e);
    }
    _handleKeydown(e) {
        this.mdcFoundation.handleKeyDown(e);
    }
    // TODO(sorvell): can scroller be optional for perf?
    render() {
        return html `
      <div class="mdc-tab-bar" role="tablist"
          @MDCTab:interacted="${this._handleTabInteraction}"
          @keydown="${this._handleKeydown}">
        <mwc-tab-scroller><slot></slot></mwc-tab-scroller>
      </div>
      `;
    }
    // TODO(sorvell): probably want to memoize this and use a `slotChange` event
    _getTabs() {
        return this.tabsSlot
            .assignedNodes({ flatten: true })
            .filter((e) => e instanceof Tab);
    }
    _getTab(index) {
        return this._getTabs()[index];
    }
    createAdapter() {
        return {
            scrollTo: (scrollX) => this.scrollerElement.scrollToPosition(scrollX),
            incrementScroll: (scrollXIncrement) => this.scrollerElement.incrementScrollPosition(scrollXIncrement),
            getScrollPosition: () => this.scrollerElement.getScrollPosition(),
            getScrollContentWidth: () => this.scrollerElement.getScrollContentWidth(),
            getOffsetWidth: () => this.mdcRoot.offsetWidth,
            isRTL: () => window.getComputedStyle(this.mdcRoot)
                .getPropertyValue('direction') === 'rtl',
            setActiveTab: (index) => this.mdcFoundation.activateTab(index),
            activateTabAtIndex: (index, clientRect) => {
                const tab = this._getTab(index);
                if (tab !== undefined) {
                    tab.activate(clientRect);
                }
                this._previousActiveIndex = index;
            },
            deactivateTabAtIndex: (index) => {
                const tab = this._getTab(index);
                if (tab !== undefined) {
                    tab.deactivate();
                }
            },
            focusTabAtIndex: (index) => {
                const tab = this._getTab(index);
                if (tab !== undefined) {
                    tab.focus();
                }
            },
            // TODO(sorvell): tab may not be able to synchronously answer
            // `computeIndicatorClientRect` if an update is pending or it has not yet
            // updated. If this is necessary, LitElement may need a `forceUpdate`
            // method.
            getTabIndicatorClientRectAtIndex: (index) => {
                const tab = this._getTab(index);
                return tab !== undefined ? tab.computeIndicatorClientRect() :
                    new DOMRect();
            },
            getTabDimensionsAtIndex: (index) => {
                const tab = this._getTab(index);
                return tab !== undefined ?
                    tab.computeDimensions() :
                    { rootLeft: 0, rootRight: 0, contentLeft: 0, contentRight: 0 };
            },
            getPreviousActiveTabIndex: () => {
                return this._previousActiveIndex;
            },
            getFocusedTabIndex: () => {
                const tabElements = this._getTabs();
                const activeElement = this.getRootNode().activeElement;
                return tabElements.indexOf(activeElement);
            },
            getIndexOfTabById: (id) => {
                const tabElements = this._getTabs();
                for (let i = 0; i < tabElements.length; i++) {
                    if (tabElements[i].id === id) {
                        return i;
                    }
                }
                return -1;
            },
            getTabListLength: () => this._getTabs().length,
            notifyTabActivated: (index) => {
                // Synchronize the tabs `activeIndex` to the foundation.
                // This is needed when a tab is changed via a click, for example.
                this.activeIndex = index;
                this.dispatchEvent(new CustomEvent(MDCTabBarFoundation.strings.TAB_ACTIVATED_EVENT, { detail: { index }, bubbles: true, cancelable: true }));
            },
        };
    }
    firstUpdated() {
        // NOTE: Delay creating foundation until scroller is fully updated.
        // This is necessary because the foundation/adapter synchronously addresses
        // the scroller element.
    }
    _getUpdateComplete() {
        return super._getUpdateComplete()
            .then(() => this.scrollerElement.updateComplete)
            .then(() => {
            if (this.mdcFoundation === undefined) {
                this.createFoundation();
            }
        });
    }
    scrollIndexIntoView(index) {
        this.mdcFoundation.scrollIntoView(index);
    }
}
__decorate([
    query('.mdc-tab-bar')
], TabBarBase.prototype, "mdcRoot", void 0);
__decorate([
    query('mwc-tab-scroller')
], TabBarBase.prototype, "scrollerElement", void 0);
__decorate([
    query('slot')
], TabBarBase.prototype, "tabsSlot", void 0);
__decorate([
    observer(async function (value) {
        await this.updateComplete;
        // only provoke the foundation if we are out of sync with it, i.e.
        // ignore an foundation generated set.
        if (value !== this._previousActiveIndex) {
            this.mdcFoundation.activateTab(value);
        }
    }),
    property({ type: Number })
], TabBarBase.prototype, "activeIndex", void 0);

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const style$6 = css `.mdc-tab-bar{width:100%}.mdc-tab{height:48px}.mdc-tab--stacked{height:72px}:host{display:block}.mdc-tab-bar{flex:1}mwc-tab{--mdc-tab-height: 48px;--mdc-tab-stacked-height: 72px}`;

let TabBar = class TabBar extends TabBarBase {
};
TabBar.styles = style$6;
TabBar = __decorate([
    customElement('mwc-tab-bar')
], TabBar);

class IconButtonBase extends LitElement {
    constructor() {
        super(...arguments);
        this.disabled = false;
        this.icon = '';
        this.label = '';
    }
    render() {
        return html `<button
    .ripple="${ripple()}"
    class="mdc-icon-button"
    aria-label="${this.label || this.icon}"
    ?disabled="${this.disabled}">
    <i class="material-icons">${this.icon}</i>
    <slot></slot>
  </button>`;
    }
}
__decorate([
    property({ type: Boolean, reflect: true })
], IconButtonBase.prototype, "disabled", void 0);
__decorate([
    property({ type: String })
], IconButtonBase.prototype, "icon", void 0);
__decorate([
    property({ type: String })
], IconButtonBase.prototype, "label", void 0);

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const style$7 = css `.mdc-icon-button{display:inline-block;position:relative;box-sizing:border-box;border:none;outline:none;background-color:transparent;fill:currentColor;color:inherit;font-size:24px;text-decoration:none;cursor:pointer;user-select:none;width:48px;height:48px;padding:12px}.mdc-icon-button svg,.mdc-icon-button img{width:24px;height:24px}.mdc-icon-button:disabled{color:rgba(0,0,0,.38);color:var(--mdc-theme-text-disabled-on-light, rgba(0, 0, 0, 0.38))}.mdc-icon-button:disabled{cursor:default;pointer-events:none}.mdc-icon-button__icon{display:inline-block}.mdc-icon-button__icon.mdc-icon-button__icon--on{display:none}.mdc-icon-button--on .mdc-icon-button__icon{display:none}.mdc-icon-button--on .mdc-icon-button__icon.mdc-icon-button__icon--on{display:inline-block}@keyframes mdc-ripple-fg-radius-in{from{animation-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transform:translate(var(--mdc-ripple-fg-translate-start, 0)) scale(1)}to{transform:translate(var(--mdc-ripple-fg-translate-end, 0)) scale(var(--mdc-ripple-fg-scale, 1))}}@keyframes mdc-ripple-fg-opacity-in{from{animation-timing-function:linear;opacity:0}to{opacity:var(--mdc-ripple-fg-opacity, 0)}}@keyframes mdc-ripple-fg-opacity-out{from{animation-timing-function:linear;opacity:var(--mdc-ripple-fg-opacity, 0)}to{opacity:0}}.mdc-icon-button{--mdc-ripple-fg-size: 0;--mdc-ripple-left: 0;--mdc-ripple-top: 0;--mdc-ripple-fg-scale: 1;--mdc-ripple-fg-translate-end: 0;--mdc-ripple-fg-translate-start: 0;-webkit-tap-highlight-color:rgba(0,0,0,0)}.mdc-icon-button::before,.mdc-icon-button::after{position:absolute;border-radius:50%;opacity:0;pointer-events:none;content:""}.mdc-icon-button::before{transition:opacity 15ms linear,background-color 15ms linear;z-index:1}.mdc-icon-button.mdc-ripple-upgraded::before{transform:scale(var(--mdc-ripple-fg-scale, 1))}.mdc-icon-button.mdc-ripple-upgraded::after{top:0;left:0;transform:scale(0);transform-origin:center center}.mdc-icon-button.mdc-ripple-upgraded--unbounded::after{top:var(--mdc-ripple-top, 0);left:var(--mdc-ripple-left, 0)}.mdc-icon-button.mdc-ripple-upgraded--foreground-activation::after{animation:mdc-ripple-fg-radius-in 225ms forwards,mdc-ripple-fg-opacity-in 75ms forwards}.mdc-icon-button.mdc-ripple-upgraded--foreground-deactivation::after{animation:mdc-ripple-fg-opacity-out 150ms;transform:translate(var(--mdc-ripple-fg-translate-end, 0)) scale(var(--mdc-ripple-fg-scale, 1))}.mdc-icon-button::before,.mdc-icon-button::after{top:calc(50% - 50%);left:calc(50% - 50%);width:100%;height:100%}.mdc-icon-button.mdc-ripple-upgraded::before,.mdc-icon-button.mdc-ripple-upgraded::after{top:var(--mdc-ripple-top, calc(50% - 50%));left:var(--mdc-ripple-left, calc(50% - 50%));width:var(--mdc-ripple-fg-size, 100%);height:var(--mdc-ripple-fg-size, 100%)}.mdc-icon-button.mdc-ripple-upgraded::after{width:var(--mdc-ripple-fg-size, 100%);height:var(--mdc-ripple-fg-size, 100%)}.mdc-icon-button::before,.mdc-icon-button::after{background-color:#000}.mdc-icon-button:hover::before{opacity:.04}.mdc-icon-button.mdc-ripple-upgraded--background-focused::before,.mdc-icon-button:not(.mdc-ripple-upgraded):focus::before{transition-duration:75ms;opacity:.12}.mdc-icon-button:not(.mdc-ripple-upgraded)::after{transition:opacity 150ms linear}.mdc-icon-button:not(.mdc-ripple-upgraded):active::after{transition-duration:75ms;opacity:.12}.mdc-icon-button.mdc-ripple-upgraded{--mdc-ripple-fg-opacity: 0.12}.material-icons{font-family:var(--mdc-icon-font, "Material Icons");font-weight:normal;font-style:normal;font-size:var(--mdc-icon-size, 24px);line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-moz-osx-font-smoothing:grayscale;font-feature-settings:"liga"}:host{display:inline-block;outline:none}:host([disabled]){pointer-events:none}:host,.mdc-icon-button{vertical-align:top}.mdc-icon-button{width:var(--mdc-icon-button-size, 48px);height:var(--mdc-icon-button-size, 48px);padding:calc((var(--mdc-icon-button-size, 48px) - var(--mdc-icon-size, 24px)) / 2)}.mdc-icon-button>i{position:absolute;top:0;padding-top:inherit}.mdc-icon-button i,.mdc-icon-button svg,.mdc-icon-button img,.mdc-icon-button ::slotted(*){display:block;width:var(--mdc-icon-size, 24px);height:var(--mdc-icon-size, 24px)}.mdc-ripple-upgraded:focus::before,.mdc-ripple-upgraded:focus::after{background-color:currentColor;background-color:var(--mdc-theme-on-primary, currentColor);opacity:.12;opacity:var(--mdc-icon-button-ripple-opacity, 0.12)}`;

/**
@license
Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
let IconButton = class IconButton extends IconButtonBase {
};
IconButton.styles = style$7;
IconButton = __decorate([
    customElement('mwc-icon-button')
], IconButton);

const hasVideo = !!(
  navigator.mediaDevices && 
  navigator.mediaDevices.getUserMedia
);

// let videoStream;
let videoElement;
let animationFrame;

const videoConstraints = window.constraints = {
  video: {
    facingMode: { exact: 'environment' }
  },
  audio: false
};

const routes = [
  () => page('/'),
  () => page('/live'),
  () => page('/ocr')
];

const setTab = ($event) => {
  routes[$event.detail.index]();
};

const renderBooleanIcon = (bool) => {
  return bool ?
    html`<style>.success-icon { fill: var(--theme-success, green); } </style><svg style="width:24px;height:24px" viewBox="0 0 24 24"><path class="success-icon" d="M21,5L9,17L3.5,11.5L4.91,10.09L9,14.17L19.59,3.59L21,5M3,21V19H21V21H3Z" /></svg>` :
    html`<style>.fail-icon { fill: var(--theme-fail, orange); } </style><svg style="width:24px;height:24px" viewBox="0 0 24 24"><path class="fail-icon" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>` ;
};

const template = (content) => {
  return html`
<style>
  .content {
    height: calc(100vh - 48px);
    width: 100%;

    overflow: auto;

    background-color: #efefef;
  }

  .card {
    margin: 1rem;
    background-color: #fff;
    padding: 0.5rem;
    box-shadow: 0 3px 1px -2px rgba(0,0,0,.2),0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12);
  }
</style>
<mwc-tab-bar @MDCTabBar:activated=${setTab}>
  <mwc-tab label="Import"></mwc-tab>
  <mwc-tab label="Live Camera"></mwc-tab>
</mwc-tab-bar>

<div class="content">
  ${content}
</div>

`};

const videoTick = (canvas, video) => async () => {
  if (!video) {
    return;
  }
  
  const canvasContext = canvas.getContext('2d');

  canvas.height = video.videoHeight;
  canvas.width = video.videoWidth;

  canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);

  requestAnimationFrame(videoTick(canvas, video));
};

 const files = [];

const updateFile = ($event) => {
  console.dir($event.target.files);
  const filesArray = Array.from($event.target.files);
  files.push(...filesArray);

  console.dir(files);

  const collection = document.querySelector('#collection');

  for (let file of filesArray) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const type = file.type;
      switch(type) {
        case 'image/jpeg':
          const imageElement = document.createElement('img');
          imageElement.src = e.target.result;
          collection.appendChild(imageElement);
          break;
        case 'video/mp4':
          const videoElement = document.createElement('video');
          videoElement.src = e.target.result;
          videoElement.controls = true;
          collection.appendChild(videoElement);
          break;
      }
    };
    

    reader.readAsDataURL(file);
  }
};

const scanImage = async ($event) => {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  var ctx = canvas.getContext('2d');

  ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
  var dataURI = canvas.toDataURL('image/png');

  const container = document.createElement('div');
  const overlay = document.createElement('div');
  const loadingMessage = document.createElement('p');
  const image = document.createElement('img');
  const imageList = document.querySelector('.snapshots');

  container.classList.add('img-container');
  overlay.classList.add('image-overlay');
  loadingMessage.classList.add('overlay-message');
  loadingMessage.id = 'loading';

  loadingMessage.textContent = 'Processing...';
  image.src = dataURI;

  overlay.appendChild(loadingMessage);
  container.appendChild(image);
  container.appendChild(overlay);
  imageList.appendChild(container);

  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  processTimer = Date.now();
  const { data: { text } } = await worker.recognize(dataURI);
  
  const endTime = Date.now();
  const timeDiff = endTime - processTimer;
  processTimer = 0;
  

  const info = document.createElement('pre');
  info.style.padding = '0.5rem';
  info.style.margin = '0.5rem';
  info.style.background = 'var(--mdc-theme-background)';
  info.style.color = '#fff';

  info.textContent = `
  OCR Text Context:
    Processing Time: ${(timeDiff / 1000)} sec

  ${text}
  `;

  console.log('=== OCR DONE ===');
  console.dir(text);
  console.log('================');

  imageList.appendChild(info);
  container.removeChild(overlay);
  return dataURI;
};

let processTimer = 0;
const worker = Tesseract.createWorker({
  workerPath: 'https://unpkg.com/tesseract.js@v2.0.0/dist/worker.min.js',
  langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  corePath: 'https://unpkg.com/tesseract.js-core@v2.0.0/tesseract-core.wasm.js',
  logger: m => {
    console.clear();
    // console.table(m);
    if (m.status !== 'recognizing text') {
      return;
    }
    
    const line = m.progress ? Math.floor(m.progress * 20) : 0;
    const space = line < 20 ? (19 - line) : 0;

    const lineBuffer = new Array(line).fill('=');
    const spaceBuffer = new Array(space).fill(' ');

    console.log('Processing Image...');
    console.log(`[${lineBuffer.join('')}${ line < 19 ? '>' : ''}${spaceBuffer.join('')}]`);

  }
});

page('/', () => {
  const content = html`
  <style>
    .import-buttons {
      display: flex;
      flex-direction: column;
      margin-top:  1rem;
    }

    .selection {
      display: grid;
      grid-template-rows: 2rem 1.5rem;
      margin: 0.5rem;
    }

    .section h4 {
      height: 100%;
      line-height: 2rem;
      margin: auto 0;
    }

    #collection {
      opacity: 0;
      transition: opacity 500ms ease-out;
    }

    #collection:not(:empty) {
      opacity: 1;
    }

    #collection img {
      width: 100%;
    }

    #collection video {
      width: 100%;
    }
  </style>
  <div class="card import">
    <h3 class="import-header">Import</h3>
    <section class="import-buttons">
      <div class="selection">
        <h4>Upload Image from Phone</h4>
        <input type="file" accept="image/*" @change=${updateFile}>
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
      <div class="selection">
        <h4>Upload Image from Camera</h4>
        <!-- Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture -->
        <input type="file" accept="image/*" capture="environment" @change=${updateFile}>
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
      <div class="selection">
        <h4>Upload Video</h4>
        <input type="file" accept="video/mp4" capture="camcorder" @change=${updateFile}>
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
    </section>
  </div>

  <div class="card" id="collection"></div>
  `;

  render(template(content), document.body);
});

page('/live', async () => {
  let content;

  const renderWithErrors = (errorTemplates) => html`
  <style>
    .live {
      margin: 1rem auto;
      display: flex;
      flex-direction: column;

      padding: 1rem;
    }

    .live h3 {
      margin: auto auto 2rem auto;
    }

    .live h4 {
      margin-bottom: 0.5rem;
    }

    .requirement {
      display: flex;
    }

    .requirement p {
      margin-left: 1rem;
      line-height: 1.5rem;
    }


    .code {
      background: lightgray;
      color: #b57500;
    }
  </style>
  <div class="card live">
    <h3>Cannot Access Media Devices!</h3>

    <h4>Requirements</h4>
    <ul>
      <li class="requirement">
        ${renderBooleanIcon( window.location.protocol === 'https' || window.location.hostname === 'localhost' )}
        <p>Using HTTPS (or running on Localhost)</p>
      </li>
      <li class="requirement">
        ${renderBooleanIcon( !!navigator.mediaDevices )}
        <p>Browser access to <span class="code">navigator.mediaDevices</span></p>
      </li>
      ${errorTemplates}
    </ul>
  </div>`;

  const stopRecording = () => {
    cancelAnimationFrame(animationFrame);

    if (videoElement && videoElement.srcObject) {
      for (const i of videoElement.srcObject.getTracks()) {
        i.stop();
      }
    }

    console.log('video active', videoElement.srcObject.active);

    videoElement.srcObject = null;
    // videoElement = null;
  };

  if (hasVideo) {

    let canvas;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      videoElement = document.createElement('video');
      videoElement.srcObject = videoStream;
      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('hidden', '');

      canvas = document.createElement('canvas');

      animationFrame = requestAnimationFrame(videoTick(canvas, videoElement));
    } catch (err) {
      console.error(err);
      const errorTemplate = html`
        <li class="requirement">
          <svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="red" d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" /></svg>
          <p> Error: ${err.message}</p>
        </li>
      `;
      render(template(renderWithErrors(errorTemplate)), document.body);
      return;
    }

    const pauseVideo = () => {
      videoElement.pause();
    };

    const startVideo = async () => {
      console.dir(videoElement);

      if (videoElement.srcObject) {
        videoElement.play();
        return;
      }

      const videoStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      videoElement = document.querySelector('video');
    

      if (!videoElement) {
        videoElement = document.createElement('video');
      }

      videoElement.srcObject = videoStream;
      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('hidden', '');

      canvas = document.createElement('canvas');

      animationFrame = requestAnimationFrame(videoTick(canvas, videoElement));
    };

    const createSnap = async ($event) => {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      var ctx = canvas.getContext('2d');

      ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
      var dataURI = canvas.toDataURL('image/png');

      const image = document.createElement('img');
      const imageList = document.querySelector('.snapshots');

      image.src = dataURI;

      imageList.appendChild(image);
      return dataURI;
    };

    content = html`
    <style>
      .live, .snapshots {
        max-width: 40rem;
        min-width: 200px;
        margin: 1rem auto;
      }

      @media only screen and (max-width: 40rem) {
        .live, .snapshots {
          margin: 1rem 0.5rem;
        }
      }

      video {
        width: 100%;
      }

      canvas {
        width: 100%;
      }

      .live .actions {

        margin-top: 1rem;

        display: flex;
        justify-content: flex-end;
      }

      .actions mwc-icon-button {
        color: var(--mdc-theme-primary);
      }

      .snapshots .img-container {
        width: 100%;
        padding: 0.5rem;
        position: relative;
      }

      .img-container img {
        width: 100%
      }

      .image-overlay {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: rgba(0,0,0,0.75);

        display: flex;
        justify-content: center;
        align-items: center;
      }

      .overlay-message {
        color: #fff;
      }

    </style>
    <div class="card live">
      ${videoElement}
      ${canvas}
      <div class="actions">
        <mwc-icon-button icon="format_shapes"  @click=${scanImage}></mwc-icon-button>
        <mwc-icon-button icon="add_a_photo"  @click=${createSnap}></mwc-icon-button>
        <mwc-icon-button icon="stop"  @click=${stopRecording}></mwc-icon-button>
        <mwc-icon-button icon="pause"  @click=${pauseVideo}></mwc-icon-button>
        <mwc-icon-button icon="play_arrow"  @click=${startVideo}></mwc-icon-button>
      </div>
    </div>
    <div class="card snapshots">
      <h3>Snapshots</h3>

    </div>
    `;
  } else {
   content = renderWithErrors();
  }

  render(template(content), document.body);
});

page('*', () => {

  // render(template('404', content), document.body);
  routes[0]();
});

page();
//# sourceMappingURL=index.js.map
