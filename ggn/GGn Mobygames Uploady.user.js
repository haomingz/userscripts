// ==UserScript==
// @name         GGn Mobygames Uploady
// @namespace    https://orbitalzero.ovh/scripts
// @version      0.36.6
// @match        https://gazellegames.net/upload.php
// @match      https://gazellegames.net/torrents.php?action=editgroup*
// @match      https://www.mobygames.com/*
// @match      http://www.mobygames.com/*
// @description  Uploady for mobygames
// @author       NeutronNoir, ZeDoCaixao
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant		 GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// ==/UserScript==

//code from https://greasyfork.org/scripts/23948-html2bbcode/code/HTML2BBCode.js
function html2bb(str) {
  if (typeof str === "undefined") return "";
  str = str.replace(/< *br *\/*>/g, "\n");
  str = str.replace(/< *u *>/g, "[u]");
  str = str.replace(/< *\/ *u *>/g, "[/u]");
  str = str.replace(/< *\/ *li *>/g, "");
  str = str.replace(/< *\/ *p *>/g, "\n\n");
  str = str.replace(/< * *p *>/g, "");
  str = str.replace(/< *\/ *em *>/g, "[/i]");
  str = str.replace(/< * *em *>/g, "[i]");
  str = str.replace(/< *li *>/g, "[*]");
  str = str.replace(/< *\/ *ul *>/g, "");
  str = str.replace(/< *ul *class=\\*\"bb_ul\\*\" *>/g, "");
  str = str.replace(/< *h2 *class=\"bb_tag\" *>/g, "[u]");
  str = str.replace(/< *\/ *h2 *>/g, "[/u]");
  str = str.replace(/< *strong *>/g, "[b]");
  str = str.replace(/< *\/ *strong *>/g, "[/b]");
  str = str.replace(/< *i *>/g, "[i]");
  str = str.replace(/< *\/ *i *>/g, "[/i]");
  str = str.replace(/\"/g, '"');
  str = str.replace(/< *img *src="([^"]*)" *>/g, "[img]$1[/img]");
  str = str.replace(/< *b *>/g, "[b]");
  str = str.replace(/< *\/ *b *>/g, "[/b]");
  str = str.replace(/< *a [^>]*>/g, "");
  str = str.replace(/< *\/ *a *>/g, "");
  str = str.replace(/< *cite *>/, "[i]");
  str = str.replace(/< *\/cite *>/, "[/i]");
  //Yeah, all these damn stars. Because people put spaces where they shouldn't.
  return str;
}

try {
  init();
} catch (err) {
  console.log(err);
}

function init() {
  if (window.location.hostname == "gazellegames.net") {
    if (window.location.pathname == "/upload.php") {
      var rls = window.location.hash.replace('#', ''); if (rls) {$('[name="empty_group"]').click(); $('[name="title"]').val(decodeURI(rls))}
      add_search_buttons();
    } else if (
      window.location.pathname == "/torrents.php" &&
      /action=editgroup/.test(window.location.search)
    ) {
      add_search_buttons_alt();
    }
    addPTPAllButton();
  } else if (window.location.href.endsWith('/specs/')) {
    handleSpecs();
  } else if (window.location.hostname == "www.mobygames.com") {
    add_validate_button();
  }

  GM_addStyle(button_css());
}

function addPTPAllButton() {
  $('[value="PTPImg It"]').first().after(
    '<input id="ptp_img_all" type="button" value="PTPImg all"/>',
  );
  $("#ptp_img_all").click(function () {
    $('[value="PTPImg It"]').click();
  })
}

function add_search_buttons() {
  $("input[name='title']").after(
    '<input id="moby_uploady_Search" type="button" value="Search MobyGames"/>',
  );
  $("#moby_uploady_Search").click(function() {
    var title = encodeURIComponent($("#title").val());

    window.open("https://www.mobygames.com/search/quick?q=" + title, "_blank"); //For every platform
  });

  $("#moby_uploady_Search").after(
    '<input id="moby_uploady_Validate" type="button" value="Validate MobyGames"/>',
  );

  $("#moby_uploady_Validate").click(async function() {
    var mobygames = JSON.parse((await GM_getValue("mobygames")) || "{}");
    console.log(mobygames);
    $("#aliases").val(mobygames.alternate_titles);
    $("#title").val(mobygames.title);
    $("#tags").val(mobygames.tags);
    $("#year").val(mobygames.year);
    $("#image").val(mobygames.cover);
    $("#album_desc").val(mobygames.description);

    var add_screen = $("a:contains('+')");
    mobygames.screenshots.forEach(function(screenshot, index) {
      if (index >= 16) return; //The site doesn't accept more than 16 screenshots
      if (index >= 3) add_screen.click(); //There's 3 screenshot boxes by default. If we need to add more, we do as if the user clicked on the "[+]" (for reasons mentioned above)
      $("[name='screens[]']").eq(index).val(screenshot); //Finally store the screenshot link in the right screen field.
    });
    if(!$('[name="screens[]"]').last().val()) {
        $("a:contains('-')").click();
    }

    $("#platform").val(mobygames.platform);

    await GM_deleteValue("mobygames");
  });
}

function add_search_buttons_alt() {
  $("input[name='aliases']").after(
    '<input id="moby_uploady_Search" type="button" value="Search MobyGames"/>',
  );
  $("#moby_uploady_Search").click(function() {
    var title = encodeURIComponent($("[name='name']").val());

    window.open("https://www.mobygames.com/search/quick?q=" + title, "_blank"); //For every platform
  });

  //need to add a button to fill the inputs and stop gathering links
  $("#moby_uploady_Search").after(
    '<input id="moby_uploady_Validate" type="button" value="Validate Moby"/>',
  );
  $("#moby_uploady_Validate").after(
    '<input id="moby_uploady_Validate_desconly" type="button" value="Only Description"/>',
  );
  $("#moby_uploady_Validate_desconly").after(
    '<input id="moby_uploady_Validate_piconly" type="button" value="Only Screenshots"/>',
  );

  async function valiClick(addType) {

    var mobygames = JSON.parse((await GM_getValue("mobygames")) || "{}");
    console.log(mobygames);
    if(!addType || addType === 'piconly'){
      $("input[name='image']").val(mobygames.cover);
      var add_screen = $("a:contains('+')");
      mobygames.screenshots.forEach(function(screenshot, index) {
        if (index >= 16) return; //The site doesn't accept more than 16 screenshots
        if (index >= 3) add_screen.click(); //There's 3 screenshot boxes by default. If we need to add more, we do as if the user clicked on the "[+]" (for reasons mentioned above)
        $("[name='screens[]']").eq(index).val(screenshot); //Finally store the screenshot link in the right screen field.
      });
    }
    if(!addType || addType === 'desconly'){
      $('[name="body"]').val(mobygames.description);
    }
    $('#mobygamesuri').val(mobygames.mobyurl);

    await GM_deleteValue("mobygames");
  }

  $("#moby_uploady_Validate").click(function () {
    valiClick(null)
  });
  $("#moby_uploady_Validate_desconly").click(function () {
    valiClick('desconly')
  });
  $("#moby_uploady_Validate_piconly").click(function () {
    valiClick('piconly')
  });
}

function get_covers(platformSlug) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: document.URL + "/covers/" + platformSlug,
      onload: (data) => {
        let imageUrl = $(data.responseText)
          .find("figcaption:contains('Front'):first")
          .prev()
          .attr("href");
        resolve(
          new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              method: "GET",
              url: imageUrl,
              onload: (data) => {
                let image = $(data.responseText).find("figure img").attr("src");
                resolve(image);
              },
              onerror: (error) => {
                resolve("");
              },
            });
          }),
        );
      },
      onerror: (error) => {
        throw error;
      },
    });
  });
}

function get_cover() {
  return new Promise(function(resolve, reject) {
    GM_xmlhttpRequest({
      method: "GET",
      url: $("#cover").attr("href"),
      onload: function(data) {
        let cover = "";
        cover = $(data.responseText).find("img[src*='covers']").attr("src");
        if (cover.indexOf("http") == -1)
          cover = "https://" + window.location.hostname + cover;
        resolve(cover);
      },
      onerror: function(error) {
        throw error;
      },
    });
  });
}

function get_screenshots(platformSlug, promos) {
  return new Promise(function(resolve, reject) {
    GM_xmlhttpRequest({
      method: "GET",
      url: promos ? document.URL + "/promo/" : document.URL + "/screenshots/" + platformSlug,
      onload: function(data) {
        let nbr_screenshots = 0;
        resolve(
          Promise.all(
            $(data.responseText)
              .find("#main .img-holder a")
              .map(function() {
                let image_url = $(this).attr("href");

                if (image_url.includes("screenshots") && nbr_screenshots < 16) {
                  nbr_screenshots++;
                  return new Promise(function(resolve, reject) {
                    GM_xmlhttpRequest({
                      method: "GET",
                      url: image_url,
                      onload: function(data) {
                        console.log(image_url);
                        var screen = $(data.responseText)
                          .find("figure img")
                          .attr("src");
                        if (screen.indexOf("http") == -1)
                          screen =
                            "https://" + window.location.hostname + screen;
                        resolve(screen);
                      },
                      onerror: function(error) {
                        throw error;
                      },
                    });
                  });
                }
              }),
          ),
        );
      },
      onerror: function(error) {
        throw error;
      },
    });
  });
}

async function validate(platformSlug) {
  let h1 = document.querySelector('h1');
  h1.innerHTML += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"> <i class="fa fa-spinner fa-spin fa-1x fa-fw"></i> ';
  const mobygames = {};

  try {
    const covers = await get_covers(platformSlug);
    mobygames.cover = covers;
  } catch (error) {
    console.error(error);
  }

  try {
    let screenshots = await get_screenshots(platformSlug, false);
    if (screenshots.length == 0) {
      alert("There's no screenshots for platorm: " + platformSlug);
      mobygames.screenshots = [];
    } else {
      mobygames.screenshots = screenshots;
    }
  } catch (error) {
    console.error(error);
  }
  mobygames.mobyurl = window.location.href;
  try {
      let descriptionElement = $("#description-text");
      mobygames.description = descriptionElement.length
        ? "[align=center][b][u]About the game[/u][/b][/align]\n" +
          html2bb(
              descriptionElement
                .html()
                .replace(/[\n]*/g, "")
                .replace(/.*<h2>Description<\/h2>/g, "")
                .replace(/<div.*/g, "")
                .replace(/< *br *>/g, "\n")
          )
        : "";
  } catch (error) {
    console.error("Error accessing #description-text:", error);
    mobygames.description = "";
}

  var alternate_titles = [];
  $(".text-sm.text-normal.text-muted:contains('aka')")
    .find("span u")
    .each(function() {
      alternate_titles.push(
        $(this)
          .text()
          .replace(/[^"]*"([^"]*)".*/g, "$1"),
      );
    });
  mobygames.alternate_titles = alternate_titles.join(", ");

  var date = $("dt:contains('by Date')")
    .next()
    .children()
    .first()
    .children()
    .filter(function() {
      return $(this).find("span a").attr("href").includes(platformSlug);
    })
    .children()
    .first()
    .text();
  date = date || $('.info-release a[href$="#' + platformSlug + '"]').text().trim()

  mobygames.year = [date];

  var tags_array = [];

  $("dt:contains('Genre')")
    .next()
    .find("a")
    .each((o, obj) => {
      let arr = $(obj).text().split("/");

      arr.forEach((t) => {
        tags_array.push(t);
      });
    });

  $("dt:contains('Setting')")
    .next()
    .find("a")
    .each((o, obj) => {
      let arr = $(obj).text().split("/");

      arr.forEach((t) => {
        tags_array.push(t);
      });
    });

  $("dt:contains('Gameplay')")
    .next()
    .find("a")
    .each((o, obj) => {
      let arr = $(obj).text().split("/");

      arr.forEach((t) => {
        tags_array.push(t);
      });
    });

  //$("#coreGameGenre div:contains('Genre')").next().text().split(/[\/,]/);
  //tags_array = tags_array.concat($("#coreGameGenre div:contains('Setting')").next().text().split(/[\/,]/));
  //tags_array = tags_array.concat($("#coreGameGenre div:contains('Gameplay')").next().text().split(/[\/,]/));

  var trimmed_tags_array = [];
  tags_array.forEach(function(tag) {
    if (tag.trim().toLowerCase().replace(" ", ".") !== "") {
      tag = tag
        .trim()
        .toLowerCase()
        .replace(/[  -]/g, ".")
        .replace(/[\(\)]/g, "");
      if (tag == "role.playing.rpg") tag = "role.playing.game";
      if (tag == "sci.fi") tag = "science.fiction";
      trimmed_tags_array.push(tag);
    }
  });
  mobygames.tags = trimmed_tags_array.join(", ");

  mobygames.title = $(".mb h1").get(0)?.innerText.trim();

  mobygames.platform = "";
  var platform = platformSlug;
  var platform_map = {
    "3do": "3DO",
    "3ds": "Nintendo 3DS",
    "adventure-vision": "Entex Adventure Vision",
    "amiga": "Commodore Amiga",
    "amiga-cd32": "Amiga CD32",
    "android": "Android",
    "apple2": "Apple II",
    "arcadia-2001": "Emerson Arcadia 2001",
    "atari-2600": "Atari 2600",
    "atari-5200": "Atari 5200",
    "atari-7800": "Atari 7800",
    "atari-st": "Atari ST",
    "c128": "Commodore 128",
    "c64": "Commodore 64",
    "casio-loopy": "Casio Loopy",
    "casio-pv-1000": "Casio PV-1000",
    "cd-i": "Philips CD-i",
    "channel-f": "Fairchild Channel F",
    "colecovision": "Colecovision",
    "commodore-16-plus4": "Commodore Plus-4",
    "cpc": "Amstrad CPC",
    "creativision": "CreatiVision",
    "dos": "DOS",
    "dreamcast": "Dreamcast",
    "dvd-player": "Interactive DVD",
    "hd-dvd-player": "Interactive DVD",
    "epoch-super-cassette-vision": "Epoch Super Casette Vision",
    "game-com": "Game.com",
    "game-gear": "Game Gear",
    "gameboy": "Game Boy",
    "gameboy-advance": "Game Boy Advance",
    "gameboy-color": "Game Boy Color",
    "gamecube": "Nintendo GameCube",
    "genesis": "Mega Drive",
    "gizmondo": "Gizmondo",
    "gp32": "GamePark GP32",
    "intellivision": "Mattel Intellivision",
    "iphone": "iOS",
    "ipad": "iOS",
    "jaguar": "Atari Jaguar",
    "linux": "Linux",
    "lynx": "Atari Lynx",
    "macintosh": "Mac",
    "memotech-mtx": "Memotech MTX",
    "msx": "MSX",
    "n64": "Nintendo 64",
    "neo-geo": "SNK Neo Geo",
    "neo-geo-pocket": "SNK Neo Geo Pocket",
    "nes": "NES",
    "new-nintendo-3ds": "New Nintendo 3DS",
    "ngage": "Nokia N-Gage",
    "nintendo-ds": "Nintendo DS",
    "oculus-quest": "Oculus Quest",
    "odyssey": "Magnavox-Phillips Odyssey",
    "odyssey-2": "Magnavox-Phillips Odyssey",
    "oric": "Tangerine Oric",
    "ouya": "Ouya",
    "pc-fx": "NEC PC-FX",
    "pc98": "NEC PC-98",
    "pippin": "Apple Bandai Pippin",
    "playstation": "PlayStation 1",
    "playstation-4": "PlayStation 4",
    "pokemon-mini": "Pokemon Mini",
    "ps-vita": "PlayStation Vita",
    "ps2": "PlayStation 2",
    "ps3": "PlayStation 3",
    "psp": "PlayStation Portable",
    "rca-studio-ii": "RCA Studio II",
    "sam-coupe": "Miles Gordon Sam Coupe",
    "sega-master-system": "Master System",
    "sega-pico": "Pico",
    "sega-saturn": "Saturn",
    "sg-1000": "SG-1000",
    "sharp-x1": "Sharp X1",
    "sharp-x68000": "Sharp X68000",
    "snes": "SNES",
    "super-acan": "Funtech Super Acan",
    "supergrafx": "NEC SuperGrafx",
    "supervision": "Watara Supervision",
    "switch": "Switch",
    "thomson-mo": "Thomson MO5",
    "turbo-grafx": "NEC TurboGrafx-16",
    "vectrex": "General Computer Vectrex",
    "vic-20": "Commodore VIC-20",
    "videopac-g7400": "Philips Videopac+",
    "virtual-boy": "Virtual Boy",
    "vsmile": "V.Smile",
    "wii": "Wii",
    "wii-u": "Wii U",
    "windows": "Windows",
    "wonderswan": "Bandai WonderSwan",
    "wonderswan-color": "Bandai WonderSwan Color",
    "xbox": "Xbox",
    "xbox360": "Xbox 360",
    "zx-spectrum": "ZX Spectrum",
    "default": "Retro - Other",
  };
  mobygames.platform = platform_map[platform] || platform_map['default'];

  await GM_setValue("mobygames", JSON.stringify(mobygames));

  let specLink = $('a[href$="/specs/"]:not(.disabled)');
  let pcBased = mobygames.platform === "Windows" || mobygames.platform === "DOS";
  console.log(specLink);
  console.log(pcBased);
  if (specLink.length && pcBased) {
    window.location = specLink[0].href;
  } else {
    $('.fa-spinner').hide();
    alert("Uploady done !");
  }
}

async function handleSpecs() {
  await new Promise(r => setTimeout(r, 500));
  let mobygames = JSON.parse((await GM_getValue("mobygames")) || "{}");

  let os_index = $('tr:contains('+ mobygames.platform +')').index()
  let indexfilter = function(){
    return $(this).closest('tr').index() > os_index;
  }

  let specs = {};
  let spec_get_defs = {
      'OS': 'Minimum OS Class Required',
      'Processor': 'Minimum CPU Class Required',
      'Memory': 'Minimum RAM Required',
      'DirectX': 'Minimum DirectX Version Required'
  };
  for (let key in spec_get_defs) {
    specs[key] = $('td:contains('+spec_get_defs[key]+')').filter(indexfilter).first().next().text().trim();
  }
  Object.keys(specs).forEach((k) => !specs[k] && delete specs[k]);

  if (Object.keys(specs).length === 0)
    return;

  mobygames['description'] += "[quote][align=center][b][u]System Requirements[/u][/b][/align]\n";
  for (let key in specs) {
    mobygames['description'] += "[*][b]" + key + "[/b]: " + specs[key] + "\n"
  }
  mobygames['description'] += '[/quote]';
  await GM_setValue("mobygames", JSON.stringify(mobygames));
  alert("Uploady done !");
}

function add_validate_button() {
  if (typeof console != "undefined" && typeof console.log != "undefined")
    console.log("Adding button to window");
  // Get all platforms available
  let platforms = [];
  $("dt:contains('Releases by Date')")
    .next()
    .find("ul li")
    .each((i, platform) => {
      let platformAnchor = $(platform).find("span a");
      let platformUrl = $(platformAnchor).attr("href");
      let platformSlug = platformUrl.replace(/\/platform\/(.+)\//, "$1");

      let platformJson = {
        name: $(platformAnchor).text(),
        slug: platformSlug,
      };

      platforms.push(platformJson);
    });

  // Add a button per platform to the page
  platforms.forEach((platform, i) => {
    console.log(platform, "|", i);
    $("body").prepend(
      '<input type="button" style="top:' +
      i * 50 +
      'px" platform="' +
      platform.slug +
      '" class="platform" value="' +
      platform.name +
      '"/>',
    );
  });

  // If there's only one platform we add a default button
  if (platforms.length == 0) {
    let platformAnchor = $("dt:contains('Released')").next().find("a:last");
    let platformUrl = $(platformAnchor).attr("href");
    let platformSlug = platformUrl.replace(/\/platform\/(.+)\//, "$1");

    $("body").prepend(
      '<input type="button" style="top:' +
      0 +
      'px" platform="' +
      platformSlug +
      '" class="platform" value="' +
      platformSlug +
      '"/>',
    );
  }

  // Adding click event to every button
  $(".platform").click(function() {
    validate($(this).attr("platform"));
  });
}

function button_css(index) {
  return "input.platform {\
                position: fixed;\
                left: 0;\
                z-index: 999999;\
                cursor: pointer;\
                height: auto;\
                width: auto;\
                padding: 10px;\
                background-color: lightblue;\
            }";
}