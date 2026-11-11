(function ($) {
	"use strict";

	/* Fixed Header */
	jQuery(window).scroll(function () {
		var hh = $("header#masthead").outerHeight();
		if (jQuery(this).scrollTop() >= 150) {
			jQuery("header#masthead").addClass("fixed-header");
			jQuery("body").css("margin-top", hh);
		} else {
			jQuery("header#masthead").removeClass("fixed-header");
			jQuery("body").css("margin-top", 0);
		}
	});

	// Mobile Menu
	/*$(".mobile-menu-button").click(function () {
		$("#site-navigation").toggleClass("is-open");
		//$("header").toggleClass("is-active");
		$(this).toggleClass("is-active");
		$("body").toggleClass("mobile-menu-open");
	});*/

	$("body").on('click','.mobile-menu-button',function () {
		$("body #site-navigation").toggleClass("is-open");
		$("body header").toggleClass("is-active");
		$(this).toggleClass("is-active");
		$("body").toggleClass("mobile-menu-open");
	});

	if (jQuery(window).width() <= 767) {
		jQuery(".footer-menu ul").hide();
		jQuery(".footer-menu h5").click(function (e) {
			e.preventDefault();
			jQuery(this).parent().toggleClass("active");
			jQuery(this).next(".footer-menu ul").slideToggle("slow");
		});
	}

	// Footer Menu

	var path = window.location.href;

	// because the 'href' property of the DOM element is the absolute path
	$(".footer-menu ul a").each(function () {
		if (this.href === path) {
			$(this).addClass("active");
		}
	});

	// Height js

	jQuery(window).on("load resize", function () {
		var eventBoxHeight = 0; //for the description section

		//Calculating the header new height
		jQuery(".event_header:first-child").each(function () {
			if (eventBoxHeight < jQuery(this).outerHeight()) {
				eventBoxHeight = jQuery(this).outerHeight();
			}
		});

		//Set the header new height
		jQuery(".event_header").css("min-height", eventBoxHeight);
	});

	jQuery(window).on("load resize", function () {
		var directoryBoxHeight = 0; //for the description section

		//Calculating the header new height
		jQuery(".p-directory-box:first-child").each(function () {
			if (directoryBoxHeight < jQuery(this).outerHeight()) {
				directoryBoxHeight = jQuery(this).outerHeight();
			}
		});

		//Set the header new height
		jQuery(".p-directory-box").css("min-height", directoryBoxHeight);
	});

	const mediaQuery = window.matchMedia("(min-width: 768px)");
	// Check if the media query is true
	if (mediaQuery.matches) {
		// Then trigger an alert
		jQuery(window).on("load resize", function () {
			var eventBoxHeightSponder = 0; //for the description section

			//Calculating the header new height
			jQuery(".up_events-img:first-child").each(function () {
				if (eventBoxHeightSponder < jQuery(this).outerHeight()) {
					eventBoxHeightSponder = jQuery(this).outerHeight();
				}
			});

			//Set the header new height
			jQuery(".up_events-img").css("min-height", eventBoxHeightSponder);
		});
	}

	$(".dropdown-name").click(function () {
		$(this).next().slideToggle("slow");
	});

	jQuery(".filtter-btn,.close-filtter").click(function () {
		jQuery(".up_events_genre").slideToggle("slow");
		jQuery("html").toggleClass("hidden");
	});

	// Counter js

	function inVisible(element) {
		//Checking if the element is
		//visible in the viewport
		var WindowTop = $(window).scrollTop();
		var WindowBottom = WindowTop + $(window).height();
		var ElementTop = element.offset().top;
		var ElementBottom = ElementTop + element.height();
		//animating the element if it is
		//visible in the viewport
		if (ElementBottom <= WindowBottom && ElementTop >= WindowTop)
			animate(element);
	}

	function animate(element) {
		//Animating the element if not animated before
		if (!element.hasClass("ms-animated")) {
			var maxval = element.data("max");
			var html = element.html();
			element.addClass("ms-animated");
			$({
				countNum: element.html(),
			}).animate(
				{
					countNum: maxval,
				},
				{
					//duration 5 seconds
					duration: 5000,
					easing: "linear",
					step: function () {
						element.html(Math.floor(this.countNum) + html);
					},
					complete: function () {
						element.html(this.countNum + html);
					},
				}
			);
		}
	}

	//When the document is ready
	$(function () {
		//This is triggered when the
		//user scrolls the page
		$(window).scroll(function () {
			//Checking if each items to animate are
			//visible in the viewport
			$("h3[data-max]").each(function () {
				inVisible($(this));
			});
		});
		if ($(window).width() <= 991) {
			$("h3[data-max]").each(function () {
				inVisible($(this));
			});
		}
	});

	// End Counter js

	

})(jQuery);

// AOS INIT
jQuery(function () {
	AOS.init({
		once: true,
		duration: 1000,
	});
});
document.addEventListener("mousemove", (e) => {
	AOS.refresh();
});
document.addEventListener(
	"scroll",
	function (event) {
		AOS.refresh();
	},
	true
);

// if (jQuery(".partners-directory-slider>div").length > 4) {
// 	jQuery(".partners-directory-slider").slick({
// 		slidesToShow: 4,
// 		rows: 2,
// 		slidesToScroll: 1,
// 		arrows: true,
// 		prevArrow: '<button class="slide-arrow prev-arrow"></button>',
//     	nextArrow: '<button class="slide-arrow next-arrow"></button>',
// 		dots: false,
// 		infinite: false,
// 		responsive: [
// 			{
// 				breakpoint: 1300,
// 				settings: {
// 					slidesToShow: 3,
// 					slidesToScroll: 1,
// 				},
// 			},
// 			{
// 				breakpoint: 992,
// 				settings: {
// 					rows: 1,
// 					slidesToShow: 3,
// 					slidesToScroll: 1,
// 				},
// 			},
// 			{
// 				breakpoint: 560,
// 				settings: {
// 					rows: 1,
// 					slidesToShow: 1,
// 					slidesToScroll: 1,
// 				},
// 			},
// 		],
// 	});
// } else {
// 	jQuery(".partners-directory-slider").slick({
// 		slidesToShow: 4,
// 		rows: 1,
// 		slidesToScroll: 1,
// 		arrows: true,
// 		prevArrow: '<button class="slide-arrow prev-arrow"></button>',
//     	nextArrow: '<button class="slide-arrow next-arrow"></button>',
// 		dots: false,
// 		infinite: false,
// 		responsive: [
// 			{
// 				breakpoint: 1300,
// 				settings: {
// 					slidesToShow: 3,
// 					slidesToScroll: 1,
// 				},
// 			},
// 			{
// 				breakpoint: 992,
// 				settings: {
// 					rows: 1,
// 					slidesToShow: 2,
// 					slidesToScroll: 1,
// 				},
// 			},
// 			{
// 				breakpoint: 560,
// 				settings: {
// 					rows: 1,
// 					slidesToShow: 1,
// 					slidesToScroll: 1,
// 				},
// 			},
// 		],
// 	});
// }

 	jQuery(".partners-directory-slider").slick({
 		slidesToShow: 4,
 		slidesToScroll: 1,
 		arrows: true,
 		nextArrow: jQuery(".partners-next"),
	    prevArrow: jQuery(".partners-prev"),
 		dots: false,
 		infinite: false,
 		responsive: [
 			{
 				breakpoint: 992,
 				settings: {
 					slidesToShow: 2,
 					slidesToScroll: 1,
 				},
 			},
 			{
 				breakpoint: 560,
 				settings: {
 					slidesToShow: 1.3,
 					slidesToScroll: 1,
 				},
 			},
 		],
 	});
 

jQuery(".event-slider").slick({
	slidesToShow: 3,
	slidesToScroll: 1,
	arrows: true,
	nextArrow: jQuery(".event-next"),
	prevArrow: jQuery(".event-prev"),
	dots: false,
	infinite: false,
	responsive: [
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
			},
		},
		{
			breakpoint: 560,
			settings: {
				slidesToShow: 1.3,
				slidesToScroll: 1,
			},
		},
	],
});

jQuery(".video-slider").slick({
	slidesToShow: 2.4,
	slidesToScroll: 1,
	arrows: true,
	nextArrow: jQuery(".slide-next2"),
	prevArrow: jQuery(".slide-prev2"),
	dots: false,
	infinite: false,
	responsive: [
		{
			breakpoint: 992,
			settings: {
				slidesToShow: 1.9,
				slidesToScroll: 1,
			},
		},
		{
			breakpoint: 560,
			settings: {
				slidesToShow: 1.1,
				slidesToScroll: 1,
			},
		},
	],
});

jQuery(document).ready(function () {

	var h = jQuery("#masthead").innerHeight();
	jQuery(".event_content .button").click(function() {
		jQuery('html, body').animate({
			scrollTop: jQuery("#tt-widget-inline-0").offset().top - (h+20)
		}, 1000);
	});

	jQuery(window).on("resize", function (e) {
		checkScreenSize();
	});

	checkScreenSize();

	function checkScreenSize() {
		var newWindowWidth = jQuery(window).width();
		if (newWindowWidth < 768) {
			jQuery(".logo-slider").slick({
				slidesToShow: 2.6,
				slidesToScroll: 1,
				arrows: false,
				dots: false,
				autoplay: true,
				autoplaySpeed: 0,
				speed: 3000,
				cssEase: "linear",
				infinite: true,
				focusOnSelect: false,
			});

			jQuery(".mobile-toggle").append("<span></span>");
			jQuery(".mobile-toggle").click(function () {
				jQuery(this).next("ul").slideToggle();
				jQuery(this).toggleClass("active");

				setTimeout(function () {
					AOS.refresh();
				}, 400);
			});
		} else {
			// jQuery(".logo-slider").slick("unslick");
			jQuery(".mobile-toggle span").remove();
			jQuery(this).next("ul").stop().slideToggle();
		}
	}
});

//Video-Popup
jQuery(document).ready(function () {
	if (jQuery(".play-icon").length) {
		/*jQuery(".play-icon").magnificPopup({
			type: 'inline',
			callbacks: {
				open: function() {
					$('html').css('margin-right', 0);
					// Play video on open:
					$(this.content).find('video')[0].play();
				},
				close: function() {
					// Reset video on close:
					$(this.content).find('video')[0].load();
				}
			}
		});*/

		jQuery(".play-icon").magnificPopup({
			type: "iframe",
			mainClass: "mfp-fade",
			removalDelay: 160,
			preloader: false,
			fixedContentPos: false,
		});
	}
});

jQuery(".play-btn,.play-icon").on("click", function () {
	jQuery("body").addClass("body-hidden");
});

jQuery(document).on("click", ".mfp-close,.mfp-iframe-holder", function () {
	jQuery("body").removeClass("body-hidden");
});

/* filter handling */
jQuery(document).ready(function () {
	window.filter_update = function (e, src) {
		e.preventDefault();
		e.stopPropagation();

		let _form = jQuery(src).closest("form");

		if (jQuery(src).get(0).hasAttribute("data-field")) {
			let _field = jQuery(src).attr("data-field");
			let _category = jQuery(_form).find(`[type="hidden"][name="${_field}"]`);

			let _selected_category = Array();
			jQuery(src)
				.closest("ul")
				.find(".filter-category_option:checked")
				.each(function (i, e) {
					_selected_category.push(jQuery(e).val());
				});
			jQuery(_category).val(_selected_category.join(","));
		}
		_form.get(0).submit();
	};
	jQuery(document.body).on("change", ".filter-order_option", function (e) {
		window.filter_update(e, this);
	});
	jQuery(document.body).on("change", ".filter-category_option", function (e) {
		window.filter_update(e, this);
	});
});




jQuery('.menu-item-has-children > a').after('<div class="sub-menu-icon"></div>');


jQuery(document).ready(function() {
    jQuery(document).on("click",".sub-menu-icon",function() {
        jQuery(this).toggleClass('active').next().slideToggle();
    });
});

