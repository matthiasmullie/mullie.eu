---
layout: post
title: Introduction to regular expressions
image: regex.png
description: Regular expressions are under-valued and most developers tend to only know the basics. Having a thorough understanding of how regular expressions work, will be incredibly helpful when you need to parse structured data.
tags: [ regex, php ]
---

Regular expressions are under-valued and most developers tend to only know the basics. Having a thorough understanding of how regular expressions work, will be incredibly helpful when you need to parse structured data.

In essence, a regular expression – or regex – is an instruction set to parse "certain data" in a "certain string". A simple example of such regex is `/[o-9]+/`: instructions to find numeric occurrences in a string.

Regular expressions are most commonly PCRE-based, an instruction set derived from the regular expression implementation in Perl. I'll be discussing the PCRE implementation in PHP in particular. While in other programming languages the specific implementation may differ, most modern languages have PCRE ( **P**erl **C**ompatible **R**egular **E**xpressions) support and the concepts should and will largely be the same in the language of your choice.

<!-- more -->

# Introduction

Regular expressions are used to match pieces inside a string. A simple fictitious example would be to check if string "foo bar baz" contains the word "bar", or to replace every occurrence of "bar" by "qux".

```php
// check if our string contains 'bar'
if(preg_match('/bar/', 'foo bar baz')) echo 'match!';
// replace 'bar' by 'qux'
echo preg_replace('/bar/', 'qux', 'foo bar baz');
```

These fictitious examples make no sense however. PHP (or the language of your choice) has its own proper tools for simple string manipulation like that: `strpos` and `str_replace` would have sufficed for these simple examples and they would even have been faster.

Regular expressions are somewhat a meta-language. In the background, there's a compiler that parses your regular expression and processes these instructions against the target string. Think of it as if the ‘foo bar baz' string is iterated over, character by character, and evaluated against the regular expression `/bar/`. This is pretty much what is going on "behind the scenes":

<table>
  <tr>
        <th>Character</th>
        <th>Result</th>
    </tr>
    <tr>
        <td>f</td>
        <td>Nope, that's no b</td>
    </tr>
    <tr>
        <td>o</td>
        <td>Nope, nor is this b</td>
    </tr>
    <tr>
        <td>o</td>
        <td>Nope, still no b</td>
    </tr>
    <tr>
        <td></td>
        <td>Nope, that ain't no b</td>
    </tr>
    <tr>
        <td>b</td>
        <td>Yes, that's b, now on to the next character</td>
    </tr>
    <tr>
        <td>a</td>
        <td>Yes, that's a, next please</td>
    </tr>
    <tr>
        <td>r</td>
        <td>Yes, that's r, we've matched our complete regex!</td>
    </tr>
    <tr>
        <td></td>
        <td>Nope, no b</td>
    </tr>
    <tr>
        <td>b</td>
        <td>Yes, another b, moving along...</td>
    </tr>
    <tr>
        <td>a</td>
        <td>Yes, here's another a, on to the next</td>
    </tr>
    <tr>
        <td>z</td>
        <td>Nope, that's no r, regex was not matched</td>
    </tr>
</table>

This, of course, is pretty much the simplest imaginable regex.

Imagine we want to replace both ‘bar' and ‘baz' however. Using the PHP native string manipulation functions, this could be done like: `echo str_replace(array('bar', 'baz'), 'qux', 'foo bar baz');`
In regex-form, this would be: `echo preg_replace('/ba[rz]/', 'qux', 'foo bar baz');`

In this example, we've just introduced new regular expression metacharacters: `[ ]`, which encloses character classes. This one just means that all characters inside are a valuable match. More on these concepts further down the post.

# Delimiter
[PHP Docs](http://www.php.net/manual/en/regexp.reference.delimiters.php)

Regular expressions must always be enclosed by 2 characters to denote the beginning and end of the expression. Pretty much any character *("A delimiter can be any non-alphanumeric, non-backslash, non-whitespace character")* can be used as a delimiter, as long as it's consistently both leading and terminating the regular expression, with no other (unescaped) occurrences of the character within the expression.

A few "special" delimiters worth knowing about are: `[ ]`, `( )`, `{ }` and `< >`. These do not require the exact same character to enclose a regular expression, but the opposite bracket, e.g.: `{[0-9]+}`

**Advice**: Let's all use the forward slash as a delimiter though, for uniformity's sake!

# Meta-characters
[PHP Docs](http://www.php.net/manual/en/regexp.reference.meta.php)

Meta characters are the actual instructions: the toolset allowing you to build regular expressions to parse complex data. A full list of available meta-characters:

<table>
    <tr>
        <th>Character</th>
        <th>Usage</th>
    </tr>
    <tr>
        <td>.</td>
        <td>The dot matches any character (apart from newlines, unless s-modifier is set): /b.g/ matches big, bag, bdg, b7g, ...</td>
    </tr>
    <tr>
        <td>?</td>
        <td>1: Defines that the leading character can be matched 0 or 1 time: /b.?g/ matches bg, big, bag, bdg, b8g, ... 2: When following + or *, it'll invert that quantifier's greediness (more on that later).</td>
    </tr>
    <tr>
        <td>*</td>
        <td>Defines that the leading character can be matched 0, 1 or multiple times: /b.*g/ matches bg, big, bag, bdg, b8g, boog, b7wrg, ...</td>
    </tr>
    <tr>
        <td>+</td>
        <td>Defines that the leading character can be matched 1 or multiple times: /b.+g/ matches big, bag, bdg, b8g, boog, b7wrg, ...</td>
    </tr>
    <tr>
        <td>{ }</td>
        <td>Defines that the leading character can be matched an arbitrary amount of times: /b.{2}g/ matches boog, b34g, ...; /b.{2,3}g/ matches boog, b7wrg, ...; /b.{2,}g/ matches boog, b7wrg, bhe73hg, ...</td>
    </tr>
    <tr>
        <td>[ ]</td>
        <td>Defines a character class, any character inside the brackets is subject to match: /b[ai]g/ matches both big &amp; bag.</td>
    </tr>
    <tr>
        <td>-</td>
        <td>Defines a range in a character class: /[0-9]{2}/ matches everything from 00 to 99.</td>
    </tr>
    <tr>
        <td>^</td>
        <td>1: Evaluates to the exact beginning of a string: /^The/ matches the occurrence of "The" only if it's at the beginning of the subject string. 2: When used in conjunction with [ ], it negates the character class: /[^0-9]/ matches any non-numeric character.</td>
    </tr>
    <tr>
        <td>$</td>
        <td>Evaluates to the exact end of a string: /end$/ matches the occurrence of "end" only if it's at the end of the subject string.</td>
    </tr>
    <tr>
        <td>( )</td>
        <td>Defines a subpattern and can be used for alternation, backreferences and lookahead/-behind assertions.</td>
    </tr>
    <tr>
        <td>|</td>
        <td>Indicates an alternation in a subpattern, meaning that either the left or right side should be matched: /(Satur|Sun)day/ will match both "Saturday" and "Sunday".</td>
    </tr>
    <tr>
        <td>\</td>
        <td>Escape-character, allowing the use of any of the meta-characters or current delimiter as literal to match: /\(.*?\)/ finds everything between parentheses.</td>
    </tr>
</table>

Don't worry if not all of the above makes sense right away, we'll touch most of these in more detail later in this post. While you could probably easily develop your own algorithm equivalent to e.g. `/[o-9]{2}/` to find a 2-digit number in a target string, you'll find that more complex parsing will soon get a lot harder if you were to do it without **regular expressions**. Generally, these meta-characters are the building blocks that make up a regular expression: a meta-language which – behind your back – compiles into real instructions that will be applied to your subject string to find exactly what you need in an as-performant-as-possible way.

## Example

Imagine we're presented some data in which we're looking for prices, basically a dollar-sign followed by an optional space, a sequence of numbers, a decimal separator and 2 decimals. The regular expression we'd construct would look like: `/\$ ?[0-9]+\.[0-9]{2}/`. Broken down, this regular expression consist out of these parts:

<table>
    <tr>
        <th>Part</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>/</td>
        <td>Opening delimiter: beginning of regular expression</td>
    </tr>
    <tr>
        <td>\$</td>
        <td>The match should start with the dollar sign. In order to not have it interpreted as dollar character (instead of the dollar meta-character), we need to escape it with a backslash.</td>
    </tr>
    <tr>
        <td> </td>
        <td>After the dollar character, we'll allow for a space to lead the numbers.</td>
    </tr>
    <tr>
        <td>?</td>
        <td>The aforementioned space is optional though, it can occur either once or not at all, represented by this quantifier.</td>
    </tr>
    <tr>
        <td>[0-9]</td>
        <td>This is a character class with a range from 0 to 9: any character from 0 to 9 (so 0, 1, 2, 3, 4, 5, 6, 7, 8, 9) is subject to match.</td>
    </tr>
    <tr>
        <td>+</td>
        <td>The preceding character (class) is subject to match at least once with this quantifier, effectively making it match anything from 0 to 99999...</td>
    </tr>
    <tr>
        <td>\.</td>
        <td>Next up: decimal-separator dot. Given that the dot character doubles as meta-character, we also need to escape it in order to make it match a lexical dot.</td>
    </tr>
    <tr>
        <td>[0-9]</td>
        <td>Again, character class range: every character from 0 to 9.</td>
    </tr>
    <tr>
        <td>{2}</td>
        <td>The preceding character (class) should be matched exactly 2 times, effectively making it match anything from 00 to 99.</td>
    </tr>
    <tr>
        <td>/</td>
        <td>Closing delimiter: end of regular expression</td>
    </tr>
</table>

The above regular expression should match any of the following possibilities: *$99.99*, *$0.00*, *$ 15.00*, …, but not: *$99*, *0.00$* or *€0.00*.

# Pattern modifiers
[PHP Docs](http://www.php.net/manual/en/reference.pcre.pattern.modifiers.php)

Basically, pattern modifiers are the reason we do need delimiters in PHP's PCRE-implementation: the closing delimiter can be followed by one or multiple pattern modifiers. A pattern modifier will alter the way a certain regular expression will be interpreted once run. A simple example would be the i-modifier, stating that the alphabetic characters used in the regular expression should be evaluated caseless, which means that `/test/i` would not only match "test", but also "Test" or "tEsT".

A full list of the available pattern modifiers in PHP:

<table>
    <tr>
        <th>Modifier</th>
        <th>Option bit</th>
        <th>Usage</th>
    </tr>
    <tr>
        <td>i</td>
        <td>PCRE_CASELESS</td>
        <td>Evaluates the regular expression caseless: /test/i matches "test", "Test", "tEsT", ...</td>
    </tr>
    <tr>
        <td>m</td>
        <td>PCRE_MULTILINE</td>
        <td>Makes the regex evaluate ^ to the beginning of a newline in the subject string. Without this option, only the beginning of the complete subject (regardless of any newlines) matches ^.</td>
    </tr>
    <tr>
        <td>s</td>
        <td>PCRE_DOTALL</td>
        <td>Makes the dot also match newlines. If you're pattern matches something where the content to be matched by the dot is on multiple lines, you'll need the dot to also include newlines.</td>
    </tr>
    <tr>
        <td>x</td>
        <td>PCRE_EXTENDED</td>
        <td>Ignores unescaped whitespace in the regular expression. Particularly useful when inline-commenting the regex.</td>
    </tr>
    <tr>
        <td>e</td>
        <td>PREG_REPLACE_EVAL</td>
        <td>Usage discouraged! This is a PHP addition, of use with the preg_replace function only. If this modifier is set, the replacement string will be eval'ed.</td>
    </tr>
    <tr>
        <td>A</td>
        <td>PCRE_ANCHORED</td>
        <td>This modifier is pretty much equivalent to adding ^ to the beginning of your pattern: it ties the expression to the beginning of the subject string.</td>
    </tr>
    <tr>
        <td>D</td>
        <td>PCRE_DOLLAR_ENDONLY</td>
        <td>Where PCRE_MULTILINE makes ^ evaluate to all line starts after a newline (by default, it only evaluates to the beginning of the complete string), this modifier does the exact opposite for $. $ by default matches the end of the complete subject string as well as the end of a line before every newline. The D-modifier reverses this, making $ only match the end of the complete subject.</td>
    </tr>
    <tr>
        <td>S</td>
        <td></td>
        <td>According to the PHP documentation, this modifier will execute your regular expression more slowly, by "studying" its usage, making it faster in the long run when using it multiple times.</td>
    </tr>
    <tr>
        <td>U</td>
        <td>PCRE_UNGREEDY</td>
        <td>This is equivalent to using ? right after a quantifier in that it reverses the default greedy behavior, but does so for the entire regular expression.</td>
    </tr>
    <tr>
        <td>X</td>
        <td>PCRE_EXTRA</td>
        <td>According to the PHP documentation, this modifier will "turn on additional functionality of PCRE that is incompatible with Perl", though there is no such additional functionality (yet).</td>
    </tr>
    <tr>
        <td>J</td>
        <td>PCRE_INFO_JCHANGED</td>
        <td>This allows duplicate names for subpatterns.</td>
    </tr>
    <tr>
        <td>u</td>
        <td>PCRE_UTF8</td>
        <td>This will make your regular expression UTF-8 compatible.</td>
    </tr>
</table>

There's a few very useful modifiers (i, m, s, x, U, J, u), some of questionable value (e, A, D) and some utter useless modifier (S, X) – and you can apply all of them simultaneously: `/xyz/ims` will apply the i-, m- and s-modifier to the preceding regular expression.

The implementation of these pattern modifiers in other programming languages may vary. Javascript, for example, only supports i, m (both same implementation as PHP) and g:

<table>
    <tr>
        <th>Modifier</th>
        <th>Option bit</th>
        <th>Usage</th>
    </tr>
    <tr>
        <td>g</td>
        <td></td>
        <td>We could consider a regular Javascript-regex equivalent to PHP's preg_match() function: the regular expression will only match the first occurrence in the subject string. Applying the g-modifier would make it equivalent to PHP's preg_match_all() function, making the regular expression find all applicable matches in the subject string.</td>
    </tr>
</table>

## Example

As we have seen in the meta-characters overview, the dot will match every character, apart from newlines.

```php
$html = '<p>This is a paragraph on one single line.</p>
<p>
    This however,
    is a paragraph
    spanning multiple lines
</p>';
echo preg_replace('/<p>.*?<\/p>/', '', $html);
```

This regex matches `<p>` first, followed by *any character*, followed by `</p>`, after which it replaces the entire match with an empty string.

Contrary to what you may think though, only the first paragraph will be replaced, this because PCRE evaluates strings on a line-basis: it'll try to match 1 line to the regular expression, and if a result could not be found, it'll try to match the next line. The very first line will match both an opening `<p>` tag, "a bunch of characters" and a closing `</p>` tag. The second line however, does not match that, neither does the 3rd line, the 4th, the 5th nor the 6th. However, using the `PCRE_DOTALL` modifier, the dot will also match a newline and will span over lines 2 to 6.
The regular expression, when applied the `PCRE_DOTALL` modifier, looks like this: `preg_replace('/<p>.*?<\/p>/s', '', $html);`

Suppose we also want to be able to match the uppercase HTML paragraph tag `<P>`, we could also apply the `PCRE_CASELESS` modifier, which would cause the compiler to ignore the case mismatch between our regex "p" and the string P. This would turn our regular expression into: `preg_replace('/<p>.*?<\/p>/si', '', $html);`

# Character classes
[PHP Docs](http://www.php.net/manual/en/regexp.reference.character-classes.php)

Character classes define a series of specific characters to be matched and are enclosed by square brackets `[ ]`. Any character between the brackets is subject to match in the subject string.

A simple example would be: `/fac[et]/`, which will match both "face" and "fact". Do not be confused by the letters inside the character class: unless a quantifier follows the character class, they can't both occur. "facet", for example, would not be a match. Unless the regex would be `/fac[et]{2}/`, which actually would match "facet", as well as "facte", "factt" and "facee".

When presented a range, like `[a-z]`, it will match anything between and including the given bounds, in this example the entire lowercase western alphabet.

**Caution**: ranges are built upon the [ASCII table](http://www.asciitable.com/), meaning that for example `[A-z]` will not only include then entire upper- and all lowercase western alphabet, but also `[`, `\`, `]`, `^`, `_` and \`. To actually match every upper- and lowercase latin character, we can use a compound range like this: `[a-zA-Z]`.

A combination of a range and single characters is perfectly valid as well, as you can see in this regular expression matching numbers, alphabetical characters and underscores: `/[0-9a-z_]/i`.

A character class can also be negated, forming a "match everything except for these characters"-instruction. A negative character class is built by preceding the character with a caret (`^`), like this: `[^0-9]`, which would match everything but a numerical character.

1 more popular type of character class is the POSIX-notation. This is basically a range, defined by a more descriptive term, like `[:alpha:]` (equivalent to `[a-zA-Z]`), `[:lower:]` (equivalent to `[a-z]`) or `[:xdigit:]` (hexadecimal digits, equivalent to `[0-9A-F]`). Personally, I'm no big fan of this notation as I find it more confusing than just spelling out the range, but whatever floats your boat, I guess. Be sure to take a look at [the full list of POSIX-notation character classes](http://www.php.net/manual/en/regexp.reference.character-classes.php) if you're into it!

# Greediness

It's quite important to thoroughly grasp the concept of greediness in regular expressions, as it'll save you major headaches. It's really easy though! Quantifiers (like `?`, `*` and `+`, but also `{2,}`) have the default tendency to try to match as much as possible. This concept is probably best illustrated by example, so here's a regular expression that should match opening XML/HTML tags: `/<.+>/s`. An XML/HTML tag starts with an opening chevron, is followed by "whatever" (the tag name, possibly some whitespace, some parameters and their values, …) and is finally closed with a closing chevron.

Let's now assume a subject string like: `<p>Hi, this is a test</p><p class="example">The above regular expression is supposed to match the HTML tags in this example.</p>`.

You might expect the regular expression to match `<p>`, instead you'll find it match the entire subject string. Confusing, huh?

If we re-examine our regular expression, this behavior will actually start to make sense: it first looks for an opening chevron. Bingo at the first character! It then looks for "anything (the dot), for one or multiple times (the `+`)" before it looks for an ending chevron. Moving along in the subject string, we find that the second character, *p*, fits the bill for "anything, for one or multiple times". As does the third character though: the ending chevron of `<p>` also fits the bill for "anything, for one or multiple times." We never told our regular expression that it should try to match as soon as possible, so it tries to find the largest possible match for the given expression: a result that starts with an opening-chevron , "something" in between, and ends in a closing-chevron (which in this case is the last character of the complete subject string).

To actually tell the regular expression to keep the match as short as possible, we could invert the default greedy behavior by appending a question mark to the quantifier, like `/<.+?>/s`. The quantifier is then "lazy": it no longer attempts to match as much as possible, and will successfully match `<p>`, `</p>`, `<p class="example">` and `</p>`.

If we're looking to invert greediness for the entire regex – as opposed to only inverting a certain quantifier – we could do so by appending the U-modifier to the regex, like `/<.+>/sU`. **Note**: In a regular expression that has been made ungreedy by applying the U-modifier – making all quantifiers lazy by default – applying `?` to a certain quantifier makes that quantifier greedy again.

# Subpatterns
[PHP Docs](http://www.php.net/manual/en/regexp.reference.subpatterns.php)

A regular expression often consists out of multiple patterns, each matching a specific part. If we look at a regular expression to match email addresses: `/[a-z0-9]+@[a-z0-9\.]+\.[a-z0-9]{2,3}/i`, we find 2 main patterns: the username (in front of the @) and the domain (after the @). Imagine we're looking to extract all domains of all email addresses in a certain subject string. We can encapsulate this pattern with parentheses, like: `/[a-z0-9]+@([a-z0-9\.]+\.[a-z0-9]{2,3})/i`. The behavior of the regex will remain unchanged but, along with the match of the complete regex, the match for this particular encapsulated subpattern will now also be captured.

*Don't ever use this regular expression to match email addresses: it is too simplistic (for exemplary purposes, of course – It's not like I'm lazy) to completely match the specs detailed in the [different](http://tools.ietf.org/html/rfc5321) [RFCs](http://tools.ietf.org/html/rfc5322).*

Important in such an isolated pattern is that it also enables alternation. Such alternative branches can be considered roughly equivalent to a character class: `/fac[et]/` (character class) matches exactly the same as `/fac(e|t)/` (subpattern with alternative branches). However, where a character class only represents 1 character, a subpattern with alternative branches can represent an alternation of certain exact sequences of characters. An example of this would be: `/(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day/`, which matches exactly all days and nothing else.

## Example

Assume we want to capture all link URLs inside an HTML source. A good regex could look like: `/href="(.*?)"/is`. We've here created a subpattern for the part that ought to match to the URL and the captured subpatterns will be exposed via PHP's `preg_match_all` function:

```php
$test = '
<p>
    <a href="http://www.mullie.eu">Matthias Mullie</a>
    knows some
    <a href="http://www.php.net">PHP</a>.
</p>';
if(preg_match_all('/href="(.*?)"/is', $test, $matches)) {
    var_dump($matches);
}
```

The result of the above code will look like this, where index 0 contains full regex's match and index 1 consists of only the subpattern excerpts:

```
array
  0 =>
    array
      0 => string 'href="http://www.mullie.eu"' (length=27)
      1 => string 'href="http://www.php.net"' (length=25)
  1 =>
    array
      0 => string 'http://www.mullie.eu' (length=20)
      1 => string 'http://www.php.net' (length=18)
```

# Escape sequences
[PHP Docs](http://www.php.net/manual/en/regexp.reference.escape.php)

We've learned that, when we want to match a character that also doubles as meta-character, we need to escape it by prepending it with a backslash. To be honest, this depends on the context the character is used in: an opening square bracket (unless when it opens a POSIX-notation character class) or a dot does not have any special meaning inside a character class, so is not ambiguous and needs no escaping. As a result, `/[[.]/` is a perfectly valid expression matching either an opening square bracket or a dot. It doesn't hurt to escape them anyway though.

There's also a couple of regular characters that, when escaped, turn into something special. The most noteworthy escape sequences would have to be:

<table>
    <tr>
        <th>Character</th>
        <th>Usage</th>
    </tr>
    <tr>
        <td>\d</td>
        <td>Digit character, equivalent to [0-9].</td>
    </tr>
    <tr>
        <td>\D</td>
        <td>Anything but a digit character, equivalent to [^0-9].</td>
    </tr>
    <tr>
        <td>\w</td>
        <td>Word character, equivalent to [a-zA-Z0-9_].</td>
    </tr>
    <tr>
        <td>\W</td>
        <td>Anything but a word character, equivalent to [^a-zA-Z0-9_].</td>
    </tr>
    <tr>
        <td>\t</td>
        <td>Tab.</td>
    </tr>
    <tr>
        <td>\r</td>
        <td>Carriage return.</td>
    </tr>
    <tr>
        <td>\n</td>
        <td>Newline.</td>
    </tr>
    <tr>
        <td>\s</td>
        <td>Whitespace, equivalent to [ \t\r\n].</td>
    </tr>
    <tr>
        <td>\S</td>
        <td>Anything but whitespace, equivalent to [^ \t\r\n].</td>
    </tr>
    <tr>
        <td>\[0-9]+</td>
        <td>Backreference, with the digit(s) following the backslash being the index of the subpattern.</td>
    </tr>
</table>

There's quite a few more obscure escape sequences, so you might want to take a look at [the full list of escape sequences](http://www.php.net/manual/en/regexp.reference.escape.php).

# PHP & PCRE escape madness

In PHP, your regular expressions are formed within strings. PHP allows for "special" manipulations to strings, also using backslashes, like: `"He said \"hello\""`, `"new\nline"` or `"\$var is a variable"`. To ensure that a backslash in our regular expression can not be interpreted by PHP as something else, we should escape it by adding another backslash in front of it, like: `preg_match('/\\s/', $var)` to achieve a regular expression of `/\s/`.

In most cases, forgetting to string-escape a PCRE-backslash will not cause any problem: if the character following the backslash is of no special meaning to PHP, it will just interpret the 1 backslash as part of the string. I would suggest to always try to get your escaping right though.

Since this double-escape madness is quite confusing, here's some examples:

<table>
    <tr>
        <th>Description</th>
        <th>Regex</th>
        <th>PHP implementation</th>
        <th>Why escape?</th>
    </tr>
    <tr>
        <td>Match a single quote</td>
        <td>/'/</td>
        <td>preg_match('/\'/', $var)</td>
        <td>We don't need any backslash in the regex. We do need to escape the single quote for PHP though, or it would end the string right there.</td>
    </tr>
    <tr>
        <td>Match whitespace</td>
        <td>/\s/</td>
        <td>preg_match('/\\s/', $var)</td>
        <td>We need the backslash in the regex to form the \s escape sequence. To make sure that PHP does not misinterpret the backslash as a string escape-character, we escape it.</td>
    </tr>
    <tr>
        <td>Match a backslash</td>
        <td>/\\/</td>
        <td>preg_match('/\\\\/', $var)</td>
        <td>We actually want to match a backslash, so the regex needs the backslash escaped (to ensure that it won't be interpreted as an escape sequence). Both backslashes have to be double-escaped though, or they would be interpreted by PHP as "the latter is a real backslash, which is being escaped by the first one".</td>
    </tr>
</table>

Since single quote strings only have a single quote itself to be escaped (and thus have a much lower risk of having a backslash be interpreted wrongfully than double-quoted strings), you might want to make it a habbit to only use single-quoted strings when building your regular expressions!
