jQuery(document).ready(function($){
    "use strict";

    // Responsive Mobile Menu
    var navlist = jQuery('.site-menu > nav ul').clone();
    var submenu = '<span class="submenu"><i class="fa fa-angle-double-down"></i></span>';
    navlist.removeClass().addClass('mobile-menu');
    navlist.find('ul').removeAttr('style');
    navlist.find('li:has(> ul) > a').after(submenu);;
    navlist.find('.submenu').toggle(function(){
        jQuery(this).parent().addClass('over').find('>ul').slideDown(200);
    },function(){
        jQuery(this).parent().removeClass('over').find('>ul').slideUp(200);
    });
    jQuery('.sb-slidebar .sb-menu-trigger').after(navlist[0]);

    // Initiate Slidebars
    jQuery.slidebars();

    // Tooltips
    jQuery('*[data-toggle="tooltip"]').tooltip();

    // Button
    jQuery('.button.hover,.button.stroke').each(function() {
        jQuery(this).wrapInner( "<span></span>");
    });

    // scroll back to top
    (function($){$.fn.backToTop=function(options){var $this=$(this);$this.hide().click(function(){$("body, html").animate({scrollTop:"0px"});});var $window=$(window);$window.scroll(function(){if($window.scrollTop()>0){$this.fadeIn();}else{$this.fadeOut();}});return this;};})(jQuery);

    // adding back to top button
    jQuery('body').append('<a class="back-to-top"><i class="fa fa-angle-up"></i></a>');
    jQuery('.back-to-top').backToTop();

    // Mag Popup
    jQuery('.image-popup').magnificPopup({
        type: 'image',
        closeOnContentClick: true,
        image: {
            verticalFit: true
        }
    });

    // make documentation links appear immediately after the title
    jQuery('h1 + p:has(> a:only-child), h2 + p:has(> a:only-child), h3 + p:has(> a:only-child)').prev().addBack().css('display', 'inline-block');
});
