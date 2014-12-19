---
layout: post
title: How JavaScript promises work
image: promises.png
description: The world of JavaScript has had promises since long, in the form of libraries like Q, BlueBird and many others, like jQuery's deferred. And it's been native in JavaScript for awhile now.
tags: [ javascript, promises ]
---

The world of JavaScript has had promises since long, in the form of libraries
like [Q](https://github.com/kriskowal/q), [BlueBird](https://github.com/petkaantonov/bluebird)
and many others, like [jQuery's deferred](http://api.jquery.com/category/deferred-object/).
And it's been [native in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
for awhile now.

I love them!

<!-- more -->


# Intro

Promises let you code asynchronously with ease, without having to resort to
nasty callback functions & events.

Here's a small example:

```javascript
var promise = new Promise(function(resolve, reject) {
    // Do something async here (e.g. an xhr call)
    // Depending on the outcome of your operation, you either resolve or reject
    // the promise.

    // Let's pretend some action takes 100ms and then completes successfully
    setTimeout(resolve.bind(this, 'Value'), 100);

    // If something went wrong, we would reject the promise like so:
    // reject('Error message');
});
```

`promise` is now an object representing a pending value. You can't do much with
it until it gets resolved or rejected, which you do by calling the functions
`resolve` or `reject` supplied as arguments of the executor function.

After having resolved or rejected the promise object, it is no longer pending,
at which point you can work with the value, or get the reason for the error. You
do this by attaching handlers to the promise object, using the `then` and
`catch` methods of your object:

```javascript
promise
    // Attach a callback to be executed when the promise is fulfilled (= resolved,
    // completed successfully)
    .then(function(value) {
        // We can now do something with the value. Since I'm unimaginative, I'll
        // just print it to console!
        console.log('onFulfilled handler', value);
    })

    // Attach a callback to be executed when the promise is rejected (= failed)
    .catch(function(reason) {
        console.log('onRejected handler', reason);
    });
```

Or attach both at once via `then` (first argument is `resolve` handler, second
is `reject` handler), like this:

```javascript
promise.then(
    function(value) {
        console.log('onFulfilled handler', value);
    },
    function(reason) {
        console.log('onRejected handler', reason);
    }
);
```

Note that in this example, they're not chained: if your resolve handler throws
an exception, the reject handler will not pick it up. More on that later!


# Chain handlers

Since the `then` & `catch` methods return new promises, you can even attach
multiple successive handlers for both success & fail cases:

```javascript
promise
    // resolve handler
    .then(function(value) {
        console.log('First onFulfilled handler', value);

        // Let's just pretend this handler executed correctly
        return value; // equivalent to Promise.resolve(value);
    })

    // second resolve handler
    .then(function(value) {
        console.log('Second onFulfilled handler', value);

        // Let's pretend this handler experienced an issue that should prompt
        // the reject handler to be executed
        throw 'Error message'; // equivalent to Promise.reject('Error message');
    })

    // reject handler
    .catch(function(reason) {
        console.log('Second onRejected handler', reason);

        // This was the last handler in this chain - if there were any more, we
        // could either return a value (triggers the next resolve handler) or
        // throw an exception (triggers the next reject handler)
    });
```

Once `promise` resolves, it will go to the first resolve handler, which will
just return a value. It will use the returned value & pass it on to the next
resolve handler. In our example, an error occurs in that next handler so it
throws an exception, which triggers the next reject handler in the chain to be
called.


# Changing values

When you're chaining handlers, any handler in the chain can alter the value that
will be passed on to the next. This can be used to supplement or transform the
already existing data.

Your first handler could, for example, receive a plain text JSON string, which
it `JSON.parse`s before passing it on to the next handler:

```javascript
new Promise(function(resolve, reject) {
    resolve('{"key":"value"}'); // resolves with JSON as plaintext string
})
    .then(JSON.parse) // turns plaintext string into JSON object
    .then(function(value) {
        console.log(value); // logs Object { key="value"}

        // The value returned by this handler will be passed on to the next one
        // If we don't return any value, the next resolve handler will receive
        // undefined as value
        value.key = "altered value";
        return value;
    })
    .then(function(value) {
        console.log(value); // logs Object { key="altered value"}
        return value;
    })
```

You can even let a reject handler return a value that will be passed to the next
resolve handler.


# Combine promises

Since you're dealing with asynchronous code, chances are you'll need to execute
something only after multiple execution paths are resolved.

You could be firing 2 API requests at once and only want to display the combined
information of both responses once both have completed. Easy with promises!

```javascript
var promise1, promise2;

// Both promises will fire simultaneously
promise1 = new Promise(function(resolve, reject) {
    setTimeout(resolve.bind(this, 'Value 1'), 50);
});
promise2 = new Promise(function(resolve, reject) {
    setTimeout(resolve.bind(this, 'Value 2'), 100);
});

// We only want to execute something after both promises have completed, though!
Promise.all([promise1, promise2])
	.then(function(value) {
		// value is an array that contains the resolved values of both promises,
		// in the other the promises were added to Promise.all
		var value1 = value[0], value2 = value[1];
		console.log('Success', value1, value2);
	})
	.catch(function(reason) {
		// Either of both promises has failed!
		console.log('Fail', reason);
	});
```

We have 2 promises going off on divergent tasks. We can "subscribe" to the
completion "event" of both of them by means of `Promise.all`, which takes an
array of promises (or even an array of normal values.)

Once all of the promises - which are being executed simultaneously - have
completed, will the resolve handler be executed. The value passed to that
handler will be an array that contains the values of all promises.

However, the reject handler will be executed should one of the promises fail
(and as soon as it does!) The resolve handler will only be executed if all
promises resolve successfully.

Similar to `Promise.all`, there's a `Promise.race` method that combines multiple
promises. This one, however, execute the resolve or reject handlers as soon as
1 of the promises resolves or rejects (with only that one's argument passed to
the handler.)
