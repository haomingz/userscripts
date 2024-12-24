// ==UserScript==
// @name         Orpheus & Redacted: YAETS
// @author       commoner@orpheus.network
// @description  Yet Another External Tracker Searcher
// @version      v2024-11-26
// @match        https://orpheus.network/requests.php?id=*
// @match        https://orpheus.network/requests.php?*&id=*
// @match        https://orpheus.network/torrents.php?id=*
// @match        https://orpheus.network/torrents.php?*&id=*
// @match        https://orpheus.network/artist.php?id=*
// @match        https://orpheus.network/artist.php?*&id=*
// @match        https://*.orpheus.network/requests.php?id=*
// @match        https://*.orpheus.network/requests.php?*&id=*
// @match        https://*.orpheus.network/torrents.php?id=*
// @match        https://*.orpheus.network/torrents.php?*&id=*
// @match        https://*.orpheus.network/artist.php?id=*
// @match        https://*.orpheus.network/artist.php?*&id=*
// @match        https://redacted.sh/requests.php?id=*
// @match        https://redacted.sh/requests.php?*&id=*
// @match        https://redacted.sh/torrents.php?id=*
// @match        https://redacted.sh/torrents.php?*&id=*
// @match        https://redacted.sh/artist.php?id=*
// @match        https://redacted.sh/artist.php?*&id=*
// @match        https://dicmusic.com/requests.php?id=*
// @match        https://dicmusic.com/requests.php?*&id=*
// @match        https://dicmusic.com/torrents.php?id=*
// @match        https://dicmusic.com/torrents.php?*&id=*
// @match        https://dicmusic.com/artist.php?id=*
// @match        https://dicmusic.com/artist.php?*&id=*
// @match        https://www.deepbassnine.com/requests.php?id=*
// @match        https://www.deepbassnine.com/requests.php?*&id=*
// @match        https://www.deepbassnine.com/torrents.php?id=*
// @match        https://www.deepbassnine.com/torrents.php?*&id=*
// @match        https://www.deepbassnine.com/artist.php?id=*
// @match        https://www.deepbassnine.com/artist.php?*&id=*
// @match        https://animebytes.tv/artist.php?id=*
// @match        https://animebytes.tv/artist.php?*&id=*
// @match        https://animebytes.tv/torrents2.php?id=*
// @match        https://animebytes.tv/torrents2.php?*&id=*
// @match        https://animebytes.tv/requests.php?id=*
// @match        https://animebytes.tv/requests.php?*&id=*
// @grant        GM.setValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM_getValue
// @homepageURL  https://redacted.sh/forums.php?action=viewthread&threadid=61605
// @homepageURL  https://orpheus.network/forums.php?action=viewthread&threadid=16152
// ==/UserScript==


////////////////////////////////////////////////////////////////////////////////
// USER CONFIGURATION

const user_configuration = (function() {
  const name = 'user_configuration';
  const data = {
    'ENABLED': {
      'default': [
        'Redacted',
        'Orpheus',
        'RuTracker',
        'MusicBrainz',
        'Discogs',
        'LastFM',
      ],
      'type': 'list of checkboxes',
      'text': 'Enabled search sites:',
      'description': 'Any sites whose checkboxes you tick will show up in the sidebar and/or linkbox.',
    },
    'LINKBOX_ENABLED': {
      'default': false,
      'type': 'checkbox',
      'text': 'Show textual search links in linkbox',
      'description': 'When ticked, make text links show up in the linkbox underneath the page title.',
      'action': function(event) {
        if (!event.target.checked) {
        	document.querySelector('.com.yaets.config-window #config-SIDEBAR_ENABLED').checked = true;
        }
      },
    },
    'SIDEBAR_ENABLED': {
      'default': true,
      'type': 'checkbox',
      'text': 'Show graphical search links in sidebar',
      'description': 'When ticked, show image links in the sidebar.',
      'action': function(event) {
        if (!event.target.checked) {
          document.querySelector('.com.yaets.config-window #config-LINKBOX_ENABLED').checked = true;
        }
      },
    },
    'SIDEBAR_ICONS_PER_LINE': {
      'default': 0,
      'type': 'number',
      'text': 'Show X icons per line in the sidebar',
      'description': 'Change this number to have a different number of icons per line in the sidebar. You can also set this to 0, which makes YAETS put all icons on 1 line.',
    },
    'GAZELLE_STRAIGHT_TO_ARTIST_PAGE': {
      'default': true,
      'type': 'checkbox',
      'text': 'Go straight to artist page on Gazelle sites',
      'description': 'When ticked, go to the artist page when an artist name search yields an exact result on a Gazelle site.',
    },
    'DISCOGS_STRICT_ARTIST_SEARCH': {
      'default': true,
      'type': 'checkbox',
      'text': 'Require exact artist name matches on Discogs',
      'description': 'When ticked, require exact artist name matches on Discogs (ie. no partial matches).',
    },
    'SHOW_OWN_SITE_ON_REQUEST_PAGES': {
      'default': false,
      'type': 'checkbox',
      'text': 'Show own site on request pages',
      'description': "Normally, YAETS doesn't show links to the site you're on (ie. no links to OPS on OPS). Setting this to false changes that behavior on request pages, to enable a one-click check to see if a request can be filled by something already on the site.",
    },
    'ENABLE_CUSTOM_SEARCH_SITES': {
      'default': false,
      'type': 'checkbox',
      'text': 'Enable custom search sites',
      'description': 'If you put the code for custom search sites in the text area below and enable this option, those search sites will be added to the page.',
    },
    'CUSTOM_SEARCH_SITES': {
      'default': `[
  {
    name: 'Example Site',
    tag: 'Ex',
    prefix: 'https://example.com',
    artist_search: '/search?q={artist}',
    album_search: '/search?q={artist}+{title}',
    icon: 'https://ptpimg.me/z0m391.png',
  },
]`,
      'type': 'textarea',
      'text': 'Custom search site code:',
      'description': `You can use this field to define additional search sites. The text area should contain a JavaScript array ([]) containing 0 or more search site objects ({}). Each search site object must have the following entries:

* name: The name of the search site, like 'Redacted' or 'DuckDuckGo'.

* tag: A short version of the name, used in the linkbox, like 'Last' or 'Wiki'.

* prefix: Usually the base URL to the search site, like 'https://example.com' or 'https://your-librarys-site-here.org'.

* artist_search: The path to the search URL for artist searches, like '/search.php?q={artist}'. This path is appended to the prefix to create the full search URL for artist searches. The placeholder '{artist}' is replaced with the actual artist name.

* album_search: The path to the search URL for album searches, like '/search.php?artist={artist}&album={title}', used in the same way as artist_search, except for album searches, and additionally replacing '{title}' with the actual album name.

* type: Instead of artist_search & album_search, you can instead specify one of the built-in search site types (like 'GAZELLE' or 'LASTFM'), which will make YAETS use the appropriate paths from the built-in ARTIST_PATHS and ALBUM_PATHS variables.

* icon: The icon used in the sidebar. This can be SVG code ('<svg xmlns="http://www.w3.org/2000/svg"...>...</svg>', a base-64 encoded image ('data:image/png;base64,...'), or an URL to an image (https://ptpimg.me/yadayada.png).

Optionally you can also include one or more of the following entries: torrents, requests, artist, transform_function. For an explanation of those, see the YAETS source code.

***NOTE***: any text entered here is evaluated as JavaScript code using indirect eval() in the global scope ONLY if 'Enable custom search sites' is ticked. Do not paste code here if you don't know what it's doing. YOU HAVE BEEN WARNED!

If you define your own search sites, please share the code in the official YAETS thread! I'm always happy to include contributions.`,
    },
  };

  // Write new values to the data object.
  const write_to_configuration = function(new_configuration) {
    Object.keys(data).forEach(function(key) {
      data[key]['value'] = (new_configuration[key] === undefined
                                     ? data[key]['default']
                                     : new_configuration[key]);
    });
  };

  // Return the default settings.
  const get_defaults = function() {
    return JSON.stringify(Object.fromEntries(Object.keys(data).map(function(key) {
      return [
        key,
        data[key]['default'],
      ];
    })));
  };

  // A GreaseMonkey-like interface for TamperMonkey.
  if (!GM) {
    const GM = {
      'getValue': function(key,
                           default_value) {
        return new Promise(function(resolve,
                                    _reject) {
          resolve(GM_getValue(key,
                              default_value));
        });
      },
      'setValue': function(key,
                           value) {
        return new Promise(function(resolve,
                                    _reject) {
          resolve(GM_setValue(key,
                              value));
        });
      },
    };
  }

  return {
    // Read config values from storage, then pass the result to the callback.
    'read': function(callback) {
      const defaults = get_defaults();
      GM.getValue(name,
                  defaults).then(function(json_string) {
        write_to_configuration(JSON.parse(json_string));
        if (callback) {
          callback(data);
        }
      });
    },
    // Return previously read configuration data.
    'get': function() {
      return data;
    },
    // Reset configuration to defaults.
    'reset': function() {
      GM.setValue(name,
                  get_defaults()).then(function() {
        console.info(`User configuration reset to defaults!`);
      });
    },
    // Write config values to storage, then execute the callback, if any.
    'write': function(new_configuration,
                      callback) {
      write_to_configuration(new_configuration);
      const json_string = JSON.stringify(new_configuration);
      GM.setValue(name,
                  json_string).then(callback || function() {});
    },
  };
}());
//user_configuration.reset();



////////////////////////////////////////////////////////////////////////////////
// SOURCE SITES

const DEFAULT_SOURCE_SITE = {
  'css_class':      undefined,
  'headline':       function() {
    return document.querySelector('.header h2');
  },
  'linkbox':        function() {
    return document.querySelector('.linkbox');
  },
  'sidebar_after': function(this_page) {
    return document.querySelector('.sidebar > .box');
  },
  'artist': {
    'artist': function(headline, grab) {
      return headline.textContent;
    },
    'title':  function(headline, grab) {
      return undefined;
    },
  },
  'torrents': {
    'artist': function(headline, grab) {
      const artist = grab(headline,
                          'a[href^="artist.php"]');
      return (artist
              ? artist.replace(/^(Various Artists|Unknown Artist(\(s\))?)$/,
                               '')
              : '');
    },
    'title':  function(headline, grab) {
      return grab(headline,
                  'span:not(.tooltip)');
    },
  },
  'requests': {
    'artist': function(headline, grab) {
      return grab(headline,
                  'a[href^="artist.php"]').replace(/^(Various Artists|Unknown Artist(\(s\))?)$/,
                                                   '');
    },
    'title':  function(headline, grab) {
      return grab(headline,
                  'span:not(.tooltip)');
    },
  },
};

// For each source site, we have an object with the following general structure,
// then insert it into SOURCE_SITES.
//
// As the name suggests, this is just an example for the sake of documenting how
// this part of YAETS works.
const orpheus_source_site = (function() {
  // Helper function to retrieve artist name from any page type.
  const get_artist = function(this_page, headline, grab) {
    // Because Gazelle sites are mostly pretty similar, not every data retrieval
    // function needs to be re-implemented for every site. If a default function
    // suffices (see DEFAULT_SOURCE_SITE above), simply include it and don't
    // worry about anything else.
    //
    // The headline, linkbox and sidebar_after functions are (mostly) the same
    // site-wide, so we define them here to avoid a bunch of code duplication.
    //
    // The 'headline' function is used to find the page title from which
    // information is retrieved.
    //
    // If a default function /almost/ suffices, call it (passing the headline
    // and grab arguments), then amend the result. In this example, we mangle
    // the artist name a bit just to illustrate the principle.
    let artist = DEFAULT_SOURCE_SITE[this_page]['artist'](headline,
                                                         grab);
    if (artist) {
      // But we still need to remove the disambiguation suffix.
      artist = artist.replace(/ \([0-9]+\)$/,
                              '');
    }
    else {
      // Various Artists.
      artist = '';
    }
    return artist;
  };
  return {
    // This is used to be able to write source site-specific CSS.
    'css_class':      'orpheus',
    'headline':       DEFAULT_SOURCE_SITE['headline'],
    // The 'linkbox' function is used to find the horizontal list below the
    // headline to which search links will be added when 'LINKBOX_ENABLED' is
    // true.
    'linkbox':        DEFAULT_SOURCE_SITE['linkbox'],
    // The 'sidebar_after' function is used to find the element in the sidebar
    // /after/ which the box for search buttons will be added, when
    // 'SIDEBAR_ENABLED' is true.
    'sidebar_after':  DEFAULT_SOURCE_SITE['sidebar_after'],
    // Each page (artist, torrents, and requests) has its own artist and title
    // retrieval functions, because those are generally not the same site-wide.
    //
    // Artist test page:
    // - https://orpheus.network/artist.php?id=1510 (normal)
    'artist': {
      'artist':       function(headline, grab) {
        return get_artist('artist', headline, grab);
      },
      'title':        DEFAULT_SOURCE_SITE['artist']['title'],
    },
    // Torrent group test pages:
    // - https://orpheus.network/torrents.php?id=998008 (VA)
    // - https://orpheus.network/torrents.php?id=1356 (normal)
    // - https://orpheus.network/torrents.php?id=940619 (split)
    'torrents': {
      'artist':       function(headline, grab) {
        return get_artist('torrents', headline, grab);
      },
      // Sometimes, the default version is just plain wrong, so don't even
      // bother calling it. Instead, we implement a site/page-specific version.
      //
      // 'headline' is the headline element on the page, as returned by the
      // function above.
      //
      // 'grab' is a helper function that returns the contents of the first
      // element within the headline that matches the specified selector.
      'title':        function(headline, grab) {
        return grab(headline,
                    'a[href^="torrents.php"]');
      },
    },
    // Request test pages:
    // - https://orpheus.network/requests.php?action=view&id=49043 (normal)
    // - https://orpheus.network/requests.php?action=view&id=49105 (VA)
    // - https://orpheus.network/requests.php?action=view&id=49069 (linked to group)
    'requests': {
      'artist':       function(headline, grab) {
        return get_artist('requests', headline, grab);
      },
      'title':        function(headline, grab) {
        // Requests that are linked to a torrent group.
        let title = grab(headline,
                         'a[href^="torrents.php"]');
        if (!title) {
          // Requests that aren't.
          const matches = headline.textContent.match(/ – (.*) \[/);
          title = (matches
                   ? matches[1]
                   : null);
        }
        return title;
      },
    },
  };
}());

const redacted_source_site = (function () {
  return {
    'css_class':      'redacted',
    'headline':       DEFAULT_SOURCE_SITE['headline'],
    'linkbox':        DEFAULT_SOURCE_SITE['linkbox'],
    'sidebar_after':  DEFAULT_SOURCE_SITE['sidebar_after'],
    'artist': {
      // Artist test page:
      // - https://redacted.sh/artist.php?id=48866 (normal)
      'artist':       DEFAULT_SOURCE_SITE['artist']['artist'],
      'title':        DEFAULT_SOURCE_SITE['artist']['title'],
    },
    'torrents': {
      // Torrent group test pages:
      // - https://redacted.sh/torrents.php?id=1942500 (normal)
      // - https://redacted.sh/torrents.php?id=1606847 (VA)
      // - https://redacted.sh/torrents.php?id=1040359 (split)
      'artist':       function(headline, grab) {
        // The default approach works for normal releases. Custom approach is
        // needed for Various Artists.
        let artist = DEFAULT_SOURCE_SITE['torrents']['artist'](headline,
                                                              grab);
        /*let artist = grab(headline,
                          'a[href^="artist.php"]:last-of-type');*/
        if (!artist) {
          artist = '';
        }
        return artist;
      },
      'title':        DEFAULT_SOURCE_SITE['torrents']['title'],
    },
    'requests': {
      // Request test pages:
      // - https://redacted.sh/requests.php?action=view&id=272220 (unlinked)
      // - https://redacted.sh/requests.php?action=view&id=291977 (linked)
      // - https://redacted.sh/requests.php?action=view&id=272377 (VA, linked)
      // - https://redacted.sh/requests.php?action=view&id=291959 (VA, unlinked)
      'artist':       function(headline, grab) {
        // The default approach works for normal releases. Custom approach is
        // needed for Various Artists.
        let artist = DEFAULT_SOURCE_SITE['requests']['artist'](headline,
                                                              grab);
        if (!artist) {
          artist = '';
        }
        return artist;
      },
      'title':        function(headline, grab) {
        // Requests that are linked to a torrent group.
        let title = grab(headline,
                         'a[href^="torrents.php"]');
        if (!title) {
          // And those that aren't.
          title = DEFAULT_SOURCE_SITE['requests']['title'](headline,
                                                          grab);
        }
        return title;
      },
    },
  };
}());

// This only makes a shallow copy, but that's good enough for our purposes.
const dicmusic_source_site =  Object.assign({},
                                          redacted_source_site);
dicmusic_source_site.css_class = 'dicmusic';

const deepbassnine_source_site = {
  'css_class':      'deepbassnine',
  'headline':       function() {
    return document.querySelector('.thin h2');
  },
  'linkbox':        DEFAULT_SOURCE_SITE['linkbox'],
  'sidebar_after':  DEFAULT_SOURCE_SITE['sidebar_after'],
  'artist': {
    'artist':       DEFAULT_SOURCE_SITE['artist']['artist'],
    'title':        DEFAULT_SOURCE_SITE['artist']['title'],
  },
  'torrents': {
    // Single artist:
    // <span dir="ltr"><a href="artist.php?id=1">Artist</a> - Album</span> [Catno] [Year] [Type]
    // Main artist with guest:
    // <span dir="ltr"><a href="artist.php?id=1>Artist</a> with <a href="artist.php?id=2">Guest</a> - Album</span> [Catno] [Year] [Type]
    // Dual main artists:
    // <span dir="ltr"><a href="artist.php?id=1>Artist</a> & <a href="artist.php?id=2">Artist</a> - Album</span> [Catno] [Year] [Type]
    // Dual main artists with guest:
    // <span dir="ltr"><a href="artist.php?id=1>Artist</a> & <a href="artist.php?id=2">Artist</a> with <a href="artist.php?id=3">Guest</a> - Album</span> [Catno] [Year] [Type]
    // VA:
    // <span dir="ltr">Various Artists - Album</span> [Catno] [Year] [Type]
    'artist':       function(headline, grab) {
      const artist = DEFAULT_SOURCE_SITE['torrents']['artist'](headline,
                                                              grab);
      return artist || '';
    },
    'title':        function(headline, grab) {
      // Works for single, dual, single with guest and dual with guest torrent
      // groups. If it fails, assume it's a VA group.
      const artist = headline.querySelector('a[href^="artist.php"]:last-of-type');
      if (artist) {
        return artist.nextSibling.textContent.replace(/^ *- */,
                                                      '');
      }
      else {
        return headline.firstChild.textContent.replace(/^Various Artists *- */,
                                                       '');
      }
    },
  },
  'requests': {
    // Single artist linked to group:
    // <a href="requests.php">Requests</a> > Music > <a href="artist.php?id=1">Artist</a> - <a href="torrents.php?torrentid=1">Album</a> [1900]
    // Main artist with guest not linked to group:
    // <a href="requests.php">Requests</a> > Music > <a href="artist.php?id=1">Artist</a> with <a href="artist.php?id=2">Guest</a> - Album [1900]
    // Dual main artists linked to group:
    // <a href="requests.php">Requests</a> > Music > <a href="artist.php?id=1">Artist</a> & <a href="artist.php?id=2">Artist</a> - <a href="torrents.php?torrentid=1">Album</a> [1900]
    // VA linked to group:
    // <a href="requests.php">Requests</a> > Music > Various Artists - <a href="torrents.php?torrentid=1">Album</a> [Year]
    // VA not linked to group(???):
    // <a href="requests.php">Requests</a> > Music > Various Artists - Album [Year]
    'artist':       function(headline, grab) {
      const artist = DEFAULT_SOURCE_SITE['requests']['artist'](headline,
                                                              grab);
      return artist || '';
    },
    'title':        function(headline, grab) {
      // Works for requests that are linked to a torrent group.
      const group = headline.querySelector('a[href^="torrents.php?]');
      if (group) {
        return group.textContent;
      }
      else {
        // Works for non-VA requests that are not linked to a torrent group.
        const artists = headline.querySelectorAll('a[href^="artist.php"]');
        if (artists.length > 0) {
          const artist = artists[artists.length - 1];
          return artist.nextSibling.textContent.replace(/^ *- */,
                                                        '').replace(/ *\[[0-9]+\]$/,
                                                                    '');
        }
        else {
          // Works for VA requests that are not linked to a torrent group.
          return headline.textContent.replace(/^ *Requests *> *Music *> *Various Artists *- */,
                                              '').replace(/ *\[[0-9]+\]$/,
                                                          '');
        }
      }
    },
  },
};

const animebytes_source_site = (function() {
  // NOTE: AB support is untested. Support welcome!
  const get_title = function(headline, grab) {
    const matches = headline.lastChild.textContent.match(/-\s*\n?\s*(.*) +\[/);
    return (matches
            ? matches[1].trim()
            : undefined);
  };
  return {
    'css_class':     'animebytes',
    'headline':      function() {
      return document.querySelector('.thin h2');
    },
    'linkbox':       function(this_page) {
      if (this_page === 'requests') {
        throw "There is no linkbox on request pages on AnimeBytes!";
        // TODO: create one?
      }
      else {
        return DEFAULT_SOURCE_SITE['linkbox']();
      }
    },
    'sidebar_after': function(this_page) {
      if (this_page === 'requests') {
        // There is no sidebar for request pages on AB, so we insert the box
        // into the main column.
        return document.querySelector('.thin > table');
      }
      else {
        return DEFAULT_SOURCE_SITE['sidebar_after'](this_page);
      }
    },
    'artist': {
      'artist':      DEFAULT_SOURCE_SITE['artist']['artist'],
      'title':       DEFAULT_SOURCE_SITE['artist']['title'],
    },
    // The AB torrent group page has a different name.
    'torrents2': {
      'artist':      function(headline, grab) {
        return grab(headline,
                    'a[href^="/artist.php"]');
      },
      'title':       get_title,
    },
    'requests': {
      'artist':      function(headline, grab) {
        return grab(headline,
                    'a[href^="artist.php"]');
      },
      'title':       get_title,
    },
  };
}());

// Functions from this object are used to extract data from the source site
// you're browsing from, to build URLs of places to search on.
const SOURCE_SITES = {
  // Always use the second level domain name as the key, ie. 'example.com',
  // not 'foo.example.com'.
  'orpheus.network':       orpheus_source_site,
  'redacted.sh':          redacted_source_site,
  'dicmusic.com':         dicmusic_source_site,
  'deepbassnine.com': deepbassnine_source_site,
  'animebytes.tv':      animebytes_source_site,
};



////////////////////////////////////////////////////////////////////////////////
// CODE

if (!document.querySelector('style.com.yaets')) {
  // Set up configuration window.
  user_configuration.read(function(configuration_data) {
    console.info('User configuration read from browser storage:');
    console.info(configuration_data);

    ////////////////////////////////////////////////////////////////////////////////
    // SEARCH SITES

    // Note: this script has two types of 'sites'. Source sites are the sites
    // that searches can be done /from/, ie. the album, artist, and request
    // pages on Gazelle sites. These are the sites that the buttons will be
    // added to.
    //
    // The other type is search sites, which searches are done /on/ when you
    // click those buttons, ie. metadata sites like Discogs, but also other
    // torrent trackers and web stores.
    //
    // If you're browsing Orpheus, and click a button to perform a search on
    // Redacted, then Orpheus is the search site and Redacted is the source
    // site.

    // Unfortunately, some of the entries in these objects cannot be constructed
    // until after the user configuration has been read, so we can't build them
    // before now.
    const discogs_artist_id = (function() {
      return Array.from(document.querySelectorAll('.box_metadata_artist li')).map(function(li) {
        const match = li.textContent.match(/^Discogs ID: ([0-9]+)$/);
        return (match
                ? +match[1]
                : -1);
      }).find(function(number) {
        return number >= 0;
      });
    }());

    const ALBUM_PATHS = {
      'GAZELLE':       '/torrents.php?action=advanced&artistname={artist}&groupname={title}',
      'JPOPSUKI':      '/torrents.php?action=advanced&artistname={artist}&torrentname={title}',
      'ANIMEBYTES':    '/torrents2.php?action=advanced&artistnames={artist}&groupname={title}',
      'TBDEV':         '/browse.php?q={artist}+{title}',
      'RUTRACKER':     '/forum/tracker.php?nm={artist}+{title}',
      'APPLEMUSIC':    '/search?term={artist}+{title}',
      'BANDCAMP':      '/search?q={artist}+{title}&item_type=a',
      'DEEZER':        '/search/{artist}+{title}',
      'QOBUZ':         '/us-en/search?q={artist}+{title}',
      'TIDAL':         '/search?q={artist}+{title}',
      'SPOTIFYAPP':    ':{artist} {title}',
      'SPOTIFYWEB':    '/search/{artist} {title}/albums',
      'MUSICBRAINZ':   '/taglookup?tag-lookup.artist={artist}&tag-lookup.release={title}',
      'DISCOGS':       '/search/?type=all&title={title}&artist={artist}&advanced=1',
      'LASTFM':        '/music/{artist}/{title}',
      'WIKIPEDIA':     '/wikipedia/en/w/index.php?title=Special:Search&search={artist} {title}',
      'ALLMUSIC':      '/search/albums/{artist}+{title}',
      'COVERSEARCHENGINE': '/?artist={artist}&album={title}',
      'YOUTUBE':       '/results?search_query={artist}+{title}',
      'YOUTUBEMUSIC':  '/search?q={artist}+{title}',
      'PITCHFORK':     '/search/?q={artist}+{title}',
      'RATEYOURMUSIC': '/search?searchterm={artist}+{title}&searchtype=',
      'DRDB':          '/?artist={artist}&album={title}',
      'DUCKDUCKGO':    '/?q={artist}+{title}',
      'GOOGLE':        '/search?q={artist}+{title}',
    };
    const ARTIST_PATHS = {
      'GAZELLE':       `/${user_configuration.get()['GAZELLE_STRAIGHT_TO_ARTIST_PAGE']['value'] ? 'artist' : 'torrents'}.php?artistname={artist}`,
      'JPOPSUKI':      `/${user_configuration.get()['GAZELLE_STRAIGHT_TO_ARTIST_PAGE']['value'] ? 'artist' : 'torrents'}.php?artistname={artist}`,
      'ANIMEBYTES':    `/${user_configuration.get()['GAZELLE_STRAIGHT_TO_ARTIST_PAGE']['value'] ? 'artist' : 'torrents'}.php?name={artist}`,
      'TBDEV':         '/browse.php?q={artist}',
      'RUTRACKER':     '/forum/tracker.php?nm={artist}',
      'APPLEMUSIC':    '/search?term={artist}',
      'BANDCAMP':      '/search?q={artist}&item_type=b',
      'DEEZER':        '/search/{artist}',
      'QOBUZ':         '/us-en/search?q={artist}',
      'TIDAL':         '/search?q={artist}',
      'SPOTIFYAPP':    ':{artist}',
      'SPOTIFYWEB':    '/search/{artist}/artists',
      'MUSICBRAINZ':   '/taglookup?tag-lookup.artist={artist}',
      'DISCOGS': (discogs_artist_id >= 0
                  ?    `/artist/{artist_id}`
                  :    `/search/?type=artist${user_configuration.get()['DISCOGS_STRICT_ARTIST_SEARCH']['value'] ? '&strict=true' : ''}&q={artist}`),
      'LASTFM':        '/music/{artist}',
      'WIKIPEDIA':     '/wikipedia/en/w/index.php?title=Special:Search&search={artist}',
      'ALLMUSIC':      '/search/artists/{artist}',
      'COVERSEARCHENGINE': '/ARTIST_SEARCH_NOT_SUPPORTED_BY_YAETS',
      'YOUTUBE':       '/results?search_query={artist}',
      'YOUTUBEMUSIC':  '/search?q={artist}',
      'PITCHFORK':     '/search/?q={artist}',
      'RATEYOURMUSIC': '/search?searchterm={artist}+&searchtype=',
      'DRDB':          '?artist={artist}',
      'DUCKDUCKGO':    '/?q={artist}',
      'GOOGLE':        '/search?q={artist}',
    };
    const SEARCH_SITES = [
      {
        // The name is used in the ENABLED array above, as well as in the info text
        // displayed when you hover over an icon or link.
        name: 'Redacted',
        // The tag is used as the text in the link box at the top of the page. It is
        // recommended to make this an abbreviation of the name, to save on
        // horizontal space.
        tag: 'RED',
        // The prefix is used in combination with the site's entry in ALBUM_PATHS or
        // ARTIST_PATHS to create full search URLs.
        prefix: 'https://redacted.sh',
        // The icon is displayed in the sidebar. It may be a data URI or
        // (recommended) SVG source code.
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 0 85.6 85.6"><g transform="matrix(1 0 0 .95 2 0)"><ellipse cx="42.3" cy="36.2" rx="39.1" ry="32.9"/><path d="M4.2 46.4h22v39.8h-22zm55.6-.7H82v39.7H59.8zM7 42.2c-.3-.5 0-3.9.4-6.3a48.6 48.6 0 0 1 9-19.6A30 30 0 0 1 36 5.6a62.4 62.4 0 0 1 11.6-.3 32 32 0 0 1 26.6 17.4 49.5 49.5 0 0 1 5.2 17.6c0 2-.1 2.3-1.3 2.3-2.6 0-3.3-.9-4.4-5.5A43.3 43.3 0 0 0 70 26.6 29.1 29.1 0 0 0 53.8 12c-2-.6-4-1-7.6-1.2-14-.9-24 4.3-29.8 15.6-1.4 3-2.4 5.8-3.8 10.6-.8 3-1.4 4.4-2 5a6 6 0 0 1-2.8.7c-.5 0-.7 0-.9-.4Z"/><ellipse cx="43" cy="33.3" fill="#babde0" rx="38.7" ry="29.5"/><path fill="#babde0" d="M63.2 66.3V48h6c6.6.1 7.1.2 7.4 1 .3.7 1 1.3 2.4 2l1.2.5v12.2c0 6.7 0 13.4-.2 14.9-.1 3-.3 3.4-1.3 3.6-.8.1-1.4.5-1.4.9s-.6 1-1.5 1.3c-1.1.4-4 .6-8.5.6h-4V66.3ZM15.3 84.7a27 27 0 0 1-5.3-.8 6.2 6.2 0 0 1-1.3-.9 4.5 4.5 0 0 0-1.5-.9c-.8-.2-1-.6-1.1-5.3-.3-4.9-.1-23 .1-24.5.3-1.3.4-1.5 1-1.6.6-.1 1.2-.7 1.8-1.5 1-1.2 1.2-1.2 8-1.2h6v37h-2.7a124.5 124.5 0 0 1-5-.2Z"/><path d="M7 88.3c-2.3-1-4.3-2.7-5.3-4.3L0 81.5l.3-21.3C.6 40.2.8 38.4 2.5 32c1-3.7 3-9.2 4.4-12A39.5 39.5 0 0 1 23.2 3.4c11-5 32.3-4.4 42 1.2A43.7 43.7 0 0 1 84 32.4c1.4 6 1.6 8 1.6 28.3v21.9l-2 2.6c-2.5 3.4-7.2 4.8-15.4 4.8-5.4 0-6.3-.2-8.4-1.8-1.6-1.2-2.4-2.5-2.4-3.6 0-2.4-1-2.7-3.8-1.3a45.3 45.3 0 0 1-21.8 0c-2.4-1.2-2.4-1.2-3 .6-.4.8-.6 1.6-.8 2.4 0 .3-1 1.3-2 2.1-2 1.4-3.1 1.6-8.9 1.6-5.5 0-7.2-.3-10.2-1.7Zm16-21.9V47.8h-6.6c-5.9 0-6.7.2-7.5 1.4-.5.8-1.4 1.5-2 1.5-.9 0-1 2.2-1 15.7 0 12.9.1 15.7 1 15.7.5 0 1.3.5 1.8 1 1 1.2 3.2 1.6 9.9 1.8l4.4.1V66.4Zm52.2 18.2c1.2-.3 2.2-1 2.2-1.5s.6-1 1.4-1c1.4 0 1.5-.4 1.5-15.4V51.3l-1.8-.8c-1-.4-1.8-1.2-1.8-1.7 0-.8-1.6-.7-6.8-.8h-6.6L63 66.3V85h5c2.7 0 6-.2 7.2-.4ZM9.9 42.3c1.2-.3 1.8-1.4 2.8-5.3 4.5-18.5 15.4-27.2 33-26.2 4.9.2 7.4.7 10.4 2.1a33 33 0 0 1 17.4 23.7c1.2 5.4 1.8 6.1 5.1 6.2 2.3 0 0-11.2-3.8-19.3C68.5 10.5 55.9 4 39.3 5.2a30.9 30.9 0 0 0-24.2 12.3c-3.8 5-7.6 14.7-8.3 21-.5 4.5-.3 4.8 3.1 3.8Z"/><ellipse cx="43.1" cy="45.1" fill="#F30000" rx="8.6" ry="8.3" transform="matrix(1 0 0 -1 0 90.2)"/></g></svg>',
        // The type is used to decide which entry in the ALBUM_PATHS and
        // ARTISTS_PATHS is used for this site.
        type: 'GAZELLE',
      },
      {
        name: 'Orpheus',
        tag: 'OPS',
        prefix: 'https://orpheus.network',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-192 -16 192 192"><linearGradient id="b" x1="0" x2="0" y1="130" y2="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#888"/><stop offset="1" stop-color="#222"/></linearGradient><linearGradient id="a" x1="0" x2="0" y1="30" y2="130" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#888"/><stop offset="1" stop-color="#222"/></linearGradient><path fill="url(#a)" d="M80 119c35 48 70-13 70-50 0-44-45-69-70-69C39 0 0 34 0 80c0 52 45 80 80 80-8-1-35-7-35-68 0-41 13-58 35-51 0 1 23 10 23 39 0 30-23 39-23 39z" transform="scale(-1.2 1)"/><path fill="url(#b)" d="M80 41c-24-8-52 12-52 50 0 63 47 69 52 69 41 0 80-34 80-80 0-51-45-80-80-80 10-1 53 11 53 69 0 38-32 59-53 50-1 0-24-9-24-39 0-29 24-39 24-39z" transform="scale(-1.2 1)"/></svg>',
        type: 'GAZELLE',
      },
      {
        name: 'DIC Music',
        tag: 'DIC',
        prefix: 'https://dicmusic.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#56cbf3" d="M83 35c2 2 5 4 9 5h1l9 2c8-2 13 2 16 10-1 4 0 8 3 12l-8 1c1-4 0-5-3-3v3c-18-1-36 0-53 1-7 1-12 4-16 8H27v6l-3 7-6 7c-2-2-3-3-3-5v-2l2-5-1-5 3-5-4-1L5 60H2c0-2 0-3 2-3 7-1 13 1 19 7l2 3 11-9c6-4 13-8 21-11 4-2 8-2 13-2l3-3c-3-3-5-5-8-5-2-1-2-2-1-2 1-2 3-3 5-3h12l2 3Z"/><path fill="#ace5f8" d="M83 35c3 0 6 2 9 5-4-1-7-3-9-5Z"/><path fill="#93ddf7" d="M65 37c3 0 5 2 8 5l-3 3v-3l-5-5Z"/><path fill="#a9e4f8" d="m118 52 3 12c-3-4-4-8-3-12Z"/><path fill="#afe6f9" d="m36 58-11 9-2-3h4c2-3 5-5 9-6Z"/><path fill="#4d4f50" d="M110 62c2 0 2 1 0 2v-2Z"/><path fill="#4f8a9e" d="M110 62c3-2 4-1 3 3h-3v-1c2-1 2-2 0-2Z"/><path fill="#85dff7" d="m121 64 7 3v5l-2 1-40 2c0-3-1-5-5-4-2-1-4 0-5 2l-1-1-2 2H41c4-4 9-7 16-8 17-1 35-2 53-1h3l8-1Z"/><path fill="#57cbf3" d="m86 75-7 6h-7c-4-1-4-3-1-5l2-2 2-2 1 1c1-2 3-3 5-2 4-1 5 1 5 4Z"/><path fill="#d3f1fb" d="M55 74h18l-2 2-16-2Z"/><path fill="#a7e4f8" d="m16 77 1 5-2 5 1-10Z"/><path fill="#a6e3f8" d="m27 80-1 5-2 2 3-7Z"/><path fill="#9de0f7" d="M15 89c0 2 1 3 3 5-2 2-3 2-5 1l2-6Z"/></svg>',
        type: 'GAZELLE',
      },
      {
        name: 'DEEPBASSNiNE',
        tag: 'DB9',
        prefix: 'https://deepbassnine.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-174 114 574 574"><circle fill="#fff" cx="113" cy="401" r="287"/><circle fill="#222" cx="113" cy="401" r="264"/><path fill="#fff" d="m70 256-1 117c0 6-4 19-12 19H-55c-10 0-17-11-17-19s9-18 17-18H57v-39H-56c-31 0-56 27-57 57s31 58 57 58H62a49 49 0 0 0 47-46V256H70zm88 0h-38v129c1 22 18 45 46 46h134c0 7-9 26-29 26H-47c-40 0-64-33-68-43v37c0 30 30 53 68 53h316c37 0 72-30 72-60v-71a59 59 0 0 0-57-57H171v40h112c10 0 17 8 17 17 0 11-7 19-17 19H171c-8 0-12-13-12-19z"/></svg>',
        type: 'GAZELLE',
      },
      {
        name: 'JPopsuki',
        tag: 'JPS',
        prefix: 'https://jpopsuki.eu',
        // TODO: This is a placeholder icon. Better versions welcome!
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g id="c" stroke-width="0"></g><g id="d" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="10.24"></g><g id="e"> <path style="fill:#FFFFFF;" d="M473.104,371.851c0.176-0.611,0.336-1.228,0.479-1.85c0.046-0.2,0.089-0.401,0.131-0.603 c0.113-0.54,0.213-1.085,0.3-1.634c0.037-0.236,0.076-0.473,0.11-0.711c0.075-0.545,0.131-1.092,0.18-1.643 c0.021-0.225,0.047-0.447,0.063-0.674c0.052-0.767,0.084-1.537,0.084-2.313l0,0l0,0v-0.006l-0.006-40.904v-0.002l-0.005-26.203 v-0.002v-4.213l-0.004-25.574l0,0l-0.008-48.824l-0.005-26.204l-0.006-40.984c0-2.995-0.407-5.931-1.16-8.75 c-0.405-1.517-0.915-2.997-1.521-4.435c-2.477-5.877-6.574-11.017-11.925-14.74c-0.784-0.545-1.584-1.071-2.419-1.553 l-22.874-13.202l-21.414-12.358l-17.239-9.949l-65.928-38.046L304.22,31.629l-19.288-11.132l-11.953-6.899 c-10.533-6.078-23.509-6.076-34.04,0.007l-11.872,6.857l-19.288,11.14l-25.717,14.854v-0.001l-65.915,38.072l-28.89,16.686 l-21.408,12.365l-11.282,6.517c-0.811,0.468-1.59,0.979-2.353,1.506c-3.272,2.268-6.073,5.068-8.333,8.235 c-1.517,2.129-2.781,4.424-3.773,6.843c-1.655,4.031-2.558,8.399-2.557,12.899l0.006,40.912l0.005,26.204l0.012,73.738v4.011v0.85 v0.001v0.013l0,0v0.005l0,0l0.005,26.2l0,0v1.864l0.002,12.617l0.004,26.497v0.006l0,0c0,0.773,0.033,1.539,0.084,2.305 c0.016,0.223,0.042,0.445,0.061,0.668c0.048,0.548,0.105,1.096,0.18,1.638c0.033,0.236,0.072,0.471,0.108,0.708 c0.087,0.544,0.186,1.086,0.298,1.625c0.042,0.201,0.086,0.403,0.131,0.603c0.14,0.615,0.298,1.222,0.471,1.825 c0.033,0.113,0.061,0.227,0.095,0.34c0.909,3.042,2.24,5.93,3.94,8.589l0.001,0.001l0.001,0.002 c1.172,1.832,2.517,3.551,4.025,5.137c0.051,0.052,0.099,0.106,0.148,0.158c0.709,0.735,1.454,1.439,2.231,2.113 c0.125,0.11,0.254,0.215,0.382,0.322c0.786,0.661,1.595,1.298,2.445,1.89c0.784,0.545,1.584,1.07,2.419,1.553l22.552,13.015 l21.414,12.36l17.561,10.134l91.644,52.89l19.288,11.132l11.953,6.899c10.533,6.078,23.509,6.076,34.04-0.007l11.872-6.857 l19.288-11.14l25.717-14.853l55.554-32.086l10.363-5.985l26.36-15.225l21.408-12.365l13.813-7.978 c0.811-0.468,1.59-0.979,2.353-1.506c0.851-0.588,1.659-1.226,2.446-1.884c0.128-0.107,0.258-0.212,0.385-0.322 c0.78-0.673,1.526-1.375,2.237-2.11c0.047-0.048,0.09-0.098,0.136-0.146c3.724-3.891,6.476-8.609,8.02-13.765 C473.045,372.067,473.072,371.958,473.104,371.851z"></path> <circle style="fill:#ED1F34;" cx="256.004" cy="256.004" r="90.414"></circle> <path d="M255.999,156.544c-54.84,0-99.455,44.616-99.455,99.455s44.615,99.455,99.455,99.455s99.455-44.616,99.455-99.455 S310.84,156.544,255.999,156.544z M255.999,337.372c-44.869,0-81.373-36.503-81.373-81.373s36.503-81.373,81.373-81.373 s81.373,36.503,81.373,81.373S300.869,337.372,255.999,337.372z M483.457,149.503c0-3.711-0.494-7.438-1.465-11.078 c-0.506-1.899-1.155-3.789-1.925-5.615c-3.179-7.544-8.398-13.991-15.096-18.652c-1.118-0.778-2.089-1.4-3.062-1.961L277.499,5.767 C270.96,1.994,263.513,0,255.964,0c-7.555,0-15.005,1.996-21.547,5.776L50.042,112.265c-0.95,0.549-1.896,1.152-2.978,1.902 c-4.086,2.831-7.635,6.335-10.547,10.421c-1.912,2.683-3.519,5.597-4.775,8.658c-2.147,5.23-3.234,10.724-3.234,16.334 l0.035,212.917c0,0.921,0.034,1.876,0.105,2.919c0.016,0.234,0.037,0.469,0.061,0.702l0.014,0.143 c0.061,0.693,0.134,1.385,0.231,2.095c0.034,0.24,0.071,0.477,0.108,0.716l0.025,0.16c0.11,0.69,0.235,1.378,0.38,2.075 c0.053,0.254,0.107,0.508,0.163,0.746c0.177,0.779,0.377,1.547,0.608,2.351l0.112,0.392c1.144,3.829,2.821,7.487,4.988,10.875 c1.484,2.322,3.198,4.509,5.089,6.494c0.04,0.042,0.153,0.164,0.195,0.206c0.896,0.929,1.847,1.83,2.81,2.663l0.498,0.42 c1.093,0.919,2.105,1.699,3.096,2.388c1.096,0.763,2.096,1.403,3.064,1.963l184.411,106.428c6.538,3.773,13.985,5.768,21.534,5.768 l0,0c7.554,0,15.005-1.998,21.547-5.776l184.372-106.49c0.945-0.545,1.89-1.149,2.982-1.905c0.986-0.682,1.999-1.461,3.181-2.448 c0.14-0.116,0.278-0.231,0.405-0.34c0.99-0.854,1.941-1.752,2.84-2.681l0.159-0.171c4.695-4.904,8.206-10.929,10.149-17.421 l0.116-0.406c0.224-0.775,0.427-1.556,0.605-2.34l0.169-0.773c0.143-0.684,0.27-1.374,0.398-2.177 c0.042-0.259,0.082-0.518,0.121-0.792c0.094-0.69,0.168-1.383,0.228-2.071l0.014-0.143c0.024-0.24,0.047-0.48,0.063-0.721 c0.071-1.043,0.105-1.999,0.105-2.931L483.457,149.503z M465.348,364.1l-0.051,0.52c-0.035,0.404-0.076,0.805-0.129,1.191 l-0.063,0.407c0,0.004-0.02,0.125-0.02,0.127c-0.064,0.404-0.137,0.804-0.231,1.251l-0.084,0.387 c-0.104,0.457-0.222,0.909-0.347,1.341l-0.071,0.254c-1.128,3.764-3.164,7.258-5.908,10.125l-0.083,0.09 c-0.512,0.529-1.066,1.051-1.649,1.555l-0.276,0.228c-0.684,0.573-1.255,1.014-1.791,1.384c-0.671,0.465-1.221,0.817-1.731,1.113 l-184.375,106.49c-3.796,2.192-8.119,3.351-12.502,3.351c-4.381,0-8.701-1.159-12.496-3.348L59.131,384.141 c-0.529-0.305-1.095-0.669-1.775-1.143c-0.538-0.375-1.126-0.829-1.787-1.385l-0.293-0.246c-0.568-0.489-1.119-1.011-1.589-1.498 c-0.027-0.029-0.129-0.137-0.157-0.168c-1.099-1.155-2.094-2.424-2.956-3.772c-0.016-0.025-0.031-0.049-0.047-0.074 c-1.237-1.948-2.195-4.047-2.849-6.239l-0.069-0.246c-0.127-0.442-0.244-0.888-0.351-1.354l-0.093-0.428 c-0.082-0.395-0.154-0.793-0.217-1.181l-0.082-0.524c-0.054-0.4-0.096-0.803-0.13-1.203l-0.048-0.493 c-0.039-0.561-0.064-1.125-0.064-1.7l-0.035-212.911c0-3.24,0.632-6.425,1.881-9.467c0.729-1.781,1.662-3.472,2.769-5.025 c1.696-2.378,3.755-4.415,6.119-6.053c0.668-0.463,1.216-0.815,1.725-1.109l184.377-106.49c3.795-2.193,8.119-3.351,12.504-3.351 c4.381,0,8.701,1.157,12.495,3.347l184.407,106.427c0.522,0.301,1.089,0.667,1.779,1.145c3.881,2.7,6.908,6.445,8.757,10.832 c0.448,1.062,0.825,2.157,1.116,3.252c0.565,2.121,0.854,4.281,0.854,6.418l0.035,212.916 C465.409,362.993,465.384,363.561,465.348,364.1z"></path> </g></svg>',
        type: 'JPOPSUKI',
      },
      {
        name: 'AnimeBytes',
        tag: 'AB',
        prefix: 'https://animebytes.tv',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1.47 0 254.33 256.03"><path fill="#eb1168" d="M97 6c3 4-4 11-6 14-9 14-18 28-25 43-9 21-13 45-7 67 9 31 39 53 72 55 31 1 50-25 55-53 1-17-3-34-16-46-11-9-24-15-35-23l-7-6a30 30 0 0 1-7-7 30 30 0 0 1-4-9c-4-13 2-25 10-34a24 24 0 0 1 3-3 20 20 0 0 1 3-2 21 21 0 0 1 7-2c41 2 79 24 99 62l2 5c10 21 13 45 14 68 2 27 0 115-4 118-3 2-8 2-10 2a56 56 0 0 1-13 0h-2l-3-1a26 26 0 0 1-7-3c-6-4-9-10-12-17-7 2-14 7-21 10a157 157 0 0 1-20 7 132 132 0 0 1-39 5c-43-1-85-29-106-65a124 124 0 0 1-6-13 130 130 0 0 1 3-109 129 129 0 0 1 37-44 131 131 0 0 1 25-15c3-1 14-8 18-6a6 6 0 0 1 2 2Zm5-4Z"/></svg>',
        type: 'ANIMEBYTES',
      },
      {
        name: 'RuTracker',
        tag: 'Ru',
        prefix: 'https://rutracker.org',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><path fill="#e22446" d="m209 12-13 16c-7 9-13 17-16 19-5 6-13 11-21 14a2166 2166 0 0 0-55 1c-4 0-7 3-7 6l13 19c11 16 16 26 18 33v23l-6 18c-5 11-6 14-5 16 2 5 5 5 22-1 29-10 34-15 44-46l7-22c3-7 10-11 17-10 7 0 10 3 26 28 7 10 17 20 19 20 0 0 2-1 2-3 4-5 12-12 28-22l18-13c2-2 1-6-1-8-1-1-10-5-21-8l-25-10c-7-4-16-14-20-21-3-5-7-20-12-38-1-6-3-9-5-11s-4-3-7-1z"/><path fill="#3a4ee7" d="M57 94c-4 1-4 4-3 17a513 513 0 0 1-2 46c-5 14-10 19-33 37L4 206v7c1 2 12 5 23 7 21 5 31 10 40 19 8 8 11 13 19 37 3 10 7 18 8 19 1 2 6 3 8 1l5-8c20-31 24-35 34-41 5-4 14-7 19-7l24-2c23 0 25-1 25-6 0-3-1-5-21-29-7-8-12-19-14-27l-1-6-4 3c-6 5-12 7-29 13-19 6-22 6-30 0-2-2-3-6-3-10-1-2 1-7 4-16l7-17v-18l-4-2c-10-1-15-3-39-20-14-10-15-10-18-9z"/><path fill="#05cc63" d="M205 108c-3 0-6 3-6 4a409 409 0 0 1-16 49v8c1 7 4 15 7 20a520 520 0 0 0 28 35c2 4 2 11 0 15-2 3-7 7-10 8l-22 2-21 1 1 5 1 29c0 23 0 25 2 26l4 2c2 0 9-4 17-10 19-14 21-16 28-19s13-4 21-3c7 0 12 0 17 2l19 7c18 6 21 6 23 2 1-3 0-5-5-23-8-22-9-27-8-37 0-13 4-20 20-42l14-19c0-1 0-3-2-4-3-3-3-3-26-3-28 0-34-1-47-10-6-5-10-9-23-27l-13-17-4-1z"/></svg>',
        type: 'RUTRACKER',
        torrents: true, // Set these to 'false' to hide the buttons on the given
        requests: true, // pages. You can use these settings for other sites as
        artist:   true, // well. If they're missing, they're assumed to be 'true'.
      },
      {
        name: 'AppleMusic',
        tag: 'APPL',
        prefix: 'https://music.apple.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.17 -0.17 512.28 512.32"><linearGradient id="f" x1="256" x2="256" y1="506.9" y2="10.2" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff5c3a"/><stop offset=".5" stop-color="#fa2e46"/><stop offset="1" stop-color="#ff2969"/></linearGradient><path fill="url(#f)" d="M512 256c-1 54 3 109-11 162-8 32-30 61-60 75-45 20-96 18-144 19-58-1-116 3-173-5-36-4-74-19-95-50C3 419 2 371 0 327c0-59-1-118 2-178 3-40 11-83 42-111C76 9 122 3 163 1c59-2 118-1 177 0 42 2 89 5 124 33 31 25 42 67 45 106 4 38 3 77 3 116z"/><path fill="#fff" d="M199 359V199q0-9 10-11l138-28q11-2 12 10v122q0 15-45 20c-57 9-48 105 30 79 30-11 35-40 35-69V88s0-20-17-15l-170 35s-13 2-13 18v203q0 15-45 20c-57 9-48 105 30 79 30-11 35-40 35-69"/></svg>',
        type: 'APPLEMUSIC',
      },
      {
        name: 'Bandcamp',
        tag: 'BC',
        prefix: 'https://bandcamp.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="-70 -352.5 980 980"><circle cx="420" cy="137.5" r="490" fill="#17a0c4"/><path fill="#fff" d="M551 103c-35 0-53 28-53 69 0 40 20 69 53 69 38 0 52-35 52-69 0-35-17-69-52-69M458 0h42v100c12-19 36-31 57-31 59 0 88 47 88 104 0 53-25 102-81 102-26 0-53-6-66-32v27h-40V0m341 140c-4-24-20-37-43-37-22 0-52 12-52 71 0 33 14 67 50 67 24 0 41-16 45-44h41c-7 50-38 78-86 78-59 0-92-43-92-101 0-59 31-105 93-105 44 0 81 23 85 71h-41M312 269H0L146 0h312L312 269"/></svg>',
        type: 'BANDCAMP',
      },
      {
        name: 'Deezer',
        tag: 'Deez',
        prefix: 'https://deezer.com',
        old_icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 62 198 130"><g transform="translate(0 87)"><path fill="#40ab5d" d="M156-25h43V0h-43z"/><path fill="#34a065" d="M156 10h43v25h-43z"/><path fill="#2c5594" d="M156 45h43v25h-43z"/><path fill="#ff8d00" d="M0 79h43v25H0z"/><path fill="#e7542f" d="M52 79h43v25H52z"/><path fill="#84166c" d="M104 79h43v25h-43z"/><path fill="#2c439b" d="M156 79h43v25h-43z"/><path fill="#81166c" d="M104 45h43v25h-43z"/><path fill="#e77d1f" d="M52 45h43v25H52z"/><path fill="#fe9912" d="M52 10h43v25H52z"/></g></svg>',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="5 5 499 499"><path fill="#a238ff" d="M424 81c4-27 10-44 19-44 13 0 25 58 25 131s-11 130-25 130c-7 0-11-10-16-26-6 60-21 102-37 102-13 0-23-25-32-64-5 75-17 128-33 128-9 0-18-20-24-55-8 71-26 121-47 121s-38-50-46-121c-7 35-15 55-24 55-16 0-28-53-34-128-8 39-18 64-31 64-16 0-31-42-37-102-4 17-11 26-16 26-13 0-25-58-25-130C41 95 52 37 66 37c8 0 15 18 19 44 8-45 21-76 34-76 16 0 30 41 37 104 6-45 16-73 28-73 15 0 28 55 33 134 9-40 23-65 37-65s28 25 38 65c5-79 18-135 33-135 12 0 21 29 28 74 6-63 21-104 38-104 13 0 25 30 33 76zM5 155c0-32 6-59 14-59s15 26 15 59c0 32-7 59-15 59-8-1-14-27-14-59Zm470 0c0-32 7-59 14-59 9 0 15 26 15 59 0 32-6 59-15 59-7 0-14-27-14-59z"/></svg>',
        type: 'DEEZER',
      },
      {
        name: 'Qobuz',
        tag: 'Qob',
        prefix: 'https://qobuz.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4.5 31.1 31.1"><path d="M27.8 29.1a15.4 15.4 0 1 0-3.2 3.2l3.1 3.3 3.4-3.3-3.3-3.2z"/><circle cx="15.4" cy="19.9" r="14.3" fill="#FFF"/><path d="M15.4 8.4a11.5 11.5 0 1 0 0 23 11.5 11.5 0 0 0 0-23zm0 16a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/><circle cx="15.4" cy="19.9" r="1"/><path fill="#FFF" d="m29.5 32.4-7.7-7.7a1.2 1.2 0 1 0-1.8 1.6l7.8 7.7 1.7-1.6z"/></sv>g',
        type: 'QOBUZ',
      },
      {
        name: 'Tidal',
        tag: 'Tid',
        prefix: 'https://listen.tidal.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 150.34 99.32 99.32"><path d="M96.2 183.5 79.6 200l-16.5-16.5L79.6 167l16.6 16.5zm0 33L79.7 233l-16.5-16.5L79.6 200l16.6 16.5zm-33.1-33L46.5 200 30 183.5 46.5 167l16.6 16.5zm66.2 0L112.7 200l-16.5-16.5 16.5-16.5 16.6 16.5z"/></svg>',
        type: 'TIDAL',
      },
      {
        name: 'Spotify (app)',
        tag: 'SPOT',
        prefix: 'spotify:search',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-13 -13 384 384"><g stroke-width=".8" transform="translate(-77 -77)"><circle cx="256" cy="256" r="192" fill="#3bd75f"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="27.6" d="M141 195c75-20 164-15 238 24"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="23.8" d="M152 257c61-17 144-13 203 24"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="18.4" d="M156 315c54-12 116-17 178 20"/></g></svg>',
        type: 'SPOTIFYAPP',
        // The raw artist and album name found on source sites has to be
        // URL-encoded before we pass them to search sites. If a search site has
        // additional requirements, you can specify a custom transform_function
        // to meet them. Most sites only require a conversion of spaces to plus
        // signs, so YAETS does that by default even if no transform_function is
        // given.
        //
        // For Spotify (both site and app), however, that should /not/ be done,
        // so we specify a do-nothing function.
        transform_function: function(data) {
          return data;
        },
      },
      {
        name: 'Spotify (web)',
        tag: 'SPOT',
        prefix: 'https://open.spotify.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-13 -13 384 384"><g stroke-width=".8" transform="translate(-77 -77)"><circle cx="256" cy="256" r="192" fill="#3bd75f"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="27.6" d="M141 195c75-20 164-15 238 24"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="23.8" d="M152 257c61-17 144-13 203 24"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="18.4" d="M156 315c54-12 116-17 178 20"/></g></svg>',
        type: 'SPOTIFYWEB',
        transform_function: function(data) {
          return data;
        },
      },
      {
        name: 'MusicBrainz',
        tag: 'MB',
        prefix: 'https://musicbrainz.org',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 0 125.1 125.2"><path fill="#eb743b" d="M67 0v125l60-30.3V30.4z"/><path fill="#ba478f" d="m62 52.1-1-.9V47l1-.9V35.6h-1V17.4l1-.9V0L2 30.4v64.3L62 125z"/><path fill="#fffedb" d="M62 46 35.4 60V49.4L62 35.6v-20L30 33h-.1a2.7 2.4 0 0 0-.3.2l-.2.1a2.9 2.5 0 0 0-.2.2l-.1.2a2.5 2.2 0 0 0-.2.2 2.8 2.4 0 0 0-.1.2l-.1.3a2.7 2.4 0 0 0 0 .2 2.5 2.2 0 0 0 0 .2 3 2.6 0 0 0 0 .3v44a10.8 9.6 0 0 0-8 1.8c-4.7 2.8-6.3 8-3.9 11.3 2.4 3.2 8 3.4 12.8.6 2.7-1.6 5.3-3.6 6-5.8a10.4 9.2 0 0 0 0-1.8V66L62 52.1z"/></svg>',
        type: 'MUSICBRAINZ',
      },
      {
        name: 'Discogs',
        tag: 'Dis',
        prefix: 'https://discogs.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.23 -0.23 24.46 24.46"><path d="M1.74 11.98a10.29 10.29 0 0 1 15.3-8.96l.82-1.49A12.06 12.06 0 0 0 12.19 0H12A12.01 12.01 0 0 0 0 11.9v.1c0 3.44 1.46 6.54 3.77 8.72l1.19-1.28a10.25 10.25 0 0 1-3.22-7.46zm18.62-8.57-1.15 1.24A10.29 10.29 0 0 1 7.1 21l-.87 1.52A12 12 0 0 0 20.36 3.4zm-18.4 8.57c0 2.87 1.21 5.46 3.15 7.3L6.29 18a8.3 8.3 0 0 1 5.73-14.33 8.3 8.3 0 0 1 4.08 1.07l.84-1.52a10.06 10.06 0 0 0-14.97 8.77zm18.37 0A8.32 8.32 0 0 1 8.06 19.3l-.86 1.52a10.07 10.07 0 0 0 11.85-16l-1.18 1.27a8.28 8.28 0 0 1 2.46 5.9zm-1.95 0a6.37 6.37 0 0 1-6.36 6.37 6.33 6.33 0 0 1-3-.76l-.85 1.5a8.1 8.1 0 0 0 9.56-12.86l-1.18 1.28a6.36 6.36 0 0 1 1.83 4.47zm-14.45 0c0 2.3.96 4.38 2.51 5.86l1.17-1.27a6.34 6.34 0 0 1 4.4-10.95c1.15 0 2.22.3 3.15.83L16 4.94a8.1 8.1 0 0 0-12.07 7.05zm12.53 0a4.44 4.44 0 0 1-4.44 4.44 4.42 4.42 0 0 1-2.06-.51l-.84 1.49a6.11 6.11 0 0 0 2.9.73 6.15 6.15 0 0 0 4.37-10.46l-1.16 1.25c.76.8 1.23 1.88 1.23 3.06zm-10.59 0c0 1.74.73 3.3 1.9 4.43l1.15-1.25.01.01a4.42 4.42 0 0 1 3.09-7.62c.8 0 1.56.22 2.21.6l.82-1.5a6.1 6.1 0 0 0-3.03-.8 6.14 6.14 0 0 0-6.15 6.13zm6.69 0a.54.54 0 0 1-1.08 0 .54.54 0 1 1 1.08 0zm-3.94 0a3.4 3.4 0 1 1 6.8 0 3.4 3.4 0 0 1-6.8 0zm.14 0a3.26 3.26 0 1 0 6.52 0 3.26 3.26 0 0 0-6.52 0Z"/></svg>',
        type: 'DISCOGS',
      },
      {
        name: 'LastFM',
        tag: 'Last',
        prefix: 'https://last.fm',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-143 145 512 512"><circle fill="#FFFFFF" cx="112" cy="400" r="200"/><path fill="#b90000" d="M113 145a256 256 0 1 0 0 512 256 256 0 0 0 0-512zm74 334c-25-1-41-12-52-37l-3-6-24-55c-7-19-27-32-48-32a53 53 0 1 0 47 78l2-1 1 1 10 22v2a77 77 0 0 1-137-49c0-42 35-77 77-77 32 0 58 18 71 48l25 57c7 15 12 24 30 25 17 1 29-9 29-23 0-12-8-15-25-21-29-10-46-20-46-44 1-25 17-40 43-40 17 0 29 7 38 23v1l-1 1-16 8h-2c-6-8-12-11-20-11-11 0-19 7-19 17 0 12 10 15 26 20l6 2c25 9 40 18 40 45 0 26-22 46-52 46z"/></svg>',
        type: 'LASTFM',
        transform_function: function(data) {
          // On Last.FM, the '+' character should be encoded as '%252B'.
          // Testcase: https://orpheus.network/torrents.php?id=4879
          return data.replace(/%2B/g, '%252B').replace(/%20/g, '+');
        },
      },
      {
        name: 'Wikipedia',
        tag: 'Wiki',
        prefix: 'https://secure.wikimedia.org',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#e7e6e6"/><path fill="#393939" d="m43 12.4-.1.3c-.1.2-.2.2-.3.2-.8 0-1.5.4-2 .8-.6.5-1.1 1.3-1.7 2.6l-8.6 19.5c0 .1-.2.2-.5.2-.2 0-.4 0-.5-.2l-4.8-10.2-5.6 10.2-.4.2c-.3 0-.5 0-.5-.2L9.5 16.3c-.5-1.2-1-2-1.7-2.5-.6-.5-1.4-.8-2.4-.9l-.3-.1-.1-.4c0-.3 0-.4.3-.4h2.3a23.8 23.8 0 0 0 4.6 0h2.6c.2 0 .3.1.3.4 0 .4 0 .5-.2.5-.7 0-1.3.3-1.7.6-.5.3-.7.7-.7 1.3l.3 1 7 15.8 4-7.5-3.7-7.8a10 10 0 0 0-1.7-2.7c-.4-.3-1-.6-2-.7l-.2-.1v-.4c0-.3 0-.4.2-.4h2a17 17 0 0 0 4.1 0h2.3c.2 0 .3.1.3.4 0 .4 0 .5-.2.5-1.5.1-2.2.5-2.2 1.3 0 .3.1.9.5 1.6l2.4 5 2.5-4.6c.3-.6.5-1.2.5-1.6 0-1-.8-1.6-2.3-1.7-.1 0-.2-.1-.2-.5l.1-.3.2-.1h2a20.9 20.9 0 0 0 5.6 0c.1 0 .2.1.2.4 0 .3-.2.5-.4.5a4 4 0 0 0-2.1.7c-.6.4-1.2 1.3-2 2.7l-3.3 6 4.4 9 6.5-15.1c.2-.6.4-1 .4-1.5 0-1.1-.8-1.7-2.3-1.8-.1 0-.2-.1-.2-.5 0-.3 0-.4.3-.4h2a18.2 18.2 0 0 0 3.4 0h1.9c.1 0 .2.1.2.4"/></svg>',
        type: 'WIKIPEDIA',
        // Wikipedia does not have unambiguous search URLs for albums. By default,
        // therefore, the button for it is only displayed on artist pages. You can
        // change that here, if you wish.
        torrents: false,
        requests: false,
      },
      {
        name: 'AllMusic',
        tag: 'All',
        prefix: 'https://www.allmusic.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="118.18 150.5 377.02 482.73"><path fill="#131313" d="M432.5 627.5 310.8 352.2a14.6 14.6 0 1 0-7.8 0l-124.2 281h67.4l14-40.2h92.4l14.3 40.1h67.7ZM276.9 544l30-82 29.3 82Z"/><path fill="#27aae1" d="M403.3 338.9a96.6 96.6 0 1 0-160 72.8l11.6-26.3a69.7 69.7 0 1 1 104-.4l11.5 26.4a96.5 96.5 0 0 0 32.9-72.5Z"/><path fill="#27aae1" d="M466 439.6A187.7 187.7 0 0 0 495.2 339c0-104-84.5-188.5-188.5-188.5S118.2 235 118.2 339a187.7 187.7 0 0 0 29.7 101.5 189.6 189.6 0 0 0 57.8 57.6l13-30a157.5 157.5 0 0 1-68.3-129c0-86.3 70-156.4 156.3-156.4S463 252.7 463 338.9a155.4 155.4 0 0 1-67.8 128.8l13 29.8a189.6 189.6 0 0 0 57.7-57.9Z"/></svg>',
        type: 'ALLMUSIC',
      },
      {
        name: 'Cover Search Engine',
        tag: 'COV',
        prefix: 'https://covers.musichoarders.xyz',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" stroke="#000" stroke-width="3" d="m509 255-1 4c0 36-33 59-69 59h-96a48 48 0 0 0-47 58l11 30c6 13 12 27 12 41 0 32-21 60-53 61l-10 1a252 252 0 1 1 253-253Z"/><path d="M384 191c18 0 32-13 32-32 0-17-14-32-32-32s-32 15-32 32c0 19 14 32 32 32zM256 63c-18 0-32 15-32 32 0 19 14 32 32 32s32-13 32-32c0-17-14-32-32-32zM128 191c18 0 32-13 32-32 0-17-14-32-32-32s-32 15-32 32c0 19 14 32 32 32zm-32 64c-18 0-32 15-32 32 0 19 14 32 32 32s32-13 32-32c0-17-14-32-32-32z"/></svg>',
        type: 'COVERSEARCHENGINE',
        // Artists don't have covers; only albums do.
        artist: false,
      },
      {
        name: 'YouTube',
        tag: 'YT',
        prefix: 'https://youtube.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="409.37 278 163.63 163.63"><g transform="translate(0 24.82)"><path fill="red" d="M569 296c-2-7-7-13-14-15-13-3-64-3-64-3s-51 0-64 3c-7 2-12 8-14 15a212 212 0 0 0 0 78c2 7 7 13 14 15 13 3 64 3 64 3s51 0 64-3c7-2 12-8 14-15 4-12 4-39 4-39s0-27-4-39Z" /><path fill="#fff" d="m475 359 42-24-42-25v49Z" /></g></svg>',
        type: 'YOUTUBE',
      },
      {
        name: 'YouTube Music',
        tag: 'YTM',
        prefix: 'https://music.youtube.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="red" d="M256 0A262 262 0 0 0 0 256c0 137 119 256 256 256s256-119 256-256S393 0 256 0Z"/><circle cx="256" cy="256" r="128" stroke="#FFF" stroke-width="20" fill="none"/><path d="m224 192 96 64-96 64Z" fill="#FFF"/></svg>',
        type: 'YOUTUBEMUSIC',
      },
      {
        name: 'Pitchfork',
        tag: 'Pitch',
        prefix: 'https://pitchfork.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 -1.5 63 63"><circle cx="30" cy="30" r="25" fill="#ccc" opacity=".8"/><g fill="#333"><path fill-rule="evenodd" d="m19.2 13.8 2.9 2.9L9.9 28.8c-.1 2.5.3 5.3 1 7.4L26.3 21l2.8 2.8v-9.9zm14 3 3 3L13.8 42c1.2 1.6 2.7 3 4.2 4.2l22.2-22.3 2.9 2.9v-10h-10m3 14 3 3L23.7 49a20 20 0 0 0 7.4 1l12.1-12.2 2.9 2.9v-10z"/><path stroke="#1a1a1a" stroke-opacity=".6" d="M30 1a29 29 0 1 0 0 58 29 29 0 1 0 0-58zm0 4a25 25 0 0 1 0 50 25 25 0 1 1 0-50z"/></g></svg>',
        type: 'PITCHFORK',
      },
      {
        name: 'Rate Your Music',
        tag: 'RYM',
        prefix: 'https://rateyourmusic.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="9.98 9.98 180.03 180.03"><g fill="#e6e4e5"><path d="M118.53 64c13.76 5.56 38.12 4.76 53.2 3.44C159.3 40.18 131.77 21.12 100 21.12a77 77 0 0 0-41.56 11.91C84.91 20.59 97.62 55.26 118.53 64z"/><path d="M190 100c0 49.76-40.24 90-90 90s-90-40.24-90-90 40.23-90 90-90 90 40.5 90 90z"/></g><path fill="#55acdb" d="M146.33 95.5c12.17.8 23.29-2.38 31.76-6.09a77.04 77.04 0 0 0-6.35-22.23c-15.1 1.32-39.44 2.11-53.2-3.44C97.61 55 83.84 19.79 58.43 32.77A78.72 78.72 0 0 0 21.12 100a78.7 78.7 0 0 0 2.91 21.18c12.44-11.12 38.65-32.03 62.2-38.38 31.77-8.48 33.89 11.11 60.1 12.7z"/><path fill="#2b6ab2" d="M178.1 89.68a72.4 72.4 0 0 1-31.77 6.08c-26.2-1.58-28.33-21.44-60.36-12.7-23.29 6.35-49.5 27.53-62.2 38.38 2.64 9 6.62 17.47 12.17 25.15 8.47-7.15 18.8-13.77 30.18-16.15 32.56-6.88 32.56 16.41 60.09 13.24 15.09-1.86 35.73-16.42 51.35-29.12.8-4.5 1.33-9.27 1.33-14.03 0-3.97-.27-7.41-.8-10.85z"/><g fill="#1c4282"><path d="M66.12 130.18c-11.39 2.38-21.7 9-30.18 16.14A78.7 78.7 0 0 0 100 179.15c38.91 0 70.94-28.06 77.56-64.86-15.62 12.71-36.27 27.27-51.36 29.12-27.53 3.18-27.53-20.38-60.08-13.23z"/><path d="M133.09 114.82c3.17 7.94.26 16.68-7.15 19.86-7.15 2.9-15.62-1.06-19.06-8.74-3.17-7.94-.26-16.68 7.15-19.85s15.88.8 19.06 8.73z"/></g></svg>',
        type: 'RATEYOURMUSIC',
      },
      {
        name: 'Dynamic Range Database',
        tag: 'DRDB',
        prefix: 'https://dr.loudness-war.info',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="5 2 50 56.1"><path fill="#999" d="M41 2v1h-2v.6h-1.7v-.4h-2.4v1h-1.6v-.8h-2v-.2h-2v-.3H27v.6h-2V4h-2v.3h-1.8V4h-2V2.7H17v.4h-2v1.2h-1.7v-1h-4V2.2H7v.4H5v54.7h2v.5h2.3v-1h2v-.2h2v-.9H15V57h2v.4h2.2v-1.5h2v-.2H23v.5h2v.3h2v.6h2.3v-.3h4v-.9h1.6v1h2.4v-.4h1.6v.6h2v1h2.3v-2.2h2v.5H47v1.4h2.2V57H51v.1h2.2v-1.3H55V4.1h-1.8V2.8H51v.1h-1.8v-.7h-2.3v1.4h-1.6v.5h-2v-2z"/><path fill="#782121" stroke="#501616" stroke-width=".3" d="M17.6 42V19.2h6a4.9 4.9 0 0 1 4.3 3.8c.4 1.8.2 3.6.3 5.5v8.2c-.2 2-1.1 4-3 4.8-2 .8-4.1.4-6.2.5zm3.2-19.7V39c1.2-.1 2.6.2 3.5-.7.9-1.3.5-2.9.6-4.3v-9.4c0-1.3-1-2.5-2.4-2.3zm13.7 0v7c1.2 0 2.4.3 3.5-.3 1.2-.8 1-2.5 1-3.8 0-1-.3-2.5-1.5-2.8-1-.2-2-.1-3-.1zM31.2 42V19.2h6.3a4.8 4.8 0 0 1 4.3 3.4c.7 2.3.6 5.1-.2 6.9a6.9 6.9 0 0 1-2 2.4L43 42h-3.5l-3-9.7h-2V42z"/></svg>',
        type: 'DRDB',
      },
      {
        name: 'DuckDuckGo',
        tag: 'DDG',
        prefix: 'https://duckduckgo.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="205.07 100 146.67 146.63"><circle cx="278.4" cy="173.3" r="73.3" fill="#de5833"/><path fill="#fff" d="M340.4 147a67.3 67.3 0 1 0-124 52.5 67.3 67.3 0 0 0 124-52.5zM293 233.7c-3.9-6.6-14.2-25-14.2-38.7 0-31.5 21.2-4.5 21.2-29.7 0-6-3-27-21.3-31.4-4.5-6-15.1-11.7-32-9.4 0 0 2.8.9 6 2.5 0 0-6 .8-6.3 5 0 0 12-.6 18.9 1.6-15.8 2-23.8 10.4-22.4 25.4 2.1 21.3 11.2 59.4 14.3 72.7A62.1 62.1 0 0 1 278.4 111 62.2 62.2 0 0 1 293 233.7z"/><path fill="#fed30a" d="M275 183.4c0-8 11-10.6 15-10.6 11.3 0 27.2-7.2 31-7.1 4.1.1 6.7 1.7 6.7 3.5 0 2.7-22.5 12.9-31.2 12-8.3-.7-10.2.1-10.2 3.5 0 3 6 5.7 12.6 5.7 9.9 0 19.5-4.4 22.4-2.4 2.6 1.9-6.7 8.5-17.3 8.5-10.6 0-29-5-29-13.1z"/><path fill="#2d4f8d" d="M294.5 149.2c-3-3.8-8.2-3.9-10 .5 2.8-2.2 6.2-2.7 10-.5zm-32.6.1c-4-2.4-10.8-2.7-10.4 5 2-4.7 4.6-5.6 10.4-5zm30.1 7.1a4 4 0 0 0-4 4c0 2.2 1.8 4 4 4s4-1.8 4-4a4 4 0 0 0-4-4zm1.5 3.8a1.2 1.2 0 0 1 0-2.4c.7 0 1.2.4 1.2 1.2-.1.6-.6 1.2-1.2 1.2zm-32.7-1.6a4.6 4.6 0 1 0 0 9.3 4.6 4.6 0 0 0 0-9.3zm1.7 4.3c-.8 0-1.4-.6-1.4-1.4 0-.7.6-1.3 1.4-1.3.7 0 1.3.6 1.3 1.3 0 .8-.6 1.4-1.3 1.4z"/><path fill="#67bd47" d="M302.9 208.2c-2-.5-10.1 5.2-13.2 7.4-.1-.6-.2-1-.4-1.3-.3-1.2-8.1-.5-10 1.5-4.9-2.4-14.6-6.9-14.7-4-.4 3.6 0 18.8 2 20 1.4.8 9.7-3.7 13.8-6h.1c2.6.6 7.4 0 9-1.1l.6-.6c3.8 1.4 12 4.3 13.6 3.7 2.2-.6 1.8-19-.8-19.6z"/></svg>',
        type: 'DUCKDUCKGO',
      },
      {
        name: 'Google',
        tag: 'GOOG',
        prefix: 'https://google.com',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#00ac47" d="M23.8 16a7.7 7.7 0 0 1-15 2.6l-4.5 3.6a13.2 13.2 0 0 0 25-6.2"/><path fill="#4285f4" d="M23.8 16a7.7 7.7 0 0 1-3.3 6.3l4.4 3.5a13.2 13.2 0 0 0 4.4-9.8"/><path fill="#ffba00" d="M8.3 16a7.7 7.7 0 0 1 .4-2.6L4.3 9.8a13.2 13.2 0 0 0 0 12.4l4.4-3.6a7.7 7.7 0 0 1-.4-2.6Z"/><path fill="#2ab2db" d="M8.7 13.4z"/><path fill="#ea4435" d="M16 8.3a7.7 7.7 0 0 1 4.6 1.4l4-3.7A13.2 13.2 0 0 0 4.3 9.8l4.4 3.6A7.8 7.8 0 0 1 16 8.2Z"/><path fill="#2ab2db" d="M8.7 18.6z"/><path fill="#4285f4" d="M29.3 15v1L27 19.5H16.5V14h11.8a1 1 0 0 1 1 1Z"/></svg>',
        type: 'GOOGLE',
      },
    ];

    
    
////////////////////////////////////////////////////////////////////////////////
// MORE CODE

    const config_box = document.createElement('div');

    const destroy_ui = function() {
      document.querySelectorAll('style.com.yaets, .com.yaets.config-window-header, .com.yaets.config-window-body, .com.yaets.sidebar-box, .com.yaets.box, .com.yaets.linkbox-link').forEach(function(el) {
        el.remove();
      });
    };

    const construct_ui = function() {
      // Build configuration window.
      const config_head_strong = document.createElement('strong');
      config_head_strong.textContent = 'YAETS configuration';
      const config_head = document.createElement('div');
      config_head.classList.add('head',
                                'com',
                                'yaets',
                                'config-window-header');
      const config_head_close = document.createElement('a');
      config_head_close.classList.add('com',
                                      'yaets',
                                      'hide-config-button');
      config_head_close.innerHTML = '&#128473;';
      config_head_close.addEventListener('click',
                                         hide_configuration_window);
      config_head.appendChild(config_head_strong);
      config_head.appendChild(config_head_close);
      const config_body = document.createElement('div');
      config_body.classList.add('body',
                                'com',
                                'yaets',
                                'config-window-body');

      const search_sites_header = document.createElement('h6');
      search_sites_header.textContent = configuration_data['ENABLED']['text'];
      const search_sites_help = document.createElement('abbr');
      search_sites_help.title = `${configuration_data['ENABLED']['description']} Default: ${configuration_data['ENABLED']['default'].join(', ')}`;
      search_sites_help.innerHTML = 'ⓘ';
      search_sites_help.classList.add('com',
                                      'yaets',
                                      'config-help');
      const search_sites_header_div = document.createElement('div');
      search_sites_header_div.classList.add('com',
                                            'yaets',
                                            'config-search-sites-header');
      search_sites_header_div.appendChild(search_sites_header);
      search_sites_header_div.appendChild(search_sites_help);
      config_body.appendChild(search_sites_header_div);

      SEARCH_SITES.map(function(search_site) {
        return search_site['name'];
      }).forEach(function(site_name) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = site_name;
        input.checked = configuration_data['ENABLED']['value'].indexOf(site_name) >= 0;
        input.id = `search-site-${site_name.replace(/[^A-Za-z0-9_]/g,
                                                    '_')}`;
        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.textContent = site_name;
        const row = document.createElement('div');
        row.classList.add('com',
                          'yaets',
                          'config-line');
        row.appendChild(input);
        row.appendChild(label);
        config_body.appendChild(row);
      });

      config_body.appendChild(document.createElement('hr'));
      const other_configuration_header = document.createElement('h6');
      other_configuration_header.textContent = 'Other configuration:';
      config_body.appendChild(other_configuration_header);
      Object.keys(configuration_data).forEach(function(config_name) {
        if (config_name !== 'ENABLED' && config_name !== 'CUSTOM_SEARCH_SITES') {
          const config = configuration_data[config_name];
          const input = document.createElement('input');
          input.type = config['type'];
          if (input.type === 'number') {
            input.min = 0;
          }
          input.name = config_name;
          if (input.type === 'checkbox') {
            input.checked = config['value'];
          }
          else {
            input.value   = config['value'];
          }
          input.id = `config-${config_name}`;
          input.classList.add('com',
                              'yaets',
                              `config-${input.type}`);
          if (config['action']) {
            input.addEventListener('change',
                                   config['action']);
          }
          const label = document.createElement('label');
          label.classList.add('com',
                              'yaets',
                              'config-label');
          label.textContent = config['text'];
          label.htmlFor = input.id;
          const help_text = document.createElement('abbr');
          const default_text = (input.type === 'checkbox'
                                ? (config['default']
                                   ? 'enabled'
                                   : 'disabled')
                                : config['default']);
          help_text.title = `${config['description']} Default: ${default_text}`;
          help_text.innerHTML = 'ⓘ';
          help_text.classList.add('com',
                                  'yaets',
                                  'config-help');
          const row = document.createElement('div');
          row.classList.add('com',
                            'yaets',
                            'config-line');
          row.appendChild(input);
          row.appendChild(label);
          row.appendChild(help_text);
          config_body.appendChild(row);
        }
      });

      config_body.appendChild(document.createElement('hr'));
      const custom_search_header = document.createElement('h6');
      custom_search_header.textContent = configuration_data['CUSTOM_SEARCH_SITES']['text'];
      const custom_search_help = document.createElement('abbr');
      custom_search_help.title = `${configuration_data['CUSTOM_SEARCH_SITES']['description']}

Example: ${configuration_data['CUSTOM_SEARCH_SITES']['default']}`;
      custom_search_help.innerHTML = 'ⓘ';
      custom_search_help.classList.add('com',
                                       'yaets',
                                       'config-help');
      const custom_search_header_div = document.createElement('div');
      custom_search_header_div.classList.add('com',
                                             'yaets',
                                             'config-custom-search-sites-header');
      custom_search_header_div.appendChild(custom_search_header);
      custom_search_header_div.appendChild(custom_search_help);
      config_body.appendChild(custom_search_header_div);
      const custom_search_site_code = document.createElement('textarea');
      custom_search_site_code.value = configuration_data['CUSTOM_SEARCH_SITES']['value'];
      custom_search_site_code.setAttribute('name',
                                           'CUSTOM_SEARCH_SITES');
      custom_search_site_code.classList.add('com',
                                            'yaets',
                                            'config-custom-search-sites');
      config_body.appendChild(custom_search_site_code);

      config_body.appendChild(document.createElement('hr'));
      const config_submit = document.createElement('input');
      config_submit.type = 'button';
      config_submit.value = 'Submit';
      config_submit.addEventListener('click',
                                     submit_configuration);
      const config_cancel = document.createElement('input');
      config_cancel.type = 'button';
      config_cancel.value = 'Cancel';
      config_cancel.addEventListener('click',
                                     cancel_configuration);
      const config_buttons = document.createElement('div');
      config_buttons.classList.add('com',
                                   'yaets',
                                   'config-buttons');
      config_buttons.appendChild(config_submit);
      config_buttons.appendChild(config_cancel);
      config_body.appendChild(config_buttons);
      config_box.classList.add('box2',
                               'box',
                               'com',
                               'yaets',
                               'config-window');
      config_box.style.display = 'none';
      config_box.appendChild(config_head);
      config_box.appendChild(config_body);
      document.querySelector('#content').insertBefore(config_box,
                                                      document.querySelector('.thin'));



      // Gather data from the page.
      const this_domain = window.location.hostname.match(/[^.]+\.[^.]+$/)[0];
      const this_prefix = `${window.location.protocol}//${this_domain}`;
      const this_page   = window.location.pathname.match(/\/(.*)\.php/)[1];

      const get_from_site = function(key,
                                     ...arguments) {
        try {
          const result = SOURCE_SITES[this_domain][key];
          if (typeof(result) === 'function') {
            return result(...arguments);
          }
          else {
            return result;
          }
        }
        catch (error) {
          console.error(`Failed to retrieve value of ${key} on site ${this_domain}: ${error}`);
          return undefined;
        }
      };
      const headline      = get_from_site('headline');
      const linkbox       = get_from_site('linkbox',
                                          this_page);
      const sidebar_after = get_from_site('sidebar_after',
                                          this_page);

      const encode = function(text) {
        return encodeURIComponent(text);
      };

      const get_from_page = function(key) {
        const grab = function(headline,
                              selector) {
          const el = headline.querySelector(selector);
          return (el
                  ? el.textContent
                  : null);
        };
        try {
          return SOURCE_SITES[this_domain][this_page][key](headline,
                                                         grab);
        }
        catch (error) {
          console.error(`Failed to retrieve value of ${key} on page ${this_page}: ${error}`);
          return '';
        }
      };
      const data = {
        artist:    encode(get_from_page('artist')),
        title:     encode(get_from_page('title')),
        artist_id: `${discogs_artist_id}`,
      };



      // Create search links.
      const buildUrl = function(site) {
        const custom_path = (this_page === 'artist'
                             ? site.artist_search
                             :  site.album_search);
        const paths = (this_page === 'artist'
                       ? ARTIST_PATHS
                       :  ALBUM_PATHS);
        const template = `${site.prefix}${custom_path || paths[site.type]}`;
        const transform = site.transform_function || function(data) {
          return data.replace(/%20/g,
                              '+');
        };
        return template.replace(/\{([^}]+)\}/g,
                                function(match,
                                         key) {
                                  return transform(data[key]);
        });
      };

      const builtin_search_sites = configuration_data['ENABLED']['value'].map(function(site_name) {
        const result = SEARCH_SITES.find(function(site) {
          return site.name === site_name;
        });
        if (!result) {
          console.error(`Ignoring unknown search site "${site_name}" in configuration data`);
          // Actually, it still gets passed to the next function in the chain,
          // so we'll filter it out there.
        }
        return result;
      }).filter(function(site) {
        return site && site[this_page] !== false;
      }).filter(function(site) {
        return (configuration_data['SHOW_OWN_SITE_ON_REQUEST_PAGES']['value'] && this_page === 'requests') || this_prefix !== site.prefix;
      });
      const custom_search_sites = (function() {
        let custom_search_sites = [];
        if (configuration_data['ENABLE_CUSTOM_SEARCH_SITES']['value']) {
          try {
            const custom_search_sites_string = configuration_data['CUSTOM_SEARCH_SITES']['value'];
            // I'm not going to write a full JavaScript parser, so this only
            // protects against a couple of basic errors.
            if (custom_search_sites_string.match(/^\s*\[\s*\{.*/) && custom_search_sites_string.match(/},?\s*\]\s*$/g)) {
              // Call eval indirectly to stop it from accessing variables
              // defined in this local scope.
              custom_search_sites = eval?.(custom_search_sites_string);
              if (!Array.isArray(custom_search_sites)) {
                throw "Must be an array!";
              }
              else if (!custom_search_sites.every(function(o) {
                return Object.getPrototypeOf(o) === Object.prototype;
              })) {
                throw "Must be an array of objects!";
              }
            }
            else {
              throw "Must be an array of objects!";
            }
          }
          catch (error) {
            console.error(`Ignoring custom search sites due to an error: ${error}`);
            custom_search_sites = [];
          }
        }
        return custom_search_sites;
      }());
      const all_search_sites = [
        ...builtin_search_sites,
        ...custom_search_sites,
      ];

      const show_configuration_window = function(event) {
        config_box.style.display = '';
      };

      if (configuration_data['LINKBOX_ENABLED']['value']) {
        if (linkbox) {
          all_search_sites.forEach(function(site) {
            const a = document.createElement('a');
            a.href = buildUrl(site);
            a.target = '_blank';
            a.title = `Search on ${site.name}`;
            a.classList.add('brackets',
                            'com',
                            'yaets',
                            'linkbox-link');
            a.innerHTML = site.tag;
            linkbox.appendChild(a);
          });
          const a = document.createElement('a');
          a.title = 'YAETS configuration';
          a.innerHTML = '⚙';
          a.classList.add('brackets',
                          'com',
                          'yaets',
                          'linkbox-link',
                          'show-config-button');
          a.addEventListener('click',
                             show_configuration_window);
          linkbox.appendChild(a);
        }
        else {
          console.error(`Linkbox not found! Can't add YAETS entries to it.`);
        }
      }

      if (configuration_data['SIDEBAR_ENABLED']['value']) {
        if (sidebar_after) {
          const abbr = document.createElement('abbr');
          abbr.innerHTML = 'YAETS';
          abbr.title = 'Yet Another External Tracker Searcher';
          const strong = document.createElement('strong');
          strong.appendChild(abbr);
          const a = document.createElement('a');
          a.classList.add('com',
                          'yaets',
                          'show-config-button');
          a.innerHTML = '⚙';
          a.title = 'Configuration';
          a.addEventListener('click',
                             show_configuration_window);
          const head = document.createElement('div');
          head.classList.add('head',
                             'com',
                             'yaets',
                             'sidebar-header');
          head.appendChild(strong);
          head.appendChild(a);
          const body = document.createElement('div');
          body.classList.add('body',
                             'com',
                             'yaets',
                             'sidebar-body');
          const box = document.createElement('div');
          box.classList.add('box',
                            'com',
                            'yaets',
                            'sidebar-box',
                            get_from_site('css_class'));
          box.appendChild(head);
          box.appendChild(body);
          all_search_sites.forEach(function(site) {
            const a = document.createElement('a');
            a.href = buildUrl(site);
            a.classList.add('com',
                            'yaets',
                            'sidebar-link');
            a.target = '_blank';
            a.title = `Search on ${site.name}`;
            const img = (function() {
              if (site.icon && site.icon.startsWith('<svg')) {
                a.innerHTML = site.icon;
                a.firstChild.addEventListener('error',
                                              function() {
                  console.error('SVG data is invalid!');
                });
                return a.firstChild;
              }
              else {
                const img = document.createElement('img');
                img.src = site.icon;
                a.appendChild(img);
                return img;
              }
            }());
            img.alt = `Search on ${site.name}`;
            img.classList.add('com',
                              'yaets',
                              'sidebar-icon');
            body.appendChild(a);
          });
          sidebar_after.insertAdjacentElement('afterEnd',
                                              box);
        }
        else {
          console.error(`Sidebar not found! If this is a non-music page, this is expected behaviour. Otherwise, it's a bug.`);
        }
      }



      // Handle styling.
      const style = document.createElement('style');
      style.classList.add('com',
                          'yaets');
      const icons = (configuration_data['SIDEBAR_ICONS_PER_LINE']['value'] === 0
                     ? all_search_sites.length
                     : Math.min(all_search_sites.length,
                                configuration_data['SIDEBAR_ICONS_PER_LINE']['value']));
      const icon_gap = (icons < 2
                        ? '0px'
                        : `${25 / (icons - 1)}px`);
      const icon_width = `calc((100% - 25px) / ${icons})`;
      style.innerHTML = `
  /* Styles for Orpheus & Redacted: External Tracker Search. */
  .com.yaets.sidebar-header,
  .com.yaets.config-window-header,
  .com.yaets.config-line,
  .com.yaets.config-custom-search-sites-header,
  .com.yaets.config-search-sites-header {
    display: flex;
  }
  .com.yaets.sidebar-header > strong,
  .com.yaets.config-window-header > strong,
  .com.yaets.config-label,
  .com.yaets.config-custom-search-sites-header > h6,
  .com.yaets.config-search-sites-header > h6 {
    flex: 1 0 auto;
  }
  .com.yaets.show-config-button,
  .com.yaets.hide-config-button {
    cursor: pointer;
  }
  .com.yaets.sidebar-body {
    display: flex;
    flex-wrap: wrap;
    column-gap: ${icon_gap};
  }
  .com.yaets.sidebar-link {
    width: ${icon_width};
    margin-bottom: ${icon_gap};
  }
  .com.yaets.sidebar-icon {
    /* Stop IMG tags from overflowing their parent container. */
    width: 100%;
    border: none;
  }
  .com.yaets.config-window {
    position: absolute;
    margin: auto;
    z-index: 100;
    top: 180px;
    right: 260px;
    box-shadow: 8px 3px 5px 2px rgba(0, 0, 0, 0.5);
  }
  .com.yaets.config-window-body {
    padding: 10px;
  }
  .com.yaets.config-window-body h6 {
    margin: 5px 0;
  }
  .com.yaets.config-line {
    text-align: left;
  }
  .com.yaets.config-line label {
    margin-top: 3px;
  }
  .com.yaets.config-custom-search-sites {
    min-width: 100%;
    height: 160px;
    padding: 0;
  }
  .com.yaets.config-help {
    margin-left: 5px;
  }
  .com.yaets.config-number {
    width: 7ex;
  }
  .com.yaets.config-buttons {
    display: flex;
    align-items: stretch;
    gap: 6px;
  }
  .com.yaets.config-buttons > input {
    flex: auto;
  }
  /* Not all Gazelle sites include the next 3 rules in their default CSS. */
  .brackets {
    text-indent: 0;
    white-space: nowrap;
  }
  .brackets::after {
    content: "]";
  }
  .brackets::before {
    content: "[";
  }
  ${document.querySelector('link[rel="stylesheet"][title="LinoHaze"]')
        ? `
  /* Patch to stop the configuration dialog from being transparent on LinoHaze on
     Orpheus. I hate everything about this. */
  .com.yaets.config-window {
    background-color: #2e2e2e;
  }
  .com.yaets.config-window-header {
    background-color: #3d3d3d;
  }`
      : ''}
  ${document.querySelector('link[rel="stylesheet"][title="red_dark"]')
      ? `
  /* Idem for the RED Dark stylesheet. It's the worst thing. */
  .com.yaets.config-window {
    background-color: #202224;
    padding: 10px;
  }
  .com.yaets.config-window-header {
    color: #f58080;
    padding: 2px 5px 7px 4px;
  }`
      : ''}
  ${document.querySelector('link[rel="stylesheet"][title="red_light"]')
      ? `
  /* Idem for the RED Light stylesheet. Why do people do this to me? */
  .com.yaets.config-window {
    background-color: #f0f0f0;
    padding: 10px;
  }
  .com.yaets.config-window-header {
    color: #544;
    padding: 2px 5px 7px 4px;
  }`
      : ''}
  #requests .com.yaets.animebytes {
    /* There is no sidebar on AnimeBytes requests, so on those pages we place
       the "sidebar" box in the main column. That makes it very big, so limit
       its size to something reasonable. */
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 10px;
  }

  `;
      document.querySelector('title').insertAdjacentElement('afterend',
                                                            style);
    };

    const hide_configuration_window = function(event) {
      config_box.style.display = 'none';
    };

    const submit_configuration = function(event) {
      const data = Object.fromEntries(Object.keys(configuration_data).map(function(key) {
        if (configuration_data[key]['type'] === 'list of checkboxes') {
          return [
            key,
            SEARCH_SITES.map(function(search_object) {
                               return search_object['name'];
                             }).filter(function(search_name) {
                               return document.querySelector(`input[name="${search_name}"]`).checked;
                             }),
            ];
        }
        else if (configuration_data[key]['type'] === 'number') {
          return [
            key,
            +document.querySelector(`input[name="${key}"]`).value,
          ];
        }
        else if (configuration_data[key]['type'] === 'textarea') {
          return [
            key,
            document.querySelector(`textarea[name="${key}"]`).value,
          ];
        }
        else {
          return [
            key,
            document.querySelector(`input[name="${key}"]`).checked,
          ];
        }
      }));
      console.info('Writing new user configuration to browser storage:');
      console.info(data);
      user_configuration.write(data);
      hide_configuration_window(event);
      destroy_ui();
      construct_ui();
    };

    const cancel_configuration = function(event) {
      hide_configuration_window(event);
    };

    construct_ui();
  });
}