---
layout: post
title: You don't want to build your own minifier
image: public/posts/minifier.png
description: Every developer has likely at least considered writing their own framework or CMS. Until you start to realize just how much work it is and how much of your problems have actually been solved by someone else already. Then you throw in the towel and start using (and hopefully, contributing) to existing open source projects that suit your needs. Writing a minifier is very much alike.
tags: { php, js, css }
---

![Picture]({{ site.baseurl }}public/posts/minifier.png)

Every developer has likely at least considered writing their own framework or CMS. Until you start to realize just how much work it is and how much of your problems have actually been solved by someone else already. Then you throw in the towel and start using (and hopefully, contributing) to existing open source projects that suit your needs. Writing a minifier is very much alike.

While working on [a CMS](http://www.fork-cms.com) we had started, we wanted to serve our CSS and JavaScript minified, automatically. We threw some regular expressions at those static files. Eventually, it became more complex, it grew into a project of its own.

<!-- more -->

# Minify
[GitHub repo](https://github.com/matthiasmullie/minify)

[![Build status](https://api.travis-ci.org/matthiasmullie/minify.svg?branch=master)](https://travis-ci.org/matthiasmullie/minify)
[![Latest version](http://img.shields.io/packagist/v/matthiasmullie/minify.svg)](https://packagist.org/packages/matthiasmullie/minify)
[![Downloads total](http://img.shields.io/packagist/dt/matthiasmullie/minify.svg)](https://packagist.org/packages/matthiasmullie/minify)
[![License](http://img.shields.io/packagist/l/matthiasmullie/minify.svg)](https://github.com/matthiasmullie/minify/blob/master/LICENSE)

As you can see (look at the shiny buttons!), this PHP-based minifier is still around. Active, even: I've only recently given it some major updates.

## Features

**CSS**

* Strips comments
* Strips whitespace
* Imports `@import`-ed CSS files
* Includes small static files into the minified file (base64-encoded)
* Shortens hexadecimal color codes

**JS**

* Strips comments
* Strips whitespace

# Lessons learned

I didn't lure you to this post to boast about the features, so let's talk about some of the struggles!

## CSS

The CSS minifier was the easier one to build. CSS doesn't have complex logic, it's pretty straightforward.

Until we found relative paths breaking...

One of the CSS minifier's features is that it will include all the content of `@import`-ed CSS files into the parent file (to save requests for multiple files). If the parent & `@import`-ed CSS file were in different directories, relative paths in the `@import`-ed file would be incorrect:

**/css/parent.css**

    @import 'subdir/child.css';

**/css/subdir/child.css**

    body: {
        background: url('../../images/my-fancy-background.gif');
    }

If we just replace the `@import` line in parent.css with the content of *subdir/child.css*, you'd see that the path for the background image would now be incorrect. It would still reference *../../images/my-fancy-background.gif*, but would now use the location of *parent.css* (which is in a higher directory) to resolve that path against.

Not only was this potentially a problem for combining imports, it would also prove a problem when the target directory you'll write the minified CSS files to, is different from that of your source file. If you're anything like me, you'd want to keep those separate, so this too could be an issue.

Anyway, that problem has been tackled. The rest of the CSS minifier is relatively straightforward, although some of the regular expressions are quite complex, mostly due to differences in syntax when referencing other files:

    @import file.css;
    @import 'file.css';
    @import "file.css";
    @import url(file.css);
    @import url('file.css');
    @import url("file.css");

## JS

JavaScript was a whole other story. Let's start by saying that I'm still currently not 100% satisfied with that minifier. JavaScript is a complex language and, in order to properly optimize JavaScript code, you would have to be able to properly interpret it. Then you can properly get rid of redundant code. Unfortunately, I didn't build a JavaScript interpreter (now thát would've been a side project!)

I would actually prefer to move away from the current regex-based implementation (mostly because it's intensive/slow), but I don't think I'll be working on that any time soon. Minify speed will only be slow on really huge files and, even then, you only minify once (after that, every new user should get the already minified version.)

Now on the the nasty parts.

### Strings, comments & regular expressions

Imagine you want to strip all single-line comments from the JavaScript source code: Seems simple, right? All we need is something like:

    $content = preg_replace('|//.*$|m', '', $content);

Right! However, what if this was our content?

    alert("Here's a string that happens to have 2 // inside of it");

Or perhaps:

    var a=/abc\/def\//.test("abc");

Our source code would've been minified to either of these, which would've broken it:

    alert("Here's a string that happens to have 2

    var a=/abc\/def\

It's important to know the context you're operating in:

* Nothing in a string should be changed: they're intended to have every character they have
* Same for regular expressions (which can easily be confused for comments!)

This means going through the source code character by character, to see exactly when a comment (which we can remove completely) or string or regular expression (which should be preserved entirely) begins.

### ASI

Another ball-buster: [automatic semicolon insertion](http://en.wikipedia.org/wiki/Lexical_analysis#Semicolon_insertion). JavaScript doesn't require statements to be terminated with a semicolon. If it doesn't encounter a semicolon and whatever is on the next line doesn't make sense in the same statement, it will automatically recover as if there were a semicolon ending that previous line.

When minifying the source code, it's all about getting rid of as much redundant code as possible, including newlines. Because of ASI, though, we can't reliably strip newlines: if the semicolon was omitted, joining both lines can cause the code to stop making sense. E.g.:

    var a = 1,
        b = 2

    var a = 1
    var b = 2

If we were to strip newlines for both, we would get:

    var a = 1,b = 2

    var a = 1var b = 2

Now that last one doesn't look good, does it?

I've worked around this particular problem by:

* stripping newlines around *most* operators
* replacing newlines by spaces for *some* keywords
* stripping remaining spaces when on either side is a non-variable/value/...

This gets us most of the way there with respect to stripping newlines, but there's still some that can't yet reliably be removed without properly interpreting the code. Consider:

    function test()
    {
       return 'test';
    }

and:

    var string = test()
    alert(string)

One of the characters after which I'm not stripping newlines is the closing parenthesis, because it can be used in multiple different contexts. In our first example, we'd be just fine:

    function test(){return 'test'}

In our second example, though, not so much. This would, again, cause an error:

    var string=test()alert(string)

I'm not particularly on a witch-hunt against newlines: they're only 1 character, just like a semicolon. But yes, some still survive that could be omitted entirely. Let's just say that I'll keep ignoring this for now.

One upside of ASI for minifying is that we can omit the very last (if any) semicolon of the source code, and the last semicolon right before closing a block (so right before the `}` character). ASI will kick in here, and we can rest assured it won't conflict with a new statement starting next!

# Contribute

Instead of building your own minifier, you might want to consider using and contributing to existing alternatives. Any project will happily accept your help, so here's a small list of minifiers:

* [My minifier](https://github.com/matthiasmullie/minify): PHP-based JS & CSS minifier
* [UglifyJS](https://github.com/mishoo/UglifyJS) or [UglifyJS2](https://github.com/mishoo/UglifyJS2): node.js-based JS minifier
* [JShrink](https://github.com/tedious/JShrink): PHP-based JS minifier
* [clean-css](https://github.com/jakubpawlowicz/clean-css): node.js-based CSS minifier
