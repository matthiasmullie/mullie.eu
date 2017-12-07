---
layout: post
title: Regular expressions for pros
image: regex-2.png
description: Regular expressions are powerful string-manipulation tools, though chances are you probably don't even know half of what is possible with them. Before touching some of the PCRE awesomeness, make sure you're quite familiar with regular expressions already.
tags: [ regex, php ]
---

Regular expressions are powerful string-manipulation tools, though chances are you probably don't even know half of what is possible with them. Before touching some of the PCRE awesomeness, make sure you're quite familiar with regular expressions already.

Though you probably won't use any of the below on a daily basis, you should definitely be aware of their existence. The exact syntax might've slipped your mind by the time you get to use some of these, but I guess you can always come back to refresh your memory once you need it, right?

If you know all about the stuff in the [basics tutorial](https://www.mullie.eu/regular-expressions-basics/) already, dive in!

<!-- more -->
<!-- ads -->

# Back references
[PHP Docs](https://www.php.net/manual/en/regexp.reference.back-references.php)

Say you're attempting to match XML tags, both the opening and closing tags. Obviously, you'll want to find the closing tag matching the opening tag, not the closing tag of another element.

The PCRE toolset provides you with: back references! Yet another escape sequence. Using back references, you can define that a certain part in your regular expression needs to exactly match an earlier part of your regular expression. This earlier reference point has to be a subpattern and you can just point to any given subpattern by escaping the subpatterns index number, starting from 1. Up to 99 back references in 1 regular expression are possible.

## Example

In the [basic tutorial](https://www.mullie.eu/regular-expressions-basics/), we've already created a regex to find all link URLs inside an HTML source. The pattern we had created looked like `/href="(.*?)"/is`. We ignored that fact that HTML attribute are not always enclosed in double quotes though: single quotes are equally valid. This basically means that the opening enclosing character should be either `"` or `'`, and the closing character should match that opening character. The improved regex looks like: `/href=(['"])(.*?)\1/is`.

**Caution**: because the PHP regular expression functions expect the regex to be tossed in as a string, do not forget to apply the regular string-escaping rules applicable in PHP. If the string is enclosed by single quotes, all single quotes within it should be escaped & we should also escape the regex' backslash. This example would finally look like this in PHP: `preg_match_all('/href=([\'"])(.*?)\\1/is', $test, $matches)`

# Advanced subpatterns
[PHP Docs](https://www.php.net/manual/en/regexp.reference.subpatterns.php)

Subpatterns are really fun. They're like those tiny little "regular expressions inside a regular expression" and unlock so many neat features.

```php
$text = '<p id="element">Hi, this is some text</p>';
$pattern = '/<([a-z][a-z0-9]*).*>(.*)<\/\\1>/is';
if(preg_match($pattern, $text, $match)) {
    var_dump($match);
}
```

The output of this code will be:

```
array
  0 => string '<p id="element">Hi, this is some text</p>' (length=41)
  1 => string 'p' (length=1)
  2 => string 'Hi, this is some text' (length=21)
```

The first value (index 0) is the result of the full regular expression, the other 2 values (index 1 & 2) are the result of the 2 subpatterns, making it really easy to grab specific data right from the results. This is also the index they're available at for back referencing.

Let's bring some order to this chaos, though.

# Non-capturing groups

The results can be fine-tuned even better though. Since subpatterns can be used for other purposes as well (e.g. alternation), we might not want all subpatterns showing up in the match-array. To not capture a certain subpattern, you simply precede the instructions in the subpattern with `?:`. This will also render the subpattern inaccessible for back referencing.

## Example

```php
$text = '<p id="element">Hi, this is some text</p>';
$pattern = '/<([a-z][a-z0-9]*).*>(?:.*)<\/\\1>/is';
if(preg_match($pattern, $text, $match)) {
    var_dump($match);
}
```

The output of this code will be:

```
array
  0 => string '<p id="element">Hi, this is some text</p>' (length=41)
  1 => string 'p' (length=1)
```

Notice how the second subpattern no longer shows up in our match!

# Named subpatterns

But the manipulation of the subpatterns doesn't stop there. Not only can we control which subpatterns are being captured but we can also give them any given name by prepending the subpattern's instructions with `?P<name>`, `?<name>` or `?'name'`. Back referencing a named pattern can still be done by index, or by name: `(?P=name)`, `\k<name>` or `\k'name'`.

## Example

```php
$text = '<p id="element">Hi, this is some text</p>';
$pattern = '/<(?P<tag>[a-z][a-z0-9]*).*>(?P<content>.*)<\/(?P=tag)>/is';
if(preg_match($pattern, $text, $match)) {
    var_dump($match);
}
```

The output of this code will be:

```
array
  0 => string '<p id="element">Hi, this is some text</p>' (length=41)
  'tag' => string 'p' (length=1)
  1 => string 'p' (length=1)
  'content' => string 'Hi, this is some text' (length=21)
  2 => string 'Hi, this is some text' (length=21)
```

Now that we have descriptive keys mapped to our values (instead of indices), your database abstraction layer or template engine may even accept your data-array as-is, without having to loop it over once more just to "pretty-format" it.

Caution: by default, you're limited to using 1 particular name only once per regular expression. It is possible to enable support for multiple subpatterns having the same name though, by adding `(?J)` at the beginning of your regular expression, like: `/(?J)<(?P<something>[a-z][a-z0-9]*).*>(?P<something>.*)<\/\\1>/is`. This may come in handy in an alternation, where both alternate branches have a subpattern whose result you'd like to capture by the same name.

# Conditional subpatterns
[PHP Docs](https://www.php.net/manual/en/regexp.reference.conditional.php)

Conditional subpatterns provide if-then(-else) constructions withing a regular expression: if a certain condition is matched, only then should a certain pattern be executed (and optionally, otherwise another pattern should be executed).

`(?(condition)yes-pattern)` or `(?(condition)yes-pattern|no-pattern)`

The condition can either be a back reference, where *condition* is the index of the referenced subpattern, or an assertion (see next chapter).

## Example

The more complicated these concepts get, the harder it becomes to come up with a plausible example. Let's pretend we're trying to match CSS `@import` statements, which can come in both of the below forms:

```php
$test = '
@import url("path/to/my/first/style.css");
@import "path/to/my/second/style.css");
';
```

Both with and without `url()` enclosure constitute a valid `@import` statement, which makes is slightly harder to match the patch in a single regex. Let's try though:

```php
if(preg_match_all('/@import (url\()?"(.*?)"(?(1)\))/', $test, $matches)) {
  var_dump($matches);
}
```

What the above regex does is first start by matching the `@import` statement. After that, it'll search for an **optional** subpattern that will match `url(`.
After that, we're looking for an opening double quote (ignoring that this may also be single quotes) and capturing the path to the imported CSS file, followed by a closing double quote.
Then the interesting stuff happens: the conditional subpattern will check for condition `(1)` (back reference to first subpattern, which was the optional `url(` – note that this back reference does not need to be escaped): if that was matched, we'll require a closing parentheses. There is no else-statement in this example.

The result of `$matches` will look like this, with index 2 holding the paths to both imports. Index 1 is the result of the optional subpattern that was used as a condition to check if we need to look for a closing parentheses.

```
array
  0 =>
    array
      0 => string '@import url("path/to/my/first/style.css")' (length=41)
      1 => string '@import "path/to/my/second/style.css"' (length=37)
  1 =>
    array
      0 => string 'url(' (length=4)
      1 => string '' (length=0)
  2 =>
    array
      0 => string 'path/to/my/first/style.css' (length=26)
      1 => string 'path/to/my/second/style.css' (length=27)
```

<!-- ads -->

# Assertions
[PHP Docs](https://www.php.net/manual/en/regexp.reference.assertions.php)

By now, we've got quite a serious toolbox to perform complex pattern matching. But all of the existing trickery will still result in sequential parsing of your regular expression. Some day, you'll just want to instruct "hey, I only want to match ABC, if it is preceded by XYZ, but I don't want XYZ to be part of this match", or "… it should not be followed by DEF."

That's where lookahead and lookbehind assertions come in to play. Without actually being part of the pattern to be matched, they will provide additional instructions that will influence what actually will be captured.

To better illustrate the concept, let's pretend we're looking for all currencies mentioned in a text. In order to be certain that the character is a currency, we'll need it to be immediately followed by a number (otherwise, we could find a lot of US Dollars in PHP documentation, where variables are prefixed with $). We're only looking to match the currency signs, but there is an additional constraint we need to look for (but it's out of the scope of what we're looking to match).

There are 4 assertions: positive lookahead (= followed by a certain pattern), negative lookahead (= not followed by a certain pattern), positive lookbehind (= preceded by a certain pattern), and negative lookbehind (= not preceded by a certain pattern).

Assertions are not being captured, and as a result can not be referenced.

## Lookahead

* Positive: `(?=pattern)`
* Negative: `(?!pattern)`

## Lookbehind

* Positive: `(?<=pattern)`,
* Negative: `(?<!pattern)`

**Caution**: in PHP, lookbehind assertions must be fixed in length, otherwise you'll be greeted with a `Warning: Compilation failed: lookbehind assertion is not fixed length`.
Fixed length means that you must avoid the use of non-fixed quantifiers, like `*`, `+`, `?` or `{1,2}`. In lookahead assertions, it is perfectly acceptable to use variable-length quantifiers, e.g. `(?=.*?blah)`, but in lookbehind assertions, you can not. Well, not in PHP.

## Example

```php
$test = 'I found a €5 note today.
$this, however is just a simple PHP variable.';
```

If we're looking to solve the aforementioned problem of finding all currencies in a text, we'll notice that in this text the € symbol is used as EUR currency, while the $ does not stand for USD here. We'll want to verify that the currency symbols are actually followed by a number:

```php
if(preg_match_all('/[$€£¥](?=[0-9])/u', $test, $matches)) {
    var_dump($matches);
}
```

*Also note how pattern modifier PCRE_UTF8 is used to make the regular expression correctly interpret the multibyte UTF8 currency symbols.*

The output of this solution will accurately only match the EUR symbol:

```
array
  0 =>
    array
      0 => string '€' (length=3)
```

# Comments
[PHP Docs](https://www.php.net/manual/en/regexp.reference.comments.php)

I very much encourage you to write documentation for your regular expressions. Regular expressions are sufficiently hard to create already, but they're even much harder to decipher without sufficient context.

Comment them correctly though: there is no need to split them into several separate strings and concatenate them in PHP, only to be able to add PHP-style comments. Perl-style comments can be added inline, in a regular expression, via the use of the `PCRE_EXTENDED` pattern modifier. The use of this modifier will result in unescaped whitespace being ignored in your regex.

```
/
    # match currency symbols for USD, EUR, GBP & YEN
    [$€£¥]
    # currency symbols must be followed by number, to indicate price
    (?=[0-9])
# pattern modifiers: u for UTF-8 interpretation (currency symbols),
# x to ignore whitespace (for comments)
/ux
```

Everything following the # will be regarded as a comment, up until the end of the line/regex. The x-modifier will ensure that the tabs before & newlines after the comments are also ignored.

# End

If you just can't get enough, you might want to check out this presentation I uploaded on [SpeakerDeck](https://speakerdeck.com/matthiasmullie/regular-expressions-101/). It's nothing more than a compact version of the information in both the [basic](https://www.mullie.eu/regular-expressions-basics/) and this advanced tutorial, albeit with some other examples.

I guess by now you've learned to appreciate the power that regular expressions harness. You'll now always have your enhanced regex-knowledge to save your ass when dealing with complex structured data, but don't be blind for other solutions. Though the possibilities are endless, depending on your specific task, other solutions may be far superior, like a DOM/SAX-based parser for XML.

*Please note that the code examples were centered around accurately explaining a specific subject, and may not cover all edge cases. For the sake of clarity, the `@import`-regex is ignorant of whitespace and single quote delimiters, and the XML nodes ignores self-closing tags.*
