// Magnific Popup fallback
(function($) {
    if (typeof $ !== 'undefined') {
        $.fn.magnificPopup = function(options) {
            return this.each(function() {
                var $this = $(this);
                $this.on('click', function(e) {
                    e.preventDefault();
                    var href = $this.attr('href');
                    if (href && href.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        // Simple image popup fallback
                        window.open(href, '_blank');
                    }
                });
            });
        };
    }
})(jQuery);