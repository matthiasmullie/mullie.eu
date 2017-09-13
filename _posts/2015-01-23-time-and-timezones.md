---
layout: post
title: Time & timezones
image: timezones.png
description: If you've ever been in a different timezone than someone you want to communicate with, you'll know how annoying daylight saving times & timezones make it to coordinate time. Dealing with time isn't necessarily difficult, you just have to be consistent.
tags: [ time, php, mysql ]
---

If you've ever been far away from someone you want to communicate with, you'll
know how annoying daylight saving times & timezones make it to coordinate time
across the world.

You don't want your users to have to have to reason about that, so you'll have
to make your application do the work for them & display them the time at their
location.

Dealing with time isn't necessarily difficult, you just have to be consistent.

<!-- more -->
<!-- ads -->

# Get the correct timezone

Your web server usually won't know the location of your visitors & what timezone
they're in. You could do GeoIP lookups based on their IP and get it right most
of the time. We could even get their time in JavaScript (`new Date().getTimezoneOffset()`)
and pass that to the backend application. But usually you'll just ask them &
store it with the rest of their account information.

We now know that Jesse's in Australia/Sydney (GMT+10:00) and Alex in
Europe/Brussels (GMT+01:00). And our web server is in
America/Los_Angeles (GMT-08:00)

# Pick a standard time

... and stick with it!

Suppose Jesse's up late and leaves a comment on our website at 10:30PM (22:30).
Don't save that time to your database! For Alex, who reads the comment a couple
of minutes later, it's only just after 01:30PM (13:30). Alex is about to freak
out about seeing comments from the future!

Alex disagrees with time-traveling Jesse and immediately replies, at 01:35PM
(13:35). Jesse sees the comment and is confused how the reply to her comment
(at 01:35PM) is actually older than her initial comment (which was at 10:30PM).

We don't want none of that witchcraft!

## Set a standard

Instead of storing a time relative to the users, let your application generate
the time. The time on the server will always be consistent, relative to whatever
timezone it's configured at (e.g. UTC)

For PHP, that's the `date.timezone` in php.ini. Or you can set it on a
per-application level like this:

```php
date_default_timezone_set('UTC');
```

In UTC, Jesse's comment was at 12:30PM (12:30) & Alex replied at 12:35PM (12:35)

## Convert on output

Now that we store consistent times, we still want to personalize it for our
visitors and show the correct time in their timezone. Easy! Your programming
language of choice should have all the tools you need. In PHP, it'll be:

```php
// Create object based on normalized time in standard timezone (UTC)
// If we have properly configured the default timezone, we don't even have to
// pass this 2nd argument here, it'll just default to that
$date = new DateTime('2015-01-23 12:30:00', new DateTimeZone('UTC'));
// Convert to user timezone
$date->setTimezone(new DateTimeZone('Australia/Sydney'));
// Show the time in user timezone
$personalized = $date->format('Y-m-d H:i:s');
echo $personalized; // outputs 2015-01-23 23:30:00
```

<!-- ads -->

## ... and output only!

Don't use this user-specific time anywhere, though! Each and every operation
you do against the time (e.g. calculate how long ago it was) should be done on
your standard time. Mistakes like this are easy to make:

```php
// I want to compare the time of Jesse's reply against half an hour later
// However, I seem to have forgotten that it was already personalized and is no
// longer in UTC
$date = new DateTime($personalized);
$now = new DateTime('2015-01-23 13:00:00');

// Instead of the expected 30 minutes, the difference would be shown as 10 hours
// & 30 minutes (because of the 10 hour timezone difference)
echo $now->diff($date)->format('%H:%i:%s');
```

You don't want to start thinking about what time zone any given date is in, you
want to make sure that it's always in your default timezone. The only time you
convert it to the timezone the user is in, is right when you output it.

# Don't mix operations across your stack

Your database, your backend application and your frontend all have features to
manipulate time. You don't want to start mixing them, though. Here too, try to
pick 1 layer and attempt to do everything in there.

I once used MySQL's `NOW()` to store the exact timestamp of when something
was inserted. I then wanted to find everything between now and an hour ago, so I
did something like `WHERE timestamp > :hourago`, where `:hourago` was a
timestamp I had generated in PHP.

However, I also got results from over an hour ago - up until 2 hours ago! The
problem here was that my application server (which generated the `:hourago`
timestamp) was configured on UTC and my DB server was on UTC+1.

In MySQL (UTC+1), `NOW()` would be 04:00PM (16:00). In UTC, the current time
would still only be 03:00PM (15:00), so 1 hour ago was 02:00PM (14:00) as far as
PHP was concerned. I then passed that value to MySQL (which was 2 hours ahead of
14:00 already), so I ended up getting more results than I anticipated. I should
either have generated the insert timestamp in PHP, of the comparison "1h ago" in
MySQL.

The MySQL configuration directive for the default timezone is `system_time_zone`,
but even if you've ensured that both your application & DB server are properly
configured, you should try to limit doing time-related operations on both: 1 of
them could be running faster than another and you could still get differences...
