
jquery.cssmate.js
=================
A blend of CSS3 transitions, jQuery and a touch of AS3-style tweening.

**Goal**
Provide a standard interface for scripting hardware accelerated transitions (on iOS), while falling back to JavaScript on all other platforms.

**Dependencies**
* [Modernizr](http://modernizr.com/)
* [jQuery](http://jquery.com/)

**Bundled**
* [jquery.easie.js](https://github.com/jaukia/easie)

**Version History**
0.8 - Initial release


Usage
-----

    .cssmate( properties, duration, easing, complete )

Create new transition using a familiar syntax:

    $(elem).cssmate({ x: 200 }, 500, "easeInOutQuart", myCallback);
    
Also supports custom "easie style" cubic-bezier easing:

    $(elem).cssmate({ x: 200 }, 500, $.easie(0.25,0.1,0.25,1.0), myCallback);
    
Chaining allows you to set multiple durations (and callbacks):

    $(elem).cssmate({ x: 200 }, 500, "ease").cssmate({ opacity: 0.5 }, 200, "easeOut");

CSS does not allow us to stop transitions, so we must reset values:

    $(elem).cssmate({ x: 0, y: 0, opacity: 1 });


**Defaults**

If any options are omitted, the following defaults are used:

    duration: 0
    easing: "ease"


**Utilities**

Boolean property to check CSS mode (can also be set for testing):

    $.cssmate.cssMode


Basic Properties (CSS with JS fallback)
---------------------------------------------

* x -- *translateX + left fallback*
* y -- *translateY + top fallback*
* opacity
* width
* height
* marginTop
* marginRight
* marginBottom
* marginLeft
* paddingTop
* paddingRight
* paddingBottom
* paddingLeft
* (any other **numeric** styles)

**Values**

Property values are treated as a number of pixels unless otherwise specified. The units em and % can be specified where applicable. **x and y** will always be converted to px for compatibility with CSS translation.

**Duration**

Durations are given in milliseconds; higher values indicate slower animations.


Advanced CSS Properties (No fallback)
------------------------------------------------

* transform -- *will overwrite x/y properties*
* origin -- *shortcut for transform-origin*

**Example**

    $(elem).cssmate({ transform: "translate3d(400px, 100px, 300px) rotate3d(0,1,1, 80deg)" }, 500);


Easing Shortcuts
----------------

**CSS3 defaults**

    ease
    ease-in
    easeIn
    ease-out
    easeOut
    ease-in-out
    easeInOut

**cubic-bezier curves**

    easeInCirc
    easeOutCirc
    easeInOutCirc
    easeInCubic
    easeOutCubic
    easeInOutCubic
    easeInExpo
    easeInOutExpo
    easeOutExpo
    easeInQuad
    easeInOutQuad
    easeOutQuad
    easeInQuart
    easeInOutQuart
    easeOutQuart
    easeInQuint
    easeInOutQuint
    easeOutQuint
    easeInSine
    easeInOutSine
    easeOutSine


Known Limitations
-----------------

* CSS mode is intentionally restricted to iOS + Modernizr.csstransforms3d.
* DOM manipulation is necessary in CSS mode, to ensure predictable callbacks. (meta tag container is inserted below the cssmate script tag)
* CSS transitions will ignore mid-transition duration updates unless a transitioning property is changed.
* No support for `delay`, `queue`, `step` or `specialEasing` options.
* No support for shortcuts such as `fadeIn()`, `toggle` or relative `+=` values.
* CSS properties that use matrix transforms `(x, y, or transform: "")` will share a single duration. If you need multiple durations for these, I suggest trying a nested div approach w/ multiple transitions.

TODOs
-----
* Add `visible` property that makes use of hide/show.
* Add utility for getting/setting x & y position.
* Add support for color properties.
* Port to Ender.js + morpheus.

Special Thanks
--------------
Janne Aukia ([janne.aukia.com](http://janne.aukia.com)) for writing [jquery.easie.js](https://github.com/jaukia/easie).


See Also
--------
* [Online Demo](http://cssmate.danro.net)
* [Custom Ease Tool](http://easie.danro.net/) (Mirror)
* [Custom Ease Tool](http://janne.aukia.com/easie/) (Original)
