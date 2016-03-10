window.insert_next_page = function (callback) {

       console.log("insert_next_page() called");

       // current page
       var current_page = window.displayList.page_num;

       url = window.displayList.page_next;
       url = url.replace(/^#!?/, '');

       if (!skip_update_page_contents && (window.displayList.loaded_page_next != url || url.match(/shuffle/i))) { // I am guessing this prevents cascade loading of multiple pages/wrong order, but please explain what these do, AV
           window.displayList.loaded_page_next = url;
           console.log("insert_next_page() going to process " + url);

           $('#player-loading').show();

           if (is_html5_history_compat()) {
               skip_update_page_contents = 1; // this way, if the event based on the URL change is triggered, it will be ignored once

               history.replaceState(null, null, document.location.protocol + '//' + document.location.host + url);

               //if(playerStatus!="PLAYING") { activeList = get_current_rel_url(); } // HACKY HACK HACK DEAR LORD
               activeList = get_current_rel_url(); // FIXME: this appears to be incorrect, should be set later?
           }

           // callback (infinite scroll version)
           function post_update_page_contents() {

               $('#player-loading').hide();

               // load actual track data and append to existing list
               n_displayList = JSON.parse($('#displayList-data').remove().html());
               n_displayList['tracks'] = window.displayList['tracks'].concat(n_displayList['tracks']);
               window.displayList = n_displayList;

               // sync playList if we are currently playing from it
               if (activeList == get_current_rel_url() && typeof playList !== 'undefined' && !playList.gc) {
                   console.log('cloning playList');
                   window.playList = jQuery.extend(true, {}, window.displayList); // clone
               }

               if (window.displayList['show_favorites_friends']) {
                   //var item_array; item_array = [];
                   //$('.section-track').each(function (i, el) {
                   //    item_set.push($(el).attr('data-itemid'));
                       load_also_loved();
                   //});
               }

               // re-set url attribute? [we probably need to specify this elsewhere]
               window.displayList['url'] = get_current_rel_url();

               if (document.location.href.match(/popular\/?\d?/)) {
                   setTimeout(function () {
                       render_popular_sparklines();
                   }, 1000);
               }

               set_ad_vars(); // regenerate the ord values so the requests don't look like dupes

               //setTimeout(function () {
               //        console.log("ts: " + get_unix_time());
               draw_ads();
               //    }, 1500);

               ga_pageview(); // fire a pageload event, so that assorted stat trackers are notified
               install_wavo_waypoint();

           }

           page_updater = $.ajax({
               url: url,
               data: 'ax=1&frag=1&ts=' + get_unix_time(),
               dataType: 'html',
               type: 'get',
               async: true,
               success: function (content) {
                   $('#content-wrapper').append(content);
                   post_update_page_contents();
                   addDownloadLinks();

                   if (typeof callback == 'function') {
                       callback(content);
                   } else {
                       console.log('insert_next_page callback not a function');
                   }

                   // Hitting the end of the pages
                   if (
                       !infinite_page_scroll_status.hit_end &&
                           (window.displayList.page_next == url || !window.displayList.page_next) && !(window.displayList.page_name == 'profile' && window.displayList.page_sort == 'shuffle')
                       ) {
                       console.log("Detected end of infinite scroll");
                       disable_infinite_page_scroll();
                       infinite_page_scroll_status.hit_end = true;
                   }

                   // once it's loaded, enough time should have passed that, we won't get overly aggressive scroll-loadng on the shufflepg and other places
                   r = setTimeout(function () {
                       skip_update_page_contents = 0;
                   }, 500);
               },
               error: function () {
                   $('#player-loading').hide();
                   setup_player_bar(); // will hide it if nothing is playing
                   _gaq.push(['_trackEvent', 'Error', 'page_updater', null, 1, true]);
               }
           });
       } else {
           //console.log(" * ignored due to timing or end of pages");
       }

   };

   window.update_page_contents = function () {

       console.log('update_page_contents() (external) called');

       if (document.location.pathname == '/' || is_html5_history_compat()) {

           // don't run this if google is indexing
           if (document.location.href.search(/_escaped_fragment_/) == -1) {

               $('#player-loading').show();

               if (is_html5_history_compat()) {
                   url = document.location.pathname + document.location.search;
               } else {
                   url = document.location.hash;
               }

               //log("update_page_contents() going to process " + url);
               if (url == '') {
                   url = '/';
               }

               //   url = decodeURIComponent(unescape(url));
               url = url.replace(/\?ax=1/, '');
               url = url.replace(/^#!?/, '');

               // callback
               function post_update_page_contents() {
                   console.log("post_update_page_contents() called on " + url);

                   $('#player-loading').hide();

                   // load actual track data
                   window.displayList = jQuery.parseJSON($('#displayList-data').remove().html() || '{}');

                   // re-set url attribute? why is this? FIXME (taken from header, where it fired at wrong moment)
                   window.displayList['url'] = get_current_rel_url();

                   // mark playList for garbage collection, for the navigating back to same url with different contents case
                   if (typeof window.playList !== 'undefined') {
                       window.playList.gc = true;
                   }

                   // save previous URL, and go to top if you didn't hit back
                   if ( prevUrl != currentUrl
                       && !currentUrl.match(/^\/blogs\//)
                       && !(is_html5_history_compat() && document.location.hash != "")
                       ) {
                       $(window).scrollTop(0);
                   }
                   prevUrl = currentUrl;

                   // experimental, for /item/ pages
                   if (document.location.href.match(/track\//) && typeof (FB) != "undefined" && typeof (FB.XFBML) != "undefined") {
                       FB.XFBML.parse();
                   }

                   if (window.displayList['show_favorites_friends']) {
                       //var item_set; item_set = [];
                       //$('.section-track').each(function (i, el) {
                       //    item_set.push($(el).attr('data-itemid'));
                           load_also_loved();
                       //});
                   }

                   set_ad_vars();
                   draw_ads();
                   install_wavo_waypoint();

                   setup_player_bar();
                   show_push_message();
                   show_view_in_app(); // iOS only
                   ga_pageview();

                   if (window.displayList.page_name === "spy") {
                       enable_spy_check();
                   }

                   /*
                    Why do this? Well, because we have to have content-right before content-left normally for the divs to be
                    positioned with the appropriate top (just try it the other way, you won't be able to get -right to line up), we must
                    swap them so that the sidebar appears under main content in the mobile view. The correct solution here is to have a
                    special mobile template, of course, but that's for another day.
                    */
                   if (ua_info.is_mobile) {
                       $('#content-left').insertBefore('#content-right');
                   }

                   if (profile.user_country == 'US') {
                       //update_buzz_page_state();
                   } else if (jQuery.inArray(profile.user_country, w00t_regions) !== -1
                       || mixed_region_rand=="w00t") {
                       update_w00t_page_state();
                   }

                   // show/hide the tv player if necessary
                   if (is_tv_page()) {
                       window.tv_show();
                   }

                   animate_page_elements();
                   setup_chat(); // only on Stack pages for now

                   // hacks //
                   if(location.href.match(/hypeon/)) {
                       $(window).resize(function() {
                           if($('#mazda_frame').length) {
                               $('#mazda_frame').height( ($(window).height()-42) ); //75
                           }
                       }).resize();
                   }



               } // post_update_page_contents

               console.log("update_page_contents() about to load " + url);

               if (first_load && is_html5_history_compat() && !url.match(/^\/(\?.*)?$/)) {
                   // skip reloading of page in case of html5+first_load+not/ scenario
                   console.log("update_page_contents loading skipped as page already inside");
                   post_update_page_contents();

                   first_load = 0; // need this here, TODO: fix this mess
                   return new $.Deferred().resolve();
               } else {

                   if(currentPlayerObj[0] && currentPlayerObj[0].type.match(/(youtube|vimeo)/)) { stopTrack(); }

                   // attempt to load olark for registered users
                   if (profile.is_logged_in && profile.olark_enabled) {
                       load_olark();
                   }

                   // load page contents
                   page_updater = $.ajax({
                       url: url,
                       data: 'ax=1&ts=' + get_unix_time(),
                       dataType: 'html',
                       type: 'get',
                       async: true,
                       success: function (content) {
                           $('#content-wrapper').html(content);
                           post_update_page_contents();
                           addDownloadLinks();
                       },
                       error: function () {
                           $('#player-loading').hide();
                           setup_player_bar(); // will hide it if nothing is playing
                           _gaq.push(['_trackEvent', 'Error', 'post_update_page_contents', null, 1, true]);
                       }
                   });

               }

               first_load = 0;

               if (playerStatus != "PLAYING" && getQueryVariable("autoplay")) {
                   setTimeout(function () {
                       loadAndPlay();
                   }, 1000);
               }


                           }
       }
       return page_updater;
   };

window.addDownloadLinks = function(){
  var contentContainers = $('#content-wrapper').children('div');
  var tracksArray = $(contentContainers[contentContainers.length - 1]).find(".section-track");
  var buttonText = 'DOWNLOAD';
  setTrackUrl = function(){
    var req_data, attempt = 0, type = 0;

    var req_url = '/serve/source/' + trackId + '/' + keyCode;

    if(trackId && trackId.match(/^(yt_|vm_)/i)) {
//            unload_video_players();
        console.log("This is video, not audio");
        return false;
    }

    var r = $.ajax({
        url: req_url,
        data: req_data,
        type: 'get',
        async: false,
        cache: false,
        dataType: 'json',
        error: function () {
            console.log('Track /source/ request FAILED');
            //buttonText = 'FAILED';
            return false;
        }
    });

    try {
        var response = JSON.parse(r.responseText);
        downloadUrl = response.url;
    }
    catch (err) {
        console.log("FAILED to parse JSON data");
        return false;
    }
};
////////////////////////////////
  for (var tools, downloadUrl, keyCode, i=0;i<tracksArray.length;i++){
    if (!tracksArray[i].className || tracksArray[i].className.match(/placeholder/)) i++;
    else {
    var trackId = tracksArray[i].getAttribute("data-itemid");
    for (k=0;k<displayList['tracks'].length;k++){
        if (trackId === window.displayList['tracks'][k].id){
           keyCode = window.displayList['tracks'][k].key;
        }
    }

    setTrackUrl();
    var trackTitle = tracksArray[i].getElementsByClassName('artist')[0].innerHTML + ' - ' +
    tracksArray[i].getElementsByClassName('base-title')[0].innerHTML;
    trackTitle = trackTitle.replace(/&amp;/, '&');
    tools = tracksArray[i].getElementsByClassName("tools")[0];
      if (tools.getElementsByClassName('play-ctrl').length) {
        var downloadDiv = document.createElement('div');
        downloadDiv.className = 'playdiv'
        downloadDiv.setAttribute('style', 'position: absolute; bottom: 5px; right: 0px; height:22px')
        var downloadButton = document.createElement('button');
        downloadButton.setAttribute('style', 'height:22px; outline:0')
        downloadButton.id = trackTitle;
        downloadButton.setAttribute('url', downloadUrl);
        downloadButton.addEventListener('click', function(){ window.postMessage(this.getAttribute('url') + '{{{}}}' + this.id, 'http://hypem.com') });
        downloadButton.innerHTML = '<span>' + buttonText + '</span>';
        downloadDiv.appendChild(downloadButton);
        tracksArray[i].appendChild(downloadDiv);
      }
    }
  }
  console.log("addDownloadLinks() called");
}

window.setTimeout(function(){addDownloadLinks();},200);
