
// jquery.cssmate.js demo

$(window).load( function () {
	startExample();
});

function startExample () {
	var testSubject = $('.test-subject');
	var testMethods = {};
	
	addButton("test 1", function () {
		testSubject.cssmate({ x: 100, y: 100, opacity: 0.5 }, 500, "easeOutQuart").cssmate({ width: 500, height: 200 }, 900, "easeInOutExpo", function(){
			console.log("callback")
		});
	});
	
	addButton("test 2", function () {
		testSubject.cssmate({ x: 200, y: 100, opacity: 1 }, 400, "easeOutQuint").cssmate({ width: 300, height: 100 }, 500, "easeInOutQuart");
	});
	addButton("test 3", function () {
		testSubject.cssmate({ x: 0, y: 0, opacity: 0.5 }, 600, "easeOutQuint").cssmate({ width: 300, height: 300 }, 200);
	});
	addButton("test 4", function () {
		testSubject.cssmate({ x: 400, y: 0, opacity: 1 }, 600, "easeOutQuint").cssmate({ width: 300, height: 300 }, 200);
	});
	addButton("special 1", function () {
		testSubject.cssmate({ transform: "translateY(100px) rotate3d(0,0,1, 10deg)" }, 500, "easeInOutQuint");
	});	
	addButton("special 2", function () {
		testSubject.cssmate({ transform: "translate3d(400px, 100px, 300px) rotate3d(0,1,1, 80deg)" }, 500, "easeInOutQuint");
	});
	addButton("reset", function () {
		testSubject.cssmate({ x: 0, y: 0, opacity: 1 }).cssmate({ width: 300, height: 100 });
		testSubject.cssmate({ transform: "translate3d(0,0,0)" });
	});
	
	// debug
	// $.cssmate.cssMode = true;
	
	testSubject.text($.cssmate.cssMode ? "css mode" : "js mode");
	
	function addButton (name, obj) {
		$('#nav').append('<a href="">'+name+'</a>');
		var btn = $('#nav a:last');
		btn.bind('click', false);
		btn.bind('mousedown', clickHandler);
		btn.bind('touchstart', clickHandler);
		testMethods[name] = obj;
	}
	
	function clickHandler (event) {
		var self = $(event.target);
		testMethods[self.text()]();
		event.preventDefault();
	}
};
