---
layout: post
title: Async processing or multitasking in PHP
image: parallel-processing.png
description: In PHP, there are multiple ways to process data in parallel, although not one will work in every single environment. There is no one true solution, and whichever suits you best will mostly come down to your specific task.
tags: [ php ]
---

In PHP, there are multiple ways to process data asynchronously, although not one will work in every single environment. There is no one true solution, and whichever suits you best will mostly come down to your specific task.

Although both multithreading and multiprocessing can be used to process code in parallel, it probably makes sense to first distinguish between the two.

<!-- more -->

# Thread

To speed up the execution of multiple tasks, it makes sense to split the work over multiple threads, each performing a smaller task. On a multi-core or on multiple processors, this will mean that multiple processors can do a part of the work that needs to be done, at the same time, rather than completing everything sequentially, in 1 single thread of execution.

Threads are part of the same process, and will usually share the same memory & file resources. Not properly accounted for, this can lead to unexpected results like race conditions or deadlocks. In PHP however, this will not be the case: memory is not shared, though it is still possible to affect data in another thread.

## pthreads
[PHP Docs](http://php.net/manual/en/book.pthreads.php)

The only multithreading solution in PHP is the pthreads extension. In it's most simple form, you'd write code like this to perform work asynchronously:

```php
<?php

class ChildThread extends Thread {
    public $data;

    public function run() {
      /* Do some work */

      $this->data = 'result';
    }
}

$thread = new ChildThread();

if ($thread->start()) {
    /*
     * Do some work here, while already doing other
     * work in the child thread.
     */

    // wait until thread is finished
    $thread->join();

    // we can now even access $thread->data
}
```

Results achieved via async processing in threading's most basic form, like this, can also be obtained via multiprocessing. All we do here is just splitting the work over 2 threads, to eventually, upon completion, process the second thread's result in the original thread. Threading really gains an edge over multiprocessing if it's necessary to transfer data between threads or to keep the execution of several steps in both threads in sync, via synchronized(), notify() and wait().

**pthreads is a [PECL extension](http://pecl.php.net/package/pthreads), compatible with a ZTS (Zend Thread Safe) PHP 5.3 and up.** It's not a part of PHP core, so you'll have to `pecl install pthreads` it.

For some advanced examples on how to use threading, check out the [GitHub page](https://github.com/krakjoe/pthreads/tree/master/examples).

### Amp\Thread
[Docs](https://github.com/amphp/thread)

Amp\Thread is a particularly interesting implementation of pthreads along with their [Amphp async multitasking framework](https://github.com/amphp/amp).

The cool thing about this project is that it hides the complex async work behind a promises-based interface, like:

```php
<?php

function work() {
    /* Do some work */

    return 'result';
}

$dispatcher = new Amp\Thread\Dispatcher;

// call 2 functions to be executed asynchronously
$promise1 = $dispatcher->call('work');
$promise2 = $dispatcher->call('work');

$comboPromise = Amp\all([$promise1, $promise2]);
list($result1, $result2) = $comboPromise->wait();

// $result1 & $result2 now contain the results of both threads
```

**Amp/Thread is designed specifically for CLI applications. You'll need PHP5.5+ and pthreads installed.**

### hack's async
[Docs](http://docs.hhvm.com/manual/en/hack.async.php)

If you're running [Facebook's HHVM](http://hhvm.com/), you can run [Hack](http://docs.hhvm.com/manual/en/hacklangref.php) code. Hack is an addition to plain old PHP: existing PHP will still run fine, but you can use additional Hack-specific features.

One of those features is `async`. While it's not exactly multithreading, it still allows you to launch separate "threads" for code that is not blocked on CPU (like waiting for an API response to come back):

```hack
<?hh

async function work(): Awaitable<string> {
    /*
     * Do some work here. This could e.g. be an API call.
     * (while that's being done, CPU will be free to execute
     * code elsewhere)
     */
    await SleepWaitHandle::create(1000);

    return 'result';
}

$thread = work();

/*
 * Do some work here - will be executed while work() is blocked.
 */

// wait until "thread" is finished & get the result
$data = $thread->getWaitHandle()->join();
```

See [the blog post on async](http://hhvm.com/blog/7091/async-cooperative-multitasking-for-hack) for more elaborate info & examples of `async`.

**Note that you have to be running HHVM instead of the Zend engine.**

# Process

A process is 1 independent application run. While one PHP process can spawn a second process, both processes will be completely isolated and won't share any memory or handles, making it much harder to actually sync data between them (although, e.g. using external resources, not completely impossible.)

## pcntl_fork
[PHP Docs](http://php.net/pcntl_fork)

Forking a process will result in the request being cloned into an exact replica, though with it's own address space. Both the parent and the child (forked) process will be exactly the same up until the moment of the fork, e.g.: any variables up to that point will be exactly the same in both processes. After forking, changing a variable's value in one process doesn't affect the other process though.

```php
<?php

$var = 'one';

$pid = pcntl_fork();

/*
 * From this point on, the process has been forked (or
 * $pid will be -1 in case of failure.)
 *
 * $pid will be a different value in parent & child process:
 * * in parent: $pid will be the process id of the child
 * * in child: $pid will be 0 (zero)
 *
 * We can define 2 separate code paths for both processes,
 * using $pid.
 */

if ($pid === -1) {
    exit; // failed to fork
} elseif ($pid === 0) {
    // $pid = 0, this is the child thread

    /*
     * Existing variables will live in both processes,
     * but changes will not affect other process.
     */
    echo $var; // will output 'one'
    $var = 'two'; // will not affect parent process

    /* Do some work */
} else {
    // $pid != 0, this is the parent thread

    /*
     * Do some work, while already doing other
     * work in the child process.
     */

    echo $var; // will output 'one'
    $var = 'three'; // will not affect child process

    // make sure the parent outlives the child process
    pcntl_wait($status);
}
```

For processing data in parallel, multiprocessing can be a perfectly valid solution. It's no 1-on-1 substitute for multithreading though: it's a separate technique entirely, and both just happen to be useful for multitasking. And although multithreading makes it much easier to synchronize threads or swap data from parent to children, it can be accomplished in multiprocessing too, manually, via external resources (e.g. via files, databases, caches.). Beware of simultaneous requests though!

**Note that pcntl_fork will not work if PHP is being run as an Apache module, in which case this function will not exist!**

## popen
[PHP Docs](http://php.net/popen)

While we've seen 2 strategies to split one request into 2 different execution paths (either via threading or forking), we could also just launch a new request. Here too, it'll be harder to communicate between parent and child processes.

**child.php**

```php
<?php

/*
 * This is the child process, it'll be launched
 * from the parent process.
 */

/* Do some work */
```

**parent.php**

```php
<?php

/*
 * This is the process being called by the user.
 * From here, we'll launch child process child.php
 */

// open child process
$child = popen('php child.php', 'r');

/*
 * Do some work, while already doing other
 * work in the child process.
 */

// get response from child (if any) as soon at it's ready:
$response = stream_get_contents($child);
```

This is an extremely simple example: the child process will be launched without any context whatsoever. You could however also pass along some parameters relevant to the child script. E.g. `popen('php child.php -f filename.txt', 'r');` would pass a filename to the child script, which could add some context for that script on what exactly it should process.

Upon having called `popen`, the parent script will resume its execution without waiting for the child process to complete. It will only wait for the child process until `stream_get_contents` is called.

Should you want to make `stream_get_contents` block the parent's execution, however, you could add `stream_set_blocking($child, 0)`. Getting `stream_get_contents` of such non-blocked stream before it has completed, will result in only partial response. To read the full response, all `stream_get_contents`' on the child stream should be concatenated until `feof($child)` returns true. Only then does the parent know the child process has completed.

**Note that the commands to popen will depend on your environment. Installed binaries or paths may differ, especially across operating systems.**

## fopen/curl/fsockopen

If you're unsure of the environment your software will be run, `popen` may not be an option: the desired commands may be non-existing or limited. Similar to the `popen` approach, web applications could fire separate child processes to the web server running the current request.

A variety of functions could be used, all with their limitations:
* `fopen` is the easiest to implement, but will not work if `allow_url_fopen` has been set to false,
* `curl` may not be installed in every environment,
* `fsockopen` should always work, regardless of `allow_url_fopen`, but is much harder to implement, as you'll have to deal with raw headers, for both the child's request & response.

This approach looks very similar to the `popen` solution. For `fopen`, this would be:

**child.php**

```php
<?php

/*
 * This is the child process, it'll be launched
 * from the parent process.
 */

/* Do some work */
```

**parent.php**

```php
<?php

/*
 * This is the process being called. From here,
 * we'll launch child process child.php
 */

// open child process
$child = fopen('http://'.$_SERVER['HTTP_HOST'].'/child.php', 'r');

/*
 * Do some work, while already doing other
 * work in the child process.
 */

// get response from child (if any) as soon at it's ready:
$response = stream_get_contents($child);
```
