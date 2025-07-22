// FlexSlider fallback
(function($) {
    if (typeof $ !== 'undefined') {
        $.fn.flexslider = function(options) {
            return this.each(function() {
                console.log('FlexSlider placeholder - no sliders to initialize');
            });
        };
    }
})(jQuery);