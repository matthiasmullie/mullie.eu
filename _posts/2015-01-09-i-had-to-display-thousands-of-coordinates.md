---
layout: post
title: I had to display thousands of coordinates
image: clustering.png
description: I recently pushed some PHP code to cluster coordinates that helped me cope with hundreds of thousands of geographic locations. Turns out drawing all of those on a map isn't that trivial...
tags: [ php, javascript, geography, scaling ]
---

I recently pushed some PHP [code to cluster coordinates](https://github.com/matthiasmullie/geo)
that helped me cope with hundreds of thousands of geographic locations.

Turns out drawing all of those on a map isn't that trivial...

<!-- more -->

It was about time I got around to tidying up & publishing that code. I'm not
even sure it is still relevant nowadays, although I assume it still is. I think
it's been about 2 years ago since I worked on this, so if anything I say has
drastically changed by now, please [let me know](http://www.mullie.eu/contact.html)!


# Problems

I was using [Google Maps](https://maps.google.com/) & was looking for some
JavaScript to cluster all of my coordinates: so many individual markers would
just be unclear. There were some great clustering scripts out there!

However:

1. Hundreds of thousands of locations is a lot to process. It takes a while for
all of them to be looped and clustered together.
2. If you zoom in/out or pan the map, the markers & clusters need to be redrawn,
so they have to be kept in memory in the meantime. This doesn't scale.
3. You have to actually get all of those coordinates to your frontend, either in
the HTML source or via an API call. That many makes for a sizable download on
slow connections.

As much as the JS clustering tools surprised me with their ability to process
lots of markers, they still couldn't quite handle the amount I was feeding them.
And then there was still problem #3.


# Strategy

The solution for #3 was obvious: do the clustering in the backend, so we don't
have to transmit that much data to the frontend. Now we only need to feed it the
coordinates of the clusters + how many there were, and the leftover
(unclustered) coordinates.

Wait a minute, that actually fixes #1 as well!

That's [the PHP clusterer](https://github.com/matthiasmullie/geo) I recently
pushed. You can give it a viewport & throw a big batch of coordinates at it, and
it wil cluster coordinates whenever enough of them are in the same sector of a
map.

For scaling reasons, it will not keep any coordinate in memory. As all of them
are being processed, the bounds & center of the clusters are immediately
adjusted and the coordinate is discarded. No matter how many coordinates you
give it, never will it store more than the specified amount of clusters, plus
some individual coordinates when there just weren't enough to cluster.


# Conundrum

We didn't solve #2 yet, though. In fact, we made that one worse: if JS no longer
has all locations, it can't redraw them when we zoom or pan the map.

So... I decided that, when that happens, we just have to re-fetch & re-cluster
markers serverside.

I hooked the zoom & pan actions and made sure all previously drawn markers
are cleared. Meanwhile, a new API call is launched to fetch markers & clusters
within the new viewport.

While that now effectively fixes #2, it also means the API is about to receive
a ton of additional calls. Even though the PHP clusterer can handle however many
coordinates, it still takes some time to run. Requests would not be completed
instantaneously, as you would like.


# Cache...

In order to deal with the amount of traffic we're about to send to the API, and
in order to get lightning fast responses, I decided to cache the output.

But what's there to cache? Every request is different, it'll be for wildly
varying viewports. Yep!

I decided to round the viewports before requesting the coordinates and clusters
from the API. Suppose I'm was viewing Kortrijk, BE, with a viewport of roughly
these coordinates:

`(northeast: lat 50.853644, lng 3.298559) to
(southwest: lat 50.806262, lng 3.213587)`

The request I would send to the API would be rounded. I would request all
markers and clusters for, e.g.:

`(northeast: lat 51.000000, lng 3.500000) to
(southwest: lat 50.500000, lng 3.000000)`

That would get me too much coordinates & clusters for my viewport, but still a
known maximum, which I could easily cache. If I then panned to a neighbouring
city, I might just be able to reuse my existing coordinates. Say we move to
Waregem, BE: it's still in the rounded bounds I requested (& cached):

`(northeast: lat 50.896700, lng 3.445458) to
(southwest: lat 50.880836, lng 3.422627)`


# ... or don't

This might look like a lot of cache to you: even when rounded, there's a lot
of sectors you have to cache clustering results for. That's a lot of cache
storage.

Again, you are correct.

However, the zoomed-in viewports were never really a problem. If our maps only
covers a very limited ground, we'll probably only have a couple of markers on
there anyway.

The biggest problem was when your viewport covers a lot of ground, like an
entire country, continent or even the entire world. Those are the ones we really
want to cache!

The more you zoom out, the less "sectors" there will be to cache. In the minimum
zoom level, there will only be the entire world. No matter how you pan the map,
you'll always see the entire world. So for the maximum zoom level, we only need
to cache 1 requests (coincidentally the most expensive of them all: the one that
clusters all coordinates)

As we zoom in, the amount of rounded-down bounds keeps growing, but the
importance of caching the result keeps shrinking, as there'll be fewer and fewer
coordinates.
