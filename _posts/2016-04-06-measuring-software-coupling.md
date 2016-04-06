---
layout: post
title: Measuring software coupling
image: coupling.png
description: Coupling is about how objects in your application are connected. Which objects depend on which, and how does that affect the entire system's stability?
tags: [ metrics, php ]
---

Coupling is about how objects in your application are connected: which objects
depend on which, and how does that affect the entire system's stability?

An application has tight coupling when a lot of components depend on each other.
This should usually be avoided because a change in 1 place can cause issues in
any of its dependencies.

So what does coupling tell you about your classes?

<!-- more -->


# Afferent coupling

Afferent coupling denotes the amount of incoming dependencies, i.e. how many
other classes use this class.

Ideally, classes with high afferent coupling are small and have few
responsibilities. Because so many others depend on such classes, they're very
hard to change without breaking something somewhere. These classes should be
stable & thoroughly tested.

High afferent coupling is not necessarily a bad thing and will naturally occur
for certain pieces of code *(e.g. core functionality will usually score high)*.
It only becomes a problem if those classes change often, or if afferent coupling
is unnaturally high across the entire application.

**The more classes depend on a class, the higher the chance one of them breaks
when it changes.**


# Efferent coupling

Efferent coupling is about how many classes this class depends on, the maount of
outgoing dependencies.

In a sense, it's good to use other classes instead of duplicating that code, but
it makes a class much harder to maintain. With lots of dependencies *(e.g.
parent classes/interfaces or parameter/variable types)*, a class becomes:

* Harder to read & maintain (because you have to know about those other classes)
* Harder to reuse (because it needs all those other components)
* Harder to test in isolation (because you have to setup those other modules)
* Brittle (because changes in those dependencies may cause errors)

High efferent coupling is an excellent indicator that a class is probably doing
more than it should. Ideally, a class only has a [single responsibility](https://nl.wikipedia.org/wiki/SOLID).
An unfocused class like that can usually be decomposed into multiple smaller
classes with a single responsibility.

**The more dependencies a class has, the more likely it is to break when any of
those change.**


# Instability

The ratio between efferent & total coupling (efferent + afferent) defines the
(in)stability of a class. It shows how resilient a class is to change, how
hard it is to change a component without impacting others in the application.

Classes with high efferent coupling (with lots of dependencies) but low
afferent coupling (used by few others) are less stable: they're likely to be
impacted by changes in their dependencies, and they don't have much depending on
them so change is easy.

Stability or instability is about technical difficulty to change things, which
may be at odds with the need or desire to change it. High stability is good, as
long as you don't need to change the implementation often.

**A class should depend only on classes that are more stable that itself.**

If you want to look into coupling in your projects, head on to
[Cauditor](https://www.cauditor.org), a code metrics visualization project I've
been working on. Or run the [PDepend](https://pdepend.org) suite if you're only
interested in the raw metrics.
