---
layout: post
title: Building a reactive frontend
image: reactive.png
description: Constraints precluded using any of the available frameworks at that time, but we did end up borrowing some ideas and unintentionally & iteratively ended up building our own little reactive architecture.
tags: [ javascript ]
---

What do you do when you want a reactive rendering frontend in an environment with constraints that preclude the use of any modern framework?

You build your own, right? Right?

<!-- more -->


# Setting the scene

I doubt that there's any decades-old software project that isn't struggling to keep up
with modern best practices in at least some areas, and Wikipedia certainly is no different.

Adopting, or even experimenting with, the latest bleeding-edge technologies is nigh
impossible with large swaths of legacy code.
Migrating all of it is a massive undertaking; a never-ending one even, if you keep chasing
the latest developments.
Not migrating, on the other hand, is also not an option once you chose to adopt a new
technology or paradigm, as you'll soon find yourself reimplementing (and deviating from)
key pieces of infrastructure, with an ever-increasing payload.

I think it's quite clear that projects with a lot of history can't just jump on every fad.
Still, that doesn't mean one must just accept and forever be stuck in the old ways.

When starting [a new, frontend-heavy project](https://commons.wikimedia.org/wiki/Commons:Structured_data),
we could've stayed with the existing status-quo (and almost did), but there was a strong
desire for a more modern approach.
This, however, was is the situation we were in:

- [broad browser support](https://www.mediawiki.org/wiki/Compatibility#Browsers);
  inability to use state-of-the-art JavaScript features
- [no build step](https://phabricator.wikimedia.org/T199004)
- a huge existing [UI library](https://www.mediawiki.org/wiki/OOUI)
- on top of a proprietary [object-oriented JavaScript library](https://www.mediawiki.org/wiki/OOjs)

These constraints precluded using any of the available frameworks at that time.
In this case, building our own implementation was not a manifestation of the
[NIH syndrome](https://en.wikipedia.org/wiki/Not_invented_here), but we did end up
borrowing some ideas and unintentionally & iteratively ended up building our own little
reactive architecture.
An imperfect, incomplete and inefficient one, if we're being honest (this was a mere
minimum-effort side effect, and you really should use an intentionally developed
framework if given the chance), but a very interesting experience nonetheless.

Here's our journey:

*Note: code examples are not using modern JavaScript features and rely heavily on jQuery.
Things could be cleaner in other circumstances.*

<!-- ads -->


# Step 1: untangling presentation from data

Constructing nodes in JavaScript and keeping track of them, updating their values as
needed and repositioning them within the DOM can be painful.
Changing one value may have a cascading effect that affects a ton of other nodes.

Tick a checkbox here, and ten fields over there become irrelevant.
Their data should be disregarded and should be taken out of view.
Other elements may need to be updated as well - repositioned, changed text, ...

Why not simply use a canonical template, assign the data and let it re-render?
Something as simple as this:

**component.js**

```js
/**
 * @constructor
 * @param {jQuery} $container
 * @param {string} template
 */
var Component = function ( $container, template ) {
    this.$container = $container;
    this.template = template;
};

/**
 * @param {Object} data
 */
Component.prototype.render = function ( data ) {
    $output = $( $.parseHTML( Mustache.render( this.template, data ) ) );
    this.$container.empty().append( $output );
};
```

*Note: above example is using [mustache.js](https://github.com/janl/mustache.js/),
an open source library for rendering [mustache templates](http://mustache.github.io/)
in JavaScript.*

**app.js**

```js
var myThing = new Component(
    $( document.body ),
    '<p>Hello {{ '{{' }}#name}}{{ '{{' }}name}}{{ '{{' }}/name}}{{ '{{' }}^name}}unknown{{ '{{' }}/name}}</p>'
);
myThing.render( { name: 'Matthias' } );
```

Easy, right?
Updating the UI has now become as easy as assigning new variables and replacing the output.

Well&hellip;

Purely text-based representations of the output (i.e. templates) are very limiting.
We're about to find out just why modern frameworks use a virtual DOM instead.


# Step 2: making rendered content interactive

The content that we've obtained by parsing our data into a template is not interactive:
there is no way to declare callback handlers to clicks on any button we'd render!

But we can do 2 things:

1. support `on<event>` attributes to allow assigning callback functions as template data
2. support assigning Node or jQuery objects to the data, where handlers are already attached

The first solution is the cleanest, but it isn't possible to assign an anonymous function
into a template.
However, we can assign that callback to a named script, and then reference that script, by
name, from the template.
We just need to make our template rendering code glue these things together.

Since we now have a solution for this problem, we could choose to not implement #2,
but let's discuss it anyway.
Much like #1, we can't simply parse a JavaScript object into a template.
But we can glue things together by assigning a placeholder, and then substituting it with
the real JavaScript/jQuery node later one, after the template has completed rendering.

Let's make a few changes to `component.js` to support both:

**component.js**

```js
/**
 * This will return an array of relevant Node nodes from
 * the given input variable, which could be of type Node or
 * jQuery.
 *
 * @param {Node|jQuery}
 * @return {Array} Array of DOM node(s)
 */
Component.prototype.getNode = function ( variable ) {
      // check if `instanceof Node` (except that wouldn't work headless;
      // ref `Node` missing)
      if ( typeof variable === 'object' && typeof variable.nodeType === 'number' ) {
        return [ variable ];
      } else if ( variable instanceof $ ) {
        return variable.toArray();
      }
      throw new Error( 'Not a node-like variable' );
};

/**
 * @param {Object} data
 */
Component.prototype.render = function ( data ) {
    var self = this,
        $container = $( '<div>' ),
        handlers = {},
        dom = [],
        random, transformNodes, i, $result;

    transformNodes = function ( d ) {
        var keys = Object.keys( d ),
            result = new d.constructor(),
            key, j, node, $stub;

        for ( j = 0; j < keys.length; j++ ) {
            key = keys[ j ];

            if ( d[ key ] instanceof Function ) {
                // on<event> handlers can't be parsed into the HTML, so we'll
                // assign them a random name, which will point to a place where
                // the actual handler will be
                random = 'fn_' + Math.random().toString( 36 ).substring( 2 );
                handlers[ random ] = d[ key ];
                result[ key ] = 'return $( "#' + random + '" ).data( "func" )( event )';
            } else if (
                // check if array or object literal, in which case
                // we'll want to go recursive
                d[ key ] instanceof Array ||
                (
                    d[ key ] instanceof Object &&
                    Object.getPrototypeOf( d[ key ] ) === Object.prototype
                )
            ) {
                result[ key ] = transformNodes( d[ key ] );
            } else {
                try {
                    // try to fetch DOM node from this data, for which
                    // we'll want to parse a placeholder into the template
                    node = self.getNode( d[ key ] );
                    $stub = $( '<div>' ).addClass( 'tpl-dom-' + dom.length );
                    dom.push( node );
                    result[ key ] = $stub[ 0 ].outerHTML;
                } catch ( e ) {
                    // fall through, leaving data unaltered
                    result[ key ] = d[ key ];
                }
            }
        }

        return result;
    };

    data = transformNodes( data );

    // render the template, using placeholder HTML for DOM nodes
    $result = $( $.parseHTML( Mustache.render( this.template, data ) ) );

    // ... and replace placeholders with actual nodes now
    $container.append( $result );
    for ( i = 0; i < dom.length; i++ ) {
        $container.find( '.tpl-dom-' + i ).replaceWith( dom[ i ] );
    }

    // ... and add nodes with the on<event> callback handlers
    Object.keys( handlers ).forEach( function ( randomId ) {
        $( '<script>' )
            .attr( 'id', randomId )
            .data( 'func', handlers[ randomId ] )
            .appendTo( $container );
    } );

    // update visible container with new nodes
    this.$container.empty().append( $container.children() );
};

// ...
// remaining code carried over from earlier iterations of component.js
// ...
```

Our UI is now driven by data, and we can make it interactive.
We're done here, right?

Well&hellip;

<!-- ads -->


# Step 3: Handling event race conditions

Let's imagine having a simple form with a couple of input fields and a couple of handlers:

- we have a form with an `onreset` handler that clears the entire form
- we have a file input for an avatar, with an on `onchange` event handler that:
  - uploads the selected file,
  - does some image recognition to avoid inappropriate content,
  - rescales/optimizes it, and
  - returns a link to the thumbnail

Let's imagine a scenario where a user has selected their image, which kicks of an
asynchronous API call.
Our user is on a really slow connection, so it takes a couple of seconds for the response
to come back.
For some reason, they figure they'd rather start over and hit that reset button.

In this scenario, our `onreset` handler is executed while our file's `onchange` handler is
still running.
Our form will be reset and any data already entered will be lost &hellip;
**And then we finally get that in-flight API response**, the remainder of the `onchange`
code runs, and it renders an avatar in a now otherwise empty form.

Instead of allowing `render()` to be called and executed immediately, we're going to have
to make sure that there are no other pending operations.
Let's introduce a layer to handle synchronicity:

*You can just skip past the code; I'll recap what's happening below.*

**component.js**

```js
/**
 * @constructor
 * @param {jQuery} $container
 * @param {string} template
 */
var Component = function ( $container, template ) {
    this.$container = $container;
    this.template = template;
    this.state = {};
    this.pendingState = {};
    this.renderPromise = $.Deferred().resolve( this.$container );
};

/**
 * Called after state has been modified, and before rerendering.
 * Return an object (or a promise resolving to an object) to be
 * parsed into the template.
 *
 * @protected
 * @param {Object}
 * @return {Object|jQuery.Promise<Object>}
 */
Component.prototype.getTemplateData = function ( state ) {
    return state;
};

/**
 * Accepts a `{ key: value }` map (state) whose data will be
 * added to, *not replace*, the current state.
 *
 * E.g. given current this.state is `{ a: 'one' }`, and an
 * argument `{ b: 'two' }` is passed to this method, that'll
 * result in a state of `{ a: 'one', b: 'two' }`.
 *
 * After the state is changed, a rerender will be initiated,
 * which can further be controlled via `shouldRerender` and
 * `getTemplateData`.
 *
 * This method returns a promise that will not resolve until
 * rerendering (if needed) is complete. The promise will
 * resolve with the rendered nodes.
 *
 * @param {Object} state
 * @return {jQuery.Promise}
 */
Component.prototype.setState = function ( state ) {
    var deferred = $.Deferred();

    // add the newest state changes - expanding on previous (if any)
    // changes that have no yet been rendered (because previous render
    // was still happening, possibly)
    this.pendingState = $.extend( {}, this.pendingState, state );

    // always chain renders on top of the previous one, so a new
    // render does not conflict with an in-progress one
    this.renderPromise = this.renderPromise
        .then( function () {
            var previousState = $.extend( {}, self.state ),
                hasChanges = Object.keys( self.pendingState ).some( function ( key ) {
                    return (
                        !( key in self.state ) ||
                        self.state[ key ] !== self.pendingState[ key ]
                    );
                } );

            self.state = $.extend( {}, self.state, self.pendingState );
            self.pendingState = {};

            if ( !hasChanges ) {
                // if there are no changes, the existing render is still valid
                return;
            }

            return $.Deferred().resolve( self.state ).promise()
                // now get all data needed for the template, some of which may
                // be derived from state (computed directly, or async)
                .then( self.getTemplateData.bind( self ) )
                // finally, with all data at hand, let's render a new version
                .then( self.render.bind( self ) )
        } )
        .catch( function ( e ) {
            // something somewhere in the render process failed, but that's ok
            // we won't handle this except for just catching it & turning the
            // promise back into a thenable state, so that follow-up renders
            // can still proceed

            console.warn( e );

            return $();
        } );
    return this.renderPromise;
};

// ...
// remaining code carried over from earlier iterations of component.js
// ...
```

What has changed?

The actual rendering has mostly remained the same, but it's no longer meant to be invoked directly.

Instead, we now have:

1. `setState()`
2. `getTemplateData()`

The first is pretty straightforward: instead of calling `render()` directly with all
relevant data, we're now calling `setState()`.
It doesn't necessarily need to hold all the data required by the template, though - some of
that can now be moved into our other new function.

`getTemplateData()` is to be implemented by the specific component, and transforms `state`
into the data that will be parsed into the template.
It can do asynchronous work (like grabbing the url to an avatar it needs to render) and
return the data within a [Promise](/how-javascript-promises-work/).

In its most simple form, usage is now going to look something like this:

**app.js**

```js
var myThing = new Component(
    $( document.body ),
    '<p>Hello {{ '{{' }}#name}}{{ '{{' }}name}}{{ '{{' }}/name}}{{ '{{' }}^name}}unknown{{ '{{' }}/name}}</p>'
);
myThing.setState( { name: 'Matthias' } );
```

Or something a little more complex:

**complex-app.js**

```js
var Implementation = function () {
    var template = '<p>Hello {{ '{{' }}#name}}{{ '{{' }}name}}{{ '{{' }}/name}}{{ '{{' }}^name}}unknown{{ '{{' }}/name}}</p>' +
        '{{ '{{' }}#thumbnail}}<img src="{{ '{{' }}thumbnail}}" />{{ '{{' }}/thumbnail}}';
    Component.call( this, '<p>{derivative}{name}!</p>' );
};
Implementation.prototype = Component.prototype;
Implementation.prototype.constructor = Implementation;

Implementation.prototype.getTemplateData = function ( state ) {
    if ( !state.name ) {
        return {};
    }

    // execute an API request to fetch the thumbnail URL,
    // then resolve with data required for template
    return fetch( '/api/thumbnail/' + state.name )
        .then( function ( response ) {
            return {
                name: state.name,
                thumbnail: response.thumbnail
            }
        } );
};

var myThing = new Implementation();
myThing.setState( { name: 'Matthias' } );
```

`setState()` stacks an awful lot of Promises to guarantee that will prevent race conditions
from happening.
When a new state is assigned, a new render will kick off, and follow-up changes to the state
will not cause a re-render until any in-flight rendering has completed.

We have an architecture in place to reliably and consistently render an interactive UI.
Surely, this must be it?

Well&hellip;


# Step 4: Preserving DOM node state

Let us now imagine we're building a form and adding some validation.
We're going to make sure that any phone number entered follows an expected format,
or otherwise show a warning.

We can do all of that:

- we render the form,
- with an `onblur` event handler for that field,
- which validates the input,
- calls `setState()` with an error message,
- which triggers a new render, with that error message

Upon execution, we find that our new render has that error message, but&hellip;
**Fields are blank, all existing input is gone!**
It just replaced all our existing nodes with a bunch of newly created, empty nodes.

This means that we're:

- losing all the input in the node that were being displayed pre-rerender
- we also lose focus state (since the element that was focused has been replaced with another)
- and we may have lost scroll position, because we just removed a bunch of content before
  replacing it with a (potentially different) version

We can't just remove nodes willy-nilly.

Many of the nodes that users can interact with possess some internal state/context,
and we need to figure out how to preserve that across different renders.
We need to hold on to those nodes currently in the DOM; we can't just throw them
out and replace them with brand-new copies.
But that means figuring out which to keep, and how to merge it with other content
that needs to be added or deleted.

Below is a massive amount of code that will do just that:

**component.js**
```js
/**
 * @param {Object} data
 * @return {jQuery}
 */
Component.prototype.renderInternal = function ( data ) {
    // ...
    // this method contains the body of Component.prototype.render in our previous step;
    // except that, instead of updating this.$container in the last line, it'll just
    // return the $container.children() instead
    // I've simply split this out in order to allow focusing on the changes/additions
    // ...
};

/**
 * Returns a promise that will resolve with the jQuery $element
 * as soon as it is done rendering.
 *
 * @private
 * @return {jQuery.Promise}
 */
Component.prototype.render = function ( data ) {
    var self = this;

    return this.renderPromise
        .then( function () {
            var scrollTop = $( window ).scrollTop(),
                extracted, nodesToPreserve, $rendered;

            // let's keep track of nodes currently rendered that have some context
            // (e.g. has focus or value has changed), to ensure we don't replace those
            // with new versions post-render
            nodesToPreserve = self.extractDOMNodesWithContext(
                self.$container.get( 0 )
            );

            // `data` may also contain nodes that are currently displayed;
            // if we parse them into the template, that means they'll be detached from
            // their current (visible on screen) position
            extracted = this.extractParamDOMNodes( data );
            nodesToPreserve = nodesToPreserve.concat( extracted.nodes );

            // use the sanitized data - with in-use nodes replaced by clones - to render
            // a new version
            $rendered = self.renderInternal( extracted.data );

            // we now have:
            // - self.$container: contains the previously rendered version, and still
            //   holds a couple of nodes that we will want to keep in the new version
            // - $rendered: is the newly rendered version for the current state, but
            //   a few nodes are missing
            // - nodesToPreserve: the aray of nodes that we will want in the new
            //   version, but can't detach from or move within self.$container (they
            //   may lose state)
            // in short: we'll have to remove all nodes from self.$container that are
            // not part of nodesToPreserve, and insert all the new nodes (from
            // $rendered) in all the right places into self.$container
            self.$container = $( self.rebuildDOM(
                self.$container.get( 0 ),
                $( self.$container.get( 0 ).cloneNode( false ) )
                    .append( $rendered )
                    .get( 0 ),
                nodesToPreserve
            ) );

            // after having rebuilt the DOM and things might have shifted up & down,
            // let's make sure we're back at the scroll position we were before
            $( window ).scrollTop( scrollTop );
        } )
        .catch( function ( e ) {
            // something somewhere in the render process failed, but that's ok
            // we won't handle this except for just catching it & turning the
            // promise back into a thenable state, so that follow-up renders
            // can still proceed

            // eslint-disable-next-line no-console
            console.warn( e );

            return $();
        } );
};

/**
 * This method will take 2 jQuery collections: $old and $new.
 * $old will be populated with nodes from $new, except for nodes that match,
 * those will be left as they were - only new changes (additions or removals)
 * will be taken from $new.
 *
 * This is done to preserve existing nodes as much as possible, because if they
 * get replaced/attached/detached/..., they'd otherwise lose context (e.g. focus
 * state)
 *
 * @private
 * @param {Node} oldContainer
 * @param {Node} newContainer
 * @param {Node[]} [preservedNodes]
 * @return {Node}
 */
Component.prototype.rebuildDOM = function ( oldContainer, newContainer, preservedNodes ) {
    var newChildrenArray = [].slice.call( newContainer.childNodes ),
        oldChildrenArray = [].slice.call( oldContainer.childNodes ),
        matchedNodes = this.matchNodes(
            newChildrenArray,
            oldChildrenArray,
            preservedNodes
        ),
        newNode,
        oldNode,
        newIndex,
        currentIndex,
        i;

    for ( newIndex = 0; newIndex < newChildrenArray.length; newIndex++ ) {
        newNode = newChildrenArray[ newIndex ];
        oldNode = matchedNodes[ newIndex ];

        if ( oldNode ) {
            currentIndex = [].slice.call( oldContainer.childNodes ).indexOf( oldNode );
        } else {
            currentIndex = -1;
        }

        // step 1: figure out the position of the new nodes in the old DOM,
        // insert it at the correct position (if new) or detach existing
        // nodes that now no longer exist before the new node
        if ( currentIndex < 0 ) {
            // if new node did not previously exist, insert it at this index
            if ( oldContainer.childNodes.length === 0 ) {
                oldContainer.appendChild( newNode );
            } else {
                oldContainer.insertBefore(
                    newNode,
                    oldContainer.childNodes[ newIndex ]
                );
            }
            // it's a new node; there's no merging left to be done with an old
            // node, so let's bail early!
            continue;
        } else if ( currentIndex > newIndex ) {
            // if node already exists, but further away in DOM, detach everything
            // in between (could be old nodes that will end up removed;
            // could be old nodes that we'll still need elsewhere later on)
            [].slice.call( oldContainer.childNodes, newIndex, currentIndex )
                .forEach( function ( node ) {
                    node.parentNode.removeChild( node );
                } );
        }

        // step 2: if we have a new node that corresponds with an existing one,
        // figure out what to do with it: this could mean keeping either the old
        // or new node (if it's one to be preserved - i.e. we're manipulating the
        // node directly elsewhere in JS), or trying to apply properties of the
        // new node to the old node
        if ( preservedNodes.indexOf( oldNode ) >= 0 ) {
            // oldNode is a node that needs to be preserved: it was a DOM node
            // directly assigned as a variable to the template and it may have
            // context that we must not lose (event listeners, focus state...)
            // leave this node alone!
            preservedNodes.splice( preservedNodes.indexOf( oldNode ), 1 );
        } else if ( preservedNodes.indexOf( newNode ) >= 0 ) {
            // same as above: it was assigned to the template, but it did not
            // yet exist in the old render (a very similar node might exist,
            // but not this exact one, which might have other event handlers
            // bound or so)
            // we must not try to merge old & new nodes, this is the exact
            // right node - it was passed into the template as such
            oldNode.parentNode.replaceChild( newNode, oldNode );
            preservedNodes.splice( preservedNodes.indexOf( oldNode ), 1 );
        } else if ( this.isEqualNodeAndProps( oldNode, newNode ) ) {
            // this node is identical, there's nothing we need to do here,
            // we can simply keep our old node
        } else if ( oldNode.tagName && oldNode.tagName === newNode.tagName ) {
            // this is for all other nodes, that were built from the HTML in
            // the template
            // we don't want to simply swap out these nodes, because then we
            // could lose context (e.g. focus state or input values), so let's
            // just try to apply the new characteristics on to the existing nodes
            for ( i = 0; i < oldNode.attributes.length; i++ ) {
                oldNode.removeAttribute( oldNode.attributes[ i ].name );
            }
            for ( i = 0; i < newNode.attributes.length; i++ ) {
                oldNode.setAttribute(
                    newNode.attributes[ i ].name,
                    newNode.attributes[ i ].value
                );
            }

            // rebuild children as needed, recursively
            oldNode = this.rebuildDOM( oldNode, newNode, preservedNodes );
        } else {
            oldNode.parentNode.replaceChild( newNode, oldNode );
        }
    }

    // remove leftover nodes, returning only the relevant ones
    [].slice.call( oldContainer.childNodes, newChildrenArray.length )
        .forEach( function ( node ) {
            node.parentNode.removeChild( node );
        } );
    return oldContainer;
};

/**
 * This will extract DOM nodes (or their OOUI/jQuery representation) and
 * substitute them for a clone, to prevent those nodes from being detached from
 * their current position in DOM (which would make them lose focus)
 *
 * @private
 * @param {Object} data
 * @return {Object} Object with keys `nodes` (array of extracted nodes) and
 *   `data` (object with the values and clones of extracted nodes)
 */
Component.prototype.extractParamDOMNodes = function ( data ) {
    var self = this,
        transformed,
        getNode,
        transformNodes;

    getNode = function ( variable ) {
        // check if `instanceof Node` (except that wouldn't work headless;
        // ref `Node` missing)
        if ( typeof variable === 'object' && typeof variable.nodeType === 'number' ) {
            return [ variable ];
        } else if ( variable instanceof $ ) {
            return variable.toArray();
        }
        throw new Error( 'Not a node-like variable' );
    };

    transformNodes = function ( d ) {
        var keys = Object.keys( d ),
            result = new d.constructor(),
            originals = [],
            key, i, j, recursive, nodes, node;

        for ( i = 0; i < keys.length; i++ ) {
            key = keys[ i ];

            if (
                // check if array or object literal, in which case
                // we'll want to go recursive
                d[ key ] instanceof Array ||
                (
                    d[ key ] instanceof Object &&
                    Object.getPrototypeOf( d[ key ] ) === Object.prototype
                )
            ) {
                recursive = transformNodes( d[ key ] );
                result[ key ] = recursive.data;
                originals = originals.concat( recursive.nodes );
            } else {
                try {
                    // clone the node we might want to parse into the template;
                    // it'd be parsed into the template just fine unaltered, but
                    // it'd mean that the node would get detached from its current
                    // place in DOM - instead, we'll parse a clone in there, and
                    // then our post-render processing (`rebuildDOM`) will recognize
                    // these nodes are the same and use the original one instead
                    nodes = getNode( d[ key ] );
                    result[ key ] = [];
                    for ( j = 0; j < nodes.length; j++ ) {
                        node = nodes[ j ];
                        originals.push( node );
                        // only clone nodes that are currently rendered - others
                        // should actually render the real nodes (not clones)
                        if ( self.$element.find( node ).length > 0 ) {
                            result[ key ].push( node.cloneNode( true ) );
                        } else {
                            result[ key ].push( node );
                        }
                    }
                } catch ( e ) {
                    // fall through, leaving data unaltered
                    result[ key ] = d[ key ];
                }
            }
        }

        return { data: result, nodes: originals };
    };

    return transformNodes( data );
};

/**
 * @private
 * @param {Node} node
 * @return {Array}
 */
Component.prototype.extractDOMNodesWithContext = function ( node ) {
    return [].concat(
        // the active node must be preserved, so that we don't lose e.g. focus
        $( node )
            .find( document.activeElement )
            .addBack( document.activeElement )
            .get(),
        // if this node or one of its children is a form element whose value has
        // been altered compared to what it rendered with initially, it matters
        $( node )
            .find( 'input:not([type="checkbox"]):not([type="radio"]), textarea' )
            .addBack( 'input:not([type="checkbox"]):not([type="radio"]), textarea' )
            .filter( function ( i, n ) {
                return n.value !== n.defaultValue;
            } )
            .get(),
        $( node )
            .find( 'input[type="checkbox"], input[type="radio"]' )
            .addBack( 'input[type="checkbox"], input[type="radio"]' )
            .filter( function ( i, n ) {
                return n.checked !== n.defaultChecked;
            } )
            .get(),
        $( node )
            .find( 'option' )
            .addBack( 'option' )
            .filter( function ( i, n ) {
                return n.selected !== n.defaultSelected;
            } )
            .get()
    );
};

/**
 * Given 2 collection of nodes (`one` and `two`), this will return
 * an array of the same size as `one`, where the indices correspond
 * to the nodes in `one`, and the values are the best matching/most
 * similar node in `two`.
 *
 * @private
 * @param {Node[]} one
 * @param {Node[]} two
 * @param {Node[]} [preserve]
 * @return {Node[]}
 */
Component.prototype.matchNodes = function ( one, two, preserve ) {
    var self = this,
        isRelevantNode = function ( node ) {
            return node.tagName && (
                // this node matters if it or one of its children is one to be preserved
                ( preserve || [] ).some( function ( p ) {
                    return $( node ).find( p ).addBack( p ).length > 0;
                } ) ||
                self.extractDOMNodesWithContext( node ).length > 0
            );
        },
        getNumberOfEqualChildren = function ( needle, haystack ) {
            return haystack.map( function ( target ) {
                if ( self.getNumberOfEqualNodes( [ needle ], [ target ] ) === 0 ) {
                    return 0;
                }
                return self.getNumberOfEqualNodes(
                    [].slice.call( needle.children ),
                    [].slice.call( target.children )
                );
            } );
        },
        filterRelevantNodes = function ( needle, haystack ) {
            return haystack.filter( function ( target ) {
                return (
                    target.tagName &&
                    // exclude nodes where neither this or the other node are relevant
                    ( isRelevantNode( needle ) || isRelevantNode( target ) )
                );
            } );
        },
        filterByMostSimilar = function ( needle, haystack ) {
            var numbers = getNumberOfEqualChildren( needle, haystack ),
                best = Math.max.apply( Math, numbers.concat( 0 ) );

            return haystack.filter( function ( target, i ) {
                return numbers[ i ] === best;
            } );
        },
        filterByLeastDissimilar = function ( needle, haystack ) {
            var numbers = getNumberOfEqualChildren( needle, haystack )
                .map( function ( number, i ) {
                    return Math.max(
                        needle.children.length,
                        haystack[ i ].children.length
                    ) - number;
                } ),
                best = Math.min.apply( Math, numbers.concat( needle.children.length ) );

            return haystack.filter( function ( target, i ) {
                return numbers[ i ] === best;
            } );
        };

    return one.reduce( function ( result, node, index, arr ) {
        var other = [].concat( two ),
            remaining = arr.slice( index ).filter( function ( target ) {
                return target.tagName !== undefined;
            } ),
            i;

        // don't bother matching non-nodes
        if ( node.tagName === undefined ) {
            return result.concat( undefined );
        }

        other = filterRelevantNodes( node, other ).filter( function ( target ) {
            // exclude nodes that we've already paired to a previous node
            return result.indexOf( target ) < 0;
        } );

        // find the first unmatched relevant equal node (if any)
        for ( i = 0; i < other.length; i++ ) {
            if ( node.isEqualNode( other[ i ] ) ) {
                return result.concat( other[ i ] );
            }
        }

        // narrow it down to nodes with the most matching children
        other = filterByMostSimilar( node, other );

        // narrow down nodes by cross-referencing similarities from the
        // other side: a future node might actually be a better match...
        other = other.filter( function ( target ) {
            return filterByMostSimilar( target, remaining ).indexOf( node ) >= 0;
        } );

        // narrow it down further to the one(s) with the minimum amount
        // of different children
        other = filterByLeastDissimilar( node, other );

        // narrow down nodes by cross-referencing dissimilarities from the
        // other side: a future node might actually be a better match...
        other = other.filter( function ( target ) {
            return filterByLeastDissimilar( target, remaining ).indexOf( node ) >= 0;
        } );

        // return the first of whatever is left
        return result.concat( other.shift() );
    }, [] );
};

/**
 * Similar to Node.isEqualNode, except that it will also compare live properties.
 *
 * @private
 * @param {Node} one
 * @param {Node} two
 * @return {boolean}
 */
Component.prototype.isEqualNodeAndProps = function ( one, two ) {
    var self = this,
        property, descriptor;

    if ( !one.isEqualNode( two ) ) {
        return false;
    }

    // isEqualNode doesn't compare props, so an input field with some manual
    // text input (where `value` prop is different from the `value` attribute,
    // because the one doesn't sync back when it changes) could be considered
    // equal even if they have different values - hence the added value compare
    for ( property in one.constructor.prototype ) {
        // some properties or getters are auto computed and can't be set
        // comparing these (e.g. `webkitEntries`) makes no sense
        descriptor = Object.getOwnPropertyDescriptor(
            one.constructor.prototype,
            property
        );
        if (
            descriptor === undefined ||
            !descriptor.writable ||
            descriptor.set === undefined
        ) {
            continue;
        }

        // if properties don't match, these nodes are not equal...
        if ( one[ property ] !== two[ property ] ) {
            return false;
        }
    }

    // nodes are the same, but there may be similar prop differences in children...
    return !one.children || ![].slice.call( one.children ).some( function ( child, i ) {
        return !self.isEqualNodeAndProps( child, two.children[ i ] );
    } );
};

/**
 * Find the amount of equal nodes, based on the nodes themselves being
 * `.isEqualNode`, or their children (or theirs, recursively) matching.
 *
 * @private
 * @param {Node[]} one
 * @param {Node[]} two
 * @return {number}
 */
Component.prototype.getNumberOfEqualNodes = function ( one, two ) {
    var self = this;

    return one
        .map( function ( twoNode ) {
            return two.some( function ( oneNode ) {
                var nodeOneChildren,
                    nodeTwoChildren;

                if ( oneNode.tagName !== twoNode.tagName ) {
                    return false;
                }

                if ( oneNode.id || twoNode.id ) {
                    // nodes that have an id must match
                    return oneNode.id === twoNode.id;
                }

                if (
                    oneNode.getAttribute( 'data-key' ) ||
                    twoNode.getAttribute( 'data-key' )
                ) {
                    // nodes that have a data-key attribute must match
                    // (similar to id, but doesn't have to be unique
                    // on the page, as long as it's unique in the template)
                    return oneNode.getAttribute( 'data-key' ) ===
                        twoNode.getAttribute( 'data-key' );
                }

                if ( oneNode.isEqualNode( twoNode ) ) {
                    // node with exact same characteristics = match!
                    return true;
                }

                // node is not a perfect match - let's run their children
                // through the same set of criteria
                nodeOneChildren = [].slice.call( oneNode.children );
                nodeTwoChildren = [].slice.call( twoNode.children );
                return self.getNumberOfEqualNodes(
                    nodeOneChildren,
                    nodeTwoChildren
                ) > 0;
            } );
        } )
        .reduce( function ( sum, isEqual ) {
            return sum + ( isEqual ? 1 : 0 );
        }, 0 );
};

// ...
// remaining code carried over from earlier iterations of component.js
// ...
```

This is where we left things: we ended up with a convenient little implementation that
allowed for rapidly building a reactive interface with the ability to mix it with the
existing libraries, within the constraints of our environment.
The last step isn't particularly efficient, but it never can be without drastic changes.

At this point, it is becoming clear how a virtual DOM can be more efficient;
instead of iterating and comparing different nodes, they can be tracked more directly.

But that was far beyond the scope of our project.
