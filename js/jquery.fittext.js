// FitText fallback
(function($) {
    if (typeof $ !== 'undefined') {
        $.fn.fitText = function(kompressor, options) {
            var compressor = kompressor || 1;
            var settings = $.extend({
                'minFontSize': Number.NEGATIVE_INFINITY,
                'maxFontSize': Number.POSITIVE_INFINITY
            }, options);

            return this.each(function() {
                var $this = $(this);
                var resizer = function() {
                    var fontSize = Math.max(
                        Math.min($this.width() / (compressor * 10), parseFloat(settings.maxFontSize)), 
                        parseFloat(settings.minFontSize)
                    );
                    $this.css('font-size', fontSize + 'px');
                };
                
                resizer();
                $(window).on('resize orientationchange', resizer);
            });
        };
    }
})(jQuery);