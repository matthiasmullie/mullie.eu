---
layout: post
title: How to prevent form spam
image: spam.png
description: Preventing common spam really isn't all that hard, so I figured I'd write down a couple of techniques that should be useful for any contact form, comments section or really any form that accepts user input. While there's no silver bullet against spam bots, it's easy enough to make it inconvenient enough for spammers to bother.
tags: [ spam, forms, javascript ]
---

After publishing a quick little project to
[support contact forms on static websites](https://github.com/matthiasmullie/post-to-email),
I was asked how spam should be handled.

Preventing common spam really isn't all that hard, so I figured I'd write down a couple of techniques
that should be useful for any contact form, comments section or really any form that accepts user input.

While there's no silver bullet against spam bots, it's easy enough to make it inconvenient enough
for spammers to bother.

<!-- more -->
<!-- ads -->


# Think like a spammer

Sadly, not everyone submitting your forms will be a human being.
Whatever is open for (human) interaction will also be accessible to bots, who are and will remain
highly capable of simulating real interaction and continue to be a nuisance.

But it really isn't too hard to fend off generic spam attacks.
It all boils down to making things hard enough for spammers by adding some hurdles that make it
unlikely enough for bots to make it past.

At some point, it simply is no longer worth a spammer's time and effort to implement more
sophistication to get past your barriers.
After all, just the simple fact that you're investing into warding them off is a clear indicator
that you're not a gullible audience for their spam: even if their spam would make it past your
layers of protection, you still wouldn't be likely to interact with their message, and their
efforts would've been for naught anyway.

Here are a couple of techniques for mitigating spam, in order of personal preference:
(is that even a word? Probably not)

- [Implement a honeypot](#add-a-honeypot-to-your-form)
- [Rely on JavaScript to submit your form](#rely-on-javascript-to-submit-your-form)
- [Validate input](#validate-input)
- [Use additional services](#use-additional-services)

Let's get started!


# Add a honeypot to your form

The honeypot technique works by leveraging the difference between how users and bots "see" a form.

Bots will parse your website until they come across a form, then fill out all available fields.
Users will do the same, unless instructed not to, or unless they're not even aware of certain fields.

So, we could add a simple field that we expect to remain empty and visually hide it. Users will not
see it (and leave it blank), but most bots will be more naive and fill it out.
After all, they're usually crude enough tools to not be able to process the rest of your code in
order to be able to figure out that this field is not visible: that kind of complex processing is
simply not worth it for generic spam bots - it takes additional effort to implement, and additional
computing power to run.

Now how do we implement this?


## 1. Add the honeypot field to your form

In-between your other (valid) form input fields, add the honeypot field.

*Note: don't pick an obvious field name like "honeypot"; instead, pick a realistic-looking name that
you don't intend to use.
In this example, I'll go with `username`.*

```html
<input type="text" name="username" placeholder="Your username" tabindex="-1" autocomplete="new-password">
```

*Note: I've also added `tabindex="-1"` to prevent users from accidentally tabbing into this field, and
I've added `autocomplete="new-password"` to prevent password managers from accidentally filling it out.*


## 2. Add some CSS to visually hide the input field

```css
input[name="username"] {
    position: absolute;
    left: -999999999px;
}
```

*Note: you could also embed these right into the html via e.g. the `style` attribute, but moving it
into CSS adds one more hurdle to overcome for bots, who are less likely to go fetch and process
additional resources.*

*Note: you could also use e.g. `display: none`, `visibility: hidden` or `opacity: 0`, although those
are more easily identifiable as "intentionally hidden" by bots. It isn't exactly rocket science to
figure out that this element is positioned off-screen and probably not intended to be visible, so
you could certainly consider other techniques if your overall project structure allows for it;
e.g. leaving it on-screen, but positioning other content over it.*


## 3. Reject submissions where honeypot is filled out

Bots will try to guess at what content your form fields expects (i.e. a field named "name" will be
populated with a name, and that big textarea will have their spam pitch), fill them out and submit
the form.

Genuine users will do the same, but since they weren't aware of your honeypot field's existence,
that one will remain blank.
We can use this discrepancy to filter out unwanted submissions, like so:

```php
if (isset($_POST['username']) && $_POST['username'] !== '') {
    exit('This is spam');
}
```

*Note: with [post-to-email](https://github.com/matthiasmullie/post-to-email), you can assign the
name of your honeypot field to the `HONEYPOT` environment variable, and it will automatically
discard submissions where that field isn't empty.*

With these 3 simple things in place, bots are likely to fall into the trap of filling out this
honeypot field and these will simply be rejected.

<!-- ads -->


# Rely on JavaScript to submit your form

Much like the honeypot technique, this leverages a difference in interaction between bots and users.
Most bots simply scrape and process your HTML, and anything that relies on JavaScript is going to
throw them off.

*Note: since some browse the web without JavaScript enabled, relying on JavaScript is also going to
exclude a (minor) subset of valid users.*

Let's walk through how we could improve a simple form like this, where all the info required for
successful submission is right there for everyone to read:

```html
<form action="https://post-to-form.my-server.com/?SUBJECT=Contact%20form" method="post">
    <input type="email" name="SENDER" placeholder="Your email" required="required" />
    <input type="text" name="name" placeholder="Your name" required="required" />
    <textarea name="message" cols="30" rows="5" required="required"></textarea>
    <input type="submit" value="Submit" />
</form>
```


## 1. Move the form endpoint out of the HTML

### Simple implementation

Instead of including the form `action` in the HTML, we'll let JavaScript fill that out:

```html
<form action="#" method="post">
    <input type="email" name="SENDER" placeholder="Your email" required="required" />
    <input type="text" name="name" placeholder="Your name" required="required" />
    <textarea name="message" cols="30" rows="5" required="required"></textarea>
    <input type="submit" value="Submit" />
</form>

<script>
    document.querySelector('form').setAttribute('action', 'https://post-to-form.my-server.com/?SUBJECT=Contact%20form');
</script>
```

It is now impossible for bots to simply submit the form based on the data available in the HTML.
They'll also need to process a script.


### Step up: separate resource

A step up from here would be to move the script into a separate file, also requiring bots to
download and process additional resources:

```html
<script src="script.js"></script>
<form action="#" method="post">
    <input type="email" name="SENDER" placeholder="Your email" required="required" />
    <input type="text" name="name" placeholder="Your name" required="required" />
    <textarea name="message" cols="30" rows="5" required="required"></textarea>
    <input type="submit" value="Submit" />
</form>
```

**script.js**
```js
document.querySelector('form').setAttribute('action', 'https://post-to-form.my-server.com/?SUBJECT=Contact%20form');
```


## 2. Obfuscate required information

Alright, by now, we've moved some key piece of information around to make it unlikely for bots to be
able to work with it, but it's still there, and sufficiently advanced bots may still find it.
Let's make that a little harder by obfuscating that data:

```html
<script src="script.js"></script>
<form action="?SUBJECT=Contact%20form" method="post">
    <input type="email" name="SENDER" placeholder="Your email" required="required" />
    <input type="text" name="name" placeholder="Your name" required="required" />
    <textarea name="message" cols="30" rows="5" required="required"></textarea>
    <input type="submit" value="Submit" />
</form>
```

**script.js**
```js
var url = atob('aHR0cHM6Ly9wb3N0LXRvLWZvcm0ubXktc2VydmVyLmNvbQ==')
var query = document.querySelector('form').getAttribute('action');
document.querySelector('form').setAttribute('action', `${url}/${query}`);
```

The above code snippet does 2 things:

- it breaks the required information and spreads it across 2 places
    - the querystring is still part of the form's `action`, and looks to be a valid action (the form
      would submit to the same page) so there is no reason for a bot to expect this not to be valid
    - the rest of the path has been moved to JavaScript
- part of the information (the non-querystring part of the URL) is base64-encoded; any bot looking 
  for a value that matches a URL would not be able to locate it
    - `aHR0cHM6Ly9wb3N0LXRvLWZvcm0ubXktc2VydmVyLmNvbQ==` is the result of `btoa('https://post-to-form.my-server.com')`

The rest of the JavaScript will then simply re-assemble the action by base64-decoding the encoded
URL part (`atob('aHR0cHM6Ly9wb3N0LXRvLWZvcm0ubXktc2VydmVyLmNvbQ==')`) and gluing both pieces back together.


## 3. Require interaction

### Simple implementation

While very unlikely, it's still possible for fully equipped bots to let the page load as intended and
read the post-script-execution DOM.

So, let's not fill out that form `action`, but let JavaScript submit the form after having interacted
with the "submit" button:

```html
<script src="script.js"></script>
<form action="?SUBJECT=Contact%20form">
    <input type="email" name="SENDER" placeholder="Your email" required="required" />
    <input type="text" name="name" placeholder="Your name" required="required" />
    <textarea name="message" cols="30" rows="5" required="required"></textarea>
    <input type="submit" value="Submit" />
</form>
```

**script.js**
```js
var url = atob('aHR0cHM6Ly9wb3N0LXRvLWZvcm0ubXktc2VydmVyLmNvbQ==')
var query = document.querySelector('form').getAttribute('action');
document.querySelector('form').addEventListener('submit', function (event) {
    event.preventDefault();
    fetch(`${url}/${query}`, {
        method: 'POST',
        body: new URLSearchParams(new FormData(event.target))
    }).then(this.reset.bind(this));
});
```


### Step up: require realistic interaction

While unrealistic, it's still not entirely impossible that some bot loaded the page, load & execute all
scripts, filled out the input fields and simulated a click on the submit button.

Let's up the ante one last time, by making assumptions that are likely to be true for human beings.
We can simply assume that your input field will take a normal person a certain amount of time to complete,
and not allow submissions before that.
We can also check for any keyboard or mouse activity to have happened, to ensure the form hasn't been
filled out programmatically.

Let's do both:

```html
<script src="script.js"></script>
<form action="?SUBJECT=Contact%20form">
    <input type="email" name="SENDER" placeholder="Your email" required="required" />
    <input type="text" name="name" placeholder="Your name" required="required" />
    <textarea name="message" cols="30" rows="5" required="required"></textarea>
    <input type="submit" value="Submit" />
</form>
```

**script.js**
```js
var interacted = false;
addEventListener('mousemove', () => interacted = true );
addEventListener('keypress', () => interacted = true );

var timeout = 30;
var timer = setTimeout( function () {
    timer = null;
}, timeout * 1000);

var url = atob('aHR0cHM6Ly9wb3N0LXRvLWZvcm0ubXktc2VydmVyLmNvbQ==')
var query = document.querySelector('form').getAttribute('action');
document.querySelector('form').addEventListener('submit', function (event) {
    event.preventDefault();

    if (interacted === false) {
        // no keyboard or mouse interaction was detected, so any data present must have been filled out programmatically
        alert("This form was submitted without keyboard or mouse interaction, which is rather suspicious!");
        return;
    }

    if (timer !== null) {
        // the timer has not yet run out, this was submitted so rapidly that it's likely a bot
        alert(`This form was submitted so rapidly that it made you look like a bot! Please try again after {timeout} seconds.`);
        return;
    }

    fetch(`${url}/${query}`, {
        method: 'POST',
        body: new URLSearchParams(new FormData(event.target))
    }).then(this.reset.bind(this));
});
```

No bot is going to stick around for 30 seconds; it just wouldn't be worth it anymore.
If any bot is going to make it past this point, I will very much welcome their spam!

<!-- ads -->


# Validate input

Another alternative, depending on what information your form requests, would be to validate the input.
This only really works with content that is expected to follow a very strict format, though.

But moving on to an example: let's say I want to know a user's postal code, and I only intend to cater
to Belgians.
To the best of my knowledge, all Belgian postal codes are a sequence of 4 digits, so we could do
something like this:

```html
<form action="https://post-to-form.my-server.com/?SUBJECT=Contact%20form" method="post">
    <input type="email" name="SENDER" placeholder="Your email" required="required" />
    <input type="text" name="name" placeholder="Your name" required="required" />
    <input type="text" name="postal_code" placeholder="Your postal code" required="required" />
    <textarea name="message" cols="30" rows="5" required="required"></textarea>
    <input type="submit" value="Submit" />
</form>
```

```php
if (!preg_match('/^\d{4}$/', $_POST['postal_code'])) {
    // the postal code entered is not 4 digits, therefore the input is invalid
    exit('The postal code entered is invalid; 4 digits are expected.');
    return;
}
```

Another popular one would be to reject anything that contains a URL in the text if you're not
expecting such input.

You can take this as far as you want, but remain careful not to end up with validation that is too
tight and reject valid input, like users mistakenly submitting ill-formatted input (e.g. a stray
space at the end of the postal code), or your failure to realize that in certain edge cases, valid
input may be different after all (e.g. a user might be trying to contact you with a question and
include a link to the page they're struggling to understand)

*Note: [post-to-email](https://github.com/matthiasmullie/post-to-email) is a general-purpose project
and no such validation is built into the receiving end, so this would only be possible by cloning and
altering the code.
Or [such validation could be done in JavaScript](https://github.com/matthiasmullie/post-to-email/blob/main/instructions/2-spam-validate-input.md)
prior to actually sending the request, in which case you should already have implemented (some of)
the above steps to ensure that bots can't simply read all form information in the first place, and
already have to simulate actual interaction.* 


# Use additional services

Below are some generic and widely used services to further help rid the world of bots.

Because they are so widely used, they can leverage vast amounts of data across their installation
base in order to detect and prevent bots from taking their shot on your website; although their
success also means that bots will more actively attempt to adapt in order to try to sneak past them.


### Akismet

[Akismet](https://akismet.com) is a third party service originally created to block spam on
[WordPress](https://wordpress.org) websites, but you can easily integrate it into your own website
after signing up for an API key.

It works by crowd-sourcing form submissions across all participating websites and comparing new
submissions against its vast database, rejecting any that match known spam.


### Firewall

Firewalls can help you prevent a bot from being able to submit forms on your website, assuming
you know what that kind of "visitor" look like.

Cloudflare, an internet service provider reverse proxying a massive amount of website globally,
employs an array of heuristics on their network in order to detect improper traffic.

They can help you fight off bots with their
[Cloudflare Bot Management](https://www.cloudflare.com/en-gb/products/bot-management).


### Captcha

I would not recommend captchas unless all other options have already been exhausted and spam
continues to roll in.
After all, captchas add some friction for genuine users as well.

In essence, captchas add yet another barrier to the process by requiring users to prove that they're
human, often in the form of solving visual riddles (that are hard to execute by bots), although some
have implemented additional heuristics to confirm that you're a human without too much friction.

Note that some bots are able to solve certain captcha implementations already, so this too is not
necessarily a silver bullet.
Nothing will ever be: bots adapt and all that we can do is add more hurdles for them to just over,
ideally without too much impact on actual human users.

If you want to pursue implementing captchas in your form, you may want to look into
[reCAPTCHA](https://www.google.com/recaptcha/about/).
