---
layout: post
title: Programmers don't evolve
image: evolve.png
description: I recently worked on a software metrics tool, which taught me a lot about the architecture of some of my work. Then I calculated the difference in metrics between mine and previous commits, plotted the results, and looked at my personal progress. Nothing!
tags: [ metrics ]
---

I recently worked on [a software metrics tool](https://www.cauditor.org), which
taught me a lot about the architecture of some of my work.

Then I calculated the difference in metrics between mine and previous commits,
plotted the results, and looked at my personal progress. **Nothing!**

<!-- more -->
<!-- ads -->

The chart below shows how my commits affected the maintainability index (which
indicates complexity) of the projects I have worked on in the last couple of
years. It spans a few thousand commits in a dozen or so projects in the last 5
years.

Commits without impact on the code (e.g. documentation, typo fixes) are ignored.

![My progress on the maintainability index metric]({{ site.baseurl }}/public/posts/metrics-me.png)

*The spike is from when I merged multiple existing small projects together, in 1
commit.*

# No progress

I had expected the chart to reveal that over time, my commits would improve.
Nope! My average commit still introduces about the same amount of complexity as
my commits 5 years ago did.

Overall, I was pretty happy with what I saw: I don't introduce too much
complexity and even get rid of some quite regularly. But there was no progress!
And not just on the maintainability index, all other metrics revealed the same
pattern. **Have I not improved?**

So I decided to check out some programmers I've worked with for awhile and have
seen grow. And much to my surprise: nothing! No progress. The charts are flat.

*If you're curious about your own progress, head on over to
[Cauditor](https://www.cauditor.org/user/progress) and let me know what yours
looks like!*

Then maybe these metrics are useless on a individual, per-commit level? Well...

# Different characteristics

Even though the metrics for my colleagues over time didn't really change, there
was a very noticeable difference between them!

One of them is very knowledgeable and built a lot of our application's
architecture. His code is usually robust and follows best practices. Here's how
his commits impacted the project's maintainability index:

![A colleague's progress on the maintainability index metric]({{ site.baseurl }}/public/posts/metrics-good.png)

Another friend is a force of nature. He cranks out so much code and so many
features in so little time:

![Another colleague's progress on the maintainability index metric]({{ site.baseurl }}/public/posts/metrics-bad.png)

Both of their impact didn't really change throughout the project, but they have
wildly different *signatures*.

# Programmer personalities?

I have no idea what all of this means! The lack of progress suggests that we
don't really change or grow during our career. Or maybe we do, and we're able to
take on more challenging tasks as we get better at keeping complexity under
control?

The differences between multiple people is notable however. That second one
obviously introduced a lot more complexity, whereas the first one even reduces a
lot of it from time to time.

And that corresponds with my experience working with them. That first colleague
didn't introduce too much complexity because he was diligent in refactoring
troubling pieces of code. And while that second guy was a lot faster, he cut the
occasional corner, causing more technical debt.

So far, these are my only conclusions based on a very limited set of data from
my (ex) coworkers and some industry leaders. I would love to learn more about
the correlation between software metrics and programmer personalities. You can
help me by answering [a few questions](https://www.cauditor.org/user/feedback)!
