// Waypoints fallback
(function($) {
    if (typeof $ !== 'undefined') {
        $.fn.waypoint = function(options) {
            return this.each(function() {
                var $this = $(this);
                var handler = options.handler || function() {};
                var offset = options.offset || 0;
                
                // Simple scroll-based waypoint detection
                $(window).on('scroll', function() {
                    var scrollTop = $(window).scrollTop();
                    var elementTop = $this.offset().top;
                    var windowHeight = $(window).height();
                    
                    if (scrollTop + windowHeight - offset > elementTop) {
                        handler.call($this[0], 'down');
                    }
                });
            });
        };
    }
})(jQuery);