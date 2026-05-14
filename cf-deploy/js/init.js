/*-----------------------------------------------------------------------------------
/*
/* Init JS
/*
-----------------------------------------------------------------------------------*/

jQuery(document).ready(function($) {

   /*----------------------------------------------------*/
   /* FitText Settings
   ------------------------------------------------------ */
   if (typeof $.fn.fitText !== 'undefined') {
      setTimeout(function() {
         $('.responsive-headline').fitText(1, { minFontSize: '40px', maxFontSize: '90px' });
      }, 100);
   }

   /*----------------------------------------------------*/
   /* Smooth Scrolling
   ------------------------------------------------------ */
   $('.smoothscroll').on('click', function (e) {
      e.preventDefault();

      var target = this.hash,
          $target = $(target);

      $('html, body').stop().animate({
         'scrollTop': $target.offset() ? $target.offset().top : 0
      }, 800, 'swing', function () {
         window.location.hash = target;
      });
   });

   /*----------------------------------------------------*/
   /* Highlight the current section in the navigation bar
   ------------------------------------------------------ */
   if (typeof $.fn.waypoint !== 'undefined') {
      var sections = $("section");
      var navigation_links = $("#nav-wrap a");

      sections.waypoint({
         handler: function(direction) {
            var active_section;
            active_section = $(this);
            if (direction === "up") active_section = active_section.prev();

            var active_link = $('#nav-wrap a[href="#' + active_section.attr("id") + '"]');
            navigation_links.parent().removeClass("current");
            active_link.parent().addClass("current");
         },
         offset: '35%'
      });
   }

   /*----------------------------------------------------*/
   /* Mobile Navigation
   ------------------------------------------------------ */
   var toggleButton = $('.mobile-btn'),
       nav = $('.nav');

   toggleButton.on('click', function(e) {
      e.preventDefault();
      nav.slideToggle("fast");
   });

   if (toggleButton.is(':visible')) nav.addClass('mobile');
   $(window).resize(function(){
      if (toggleButton.is(':visible')) nav.addClass('mobile');
      else nav.removeClass('mobile');
   });

   /*----------------------------------------------------*/
   /* Back To Top Button
   ------------------------------------------------------ */
   var pxShow = 300;
   var scrollSpeed = 500;
   $(window).scroll(function(){
      if($(window).scrollTop() >= pxShow){
         $("#go-top").fadeIn(scrollSpeed);
      } else {
         $("#go-top").fadeOut(scrollSpeed);
      }
   });

});