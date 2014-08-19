---
layout: post
title: Using rollup tables to aggregate data in large datasets
---

![Picture]({{ site.url }}/public/posts/aggregate-data.png)

A myriad of features may prompt the need to aggregate your data, like showing an average score based on multiple values, or even simply showing the amount of entries that abide to a certain condition. Usually this is a trivial query, but this is often untrue when dealing with a huge dataset.

<!-- more -->

# What's the problem with a large dataset?

In moderately sized datasets, you could just construct a query using [MySQL's aggregate functions](http://dev.mysql.com/doc/refman/5.7/en/group-by-functions.html), like:

    SELECT COUNT(*)
    FROM products
    WHERE
        category = 'accessories' AND
        color = 'green'

Obviously, the above query would return all entries that, for columns `category` and `color`, have the values 'accessories' and 'green'. It would do so by looping all entries in this table, comparing the values for `category` and `color` to those respective values.

In a table with only a few hundred entries, this is easy. You can imagine that once the amount of entries in a table grows to millions, looping all entries is not a terribly bright idea, as it will take MySQL quite some time and effort to calculate that result. Once once the rate of requests outgrows the rate MySQL is able to respond to those requests, you're done.

One solution could be to add accurate indexes. MySQL can then promptly return the requested amount without having to put much effort into it, since those indexes would save it from having to loop all entries. If the conditions grow complex, however, you may find it gets increasingly less sane, if at all possible, to attempt to fix the problem by applying an index to the conditional columns.

# Rollup tables

Rollup tables are tables where totals for (combinations of) conditions are saved. A "summary table", that holds pre-aggregated values for all conditions you may need to fetch totals for.

If your data table has millions of entries, you can imagine it makes more sense directing your queries against a very small rollup table, than at the huge primary dataset.

An example rollup table could look like this:

<table>
  <tr>
		<th>category</th>
		<th>color</th>
		<th>total</th>
	</tr>
	<tr>
		<td>shirts</td>
		<td>red</td>
		<td>23578347</td>
	</tr>
	<tr>
		<td>shirts</td>
		<td>green</td>
		<td>14364323</td>
	</tr>
	<tr>
		<td>shirts</td>
		<td>blue</td>
		<td>46723343</td>
	</tr>
	<tr>
		<td>accessories</td>
		<td>red</td>
		<td>3452465</td>
	</tr>
	<tr>
		<td>accessories</td>
		<td>green</td>
		<td>867665</td>
	</tr>
	<tr>
		<td>accessories</td>
		<td>blue</td>
		<td>7609852</td>
	</tr>
	<tr>
		<td>pants</td>
		<td>red</td>
		<td>56878766</td>
	</tr>
	<tr>
		<td>pants</td>
		<td>green</td>
		<td>87067876</td>
	</tr>
	<tr>
		<td>pants</td>
		<td>blue</td>
		<td>759457363</td>
	</tr>
</table>

Assuming you accurately keep these totals in sync with the atomic source data in `products`, you'd be much better of executing this query:

    SELECT total
    FROM products_rollup
    WHERE
        category = 'accessories' AND
        color = 'green'

# Keeping rollup data in sync

You'll always want the rollup table's totals to accurately reflect the data in the source data's table, and keeping them in sync is definitely the biggest challenge. For every new insert, update or delete in the primary table, an update to several rows in the rollup table may be needed. To achieve this, you'll need to add some additional logic to your application.

## Full recalc

In it's most basic form, you could recalculate all rollup values immediately after updating data in the source table. What you'd do is query the source table (in our example, `products`) and `GROUP BY` the rollup columns. MySQL will loop all source records and respond with up-to-date rollup values, which you can immediately write to your rollup table:

    REPLACE INTO products_rollup
    SELECT category, color, COUNT(*)
    FROM products
    GROUP BY category, color

This is the easiest approach to keep your data in sync where, no matter what you change to your source table's data, all rollup data will accurately be updated.

The downside, however, is that you still perform this rather expensive query, that loops all entries in the source table. All reads will target the rollup table, but now every write will result in this hefty query. If you're in a write-heavy environment, this too may eventually lead to trouble.

## Per-entry update

Letting MySQL recalculate all rollup values is needlessly intensive. If we know exactly what changes, we can simply update only those specific rollup values.

Imagine that we add a new red accessory to our products table: we don't need to recalculate all values, we can just increase the rollup value for accessories/red with 1. All other rollup values can remain unchanged.

Although it's slightly more work to implement than the full recalc, this too can be done generic. For every single update to the source table, the relevant changes to the rollup table can be deduced. All we need to do is perform 1 read query to the source table before updating the data, and 1 after. Then we know the original and updated values, and know exactly which rollup values to update.

For starters, we would query the source table this entry's columns relevant to the rollup table: `category` and `color`:

    SELECT category, color
    FROM products
    WHERE id = 1

This could, for example, return:

<table>
	<tr>
		<th>category</th>
		<th>color</th>
	</tr>
	<tr>
		<td>shirts</td>
		<td>green</td>
	</tr>
</table>

After this, we update an entry, e.g.:

    UPDATE products
    SET
        category = 'shirts',
        color = 'blue'
    WHERE id = 1

And now, again, we issue another read-query for this entry, to identify which to the rollup table relevant values have changed:

    SELECT category, color
    FROM products
    WHERE id = 1

This would now return:

<table>
	<tr>
		<th>category</th>
		<th>color</th>
	</tr>
	<tr>
		<td>shirts</td>
		<td>blue</td>
	</tr>
</table>

Now we know exactly what rollups should change. The entry was originally shirts/green. It is not anymore, so we should deduct this one entry from that total for shirts/green. Since the entry is now shirts/blue, we should increase that rollup:

    UPDATE products_rollup
    SET value = value - 1
    WHERE category = 'shirts' AND color = 'green'

    UPDATE products_rollup
    SET value = value + 1
    WHERE category = 'shirts' AND color = 'blue'

You'll probably have noticed that this approach results in a couple of additional queries, none of which is expensive to execute, though. The 2 read queries can efficiently use the (primary key) index on the source table's id column, and both update queries are better than replacing all values in the rollup table.