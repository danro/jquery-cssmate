/* 
 * jquery.cssmate.js
 * 
 * Version: 0.8
 * 
 * CSS3 transition plugin w/ fallback to jQuery.animate
 * https://github.com/danro/jquery-cssmate
 * 
 * Copyright 2011, Dan Rogers
 * Released under the MIT License.
 * 
 */
(function($){
	"use strict";
	
	var agent = navigator.userAgent.toLowerCase(),
	cssMode = Modernizr.csstransforms3d && agent.match(/(iphone|ipod|ipad)/),
	prefixedTransform = "-webkit-transform",
	prefixedTransition = "-webkit-transition",
	endEvent = "webkitTransitionEnd",
	gpuTrigger = "translateZ(0px)",
	defaults = { duration: 0, easing: "ease" },
	TweenMan,
	easingMap = (function() {
		var i,j,name,
		result = {},
		myPrefix = "ease",
		ezPrefix = "easieEase",
		easeIn = "In",
		easeOut = "Out",
		easeInOut = "InOut",
		names = ["Quad","Cubic","Quart","Quint","Sine","Expo","Circ"]
		for (i=0, j=names.length; i<j; i++) {
			name = names[i];
			result[myPrefix + easeIn + name] = ezPrefix + easeIn + name;
			result[myPrefix + easeOut + name] = ezPrefix + easeOut + name;
			result[myPrefix + easeInOut + name] = ezPrefix + easeInOut + name;
		}
		result["linear"] = "easieLinear";
		result["ease"] = ezPrefix;
		result["ease-in"] = ezPrefix + easeIn;
		result["ease-out"] = ezPrefix + easeOut;
		result["ease-in-out"] = ezPrefix + easeInOut;
		result["swing"] = ezPrefix + easeInOut;
		result[myPrefix + easeIn] = ezPrefix + easeIn;
		result[myPrefix + easeOut] = ezPrefix + easeOut;
		result[myPrefix + easeInOut] = ezPrefix + easeInOut;
		return result;
	})(),
	cssTransforms = {
		"transform": true,
		"origin": true,
		"translateX": true,
		"translateY": true
	},
	cssPropertyMap = {
		"x": "translateX",
		"y": "translateY",
		"marginTop": "margin-top",
		"marginRight": "margin-right",
		"marginBottom": "margin-bottom",
		"marginLeft": "margin-left",
		"paddingTop": "padding-top",
		"paddingRight": "padding-right",
		"paddingBottom": "padding-bottom",
		"paddingLeft": "padding-left"
	},
	aniPropertyMap = {
		"x": "left",
		"y": "top"
	},
	cssMatrixPrefix = "matrix(",
	cssMatrixSuffix = ")",
	// regex for css numeric values
	cssValueRegex = /^([+\-]=)?([\d+.\-]+)([a-z%]*)$/i,
	// exclude the following css properties to add px
	cssNumber = {
		"zIndex": true,
		"fontWeight": true,
		"opacity": true,
		"zoom": true,
		"lineHeight": true,
		"widows": true,
		"orphans": true
	},
	// meta tags for CSS callbacks
	cbStartCount = 5,
	callbackPool,
	callbackTag = $('<meta style="display: block; width: 0; height: 0; overflow: hidden;" />'),
	callbackInner = '<meta style="display: inline; opacity: 0;" />';
	
	// cssmate plugin. Iterates over each element, starting tweens.
	$.fn.cssmate = function (properties, duration, easing, complete) {
		
		if (typeof duration !== "number") duration = defaults.duration;
		return this.each(function() {
			TweenMan.start($(this), properties, duration, easing, complete);
		});
	}
	
	// cssmate utility in jQuery namespace. Gets / sets special properties.
	$.cssmate = {
		
		cssMode: cssMode,
				
		position: function ($elem) {
			// TODO get and set... use first() here
			// return { x/y }
		}
	}
	
	// TweenMan: Stores up to 2 tweens per element (1 CSS + 1 jQuery), manages tween pool.
	TweenMan = {
		
		init: function () {
			var self = this;
			self.tweens = [];
			self.pool = new ObjectPool(Tween);
			callbackPool = new ObjectPool(Callback);
			// populate callback pool
			if ($.cssmate.cssMode) {
				var count = cbStartCount;
				while (count--) {
					callbackPool.add();
				}
			}
			$("body").append(callbackTag);
		},
		
		// start a tween using the element and appropriate cssMode
		start: function ($elem, properties, duration, easing, complete) {
			// clone properties to avoid modifying the original
			properties = $.extend({}, properties);
			// determine if CSS mode should be used
			var cssFlag = $.cssmate.cssMode;
			if (typeof properties.css === "boolean") {
				cssFlag = properties.css;
				delete properties.css;
			}
			// get & start tween
			this.get($elem, cssFlag).start(properties, duration, easing, complete);
		},
		
		// get tween from list or return new
		get: function ($elem, cssFlag) {
			var self = this;
			var tween,i,j;
			// check for existing tween
			for (i=0, j=self.tweens.length; i<j; i++) {
				tween = self.tweens[i];
				if (tween.$elem && tween.$elem[0] === $elem[0] && tween.cssFlag === cssFlag) return tween;
			}
			// otherwise acquire tween from pool and config
			tween = self.pool.acquire();
			self.tweens.push(tween);
			tween.config($elem, cssFlag);
			return tween;
		},
		
		// remove tween from list & release back into pool
		release: function (tween) {
			var self = this;
			var index = $.inArray(tween, self.tweens);
			if (index !== -1) self.tweens.remove(index);
			tween.init();
			self.pool.release(tween);
		}
	}
	
	// Tween: Dual mode class that will either tween an element in CSS mode or jQuery mode.
	function Tween () {
		this.init();
	}
	
	Tween.prototype = {
		
		init: function () {
			var self = this;
			self.$elem = null;
			self.cssFlag = null;
			self.props = {};
			self.duras = { map: {}, list: [] };
			self.start = null;
			self.callbacks = [];
			self.inChain = false;
		},
		
		config: function ($elem, cssFlag) {
			var self = this;
			self.$elem = $elem;
			self.cssFlag = cssFlag;
			self.start = cssFlag ? self.s1 : self.s2;
			self.end = cssFlag ? self.e1 : self.e2;
		},
		
		// CSS mode start
		s1: function (properties, duration, easing, complete) {
			// init CSS vars
			var self = this,
			i, j, p,
			newCssData = {},
			currentTransform = self.$elem.css(prefixedTransform);
			
			// trigger hardware acceleration for elements with no existing transform
			if (currentTransform === "none" || currentTransform === "") {
				self.$elem.css(prefixedTransform, gpuTrigger);
				currentTransform = self.$elem.css(prefixedTransform);
			}
			
			// set / remap incoming properties
			$.each(properties, function(p, value) {
				var mP = cssPropertyMap[p];
				if (!!mP) {
					self.props[mP] = value;
					properties[mP] = true;
					delete properties[p];
					return true; // continue
				}
				self.props[p] = value;
			});
			
			// arrange properties into style vs transform and set durations
			var styleProps = [];
			var transformProps = [];
			var isTransformNew = false;
			self.duras.list = [];
			
			$.each(self.props, function(p, value) {
				if (!!cssTransforms[p]) {
					transformProps.push(p);
					if (properties[p]) isTransformNew = true;
					return true; // continue
				}
				styleProps.push(p);
				// convert style value to proper units
				var parts = cssValueRegex.exec( value );
				if (parts) {
					var valueNum = parseFloat( parts[2] );
					var valueUnit = parts[3] || ( cssNumber[ p ] ? "" : "px" );
					self.props[p] = valueNum + valueUnit;
				}
				self.setDura(p, properties, duration, false);
			});
			
			// add styles to CSS data
			for (i=0, j=styleProps.length; i<j; i++) {
				p = styleProps[i];
				newCssData[p] = self.props[p];
			}
			
			// build transforms if they exist
			if (!!transformProps.length) {
				var startIndex = currentTransform.indexOf(cssMatrixPrefix);
				var endIndex = currentTransform.indexOf(cssMatrixSuffix);
				var currentMatrix = currentTransform.substring(startIndex + cssMatrixPrefix.length, endIndex).split(",");
				var newTransform = "";
				for (i=0, j=transformProps.length; i<j; i++) {
					p = transformProps[i];
					switch (p) {
						case "origin":
							newCssData[prefixedTransform + "Origin"] = self.props[p];
							break;
						case "transform":
							newTransform += self.props[p] + " ";
							break;
						case "translateX":
							currentMatrix[4] = " " + parseInt(self.props[p], 10);
							break;
						case "translateY":
							currentMatrix[5] = " " + parseInt(self.props[p], 10);
							break;
					}
				}
				// if no custom transform, use matrix
				if (newTransform === "") newTransform = cssMatrixPrefix + currentMatrix.join(",") + cssMatrixSuffix;
				// add transform to CSS data
				newCssData[prefixedTransform] = newTransform;
				// set duration and add transform to property list
				self.setDura("transform", properties, duration, isTransformNew);
				styleProps.push(prefixedTransform);
			}
			
			// set transition props
			newCssData[prefixedTransition + "Property"] = styleProps.join(", ");
			newCssData[prefixedTransition + "Duration"] = self.duras.list.join(", ");
			var easeName = easingMap[easing] ? easingMap[easing] : $.easing[easing] ? easing : null;
			var easeValue = easeName ? "cubic-bezier(" + $.easing[easeName].params.join(",") + ")" : defaults.easing;
			newCssData[prefixedTransition + "TimingFunction"] = easeValue;
			
			// set any previously-started callbacks to ignore
			var callback;
			for (i=0, j=self.callbacks.length; i<j; i++) {
				callback = self.callbacks[i];
				callback.ignore = !!callback.started;
			}
			
			// add a new callback on each CSS start
			callback = callbackPool.acquire();
			var eventData = { tween: self, callback: callback, duration: duration, complete: complete };
			self.callbacks.push(callback);
			callback.start(eventData);
			
			// apply css property map to start transition
			self.$elem.css(newCssData);
		},
		
		// set CSS durations
		setDura: function (p, properties, duration, forceNew) {
			var self = this;
			// if the duration already exists for this property
			if (!!self.duras.map[p]) {
				// overwrite duration if property is new
				if (forceNew || properties[p]) self.duras.map[p] = duration;
			// otherwise, store the duration
			} else {
				self.duras.map[p] = duration;
			}
			duration = self.duras.map[p];
			self.duras.list.push(duration + "ms");
		},
		
		// CSS mode end
		e1: function (event) {
			var e = event.data,
			self = e.tween;
			
			// invoke user complete function if possible
			if (!e.callback.ignore && $.isFunction(e.complete)) e.complete.call(self.$elem);
			
			// remove callback from array & release it to pool
			var index = $.inArray(e.callback, self.callbacks);
			if (index !== -1) self.callbacks.remove(index);
			e.callback.init();
			callbackPool.release(e.callback);
			
			// if callbacks array is empty, tween is ready for release
			if (self.callbacks.length === 0) {
				TweenMan.release(self);
			}
		},
		
		// jQuery mode start
		s2: function (properties, duration, easing, complete) {
			var self = this;
			
			// remap incoming properties
			$.each(properties, function(p, value) {
				var mP = aniPropertyMap[p];
				if (!!mP) {
					properties[mP] = value;
					delete properties[p];
					return true; // continue
				}
			});
			
			// invoke stop method and reset callbacks once per chain
			if (!self.inChain) {
				self.$elem.stop();
				self.callbacks = [];
				self.inChain = true;
			}

			// create new callback event object
			var callback = { complete: complete };
			self.callbacks.push(callback);
			
			// set animate options
			var options = {
				queue: false,
				duration: duration, 
				easing: easingMap[easing] || easingMap[defaults.easing],
				complete: function () {
					self.end(callback);
				}
			};
			
			// invoke animate with current props & options
			self.$elem.animate(properties, options);
			
			// reset inChain after zero timeout occurs
			if (typeof self.chainReset !== "undefined") clearTimeout(self.chainReset);
			self.chainReset = setTimeout(function () {
				self.inChain = false;
			}, 0);
		},
		
		// jQuery mode end
		e2: function (callback) {
			var self = this;
			
			var cbIndex = $.inArray(callback, self.callbacks);
			var cbInArray = cbIndex !== -1;
			
			// invoke user complete function if possible
			if (cbInArray && $.isFunction(callback.complete)) callback.complete.call(self.$elem);
			
			// remove callback from array
			if (cbInArray) self.callbacks.remove(cbIndex);
			
			// if callbacks array is empty, tween is ready for release
			if (self.callbacks.length === 0) {
				TweenMan.release(self);
			}
		}
	}
	
	// Callback: Stores a reference to a CSS callback meta tag.
	function Callback () {
		var self = this;
		self.$tag = $(callbackInner).appendTo(callbackTag);
		self.value = 0;
		self.init();
	}
	Callback.prototype = {
		
		init: function () {
			var self = this;
			self.ignore = false;
			self.started = false;
			if (self.tween) {
				self.$tag.unbind(endEvent, self.tween.end);
				self.tween = null;
			}
		},
		
		start: function (eventData) {
			var self = this;
			self.tween = eventData.tween;
			setTimeout(function () {
				if (eventData.duration > 0) {
					var cssData = {};
					cssData[prefixedTransition + "Property"] = "opacity";
					cssData[prefixedTransition + "Delay"] = eventData.duration + "ms";
					self.value = 1 - self.value; // toggle between 0 and 1
					cssData["opacity"] = self.value;
					self.$tag.bind(endEvent, eventData, self.tween.end);
					self.$tag.css(cssData);
					self.started = true;
				} else {
					self.tween.end({ data: eventData });
				}
			}, 0);
		}
	}
		
	// ObjectPool: Creates and stores reusable class objects.
	function ObjectPool (obj) {
		this.obj = obj;
		this.list = [];
	}
	
	ObjectPool.prototype = {
		
		add: function () {
			this.list.push( new this.obj() );
		},
		
		acquire: function () {
			if (this.list.length == 0) return new this.obj();
			return this.list.pop();
		},
		
		release: function (obj) {
			this.list.push(obj);
		}
	}
	
	// Array Remove - By John Resig (MIT Licensed)
	Array.prototype.remove = function(from, to) {
		var rest = this.slice((to || from) + 1 || this.length);
		this.length = from < 0 ? this.length + from : from;
		return this.push.apply(this, rest);
	}

	// init TweenMan after prototypes exist
	TweenMan.init();
	
})(jQuery);

/*
 * Example usage:
 * $(elem).animate( {top: 100}, $.easie(0.25,0.1,0.25,1.0) );
 */
 
/*
 * jquery.easie.js:
 * http://www.github.com/jaukia/easie
 *
 * Version history:
 * 1.0 Initial public version
 *
 * LICENCE INFORMATION:
 *
 * Copyright (c) 2011 Janne Aukia (janne.aukia.com),
 * Louis-Rémi Babé (public@lrbabe.com).
 *
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL Version 2 (GPL-LICENSE.txt) licenses.
 *
 * LICENCE INFORMATION FOR DERIVED FUNCTIONS:
 *
 * Function cubicBezierAtTime is written by Christian Effenberger, 
 * and corresponds 1:1 to the WebKit project function.
 * "WebCore and JavaScriptCore are available under the 
 * Lesser GNU Public License. WebKit is available under 
 * a BSD-style license."
 *
 */

/*jslint sub: true */

(function($) {
    "use strict";

    var prefix = "easie",
        ease = "Ease",
        easeIn = prefix+ease+"In",
        easeOut = prefix+ease+"Out",
        easeInOut = prefix+ease+"InOut",
        names = ["Quad","Cubic","Quart","Quint","Sine","Expo","Circ"];

    $.easie = function(p1x,p1y,p2x,p2y,name,forceUpdate) {
        name = name || [prefix,p1x,p1y,p2x,p2y].join("-");
        if ( !$.easing[name] || forceUpdate ) {
            // around 40x faster with lookup than without it in FF4
            var cubicBezierAtTimeLookup = makeLookup(function(p) {
                // the duration is set to 5.0. this defines the precision of the bezier calculation.
                // the animation is ok for durations up to 5 secs with this.
                // with the lookup table, the precision can be high without any big penalty.
                return cubicBezierAtTime(p,p1x,p1y,p2x,p2y,5.0);
            });
    
            $.easing[name] = function(p, n, firstNum, diff) {
                return cubicBezierAtTimeLookup.call(null, p);
            }
            $.easing[name].params = [p1x,p1y,p2x,p2y];
        }
        return name;
    }

    var $easie = $.easie;

    // default css3 easings

    $easie(0.000, 0.000, 1.000, 1.000, prefix+"Linear");
    $easie(0.250, 0.100, 0.250, 1.000, prefix+ease);
    $easie(0.420, 0.000, 1.000, 1.000, easeIn);
    $easie(0.000, 0.000, 0.580, 1.000, easeOut);
    $easie(0.420, 0.000, 0.580, 1.000, easeInOut);

    // approximated Penner equations, from:
    // http://matthewlein.com/ceaser/
    
    $easie(0.550, 0.085, 0.680, 0.530, easeIn+names[0]);
    $easie(0.550, 0.055, 0.675, 0.190, easeIn+names[1]);
    $easie(0.895, 0.030, 0.685, 0.220, easeIn+names[2]);
    $easie(0.755, 0.050, 0.855, 0.060, easeIn+names[3]);
    $easie(0.470, 0.000, 0.745, 0.715, easeIn+names[4]);
    $easie(0.950, 0.050, 0.795, 0.035, easeIn+names[5]);
    $easie(0.600, 0.040, 0.980, 0.335, easeIn+names[6]);
                    
    $easie(0.250, 0.460, 0.450, 0.940, easeOut+names[0]);
    $easie(0.215, 0.610, 0.355, 1.000, easeOut+names[1]);
    $easie(0.165, 0.840, 0.440, 1.000, easeOut+names[2]);
    $easie(0.230, 1.000, 0.320, 1.000, easeOut+names[3]);
    $easie(0.390, 0.575, 0.565, 1.000, easeOut+names[4]);
    $easie(0.190, 1.000, 0.220, 1.000, easeOut+names[5]);
    $easie(0.075, 0.820, 0.165, 1.000, easeOut+names[6]);
                    
    $easie(0.455, 0.030, 0.515, 0.955, easeInOut+names[0]);
    $easie(0.645, 0.045, 0.355, 1.000, easeInOut+names[1]);
    $easie(0.770, 0.000, 0.175, 1.000, easeInOut+names[2]);
    $easie(0.860, 0.000, 0.070, 1.000, easeInOut+names[3]);
    $easie(0.445, 0.050, 0.550, 0.950, easeInOut+names[4]);
    $easie(1.000, 0.000, 0.000, 1.000, easeInOut+names[5]);
    $easie(0.785, 0.135, 0.150, 0.860, easeInOut+names[6]);

    function makeLookup(func,steps) {
        var i;
        steps = steps || 101;
        var lookupTable = [];
        for(i=0;i<(steps+1);i++) {
            lookupTable[i] = func.call(null,i/steps);
        }
        return function(p) {
            if(p===1) return lookupTable[steps];
            var sp = steps*p;
            // fast flooring, see
            // http://stackoverflow.com/questions/2526682/why-is-javascripts-math-floor-the-slowest-way-to-calculate-floor-in-javascript
            var p0 = Math.floor(sp);
            var y1 = lookupTable[p0];
            var y2 = lookupTable[p0+1];
            return y1+(y2-y1)*(sp-p0);
        }
    }

    // From: http://www.netzgesta.de/dev/cubic-bezier-timing-function.html
    // 1:1 conversion to js from webkit source files
    // UnitBezier.h, WebCore_animation_AnimationBase.cpp
    function cubicBezierAtTime(t,p1x,p1y,p2x,p2y,duration) {
        var ax=0,bx=0,cx=0,ay=0,by=0,cy=0;
        // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
        function sampleCurveX(t) {return ((ax*t+bx)*t+cx)*t;}
        function sampleCurveY(t) {return ((ay*t+by)*t+cy)*t;}
        function sampleCurveDerivativeX(t) {return (3.0*ax*t+2.0*bx)*t+cx;}
        // The epsilon value to pass given that the animation is going to run over |dur| seconds. The longer the
        // animation, the more precision is needed in the timing function result to avoid ugly discontinuities.
        function solveEpsilon(duration) {return 1.0/(200.0*duration);}
        function solve(x,epsilon) {return sampleCurveY(solveCurveX(x,epsilon));}
        // Given an x value, find a parametric value it came from.
        function solveCurveX(x,epsilon) {var t0,t1,t2,x2,d2,i;
            function fabs(n) {if(n>=0) {return n;}else {return 0-n;}}
            // First try a few iterations of Newton's method -- normally very fast.
            for(t2=x, i=0; i<8; i++) {x2=sampleCurveX(t2)-x; if(fabs(x2)<epsilon) {return t2;} d2=sampleCurveDerivativeX(t2); if(fabs(d2)<1e-6) {break;} t2=t2-x2/d2;}
            // Fall back to the bisection method for reliability.
            t0=0.0; t1=1.0; t2=x; if(t2<t0) {return t0;} if(t2>t1) {return t1;}
            while(t0<t1) {x2=sampleCurveX(t2); if(fabs(x2-x)<epsilon) {return t2;} if(x>x2) {t0=t2;}else {t1=t2;} t2=(t1-t0)*0.5+t0;}
            return t2; // Failure.
        }
        // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
        cx=3.0*p1x; bx=3.0*(p2x-p1x)-cx; ax=1.0-cx-bx; cy=3.0*p1y; by=3.0*(p2y-p1y)-cy; ay=1.0-cy-by;
        // Convert from input time to parametric value in curve, then from that to output time.
        return solve(t, solveEpsilon(duration));
    }

})(jQuery);
