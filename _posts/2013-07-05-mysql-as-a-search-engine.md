---
layout: post
title: How to build a MySQL-powered search engine
image: search.png
description: In content-heavy websites, it becomes increasingly important to provide capable search possibilities to help your users find exactly what they're looking for. The most obvious solution is searching your MySQL database directly, but implementing a generic MySQL search is not at all trivial. Here's how to avoid those pitfalls and build a robust MySQL-powered search engine for you website.
tags: [ scaling, mysql, php ]
---

In content-heavy websites, it becomes increasingly important to provide capable search possibilities to help your users find exactly what they're looking for. The most obvious solution is searching your MySQL database directly, but implementing a generic MySQL search is not at all trivial. Here's how to avoid those pitfalls and build a robust MySQL-powered search engine for you website.

This article will solely focus on the most common text-based search (as opposed to e.g. geography- or time-based)

<!-- more -->

# MySQL is not a search engine

MySQL is a relational database, no search engine. While it does provide some tools to search inside the data it holds, you're better of integrating a real search engine if you're looking for a full-fledged solution. Some of the most popular (open source) search engines are:

* [Lucene](http://lucene.apache.org/core)
* [Sphinx](http://sphinxsearch.com/)
* [Elasticsearch](http://www.elasticsearch.org/): Lucene-based server
* [Solr](http://lucene.apache.org/solr): Lucene-based server

While the above options are far superior, it could definitely make sense to build a MySQL-based search engine. We built it because we wanted [Fork CMS](http://www.fork-cms.com/) to have a capable search on common, cheap, server architectures with only PHP & MySQL, without having to install additional software.

# Full-text search
[MySQL Docs](http://dev.mysql.com/doc/refman/5.7/en/fulltext-search.html)

So how does one search for text in MySQL?

Simple solutions could be to use `column LIKE '%word%'` or `column REGEXP '.*word.*'`, but these provide limited capabilities.
Apart from not providing too much options, they don't accurately utilise indexes and as a result will get you in trouble once your dataset grows.

What you'll want to do is add a `FULLTEXT` index to the column you'll want to search, and build your query using `MATCH(column) AGAINST(word)`.
In it's most simple form, this could look like:

```sql
SELECT *
FROM table
WHERE MATCH(column) AGAINST('word');
```

MATCH even returns a score, so you can sort your results based on relevance (don't worry, the second MATCH won't cause additional overhead):

```sql
SELECT *
FROM table
WHERE MATCH(column) AGAINST('word')
ORDER BY MATCH(column) AGAINST('word') DESC;
```

## In boolean mode
[MySQL Docs](http://dev.mysql.com/doc/refman/5.7/en/fulltext-boolean.html)

By default, `MATCH` will search `IN NATURAL LANGUAGE MODE`, where each word in your `AGAINST` clause will evenly be checked against the column.
More advanced searched can be obtained via `IN BOOLEAN MODE`, which enables possibilities like excluding a certain word, or not weighing all words equally.

A full list of the available operators:

<table>
  <tr>
        <th>Character</th>
        <th>Usage</th>
    </tr>
    <tr>
        <td>+</td>
        <td>Indicates that this word MUST be present in the text.</td>
    </tr>
    <tr>
        <td>-</td>
        <td>Excludes matches that include this word, it MUST NOT be present in the text.</td>
    </tr>
    <tr>
        <td>(nothing)</td>
        <td>Optionally includes this word. Could still result in a match if not present (depending on other search term matches), but will yield a higher relevance score if matched.</td>
    </tr>
    <tr>
        <td>@distance</td>
        <td>Indicates the search terms should appear within distance words of each other. E.g.: word1, word2 & word3 should all appear within an 8-words range: MATCH(col1) AGAINST('"word1 word2 word3" @8' IN BOOLEAN MODE)</td>
    </tr>
    <tr>
        <td>&gt; &lt;</td>
        <td>Increases or decreases a word's importance in the relevance score.</td>
    </tr>
    <tr>
        <td>( )</td>
        <td>Groups words into a subexpression. Operators can be applied to subexpressions as a whole as well as to specific words.</td>
    </tr>
    <tr>
        <td>~</td>
        <td>Instead of adding to the relevance score, the word preceded by this operator (when matched) subtracts from it. Most commonly used to downgrade potential noise.</td>
    </tr>
    <tr>
        <td>*</td>
        <td>Wildcard character, matches anything that begins with the word.<br>Rather than leading the word (like other operators), this operator is appended.</td>
    </tr>
    <tr>
        <td>"</td>
        <td>Everything inside double quotes must be matched exactly (words only, not punctuation)</td>
    </tr>
</table>

Note that *(nothing)* indicates words are optional. This does not mean that, if nothing at all is matched, a result will be included. A column will still have to match at least 1 valid search term. Likewise, only within a set of matches, are - matches excluded: a clause with only a negated word does not make sense and will never return results, it should only be used in conjunction with (an)other (words) that are supposed to be match, then making sure matches excluding a certain word are stripped.

## Examples

Rows MUST contain *lorem*. *Ipsum* is optional, but if *ipsum* too is found, the row should score higher than if it's not.

```sql
MATCH(column) AGAINST('+lorem ipsum' IN BOOLEAN MODE)
```

Rows MUST contain *lorem*, but MUST NOT contain *dolor*. *Ipsum* is optional.

```sql
MATCH(column) AGAINST('+lorem ipsum -dolor' IN BOOLEAN MODE)
```

Rows MUST contain both *lorem* and *ipsum*. If sequential, in exactly that order, it'll score higher than if both words are scattered around the text (because that'll satisfy both subexpressions, scoring twice)

```sql
MATCH(column) AGAINST('(+lorem +ipsum) ("lorem ipsum")' IN BOOLEAN MODE)
```

Rows should contain either *lorem* or anything starting with *ips*. Matches with *lorem* should score higher than matches with words starting with *ips*.

```sql
MATCH(column) AGAINST('>lorem <ips*' IN BOOLEAN MODE)
```

## Caveats

You should be aware that some words are simply ignored by MySQL's full-text search and trying to match them will, even though they exist in your rows, not yield any results.

For starters, there's the `ft_min_word_len` and `ft_max_word_len` configuration directives, which indicate the minimum and maximum length a word may have to be indexed.
By default, `ft_min_word_len` is 4, so words with less than 4 characters, can not be searched for, unless you change this configuration directive (and rebuild the index after you did so.) Note that this is a server-wide setting that will affect all databases and can not be configured on a per-database level.

*You can circumvent this by padding all words in the search index with (`ft_min_word_len` - 1) characters, then also padding the search terms with those same characters. I don't encourage this work-around: if lower-character words are of importance, you should lower `ft_min_word_len`! But you may not have that option on shared hosting...*

Another common reason for words not being found is because they're on [MySQL's stopword list](http://dev.mysql.com/doc/refman/5.7/en/fulltext-stopwords.html). Common words like “the” or “and” are never indexed, much like Google does too.

# Scale

Now that we know how to accurately search in MySQL, you'll find it gets increasingly complex when dealing with data spread over multiple tables & columns, or when data gets really large.

Effectively searching data scattered throughout your database and then sorting them based on the search relevance score, it's quite impossible. You may be tempted to fire multiple queries per table, like:

```sql
SELECT id, title, image, text
FROM blog
WHERE
    publish_date > '2013-06-19 00:00:00' AND
    MATCH(title, text) AGAINST('lorem' IN BOOLEAN MODE)
ORDER BY MATCH(title, text) AGAINST('lorem' IN BOOLEAN MODE)
LIMIT 0, 10;
```

```sql
SELECT id, title, text
FROM pages
WHERE MATCH(title, text) AGAINST('lorem' IN BOOLEAN MODE)
ORDER BY MATCH(title, text) AGAINST('lorem' IN BOOLEAN MODE)
LIMIT 10, 0;
```

**Bad idea**! The queries are A-OK, but you're leaving it up to PHP (or your language of choice) to compile the data. Finding the first 10 result, over multiple tables, is not too hard: you just make every query return the first 10 results, puzzle the very top 10 together and discard the rest.

This won't scale though: if you're looking for search result 1000 to 1009, all queries should return their 1009 top results, and your PHP has to puzzle them all together to finally come up with which exactly make up 1000 to 1009. At some point, if your set of data grows large enough, this will get you into trouble. Also, as you want to search more tables, you'll fire more queries, which will also start to cripple the system eventually. You fail to scale on 2 levels.

You may try to be a smart-ass and rather than off-loading those results to PHP, you make sure they return uniform columns, and try to UNIONize them in MySQL, making MySQL order the whole set of individual tables' results. While that would likely be an improvement over letting PHP do this, you'll eventually run into the same problems.

Face it: you'll have to group the data into 1 search index.

## Search index

To make sure MySQL can effectively use the full-text index to its fullest extend, you'll want to have all searchable text grouped together, in 1 table. You can do this by simply duplicating your textual data into a designated search index table, and, while you're at it, strip it from all irrelevant noise (like HTML tags) that may affect the search: we only want bare text.

Make sure to also keep a reference to the original source of that data. If some day, you update your blog post, you should also changed the duplicate in the search index table.

A simplified example table could look like this, where text has a `FULLTEXT` index:

<table>
    <tr>
        <th>component</th>
        <th>component_id</th>
        <th>text</th>
    </tr>
    <tr>
        <td>blog</td>
        <td>1</td>
        <td>This is the title of blog entry #1</td>
    </tr>
    <tr>
        <td>blog</td>
        <td>1</td>
        <td>This is the text of blog entry #1</td>
    </tr>
    <tr>
        <td>blog</td>
        <td>2</td>
        <td>This is the title of blog entry #2</td>
    </tr>
    <tr>
        <td>blog</td>
        <td>2</td>
        <td>This is the text of blog entry #2</td>
    </tr>
    <tr>
        <td>page</td>
        <td>1</td>
        <td>This is the title of page #1</td>
    </tr>
    <tr>
        <td>page</td>
        <td>1</td>
        <td>This is the text of page #1</td>
    </tr>
    <tr>
        <td>...</td>
        <td>...</td>
        <td>...</td>
    </tr>
</table>

We had to write some more boilerplate code in our application (to make it insert, update and delete the data into `blog` and `page`, as well as in `search_index`), but scanning and sorting all data in our database is trivial now:

```sql
SELECT *, SUM(MATCH(text) AGAINST('lorem' IN BOOLEAN MODE)) as score
FROM search_index
WHERE MATCH(text) AGAINST('lorem' IN BOOLEAN MODE)
GROUP BY component, component_id
ORDER BY score DESC
LIMIT 0, 10;
```

## Callback

You may not have noticed, but the original example for finding blog posts also included a `publish_date > '2013-06-19 00:00:00'` condition, which we can not satisfy via our `search_index` table. Other tables may have even other conditions. Luckily, we already save a reference to the component and the id the real entry has there. This provides us with a unique opportunity to go verify the data.

Let's say we've just execute our query to `search_index` and it returned 7 blog entries and 3 pages. We can group those together

```php
$results = /* Search results returned by querying search_index */;
$components = array();
foreach($results as $result) {
    $component = $result['component'];
    $componentId = $result['component_id'];

    // build a per-component array of component ids
    $components[$component][] = $components[$componentId];
}
/*
$components may now look like:
array(
    'blog' => array(1, 2, 5, 8, 12, 13, 17),
    'page' => array(1, 3, 4)
);
*/
```

Having grouped those together, we can now fire individual, high-performance requests to both specific tables, which can now weed out search results that, after all, should not be included.

```php
// functions to return detailed information for both blog &
// page components, weeding out results that are no longer valid
function blog($ids) {
    return mysqli_query('
        SELECT id, title, image, text
        FROM blog
        WHERE
            publish_date > '2013-06-19 00:00:00' AND
            id IN ('. implode( ',', $ids ) .')
    ');
}
function page($ids) {
    return mysqli_query('
        SELECT id, title, image
        FROM page
        WHERE id IN ('. implode( ',', $ids ) .')
    ');
}

// pass the per-component grouped ids to the callback functions
// fill $verified with the actual verified search results
$verified = array();
foreach($components as $component => $ids) {
    $componentResults = call_user_func($component, $ids);
    $verified = array_merge($verified, $componentResults);
}
```

We now end up with exactly the same result we originally had. We did so in a scalable way, with only 3 highly performant queries, which all used an index.
To fetch 10 entries, the worst possible case is that we end up with 11 different queries: 1 to `search_index`, which utilises the `FULLTEXT` index, and potentially 10 queries to 10 different tables to verify the results, where the query utilised the indexed primary key column.

We're almost there, but have not yet completely covered all edge cases. What actually happens when the callbacks have dropped some results, leaving us with only 7 results?

Quite easy: you can just do exactly the same round again, starting from offset 10, asking for 1 more search result. Like this:

```sql
SELECT *, SUM(MATCH(text) AGAINST('lorem' IN BOOLEAN MODE)) as score
FROM search_index
WHERE MATCH(text) AGAINST('lorem' IN BOOLEAN MODE)
GROUP BY component, component_id
ORDER BY score DESC
LIMIT 10, 3;
```

Then go verify those results again and repeat until the full 10 results have been matched.

## Invalidate

If a lot of your search results are dropped (e.g. there are a lot of entries that can only be displayed after a certain time) and you're really short on resources, you could add an invalidation to your search index. After finding out results have been dropped in their respective callback functions, you can identify which they were and mark them in your `search_index` as invalid, so your `search_index` query can exclude them immediately.

**Caution**: this is an imperfect solution though. E.g. if an entry was dropped because of a time-constraint, it could be possible that 5 seconds later, if should no longer be dropped. If you do decide to include such invalidation, make sure your “marked as invalid”-entries are regularly re-verified!

Generally, you won't need to this though: since we've engineered our search to scale and perform well, going back for a second round to fetch new entries after some have been dropped, should not be a problem. And if your setup is so complex you'd actually need it, you're probably better off implementing a real search engine anyhow.
