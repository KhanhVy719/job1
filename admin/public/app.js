const currentEpisode = episode[0];
const defaultVideo = currentEpisode.videos.find(v => v.is_default === true) || currentEpisode.videos[0];
let file = defaultVideo.url;  // URL trực tiếp, không cần decrypt nữa
let currentServerName = defaultVideo.server_name;

const resumeData = "PlayerPosition-" + currentEpisode._id;
// =================================================================================================

const playerInstance = jwplayer("player");
let dualSubtitlesEnabled = false;
let subtitleTracks = [];
let introSkipped = false;
let currentConfigSub = {
    'color': "white",
    'size': '70',
    'opacity': "100",
    'font': "Arial"
};

const arrayColor = [{ 'label': "Trắng", 'color': 'white' }, { 'label': "Vàng", 'color': "yellow" }, { 'label': "Xanh dương", 'color': "blue" }, { 'label': "Xanh lá", 'color': "green" }, { 'label': "Tím", 'color': 'purple' }];
const arraySize = [{ 'label': '32pt', 'size': '32' }, { 'label': '24pt', 'size': '24' }, { 'label': "20pt", 'size': '20' }, { 'label': "18pt", 'size': '18' }, { 'label': "16pt", 'size': '16' }, { 'label': "14pt", 'size': '14' }, { 'label': '12pt', 'size': '12' }];
const arrayOpacity = [{ 'label': "100%", 'opacity': '100' }, { 'label': "75%", 'opacity': '75' }, { 'label': "50%", 'opacity': '50' }, { 'label': "25%", 'opacity': '25' }, { 'label': '0%', 'opacity': '0' }];
const arrayFont = [{ 'label': "Arial", 'font': "Arial" }, { 'label': "Courier", 'font': "Courier" }, { 'label': "Georgia", 'font': "Georgia" }, { 'label': "Impact", 'font': "Impact" }, { 'label': "Lucida Console", 'font': "Lucida Console" }, { 'label': 'Tahoma', 'font': "Tahoma" }, { 'label': "Times New Roman", 'font': "Times New Roman" }, { 'label': "Trebuchet MS", 'font': "Trebuchet MS" }, { 'label': 'Verdana', 'font': 'Verdana' }];
const arraySizeFont = [{ 'label': "150%", 'size': "150" }, { 'label': '120%', 'size': "120" }, { 'label': "100%", 'size': '100' }, { 'label': "75%", 'size': '75' }, { 'label': "70%", 'size': '70' }, { 'label': "50%", 'size': '50' }];
const arrayBackground = [{ 'label': 'Đen', 'background': "#000000" }, { 'label': "Xám Đậm", 'background': "#323232" }, { 'label': "Xanh Hải Quân", 'background': "#03047d" }, { 'label': "Nâu Ấm", 'background': "#592c07" }, { 'label': "Tím Nhạt", 'background': "#4a027f" }, { 'label': "Xanh Olive Đậm", 'background': '#243224' }, { 'label': "Than Chì", 'background': "#37454e" }, { 'label': "Xanh Biển Sâu", 'background': "#0d5555" }, { 'label': "Xám nhạt", 'background': '#f0f0f0' }, { 'label': "Vàng Hổ Phách", 'background': "#fdcb36" }];

async function loadCuesFromFile(_0x400220) {
    const _0x2a0d4a = file.substring(0x0, file.lastIndexOf('/') + 0x1);
    if (!_0x400220.file) {
        return [];
    }
    try {
        const _0x451eb3 = await fetch(_0x2a0d4a + _0x400220.file);
        const _0x295347 = await _0x451eb3.text();
        const _0x5a9e8b = _0x295347.split("\n").find(_0x34bf85 => _0x34bf85.trim() && !_0x34bf85.startsWith('#'));
        if (_0x5a9e8b) {
            const _0x163862 = await fetch(_0x2a0d4a + _0x5a9e8b.trim());
            const _0x4400ed = await _0x163862.text();
            return parseVTT(_0x4400ed);
        }
    } catch (_0x19d6cf) {
        console.error("Error loading subtitle file:", _0x19d6cf);
        return [];
    }
}

function parseVTT(_0x2c9055) {
    const _0x328cd8 = [];
    const _0x181af4 = _0x2c9055.split("\n");
    let _0x41f65f = 0x0;
    while (_0x41f65f < _0x181af4.length && !_0x181af4[_0x41f65f].includes("-->")) {
        _0x41f65f++;
    }
    while (_0x41f65f < _0x181af4.length) {
        if (_0x181af4[_0x41f65f].includes("-->")) {
            const [_0x24c1a9, _0x1b0488] = _0x181af4[_0x41f65f].split("-->").map(_0x3e4984 => parseTimeString(_0x3e4984.trim()));
            _0x41f65f++;
            let _0x3adb86 = '';
            while (_0x41f65f < _0x181af4.length && _0x181af4[_0x41f65f].trim() !== '') {
                _0x3adb86 += _0x181af4[_0x41f65f] + "\n";
                _0x41f65f++;
            }
            if (_0x3adb86) {
                _0x328cd8.push({
                    'startTime': _0x24c1a9,
                    'endTime': _0x1b0488,
                    'text': _0x3adb86.trim()
                });
            }
        }
        _0x41f65f++;
    }
    return _0x328cd8;
}

function parseTimeString(_0x51349e) {
    const _0x54f1fb = _0x51349e.split(':');
    let _0x3992b9 = 0x0;
    if (_0x54f1fb.length === 0x3) {
        _0x3992b9 = parseInt(_0x54f1fb[0x0]) * 0xe10 + parseInt(_0x54f1fb[0x1]) * 0x3c + parseFloat(_0x54f1fb[0x2]);
    } else if (_0x54f1fb.length === 0x2) {
        _0x3992b9 = parseInt(_0x54f1fb[0x0]) * 0x3c + parseFloat(_0x54f1fb[0x1]);
    }
    return _0x3992b9;
}

let secondaryCues = [];
async function updateDualSubtitles() {
    if (!dualSubtitlesEnabled) {
        return;
    }
    const _0x1531c7 = playerInstance.getPosition();
    if (secondaryCues.length > 0x0) {
        const _0x12dd57 = secondaryCues.find(_0x23284c => _0x1531c7 >= _0x23284c.startTime && _0x1531c7 <= _0x23284c.endTime);
        if (_0x12dd57) {
            const _0x5cac9f = $(".jw-text-track-display").css("top");
            const _0x19cfc4 = parseInt(_0x5cac9f.replace('px', '')) - 0x46;
            $(".jw-text-track-display").css('top', _0x19cfc4 + 'px');
            $(".jw-text-track-cue").append("<br><span lang=\"su\" style=\"color: white; font-size: 70%; opacity: 100%; font-family: Arial;\">" + _0x12dd57.text.replace(/\n/g, "<br>") + "</span>");
        }
    }
}

$(document).on("click", "#sub-off", function () {
    $(".jw-main-caption-menu").removeClass("active");
    $(".jw-sub-caption-menu").removeClass("active");
    $(".sub-toggle-tabs .item").removeClass("active");
    $(this).addClass("active");
    playerInstance.setCurrentCaptions(0x0);
    dualSubtitlesEnabled = false;
    secondaryCues = [];
});

$(document).on("click", "#sub-on", function () {
    $(".jw-main-caption-menu").addClass("active");
    $(".jw-sub-caption-menu").removeClass("active");
    $(".sub-toggle-tabs .item").removeClass("active");
    $(this).addClass("active");
    dualSubtitlesEnabled = false;
    const _0x3ffc82 = $(".jw-main-caption-menu .dropdown-item.active").attr('data');
    if (_0x3ffc82 !== undefined) {
        playerInstance.setCurrentCaptions(parseInt(_0x3ffc82));
    } else if (subtitleTracks.length > 0x0) {
        playerInstance.setCurrentCaptions(0x1);
    }
});

$(document).on('click', '#sub-dual', async function () {
    $(".jw-main-caption-menu").addClass("active");
    $(".jw-sub-caption-menu").addClass("active");
    $(".sub-toggle-tabs .item").removeClass("active");
    $(this).addClass("active");
    dualSubtitlesEnabled = true;
    updateDualSubtitles();
});

async function getSubtitleTracks(_0x29df82) {
    const _0xa6f913 = await fetch(_0x29df82);
    const _0x235e5a = await _0xa6f913.text();
    const _0x1f53e3 = _0x235e5a.split("\n");
    const _0x51c5ca = [];
    for (const _0x9e7a83 of _0x1f53e3) {
        if (_0x9e7a83.startsWith("#EXT-X-MEDIA:") && _0x9e7a83.includes('TYPE=SUBTITLES')) {
            const _0x3c5733 = _0x9e7a83.match(/NAME="([^"]+)"/);
            const _0x1931e4 = _0x9e7a83.match(/URI="([^"]+)"/);
            if (_0x3c5733 && _0x1931e4) {
                _0x51c5ca.push({
                    'label': _0x3c5733[0x1],
                    'file': _0x1931e4[0x1]
                });
            }
        }
    }
    return _0x51c5ca;
}

$(document).on("click", ".jw-sub-caption-menu.active .dropdown-item", async function () {
    const _0x18f85a = parseInt($(this).attr("data"));
    $(".jw-sub-caption-menu .dropdown-item").removeClass("active");
    $(this).addClass("active");
    if (subtitleTracks.length == 0x0) {
        subtitleTracks = await getSubtitleTracks(file);
    }
    if ($('#sub-dual').hasClass("active")) {
        const _0x33f3fd = subtitleTracks[_0x18f85a - 0x1];
        secondaryCues = await loadCuesFromFile(_0x33f3fd);
        updateDualSubtitles();
    }
});

let isAdPlaying = false;

playerInstance.setup({
    'file': file,
    'width': "100%",
    'height': "100%",
    'aspectratio': "16:9",
    'skin': {
        'name': 'pom'
    },
    'autostart': true,
    'repeat': true,
    'playbackRateControls': true,
    'playbackRates': [0.25, 0.5, 0.75, 0x1, 1.25, 1.5, 0x2],
    'image': background,
    'advertising': {
        'client': "vast",
        'tag': tag,
        'autostart': "viewable",
        'vpaidmode': "insecure",
        'skipoffset': 0x5,
        'admessage': "Quảng cáo kết thúc sau (xxs)",
        'skipmessage': "Bỏ qua sau xx giây",
        'skiptext': "Bỏ qua",
        'vpaidcontrols': true
    },
    'tracks': [{
        'file': CONFIG.thumbs,
        'kind': "thumbnails"
    }]
});

playerInstance.on("adPlay", function () {
    isAdPlaying = true;
});

playerInstance.on("adComplete", function () {
    isAdPlaying = false;
    setTimeout(() => {
        addCustomControls();
    }, 0x64);
});

playerInstance.on("adSkipped", function () {
    isAdPlaying = false;
    setTimeout(() => {
        addCustomControls();
    }, 0x64);
});

playerInstance.on("ready", function () {
    $("#video_mask").remove();
    playerInstance.setCaptions({
        ...playerInstance.getConfig().captions,
        'backgroundOpacity': 0x0
    });

    let _0x2d27ae = 0x0;
    window.addEventListener("message", function (_0x3378f0) {
        if (_0x3378f0.data.type === 'CONTINUE_WATCHING_DATA') {
            const _0x471911 = _0x3378f0.data.data;
            if (_0x471911.currentTime && playerInstance && _0x471911.currentTime > 0x0 && _0x471911.currentTime < _0x471911.duration) {
                _0x2d27ae = _0x471911.currentTime;
            }
        }
    });

    if (_0x2d27ae == 0x0) {
        if (typeof Storage !== 'undefined') {
            if (localStorage[resumeData] == '' || localStorage[resumeData] == 'undefined') {
                _0x2d27ae = 0x0;
            } else if (localStorage[resumeData] == "null") {
                localStorage[resumeData] = 0x0;
            } else {
                _0x2d27ae = localStorage[resumeData];
            }
            window.onunload = function () {
                localStorage[resumeData] = playerInstance.getPosition();
            };
        } else {
            console.log("Your browser is too old!");
        }
    }

    playerInstance.once("play", function () {
        setTimeout(() => {
            if (_0x2d27ae > 0x3c && Math.abs(playerInstance.getDuration() - _0x2d27ae) > 0x5) {
                playerInstance.seek(_0x2d27ae);
            }
        }, 0x1f4);
    });

    if ($(".jw-time-container").length > 0x0) {
        return;
    }

    if (!tag || tag === '') {
        addCustomControls();
    }

    const _0x357ec1 = $(".jwplayer");
    _0x357ec1.append("\n    <div class=\"skip-buttons\">\n      <a class=\"skip-intro sb-button\" id=\"skip-intro\" href=\"#\" style=\"display: none;\">\n       Bỏ qua giới thiệu\n      </a>\n      <a href=\"#\" class=\"sb-button light skip-outro\" id=\"skip-outro\" style=\"display: none;\">\n       <div class=\"bg progress\" style=\"width: 0%;\"></div>\n       <div class=\"line-center\">\n         <span>Tập tiếp theo</span>\n         <div class=\"inc-icon icon-14\">\n           <svg height=\"512\" viewBox=\"0 0 24 24\" width=\"512\" xmlns=\"http://www.w3.org/2000/svg\">\n             <path fill=\"currentColor\" d=\"m4.028 20.882a1 1 0 0 0 1.027-.05l12-8a1 1 0 0 0 0-1.664l-12-8a1 1 0 0 0 -1.555.832v16a1 1 0 0 0 .528.882zm1.472-15.013 9.2 6.131-9.2 6.131z\"></path>\n             <path fill=\"currentColor\" d=\"m19.5 19a1 1 0 0 0 1-1v-12a1 1 0 0 0 -2 0v12a1 1 0 0 0 1 1z\"></path>\n           </svg>\n         </div>\n       </div>\n      </a>\n    </div>\n  ");

    if (nextEpisode && nextEpisode !== "null") {
        $(".item-next").removeClass('d-none');
        $(".item-next").attr("data-bs-title", "Xem tập " + nextEpisode.name);
    }

    // ==================== THÊM DROPDOWN CHỌN SERVER (nếu có nhiều hơn 1 server) ====================
    if (currentEpisode.videos.length > 1) {
        let serverItems = '';
        currentEpisode.videos.forEach(video => {
            const activeClass = video.url === file ? 'active' : '';
            serverItems += `
                <li>
                    <a class="dropdown-item ${activeClass}" href="#" data="${video.url}" label="${video.server_name}">
                        <span class="s-title">${video.server_name}</span>
                        <div class="w-check"><i class="fa-solid fa-check"></i></div>
                    </a>
                </li>`;
        });

    const dropdownHtml = `<div class="item-btn item-dub jw-audio-button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"> <div class="line-center jw-audio-label" data-bs-toggle="tooltip" data-bs-custom-class="custom-tooltip" data-bs-placement="top" data-bs-title="${episode.server}">
     <div class="inc-icon"> 
     <svg width="40" height="41" viewBox="0 0 40 41" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M33.75 30.5H6.25C5.25544 30.5 4.30161 30.1049 3.59835 29.4017C2.89509 28.6984 2.5 27.7446 2.5 26.75V9.25C2.5 8.25544 2.89509 7.30161 3.59835 6.59835C4.30161 5.89509 5.25544 5.5 6.25 5.5H33.75C34.7446 5.5 35.6984 5.89509 36.4016 6.59835C37.1049 7.30161 37.5 8.25544 37.5 9.25V26.75C37.5 27.7446 37.1049 28.6984 36.4016 29.4017C35.6984 30.1049 34.7446 30.5 33.75 30.5ZM6.25 8C5.91848 8 5.60054 8.1317 5.36612 8.36612C5.1317 8.60054 5 8.91848 5 9.25V26.75C5 27.0815 5.1317 27.3995 5.36612 27.6339C5.60054 27.8683 5.91848 28 6.25 28H33.75C34.0815 28 34.3995 27.8683 34.6339 27.6339C34.8683 27.3995 35 27.0815 35 26.75V9.25C35 8.91848 34.8683 8.60054 34.6339 8.36612C34.3995 8.1317 34.0815 8 33.75 8H6.25ZM18 23C18 22.6685 17.8683 22.3505 17.6339 22.1161C17.3995 21.8817 17.0815 21.75 16.75 21.75H11.75C11.6515 21.75 11.554 21.7306 11.463 21.6929C11.372 21.6552 11.2893 21.6 11.2197 21.5303C11.15 21.4607 11.0948 21.378 11.0571 21.287C11.0194 21.196 11 21.0985 11 21V15C11 14.8011 11.079 14.6103 11.2197 14.4697C11.3603 14.329 11.5511 14.25 11.75 14.25H16.75C17.0815 14.25 17.3995 14.1183 17.6339 13.8839C17.8683 13.6495 18 13.3315 18 13C18 12.6685 17.8683 12.3505 17.6339 12.1161C17.3995 11.8817 17.0815 11.75 16.75 11.75H11.75C10.8891 11.7533 10.0643 12.0968 9.45554 12.7055C8.84676 13.3143 8.50329 14.1391 8.5 15V21C8.50329 21.8609 8.84676 22.6857 9.45554 23.2945C10.0643 23.9032 10.8891 24.2467 11.75 24.25H16.75C17.0815 24.25 17.3995 24.1183 17.6339 23.8839C17.8683 23.6495 18 23.3315 18 23ZM31.5 23C31.5 22.6685 31.3683 22.3505 31.1339 22.1161C30.8995 21.8817 30.5815 21.75 30.25 21.75H25.25C25.0521 21.7468 24.8632 21.6667 24.7232 21.5268C24.5833 21.3868 24.5032 21.1979 24.5 21V15C24.5032 14.8021 24.5833 14.6132 24.7232 14.4732C24.8632 14.3333 25.0521 14.2532 25.25 14.25H30.25C30.5815 14.25 30.8995 14.1183 31.1339 13.8839C31.3683 13.6495 31.5 13.3315 31.5 13C31.5 12.6685 31.3683 12.3505 31.1339 12.1161C30.8995 11.8817 30.5815 11.75 30.25 11.75H25.25C24.3891 11.7533 23.5643 12.0968 22.9555 12.7055C22.3468 13.3143 22.0033 14.1391 22 15V21C22.0033 21.8609 22.3468 22.6857 22.9555 23.2945C23.5643 23.9032 24.3891 24.2467 25.25 24.25H30.25C30.5815 24.25 30.8995 24.1183 31.1339 23.8839C31.3683 23.6495 31.5 23.3315 31.5 23ZM37.5 34.25C37.5 33.9185 37.3683 33.6005 37.1339 33.3661C36.8995 33.1317 36.5815 33 36.25 33H3.75C3.41848 33 3.10054 33.1317 2.86612 33.3661C2.6317 33.6005 2.5 33.9185 2.5 34.25C2.5 34.5815 2.6317 34.8995 2.86612 35.1339C3.10054 35.3683 3.41848 35.5 3.75 35.5H36.25C36.5815 35.5 36.8995 35.3683 37.1339 35.1339C37.3683 34.8995 37.5 34.5815 37.5 34.25Z" fill="currentColor"></path> </svg> </div> <span c=""></span> </div> </div> <ul class="dropdown-menu player-dm jw-audio-menu"> <li> <a class="dropdown-item active" href="#" data="$$ {episode.encrypted_url}" label=" $${episode.server}"> <span class="s-title">${episode.server}</span> <div class="w-check"><i class="fa-solid fa-check"></i></div> </a> </li> <li> <a class="dropdown-item" href="#" data="$$ {otherServer.encrypted_url}" label=" $${otherServer.server}"> <span class="s-title">${otherServer.server}</span> <div class="w-check"><i class="fa-solid fa-check"></i></div> </a> </li> </ul>`;

        $('.p_b-right').prepend(dropdownHtml);
    }

    initializeTooltips();
});

$(document).on("click", ".jw-audio-menu .dropdown-item", function () {
    $(".jw-audio-menu .dropdown-item").removeClass("active");
    $(this).addClass("active");

    const newFile = $(this).attr('data'); // URL trực tiếp
    const newLabel = $(this).attr('label');

    file = newFile;
    currentServerName = newLabel;

    $('.jw-audio-label').attr('data-bs-title', newLabel);
    initializeTooltips();

    const _0x4e0061 = playerInstance.getPosition() || 0x0;
    playerInstance.once("playlistItem", function () {
        setTimeout(function () {
            playerInstance.seek(_0x4e0061);
            playerInstance.play();
        }, 0x12c);
    });

    playerInstance.load({
        'file': newFile,
        'type': "application/x-mpegURL",
        'autostart': true
    });
});
// ============================================================

// Phần còn lại giữ nguyên 100% (không thay đổi giao diện)
playerInstance.on("play", function () {
    $('.item-play').removeClass("d-none");
    $('.item-pause').addClass("d-none");
});

playerInstance.on("pause", function () {
    $(".item-pause").removeClass("d-none");
    $('.item-play').addClass("d-none");
});
function addCustomControls() {
    const _0x1c5625 = playerInstance.getConfig().captions;
    const _0x1fe2fd = arrayColor.find(_0x5e9c7b => _0x5e9c7b.color === (_0x1c5625.color || "white"));
    const _0x386cb3 = _0x1fe2fd ? _0x1fe2fd.label : "Trắng";
    const _0x29a0c8 = (_0x1c5625.fontSize || '14') + 'pt';
    const _0x40055c = (_0x1c5625.fontOpacity || "100") + '%';
    const _0xaa16d = _0x1c5625.fontFamily || 'Arial';
    const _0x4669c3 = _0x1c5625.color || "#fff";
    const _0x3582bc = _0x1c5625.edgeStyle || "none";
    const _0x4d0fd9 = arrayBackground.find(_0x3a4036 => _0x3a4036.background === (_0x1c5625.backgroundColor || "#000000"));
    const _0x5355bf = _0x4d0fd9 ? _0x4d0fd9.label : 'Đen';
    const _0x3093fe = _0x1c5625.backgroundColor || '#000000';
    const _0x22ac74 = (_0x1c5625.backgroundOpacity || '0') + '%';
    const _0x2a02ee = arrayColor.find(_0x6a22ee => _0x6a22ee.color === (_0x1c5625.color || "white"));
    const _0x18be66 = _0x2a02ee ? _0x2a02ee.label : 'Trắng';
    const _0x2a3cfa = _0x1c5625.color || "#fff";
    $(".jw-button-container").remove();
    $(".jw-controlbar").prepend("<div class=\"jw-time-container jw-icon-inline jw-text jw-reset\">\n              <div class=\"jw-icon jw-icon-inline jw-text jw-reset jw-text-elapsed\" role=\"timer\">00:00</div>\n              <div class=\"jw-text-div\"></div>\n              <div class=\"jw-icon jw-icon-inline jw-text jw-reset jw-text-countdown\" role=\"timer\">00:00</div>\n              <div class=\"jw-icon jw-icon-inline jw-text jw-reset jw-text-duration\" role=\"timer\">00:00</div>\n            </div>");
    $(".jw-slider-time").addClass("b_bar jw-chapter-slider-time");
    $('.jw-controlbar').append("<div class=\"b_func\">\n    <div class=\"p_b-left line-center gap-4\">\n                 <div class=\"item-btn item-pause jw-btn-play d-none\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"Tạm dừng\">\n                   <div class=\"inc-icon icon-large\">\n                     <svg fill=\"none\" height=\"512\" viewBox=\"0 0 24 24\" width=\"512\" xmlns=\"http://www.w3.org/2000/svg\">\n                       <path d=\"m10.8 15.9 4.67-3.5c.27-.2.27-.6 0-.8l-4.67-3.5c-.33-.25-.8-.01-.8.4v7c0 .41.47.65.8.4zm1.2-13.9c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z\" fill=\"currentColor\"></path>\n                     </svg>\n                   </div>\n                 </div>\n                 <div class=\"item-btn item-play jw-btn-play d-none\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"Phát\">\n                   <div class=\"inc-icon  icon-large\">\n                     <svg fill=\"none\" height=\"512\" viewBox=\"0 0 24 24\" width=\"512\" xmlns=\"http://www.w3.org/2000/svg\">\n                       <path d=\"m10 16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1s-1 .45-1 1v6c0 .55.45 1 1 1zm2-14c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm2-4c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1s-1 .45-1 1v6c0 .55.45 1 1 1z\" fill=\"currentColor\"></path>\n                     </svg>\n                   </div>\n                 </div>\n                 <div class=\"line-center gap-2\">\n                   <div class=\"item-btn skip-10-prev\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"10s trước\">\n                     <div class=\"line-center\">\n                       <div class=\"inc-icon\">\n                         <svg width=\"396\" height=\"430\" viewBox=\"0 0 396 430\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                           <g fill=\"currentColor\">\n                             <path d=\"M237.342 26.3129C243.281 20.3742 243.281 10.7449 237.342 4.80589C231.403 -1.13321 221.773 -1.13321 215.835 4.80589L178.779 41.8615C178.72 41.9187 178.661 41.9765 178.603 42.0348C175.633 45.0044 174.148 48.8971 174.149 52.7894C174.148 56.6821 175.633 60.5748 178.603 63.5444C178.661 63.6027 178.72 63.6605 178.779 63.7178L215.835 100.773C221.773 106.713 231.403 106.713 237.342 100.773C243.281 94.8342 243.281 85.205 237.342 79.2663L225.235 67.1593C254.972 72.106 283 85.0372 306.208 104.807C336.452 130.57 356.532 166.263 362.848 205.487C369.165 244.711 361.305 284.903 340.677 318.858C320.05 352.813 288.003 378.312 250.282 390.783C212.56 403.255 171.63 401.885 134.828 386.919C98.0256 371.951 67.7562 344.366 49.4459 309.108C31.1355 273.849 25.9816 233.222 34.9071 194.508C43.8326 155.794 66.2547 121.524 98.1538 97.8413C104.898 92.8343 106.306 83.3091 101.299 76.5649C96.2924 69.8212 86.7666 68.4135 80.0229 73.4199C42.3199 101.412 15.8181 141.916 5.26888 187.674C-5.28085 233.432 0.811443 281.452 22.4528 323.125C44.0947 364.8 79.8708 397.403 123.37 415.093C166.868 432.784 215.246 434.403 259.83 419.662C304.414 404.921 342.292 374.783 366.672 334.65C391.052 294.517 400.343 247.012 392.877 200.651C385.412 154.291 361.679 112.104 325.932 81.653C297.666 57.5743 263.349 42.0784 227.007 36.6477L237.342 26.3129Z\">\n                             </path>\n                             <path d=\"M150.883 149.325C150.883 131.568 129.676 122.388 116.729 134.54L90.9877 158.701C84.8635 164.449 84.5588 174.073 90.3069 180.197C96.055 186.321 105.68 186.626 111.803 180.878L120.467 172.746V312.954C120.467 321.354 127.276 328.162 135.675 328.162C144.074 328.162 150.883 321.354 150.883 312.954V149.325Z\">\n                             </path>\n                             <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M190.579 187.772C190.579 159.154 213.779 135.953 242.398 135.953C271.016 135.953 294.217 159.154 294.217 187.772V276.358C294.217 304.976 271.016 328.176 242.398 328.176C213.779 328.176 190.579 304.976 190.579 276.358V187.772ZM263.801 187.772V276.358C263.801 288.178 254.218 297.761 242.398 297.761C230.577 297.761 220.995 288.178 220.995 276.358V187.772C220.995 175.952 230.577 166.369 242.398 166.369C254.218 166.369 263.801 175.952 263.801 187.772Z\">\n                             </path>\n                           </g>\n                         </svg>\n                       </div>\n                     </div>\n                   </div>\n                   <div class=\"item-btn skip-10-next\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"10s sau\">\n                     <div class=\"line-center\">\n                       <div class=\"inc-icon\">\n                         <svg width=\"396\" height=\"430\" viewBox=\"0 0 396 430\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                           <g fill=\"currentColor\">\n                             <path d=\"M158.267 26.3129C152.327 20.3742 152.327 10.7449 158.267 4.80589C164.206 -1.13321 173.835 -1.13321 179.774 4.80589L216.829 41.8615C216.889 41.9187 216.947 41.9765 217.005 42.0348C219.975 45.0044 221.46 48.8971 221.46 52.7894C221.46 56.6821 219.975 60.5748 217.005 63.5444C216.947 63.6027 216.889 63.6605 216.829 63.7178L179.774 100.773C173.835 106.713 164.206 106.713 158.267 100.773C152.327 94.8342 152.327 85.205 158.267 79.2663L170.374 67.1593C140.637 72.106 112.608 85.0372 89.4001 104.807C59.1561 130.57 39.0766 166.263 32.7602 205.487C26.4439 244.711 34.3038 284.903 54.9314 318.858C75.5589 352.813 107.605 378.312 145.327 390.783C183.048 403.255 223.978 401.885 260.781 386.919C297.583 371.951 327.852 344.366 346.163 309.108C364.473 273.849 369.627 233.222 360.701 194.508C351.776 155.794 329.354 121.524 297.455 97.8413C290.711 92.8343 289.303 83.3091 294.31 76.5649C299.316 69.8212 308.842 68.4135 315.585 73.4199C353.288 101.412 379.79 141.916 390.34 187.674C400.889 233.432 394.797 281.452 373.156 323.125C351.514 364.8 315.738 397.403 272.239 415.093C228.74 432.784 180.363 434.403 135.778 419.662C91.1941 404.921 53.3168 374.783 28.9365 334.65C4.55614 294.517 -4.73438 247.012 2.73119 200.651C10.1968 154.291 33.9297 112.104 69.6765 81.653C97.9424 57.5743 132.259 42.0784 168.601 36.6477L158.267 26.3129Z\">\n                             </path>\n                             <path d=\"M150.883 149.325C150.883 131.568 129.676 122.388 116.729 134.54L90.9877 158.701C84.8635 164.449 84.5588 174.073 90.3069 180.197C96.055 186.321 105.68 186.626 111.803 180.878L120.467 172.746V312.954C120.467 321.354 127.276 328.162 135.675 328.162C144.074 328.162 150.883 321.354 150.883 312.954V149.325Z\">\n                             </path>\n                             <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M190.579 187.772C190.579 159.154 213.779 135.953 242.398 135.953C271.016 135.953 294.217 159.154 294.217 187.772V276.358C294.217 304.976 271.016 328.176 242.398 328.176C213.779 328.176 190.579 304.976 190.579 276.358V187.772ZM263.801 187.772V276.358C263.801 288.178 254.218 297.761 242.398 297.761C230.577 297.761 220.995 288.178 220.995 276.358V187.772C220.995 175.952 230.577 166.369 242.398 166.369C254.218 166.369 263.801 175.952 263.801 187.772Z\">\n                             </path>\n                           </g>\n                         </svg>\n                       </div>\n                     </div>\n                   </div>\n                 </div>\n                 <div class=\"item-volume ps-3\">\n                   <div class=\"iv-volume line-center gap-3\">\n                     <i class=\"fa-solid fa-volume-high iv-icon btn-muted\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"Tắt tiếng\"></i>\n                     <div id=\"volume\" class=\"iv-bar\">\n                       <div class=\"iv-load\" style=\"width: 100%;\"></div>\n                     </div>\n                   </div>\n                 </div>\n               </div>\n               <div class=\"p_b-right line-center gap-4\">\n                 <div class=\"item-btn item-next d-none\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"\">\n                   <div class=\"line-center\">\n                     <div class=\"inc-icon\">\n                       <svg height=\"512\" viewBox=\"0 0 24 24\" width=\"512\" xmlns=\"http://www.w3.org/2000/svg\">\n                         <path fill=\"currentColor\" d=\"m4.028 20.882a1 1 0 0 0 1.027-.05l12-8a1 1 0 0 0 0-1.664l-12-8a1 1 0 0 0 -1.555.832v16a1 1 0 0 0 .528.882zm1.472-15.013 9.2 6.131-9.2 6.131z\">\n                         </path>\n                         <path fill=\"currentColor\" d=\"m19.5 19a1 1 0 0 0 1-1v-12a1 1 0 0 0 -2 0v12a1 1 0 0 0 1 1z\"></path>\n                       </svg>\n                     </div>\n                     <span>Tập sau</span>\n                   </div>\n                 </div>\n                 \n                 <div class=\"item-btn item-pip jw-float-player\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"Xem dạng cửa sổ\">\n                   <div class=\"line-center\">\n                     <div class=\"inc-icon\">\n                       <svg width=\"98\" height=\"98\" viewBox=\"0 0 98 98\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                         <path d=\"M4.08334 14.1667C4.08334 10.853 6.76964 8.16675 10.0833 8.16675H75.6667C78.9804 8.16675 81.6667 10.853 81.6667 14.1667V35.6251C81.6667 37.374 80.2489 38.7917 78.5 38.7918V38.7918V38.7918C76.8432 38.7918 75.5 37.4486 75.5 35.7918V26.5V20.5C75.5 17.1863 72.8137 14.5 69.5 14.5L17 14.5C13.6863 14.5 11 17.1863 11 20.5V56.5C11 59.8137 13.6863 62.5 17 62.5L21 62.5C22.933 62.5 24.5 64.067 24.5 66V66V66C24.5 67.887 22.9703 69.4167 21.0833 69.4167H10.0833C6.76963 69.4167 4.08334 66.7305 4.08334 63.4167V14.1667Z\" fill=\"currentColor\"></path>\n                         <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M36.75 53.0833C36.75 50.8282 38.5782 49 40.8333 49H89.8333C92.0885 49 93.9167 50.8282 93.9167 53.0833V85.75C93.9167 88.0052 92.0885 89.8333 89.8333 89.8333H40.8333C38.5782 89.8333 36.75 88.0052 36.75 85.75V53.0833ZM49 57.1667C46.7448 57.1667 44.9167 58.9948 44.9167 61.25V77.5833C44.9167 79.8385 46.7448 81.6667 49 81.6667H81.6667C83.9218 81.6667 85.75 79.8385 85.75 77.5833V61.25C85.75 58.9948 83.9218 57.1667 81.6667 57.1667H49Z\" fill=\"currentColor\"></path>\n                         <path d=\"M40.8333 53.0833H89.8333V85.75H40.8333V53.0833Z\" fill=\"currentColor\">\n                         </path>\n                       </svg>\n\n                     </div>\n                     <span>PiP</span>\n                   </div>\n                 </div>\n                 <div class=\"item-btn item-setup\" data-bs-toggle=\"dropdown\" data-bs-auto-close=\"outside\" aria-expanded=\"false\">\n                   <div class=\"line-center\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\">\n                     <div class=\"inc-icon icon-quality\">\n\n                       <svg width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                         <path d=\"M35.2488 14.8255V25.1732C35.2488 26.8355 34.3618 28.3712 32.9218 29.203L23.9623 34.376C22.5222 35.208 20.7482 35.208 19.3082 34.376L10.3469 29.203C8.90852 28.3712 8.02148 26.8355 8.02148 25.1732V14.8255C8.02148 13.1633 8.90852 11.6276 10.3469 10.7974L19.3082 5.62271C20.7482 4.79243 22.5222 4.79243 23.9623 5.62271L32.9218 10.7974C34.3618 11.6276 35.2488 13.1633 35.2488 14.8255Z\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>\n                         <path d=\"M21.6335 24.6114C24.181 24.6114 26.2453 22.5471 26.2453 19.9994C26.2453 17.4518 24.181 15.3875 21.6335 15.3875C19.0858 15.3875 17.0215 17.4518 17.0215 19.9994C17.0215 22.5471 19.0858 24.6114 21.6335 24.6114Z\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>\n                       </svg>\n                       <span class=\"q-play\">Auto</span>\n                     </div>\n                     <span>Cài đặt</span>\n                   </div>\n                 </div>\n                 <ul class=\"dropdown-menu player-dm\">\n                   <div class=\"content-slide\">\n                     <div class=\"dropdown-title\">\n                       <span class=\"s-title\">Cài đặt</span>\n                     </div>\n                     <div class=\"cs-list\">\n                       <a id=\"toggle-quality\" class=\"cs-item line-center\">\n                         <div class=\"csi-title\">Chất lượng</div>\n                         <div class=\"csi-current line-center\">\n                           <span class=\"jw-title-quality\">Auto (1080P)</span>\n                           <i class=\"fa-solid fa-angle-right\"></i>\n                         </div>\n                       </a>\n                       <a id=\"toggle-caption\" class=\"cs-item line-center\">\n                         <div class=\"csi-title\">Phụ đề</div>\n                         <div class=\"csi-current line-center\">\n                           <span>Tuỳ chỉnh</span>\n                           <i class=\"fa-solid fa-angle-right\"></i>\n                         </div>\n                       </a>\n                       <a id=\"toggle-speed\" class=\"cs-item line-center\">\n                         <div class=\"csi-title\">Tốc độ</div>\n                         <div class=\"csi-current line-center\">\n                           <span class=\"jw-speed-text\">1x</span>\n                           <i class=\"fa-solid fa-angle-right\"></i>\n                         </div>\n                       </a>\n                     </div>\n                   </div>\n                   <div id=\"sub-quality\" class=\"sub-slide level-1\" style=\"display: none;\">\n                     <div class=\"dropdown-title\">\n                       <span class=\"s-title sub-back line-center\">\n                         <i class=\"fa-solid fa-angle-left\"></i>\n                         Chất lượng\n                       </span>\n                     </div>\n                     <div class=\"cs-list jw-quality-menu\">\n                     </div>\n                   </div>\n                   <div id=\"sub-speed\" class=\"sub-slide level-1\" style=\"display: none;\">\n                     <div class=\"dropdown-title\">\n                       <span class=\"s-title sub-back line-center\">\n                         <i class=\"fa-solid fa-angle-left\"></i>\n                         Tốc độ\n                       </span>\n                     </div>\n                     <div class=\"cs-list jw-playback-rate\">\n                       <a class=\"cs-item line-center\" data=\"0.25\">\n                         <div class=\"csi-title\">0.25x</div>\n                         <i class=\"fa-solid fa-check\"></i>\n                       </a>\n                       <a class=\"cs-item line-center\" data=\"0.5\">\n                         <div class=\"csi-title\">0.5x</div>\n                         <i class=\"fa-solid fa-check\"></i>\n                       </a>\n                       <a class=\"cs-item line-center active\" data=\"1\">\n                         <div class=\"csi-title\">1x</div>\n                         <i class=\"fa-solid fa-check\"></i>\n                       </a>\n                       <a class=\"cs-item line-center\" data=\"1.25\">\n                         <div class=\"csi-title\">1.25x</div>\n                         <i class=\"fa-solid fa-check\"></i>\n                       </a>\n                       <a class=\"cs-item line-center\" data=\"1.5\">\n                         <div class=\"csi-title\">1.5x</div>\n                         <i class=\"fa-solid fa-check\"></i>\n                       </a>\n                       <a class=\"cs-item line-center\" data=\"2\">\n                         <div class=\"csi-title\">2x</div>\n                         <i class=\"fa-solid fa-check\"></i>\n                       </a>\n                     </div>\n                   </div>\n\n\n                   <div id=\"sub-caption\" class=\"sub-slide level-1\" style=\"display: none;\">\n                     <div class=\"dropdown-title\">\n                       <span class=\"s-title sub-back line-center\">\n                         <i class=\"fa-solid fa-angle-left\"></i>\n                         Tuỳ chỉnh\n                       </span>\n                     </div>\n                     <div class=\"cs-list jw-subtitle-setting-menu\">\n                       <div class=\"csl-primary\">\n                         <div class=\"dropdown-title py-1\">\n                           <span class=\"s-title small\">Phụ đề chính</span>\n                         </div>\n                         <a id=\"toggle-font\" class=\"cs-item line-center\" data-type=\"color\">\n                           <div class=\"csi-title\">Màu chữ</div>\n                           <div class=\"csi-current line-center\">\n                             <div class=\"csi-color\" style=\"background-color: " + _0x4669c3 + ";\"></div>\n                             <span>" + _0x386cb3 + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a id=\"toggle-size\" class=\"cs-item line-center\" data-type=\"fontSize\">\n                           <div class=\"csi-title\">Cỡ chữ</div>\n                           <div class=\"csi-current line-center\">\n                             <span>" + _0x29a0c8 + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a id=\"toggle-opacity-font\" class=\"cs-item line-center\" data-type=\"fontOpacity\">\n                           <div class=\"csi-title\">Độ trong</div>\n                           <div class=\"csi-current line-center\">\n                             <span>" + _0x40055c + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a id=\"toggle-font-family\" class=\"cs-item line-center\" data-type=\"fontFamily\">\n                           <div class=\"csi-title\">Font chữ</div>\n                           <div class=\"csi-current line-center\">\n                             <span>" + _0xaa16d + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a id=\"toggle-border-font\" class=\"cs-item line-center\" data-type=\"edgeStyle\">\n                           <div class=\"csi-title\">Viền chữ</div>\n                           <div class=\"csi-current line-center\">\n                             <span>" + (_0x3582bc === "none" ? "Không viền" : _0x3582bc === "raised" ? "Bo viền" : "Đổ bóng") + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a id=\"toggle-background\" class=\"cs-item line-center\" data-type=\"backgroundColor\">\n                           <div class=\"csi-title\">Màu nền</div>\n                           <div class=\"csi-current line-center\">\n                             <div class=\"csi-color\" style=\"background-color: " + _0x3093fe + ";\"></div>\n                             <span>" + _0x5355bf + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a id=\"toggle-opacity-background\" class=\"cs-item line-center\" data-type=\"backgroundOpacity\">\n                           <div class=\"csi-title\">Độ trong nền</div>\n                           <div class=\"csi-current line-center\">\n                             <span>" + _0x22ac74 + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                       </div>\n                       <div class=\"csl-secondary\">\n                         <hr>\n                         <div class=\"dropdown-title py-1\">\n                           <span class=\"s-title small\">Song ngữ</span>\n                         </div>\n                         <a class=\"cs-item line-center\" data-type=\"color-sub\" id=\"toggle-color-sub\">\n                           <div class=\"csi-title\">Màu chữ</div>\n                           <div class=\"csi-current line-center\">\n                             <div class=\"csi-color\" style=\"background-color: " + _0x2a3cfa + ";\"></div>\n                             <span>" + _0x18be66 + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a class=\"cs-item line-center\" data-type=\"fontSize-sub\" id=\"toggle-size-sub\">\n                           <div class=\"csi-title\">Cỡ chữ</div>\n                           <div class=\"csi-current line-center\">\n                             <span>" + '70' + "%</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a class=\"cs-item line-center\" data-type=\"fontOpacity-sub\" id=\"toggle-opacity-sub\">\n                           <div class=\"csi-title\">Độ trong</div>\n                           <div class=\"csi-current line-center\">\n                             <span>" + "100" + "%</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                         <a class=\"cs-item line-center\" data-type=\"fontFamily-sub\" id=\"toggle-font-family-sub\">\n                           <div class=\"csi-title\">Font chữ</div>\n                           <div class=\"csi-current line-center\">\n                             <span>" + "Arial" + "</span>\n                             <i class=\"fa-solid fa-angle-right\"></i>\n                           </div>\n                         </a>\n                       </div>\n                     </div>\n                   </div>\n                 </ul>\n                 <div class=\"item-btn item-max\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"Phóng to\">\n                   <div class=\"line-center\">\n                     <div class=\"inc-icon\">\n                       <svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                         <path d=\"M18.73 55C21.3421 55 23.4601 53.1121 23.4601 50.5L23.4601 27.4601L48 27.4601C50.6121 27.4601 53 25.3421 53 22.7301C53 20.118 50.6121 18 48 18L18.73 18C16.118 18 14 20.118 14 22.73L14 50.5C14 53.1121 16.118 55 18.73 55Z\" fill=\"currentColor\"></path>\n                         <path d=\"M53.9997 105.27C53.9997 102.658 51.6118 100.54 48.9997 100.54L23.4601 100.54L23.4601 78C23.4601 75.3879 21.3421 73 18.73 73C16.118 73 14 75.3879 14 78L14 105.27C14 107.882 16.118 110 18.73 110L48.9997 110C51.6118 110 53.9997 107.882 53.9997 105.27Z\" fill=\"currentColor\"></path>\n                         <path d=\"M74 22.73C74 25.3421 76.3879 27.4601 79 27.4601L104.54 27.46L104.54 50C104.54 52.6121 106.658 55 109.27 55C111.882 55 114 52.6121 114 50L114 22.73C114 20.118 111.882 18 109.27 18L79 18C76.3879 18 74 20.118 74 22.73Z\" fill=\"currentColor\"></path>\n                         <path d=\"M109.27 72C106.658 72 104.54 74.3879 104.54 77V100.54L80 100.54C77.3879 100.54 75 102.658 75 105.27C75 107.882 77.3879 110 80 110L109.27 110C111.882 110 114 107.882 114 105.27V77C114 74.3879 111.882 72 109.27 72Z\" fill=\"currentColor\"></path>\n                       </svg>\n                     </div>\n                     <span>Phóng to</span>\n                   </div>\n                 </div>\n                 <div class=\"item-btn item-min d-none\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"Thu nhỏ\">\n                   <div class=\"line-center\">\n                     <div class=\"inc-icon\">\n                       <svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                         <path d=\"M79.73 111C82.3421 111 84.4601 108.112 84.4601 105.5L84.4601 84.4601L109 84.4601C111.612 84.4601 114 82.3421 114 79.73C114 77.118 111.612 75 109 75L79.73 75C77.118 75 75 77.118 75 79.73L75 105.5C75 108.112 77.118 111 79.73 111Z\" fill=\"currentColor\"></path>\n                         <path d=\"M114 48.27C114 45.6579 111.612 43.5399 109 43.5399L83.4601 43.5399L83.4601 23C83.4601 20.3879 81.3421 18 78.73 18C76.118 18 74 20.3879 74 23L74 48.27C74 50.882 76.118 53 78.73 53L109 53C111.612 53 114 50.882 114 48.27Z\" fill=\"currentColor\"></path>\n                         <path d=\"M14 79.73C14 82.3421 16.3879 84.46 19 84.46L44.5396 84.46L44.5396 105.5C44.5396 108.112 46.6576 110.5 49.2697 110.5C51.8818 110.5 53.9997 108.112 53.9997 105.5L53.9997 79.73C53.9997 77.118 51.8818 75 49.2697 75L19 75C16.3879 75 14 77.118 14 79.73Z\" fill=\"currentColor\"></path>\n                         <path d=\"M48.27 18C45.6579 18 43.5399 20.3879 43.5399 23V44.5396L19 44.5396C16.3879 44.5396 14 46.6576 14 49.2697C14 51.8818 16.3879 53.9997 19 53.9997L48.27 53.9997C50.882 53.9997 53 51.8818 53 49.2697L53 23C53 20.3879 50.882 18 48.27 18Z\" fill=\"currentColor\"></path>\n                       </svg>\n                     </div>\n                     <span>Thu nhỏ</span>\n                   </div>\n                 </div>\n               </div>\n             </div>");
}
$(document).on("click", '.item-next', function (_0x37dbc6) {
    _0x37dbc6.preventDefault();
    skipToNextEpisode();
});
playerInstance.on("meta", function (_0x195b5e) {
    if (_0x195b5e.duration) {
        setTimeout(() => {
            addTimelineMarkers();
        }, 0x64);
    }
});
$(document).on('click', '#skip-intro', function (_0x3c03dd) {
    _0x3c03dd.preventDefault();
    skipIntro();
});
$(document).on("click", "#skip-outro", function (_0x3222e2) {
    _0x3222e2.preventDefault();
    skipToNextEpisode();
});
let lastTimeUpdate = 0x0;
let lastStorageUpdate = 0x0;
let lastMessageUpdate = 0x0;
let storageTimeout = null;
let lastSkipUpdate = 0x0;
playerInstance.on("time", function (_0x373b0e) {
    var _0x2da5ef = playerInstance.getPosition();
    var _0x134319 = playerInstance.getDuration();
    var _0x2e524e = _0x134319 - _0x2da5ef;
    var _0x36e73b = Date.now();
    var _0x26ab34 = jwplayer.utils && jwplayer.utils.timeFormat ? jwplayer.utils.timeFormat : function (_0x5ab102) {
        _0x5ab102 = Math.max(0x0, Math.floor(_0x5ab102));
        var _0x2ed201 = Math.floor(_0x5ab102 / 0x3c);
        var _0x2cefdd = _0x5ab102 % 0x3c;
        return _0x2ed201 + ':' + (_0x2cefdd < 0xa ? '0' : '') + _0x2cefdd;
    };
    if (_0x36e73b - lastTimeUpdate > 0xfa) {
        $(".jw-text-elapsed").text(_0x26ab34(_0x2da5ef));
        $('.jw-text-duration').text(_0x26ab34(_0x134319));
        $(".jw-text-countdown").text('-' + _0x26ab34(_0x2e524e));
        lastTimeUpdate = _0x36e73b;
    }
    if (typeof Storage !== 'undefined' && _0x36e73b - lastStorageUpdate > 0x1388) {
        clearTimeout(storageTimeout);
        storageTimeout = setTimeout(() => {
            try {
                localStorage.setItem(resumeData, _0x2da5ef);
                lastStorageUpdate = _0x36e73b;
            } catch (_0x1d15a7) {
                console.warn("Không thể lưu vào localStorage:", _0x1d15a7);
            }
        }, 0x64);
    }
    if (_0x36e73b - lastSkipUpdate > 0x3e8) {
        handleIntroSkip(_0x2da5ef);
        handleOutroSkip(_0x2da5ef, _0x134319);
        lastSkipUpdate = _0x36e73b;
    }
    if (_0x36e73b - lastMessageUpdate > 0x7d0) {
        try {
            window.parent.postMessage({
                'type': "PLAYER_TIME_UPDATE",
                'data': {
                    'current': _0x2da5ef,
                    'duration': _0x134319,
                    'remaining': _0x2e524e
                }
            }, '*');
            lastMessageUpdate = _0x36e73b;
        } catch (_0x271f6c) {
            console.warn("Không thể gửi message:", _0x271f6c);
        }
    }
    updateDualSubtitles();
});
function handleIntroSkip(_0x13d90c) {
    const _0x2ff4e9 = $("#skip-intro");
    if (!introSkipped && _0x13d90c >= CONFIG.introStart && _0x13d90c <= CONFIG.introEnd) {
        _0x2ff4e9.show();
    } else {
        _0x2ff4e9.hide();
    }
}
function handleOutroSkip(_0x24a54f, _0x2b5950) {
    if (CONFIG.outroStart && CONFIG.outroStart > 0x0) {
        if (nextEpisode && nextEpisode !== 'null' && _0x24a54f >= CONFIG.outroStart && _0x24a54f < _0x2b5950) {
            $('#skip-outro').show();
            startOutroCountdown(_0x24a54f);
        } else {
            $("#skip-outro").hide();
        }
        if (CONFIG.outroEnd && CONFIG.outroEnd > 0x0 && _0x24a54f >= CONFIG.outroEnd) {
            $("#skip-outro").hide();
        }
    } else {
        const _0xc87f5c = _0x2b5950 - 0xa;
        if (nextEpisode && nextEpisode !== "null" && _0x24a54f >= _0xc87f5c && _0x24a54f < _0x2b5950) {
            $("#skip-outro").show();
            startOutroCountdown(_0x24a54f);
        } else {
            $("#skip-outro").hide();
        }
    }
    if (_0x24a54f + 0x1 >= _0x2b5950) {
        skipToNextEpisode("next-auto");
    }
}
function skipIntro() {
    playerInstance.seek(CONFIG.introEnd);
    introSkipped = true;
    $("#skip-intro").hide();
}
function startOutroCountdown(_0x4fd667) {
    const _0x12b403 = $("#skip-outro .progress");
    if (CONFIG.outroStart && CONFIG.outroStart > 0x0) {
        const _0x510424 = (CONFIG.outroEnd || playerInstance.getDuration()) - CONFIG.outroStart;
        const _0x139b57 = _0x4fd667 - CONFIG.outroStart;
        const _0x3b9d3f = Math.min(0x64, Math.max(0x0, _0x139b57 / _0x510424 * 0x64));
        _0x12b403.css('width', _0x3b9d3f + '%');
    } else {
        const _0x3b490f = _0x4fd667 - (playerInstance.getDuration() - 0xa);
        const _0x585e4a = Math.min(0x64, Math.max(0x0, _0x3b490f / 0xa * 0x64));
        _0x12b403.css("width", _0x585e4a + '%');
    }
}
function skipToNextEpisode(_0x6f4612 = "next") {
    if (nextEpisode && nextEpisode !== 'null') {
        window.parent.postMessage({
            'type': "CHANGE_EPISODE",
            'episodeId': nextEpisode.id,
            'action': _0x6f4612
        }, '*');
    }
}
function addTimelineMarkers() {
    const _0x376fae = playerInstance.getDuration();
    if (!_0x376fae) {
        return;
    }
    const _0xf053b9 = $(".jw-slider-container");
    if (_0xf053b9.length === 0x0) {
        return;
    }
    $(".jw-intro, .jw-outro").remove();
    if (CONFIG.introStart && CONFIG.introEnd && CONFIG.introStart > 0x0 && CONFIG.introEnd > 0x0 && CONFIG.introStart < CONFIG.introEnd) {
        const _0x33d26e = CONFIG.introStart / _0x376fae * 0x64;
        const _0x47328b = (CONFIG.introEnd - CONFIG.introStart) / _0x376fae * 0x64;
        const _0xe6c7bc = $("\n      <div class=\"jw-reset jw-intro\" \n           style=\"margin-left: " + _0x33d26e + "%; width: " + _0x47328b + "%\">\n      </div>\n    ");
        _0xf053b9.append(_0xe6c7bc);
    }
    if (CONFIG.outroStart && CONFIG.outroStart > 0x0) {
        const _0x8b3582 = CONFIG.outroStart / _0x376fae * 0x64;
        const _0x219d94 = ((CONFIG.outroEnd || playerInstance.getDuration()) - CONFIG.outroStart) / _0x376fae * 0x64;
        const _0x58748d = $("\n      <div class=\"jw-reset jw-outro\" \n           style=\"margin-left: " + _0x8b3582 + "%; width: " + _0x219d94 + "%\">\n      </div>\n    ");
        _0xf053b9.append(_0x58748d);
    }
}
$(document).on("click", '.jw-btn-play', function () {
    if (playerInstance.getState() === "playing") {
        playerInstance.pause();
    } else {
        playerInstance.play();
    }
});
playerInstance.on("setupError", function (_0x22dd39) {
    alert("Setup error:", _0x22dd39);
});
function initializeTooltips() {
    const _0x39b6f9 = document.querySelectorAll("[data-bs-toggle=\"tooltip\"]");
    [..._0x39b6f9].map(_0x13492c => new bootstrap.Tooltip(_0x13492c));
}
$(document).on('click', ".skip-10-prev", () => {
    const _0x3a23d7 = playerInstance.getPosition();
    playerInstance.seek(Math.max(0x0, _0x3a23d7 - 0xa));
});
$(document).on('click', ".skip-10-next", () => {
    const _0x5740cc = playerInstance.getPosition();
    const _0x242f25 = playerInstance.getDuration();
    playerInstance.seek(Math.min(_0x242f25, _0x5740cc + 0xa));
});
let isMuted = false;
let isDragging = false;
playerInstance.on("volume", function (_0x87c66b) {
    const _0x185586 = _0x87c66b.volume;
    $('.iv-load').css('width', _0x185586 + '%');
    if (_0x185586 === 0x0) {
        $(".btn-muted").addClass("fa-volume-mute");
        $(".btn-muted").removeClass("fa-volume-high");
    } else {
        $(".btn-muted").addClass("fa-volume-high");
        $(".btn-muted").removeClass('fa-volume-mute');
    }
});
function updateVolume(_0x1ec3a0) {
    const _0x147247 = $("#volume")[0x0].getBoundingClientRect();
    let _0x1aecc7 = (_0x1ec3a0 - _0x147247.left) / _0x147247.width;
    _0x1aecc7 = Math.max(0x0, Math.min(0x1, _0x1aecc7));
    $('.iv-load').css("width", _0x1aecc7 * 0x64 + '%');
    playerInstance.setVolume(_0x1aecc7 * 0x64);
    if (_0x1aecc7 === 0x0) {
        isMuted = true;
        $(".btn-muted").addClass('fa-volume-mute');
        $(".btn-muted").removeClass("fa-volume-high");
    } else {
        isMuted = false;
        $(".btn-muted").addClass("fa-volume-high");
        $(".btn-muted").removeClass('fa-volume-mute');
    }
}
$(document).on("mousedown", "#volume", function (_0x193eaa) {
    isDragging = true;
    updateVolume(_0x193eaa.clientX);
});
$(document).on('mousemove', function (_0x3928f4) {
    if (isDragging) {
        updateVolume(_0x3928f4.clientX);
    }
});
$(document).on('mouseup', function (_0x84fcb8) {
    isDragging = false;
});
$(document).on("click", "#volume", function (_0x4a8fe2) {
    updateVolume(_0x4a8fe2.clientX);
});
$(document).on("click", ".btn-muted", function () {
    isMuted = !isMuted;
    if (isMuted) {
        playerInstance.setVolume(0x0);
        $(".iv-load").css('width', '0%');
        $(".btn-muted").addClass('fa-volume-mute');
        $(".btn-muted").removeClass("fa-volume-high");
    } else {
        playerInstance.setVolume(0x64);
        $('.iv-load').css("width", '100%');
        $(".btn-muted").addClass('fa-volume-high');
        $('.btn-muted').removeClass("fa-volume-mute");
    }
});
$(document).on("click", '.item-max', function () {
    playerInstance.setFullscreen(true);
    $(".item-max").addClass('d-none');
    $(".item-min").removeClass("d-none");
});
$(document).on('click', ".item-min", function () {
    playerInstance.setFullscreen(false);
    $(".item-max").removeClass("d-none");
    $('.item-min').addClass('d-none');
});
playerInstance.on("fullscreen", function (_0x10847e) {
    if (_0x10847e.fullscreen) {
        $(".item-max").addClass("d-none");
        $(".item-min").removeClass("d-none");
    } else {
        $(".item-max").removeClass("d-none");
        $(".item-min").addClass("d-none");
    }
});
$(document).on("click", '.item-pip', function () {
    if (document.pictureInPictureEnabled || document.webkitPictureInPictureEnabled) {
        const _0x59d32f = playerInstance.getContainer().querySelector("video");
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture()['catch'](_0x3facf4 => {
                console.error("Lỗi khi thoát PiP:", _0x3facf4);
            });
        } else {
            _0x59d32f.requestPictureInPicture()['catch'](_0x46d04f => {
                console.error("Lỗi khi bật PiP:", _0x46d04f);
            });
        }
    } else {
        alert("Trình duyệt của bạn không hỗ trợ chế độ Picture-in-Picture");
    }
});
$(document).on("click", "#toggle-speed", function () {
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-speed").fadeIn(0x0);
    });
});
$(document).on("click", ".sub-back", function () {
    const _0x1cc0ec = $(this).closest(".sub-slide");
    let _0x38e0dc;
    if (_0x1cc0ec.hasClass("level-2")) {
        _0x38e0dc = $("#sub-caption");
    } else {
        _0x38e0dc = $(".content-slide");
    }
    $(".level-1").hide();
    _0x1cc0ec.fadeOut(0x0, function () {
        _0x38e0dc.fadeIn(0x0);
    });
});
$(document).on("click", '#toggle-quality', function () {
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $('#sub-quality').fadeIn(0x0);
    });
});
$(document).on('click', "#toggle-caption", function () {
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
});
$(document).on("click", "#sub-speed .cs-item", function () {
    const _0x13742a = parseFloat($(this).attr("data"));
    if (isNaN(_0x13742a) || _0x13742a <= 0x0) {
        return;
    }
    try {
        playerInstance.setPlaybackRate(_0x13742a);
        $(".jw-playback-rate .cs-item").removeClass("active");
        $(this).addClass("active");
        $(".jw-speed-text").text(_0x13742a + 'x');
        $("#sub-speed").hide();
        $('.content-slide').show();
    } catch (_0x4a2a19) {
        console.error("Lỗi khi set tốc độ:", _0x4a2a19);
    }
});
playerInstance.on("levels", function (_0x42f243) {
    const _0x32b794 = _0x42f243.levels;
    const _0x372dfe = -0x1;
    $('.jw-quality-menu').empty();
    let _0x50ca18 = 'Auto';
    if (_0x372dfe === -0x1) {
        const _0x101765 = playerInstance.getVisualQuality();
        if (_0x101765 && _0x101765.level && _0x101765.level.height) {
            _0x50ca18 = "Auto (" + formatQualityLabel(_0x101765.level.height) + ')';
        }
    }
    $('.jw-quality-menu').append("\n    <a class=\"cs-item line-center " + (_0x372dfe === -0x1 ? "active" : '') + "\" data-level=\"-1\">\n        <div class=\"csi-title\">" + _0x50ca18 + "</div>\n        <i class=\"fa-solid fa-check\"></i>\n    </a>\n  ");
    const _0x5dfe32 = [..._0x32b794].sort((_0x2522b6, _0x4a2595) => (_0x4a2595.height || 0x0) - (_0x2522b6.height || 0x0));
    _0x5dfe32.forEach((_0x2889db, _0x5d53c8) => {
        if (typeof _0x2889db.height !== "undefined") {
            const _0x359c72 = _0x32b794.findIndex(_0x3521f4 => _0x3521f4 === _0x2889db);
            const _0x32a46e = _0x359c72 === _0x372dfe;
            const _0x16df6c = formatQualityLabel(_0x2889db.height);
            $(".jw-quality-menu").append("\n        <a class=\"cs-item line-center " + (_0x32a46e ? "active" : '') + "\" data-level=\"" + _0x359c72 + "\">\n            <div class=\"csi-title\">" + _0x16df6c + "</div>\n            <i class=\"fa-solid fa-check\"></i>\n        </a>\n    ");
        }
    });
    $(".jw-title-quality").text("Auto");
    $(".q-play").text("Auto");
});
function updateQualityText(_0xd03f97, _0x868b61) {
    let _0x42eda4 = "Auto";
    if (_0xd03f97 === -0x1) {
        const _0x595eca = playerInstance.getVisualQuality();
        if (_0x595eca && _0x595eca.level && _0x595eca.level.height) {
            _0x42eda4 = "Auto (" + formatQualityTitle(_0x595eca.level.height) + ')';
        } else {
            const _0x53a595 = _0x868b61.find(_0x52041b => _0x52041b.bitrate === _0x595eca?.["reason"]?.['bitrate']);
            if (_0x53a595) {
                _0x42eda4 = "Auto (" + formatQualityTitle(_0x53a595.height) + ')';
            }
        }
    } else {
        if (_0xd03f97 >= 0x0 && _0x868b61[_0xd03f97]) {
            const _0x41a6d4 = _0x868b61[_0xd03f97];
            _0x42eda4 = formatQualityTitle(_0x41a6d4.height);
        }
    }
    $(".jw-title-quality").text(_0x42eda4);
    $('.q-play').text(_0x42eda4);
}
function formatQualityLabel(_0x3f9028) {
    if (!_0x3f9028) {
        return "Auto";
    }
    const _0x1ea9a5 = {
        0x870: '4K',
        0x5a0: '2K',
        0x438: "FHD 1080p",
        0x2d0: "HD 720p",
        0x1e0: "480p",
        0x168: "360p",
        0xf0: "240p",
        0x90: '144p'
    };
    return _0x1ea9a5[_0x3f9028] || _0x3f9028 + 'p';
}
function formatQualityTitle(_0x283cfd) {
    if (!_0x283cfd) {
        return "Auto";
    }
    const _0x43d710 = {
        0x870: '4K',
        0x5a0: '2K',
        0x438: "FHD",
        0x2d0: 'HD',
        0x1e0: "480p",
        0x168: '360p',
        0xf0: '240p',
        0x90: "144p"
    };
    return _0x43d710[_0x283cfd] || _0x283cfd + 'p';
}
playerInstance.on("visualQuality", function (_0x3ee408) {
    const _0x199649 = playerInstance.getCurrentQuality();
    if (_0x199649 === -0x1) {
        const _0x5f16a9 = _0x3ee408.level.height;
        let _0x3983 = 'Auto';
        if (_0x5f16a9) {
            _0x3983 = "Auto (" + formatQualityLabel(_0x5f16a9) + ')';
            $(".jw-quality-menu .cs-item[data-level=\"-1\"] .csi-title").text(_0x3983);
        }
        $('.jw-title-quality').text(_0x3983);
        $(".q-play").text(_0x3983);
    }
});
playerInstance.on('levelsChanged', function (_0x18f37f) {
    const _0x46df35 = _0x18f37f.currentQuality;
    const _0x539c67 = playerInstance.getQualityLevels();
    $(".jw-quality-menu .cs-item").removeClass("active");
    $(".jw-quality-menu .cs-item[data-level=\"" + _0x46df35 + "\"]").addClass("active");
    updateQualityText(_0x46df35, _0x539c67);
});
$(document).on("click", ".jw-quality-menu .cs-item", function () {
    const _0x25c9de = parseInt($(this).data('level'));
    playerInstance.setCurrentQuality(_0x25c9de);
    $(".jw-quality-menu .cs-item").removeClass("active");
    $(this).addClass("active");
    if (_0x25c9de === -0x1) {
        let _0x4e1402 = "Auto";
        const _0x265af3 = playerInstance.getVisualQuality && playerInstance.getVisualQuality();
        if (_0x265af3 && _0x265af3.level && _0x265af3.level.height) {
            _0x4e1402 = "Auto (" + formatQualityTitle(_0x265af3.level.height) + ')';
        }
        $(".jw-title-quality").text(_0x4e1402);
        $(".q-play").text('Auto');
    } else {
        const _0x59aa5d = playerInstance.getQualityLevels();
        updateQualityText(_0x25c9de, _0x59aa5d);
    }
    $("#sub-quality").hide();
    $(".content-slide").show();
});
playerInstance.on("captionsList", function (_0xfaef20) {
    const _0x3e81fc = _0xfaef20.tracks;
    $(".jw-main-caption-menu").empty();
    $(".jw-sub-caption-menu").empty();
    if (_0x3e81fc.length === 0x0) {
        $('#sub-off').click();
        return;
    }
    if (_0x3e81fc.length > 0x0) {
        const _0x43a510 = _0x3e81fc.findIndex(_0x22e23a => _0x22e23a.id === "default") ?? 0x1;
        playerInstance.setCurrentCaptions(_0x43a510);
        $(".p_b-right").prepend("<div class=\"item-btn item-sub jw-caption-button\" data-bs-toggle=\"dropdown\" data-bs-auto-close=\"outside\" aria-expanded=\"false\">\n                    <div class=\"line-center\" data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"Phụ đề\">\n                      <div class=\"inc-icon\">\n                        <svg width=\"40\" height=\"41\" viewBox=\"0 0 40 41\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                          <path d=\"M33.75 30.5H6.25C5.25544 30.5 4.30161 30.1049 3.59835 29.4017C2.89509 28.6984 2.5 27.7446 2.5 26.75V9.25C2.5 8.25544 2.89509 7.30161 3.59835 6.59835C4.30161 5.89509 5.25544 5.5 6.25 5.5H33.75C34.7446 5.5 35.6984 5.89509 36.4016 6.59835C37.1049 7.30161 37.5 8.25544 37.5 9.25V26.75C37.5 27.7446 37.1049 28.6984 36.4016 29.4017C35.6984 30.1049 34.7446 30.5 33.75 30.5ZM6.25 8C5.91848 8 5.60054 8.1317 5.36612 8.36612C5.1317 8.60054 5 8.91848 5 9.25V26.75C5 27.0815 5.1317 27.3995 5.36612 27.6339C5.60054 27.8683 5.91848 28 6.25 28H33.75C34.0815 28 34.3995 27.8683 34.6339 27.6339C34.8683 27.3995 35 27.0815 35 26.75V9.25C35 8.91848 34.8683 8.60054 34.6339 8.36612C34.3995 8.1317 34.0815 8 33.75 8H6.25ZM18 23C18 22.6685 17.8683 22.3505 17.6339 22.1161C17.3995 21.8817 17.0815 21.75 16.75 21.75H11.75C11.6515 21.75 11.554 21.7306 11.463 21.6929C11.372 21.6552 11.2893 21.6 11.2197 21.5303C11.15 21.4607 11.0948 21.378 11.0571 21.287C11.0194 21.196 11 21.0985 11 21V15C11 14.8011 11.079 14.6103 11.2197 14.4697C11.3603 14.329 11.5511 14.25 11.75 14.25H16.75C17.0815 14.25 17.3995 14.1183 17.6339 13.8839C17.8683 13.6495 18 13.3315 18 13C18 12.6685 17.8683 12.3505 17.6339 12.1161C17.3995 11.8817 17.0815 11.75 16.75 11.75H11.75C10.8891 11.7533 10.0643 12.0968 9.45554 12.7055C8.84676 13.3143 8.50329 14.1391 8.5 15V21C8.50329 21.8609 8.84676 22.6857 9.45554 23.2945C10.0643 23.9032 10.8891 24.2467 11.75 24.25H16.75C17.0815 24.25 17.3995 24.1183 17.6339 23.8839C17.8683 23.6495 18 23.3315 18 23ZM31.5 23C31.5 22.6685 31.3683 22.3505 31.1339 22.1161C30.8995 21.8817 30.5815 21.75 30.25 21.75H25.25C25.0521 21.7468 24.8632 21.6667 24.7232 21.5268C24.5833 21.3868 24.5032 21.1979 24.5 21V15C24.5032 14.8021 24.5833 14.6132 24.7232 14.4732C24.8632 14.3333 25.0521 14.2532 25.25 14.25H30.25C30.5815 14.25 30.8995 14.1183 31.1339 13.8839C31.3683 13.6495 31.5 13.3315 31.5 13C31.5 12.6685 31.3683 12.3505 31.1339 12.1161C30.8995 11.8817 30.5815 11.75 30.25 11.75H25.25C24.3891 11.7533 23.5643 12.0968 22.9555 12.7055C22.3468 13.3143 22.0033 14.1391 22 15V21C22.0033 21.8609 22.3468 22.6857 22.9555 23.2945C23.5643 23.9032 24.3891 24.2467 25.25 24.25H30.25C30.5815 24.25 30.8995 24.1183 31.1339 23.8839C31.3683 23.6495 31.5 23.3315 31.5 23ZM37.5 34.25C37.5 33.9185 37.3683 33.6005 37.1339 33.3661C36.8995 33.1317 36.5815 33 36.25 33H3.75C3.41848 33 3.10054 33.1317 2.86612 33.3661C2.6317 33.6005 2.5 33.9185 2.5 34.25C2.5 34.5815 2.6317 34.8995 2.86612 35.1339C3.10054 35.3683 3.41848 35.5 3.75 35.5H36.25C36.5815 35.5 36.8995 35.3683 37.1339 35.1339C37.3683 34.8995 37.5 34.5815 37.5 34.25Z\" fill=\"currentColor\"></path>\n                        </svg>\n                      </div>\n                      <span>Phụ đề</span>\n                    </div>\n                  </div>\n                  <ul class=\"dropdown-menu player-dm dm-sub \">\n                    <div class=\"dropdown-title\">\n                      <div class=\"line-center w-100\">\n                        <span data-bs-toggle=\"tooltip\" data-bs-custom-class=\"custom-tooltip\" data-bs-placement=\"top\" data-bs-title=\"Hiển thị 2 phụ đề cùng lúc\">Phụ đề</span>\n                        <div class=\"flex-grow-1\"></div>\n                        <div class=\"sub-toggle-tabs line-center jw-caption-switch\">\n                          <a id=\"sub-on\" data=\"on\" class=\"item\">Bật</a>\n                          <a id=\"sub-dual\" data=\"doul\" class=\"item\">Song ngữ</a>\n                          <a id=\"sub-off\" data=\"off\" class=\"item\">Tắt</a>\n                          <a id=\"toggle-subs\" data=\"setting\" class=\"item item-circle\"><i class=\"fa-solid fa-gear\"></i></a>\n                        </div>\n                      </div>\n                    </div>\n                    <div class=\"sub-sbs\">\n                      <div class=\"sub-col is-primary jw-main-caption-menu\">\n                      </div>\n                      <div class=\"sub-col is-secondary jw-sub-caption-menu\">\n                      </div>\n                    </div>\n                  </ul>");
    }
    $('.jw-main-caption-menu').addClass('active');
    $("#sub-on").addClass("active");
    _0x3e81fc.forEach((_0x4bc6a8, _0x10d804) => {
        if (_0x4bc6a8.label && _0x4bc6a8.label !== "None" && _0x4bc6a8.label !== "Off") {
            const _0x3e7918 = _0x10d804 === playerInstance.getCurrentCaptions();
            $(".jw-main-caption-menu").append("\n        <a class=\"dropdown-item " + (_0x3e7918 ? "active" : '') + "\" href=\"#\" data=\"" + _0x10d804 + "\" label=\"" + _0x4bc6a8.label + "\">\n            <span class=\"s-title\">" + _0x4bc6a8.label + "</span>\n            <div class=\"w-check\"><i class=\"fa-solid fa-check\"></i></div>\n        </a>\n      ");
            $('.jw-sub-caption-menu').append("\n        <a class=\"dropdown-item\" href=\"#\" data=\"" + _0x10d804 + "\" label=\"" + _0x4bc6a8.label + "\">\n            <span class=\"s-title\">" + _0x4bc6a8.label + "</span>\n            <div class=\"w-check\"><i class=\"fa-solid fa-check\"></i></div>\n        </a>\n      ");
        }
    });
});
$(document).on('click', ".jw-main-caption-menu.active .dropdown-item", function () {
    const _0x2990cf = parseInt($(this).attr("data"));
    playerInstance.setCurrentCaptions(_0x2990cf);
    $(".jw-main-caption-menu .dropdown-item").removeClass('active');
    $(this).addClass("active");
});
$(document).on("click", ".jw-audio-menu .dropdown-item", function () {
    $(".jw-audio-menu .dropdown-item").removeClass("active");
    $(this).addClass("active");
    const file = hexXorDecrypt($(this).attr('data'), 'mySecretKey2024');
    const _0x4e0061 = playerInstance.getPosition() || 0x0;
    playerInstance.once("playlistItem", function () {
        setTimeout(function () {
            playerInstance.seek(_0x4e0061);
            playerInstance.play();
        }, 0x12c);
    });
    playerInstance.load({
        'file': file,
        'type': "application/x-mpegURL",
        'autostart': true
    });
});
playerInstance.on("complete", function () {
    if (typeof Storage !== 'undefined') {
        localStorage.removeItem(resumeData);
    } else {
        console.log("Your browser is too old!");
    }
});
$(document).on("click", "#toggle-font", function () {
    if ($('.sub-color').length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-color\" class=\"sub-slide level-2 sub-color\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Phụ đề chính / Màu chữ\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arrayColor.map(_0x53396e => renderItemColor(_0x53396e.color, _0x53396e.label, "color")).join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-color").fadeIn(0x0);
    });
});
$(document).on('click', "#toggle-color-sub", function () {
    if ($(".sub-color-sub").length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-color-sub\" class=\"sub-slide level-2 sub-color-sub\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Song ngữ / Màu chữ\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arrayColor.map(_0x55eca1 => renderItemColor(_0x55eca1.color, _0x55eca1.label, 'color', "white", currentConfigSub)).join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-color-sub").fadeIn(0x0);
    });
});
$(document).on("click", ".sub-color-sub .cs-item", function () {
    const _0x1b1380 = $(this).attr("data");
    currentConfigSub.color = _0x1b1380;
    const _0x2b6c30 = $("span[lang=\"su\"]");
    _0x2b6c30.css("color", _0x1b1380);
    $(".sub-color-sub .cs-item").removeClass('active');
    $(".sub-color-sub .cs-item[data=\"" + _0x1b1380 + "\"]").addClass("active");
    $("a[data-type=\"color-sub\"] .csi-current").html("<div class=\"csi-color\" style=\"background-color: " + _0x1b1380 + ";\"></div><span>" + arrayColor.find(_0xb699d6 => _0xb699d6.color === _0x1b1380).label + "</span><i class=\"fa-solid fa-angle-right\"></i>");
    $('#sub-color-sub').fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on("click", ".sub-color .cs-item", function () {
    const _0x1e2d01 = $(this).attr("data");
    const _0x4b75e4 = playerInstance.getConfig().captions;
    playerInstance.setCaptions({
        ..._0x4b75e4,
        'color': _0x1e2d01
    });
    $(".sub-color .cs-item").removeClass("active");
    $(".sub-color .cs-item[data=\"" + _0x1e2d01 + "\"]").addClass("active");
    $("a[data-type=\"color\"] .csi-current").html("<div class=\"csi-color\" style=\"background-color: " + _0x1e2d01 + ";\"></div><span>" + arrayColor.find(_0x372045 => _0x372045.color === _0x1e2d01).label + "</span><i class=\"fa-solid fa-angle-right\"></i>");
    $("#sub-color").fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on("click", "#toggle-size", function () {
    if ($("#sub-size").length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-size\" class=\"sub-slide level-2 sub-size\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Phụ đề chính / Cỡ chữ\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arraySize.map(_0x4348b0 => renderItemFont(_0x4348b0.size, _0x4348b0.label, "fontSize")).join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-size").fadeIn(0x0);
    });
});
$(document).on("click", "#toggle-size-sub", function () {
    if ($("#sub-size-sub").length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-size-sub\" class=\"sub-slide level-2 sub-size-sub\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Song ngữ / Cỡ chữ\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arraySizeFont.map(_0x378128 => renderItemFont(_0x378128.size, _0x378128.label, "size", currentConfigSub)).join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-size-sub").fadeIn(0x0);
    });
});
$(document).on('click', ".sub-size .cs-item", function () {
    const _0x385df2 = $(this).attr("data");
    const _0xddddd6 = playerInstance.getConfig().captions;
    playerInstance.setCaptions({
        ..._0xddddd6,
        'fontSize': _0x385df2
    });
    $(".sub-size .cs-item").removeClass("active");
    $(".sub-size .cs-item[data=\"" + _0x385df2 + "\"]").addClass("active");
    $("a[data-type=\"fontSize\"] .csi-current span").text(arraySize.find(_0x49b865 => _0x49b865.size === _0x385df2).label);
    $("#sub-size").fadeOut(0x0, function () {
        $('#sub-caption').fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on("click", ".sub-size-sub .cs-item", function () {
    const _0x1317a0 = $(this).attr('data');
    currentConfigSub.size = _0x1317a0;
    const _0x242f85 = $("span[lang=\"su\"]");
    _0x242f85.css('font-size', _0x1317a0 + '%');
    $(".sub-size-sub .cs-item").removeClass("active");
    $(".sub-size-sub .cs-item[data=\"" + _0x1317a0 + "\"]").addClass('active');
    $("a[data-type=\"fontSize-sub\"] .csi-current span").text(arraySizeFont.find(_0x34e60c => _0x34e60c.size === _0x1317a0).label);
    $("#sub-size-sub").fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on("click", "#toggle-opacity-font", function () {
    if ($("#sub-opacity-font").length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-opacity-font\" class=\"sub-slide level-2 sub-opacity-font\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Phụ đề chính / Độ trong\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arrayOpacity.map(_0x39775b => renderItemFont(_0x39775b.opacity, _0x39775b.label, "fontOpacity")).join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $('#sub-opacity-font').fadeIn(0x0);
    });
});
$(document).on('click', "#toggle-opacity-sub", function () {
    if ($("#sub-opacity-font-sub").length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-opacity-font-sub\" class=\"sub-slide level-2 sub-opacity-font-sub\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Song ngữ / Độ trong\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arrayOpacity.map(_0x5242e8 => renderItemFont(_0x5242e8.opacity, _0x5242e8.label, "opacity", currentConfigSub)).join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-opacity-font-sub").fadeIn(0x0);
    });
});
$(document).on('click', ".sub-opacity-font .cs-item", function () {
    const _0x478a83 = $(this).attr("data");
    const _0x46107d = playerInstance.getConfig().captions;
    playerInstance.setCaptions({
        ..._0x46107d,
        'fontOpacity': parseInt(_0x478a83)
    });
    $(".sub-opacity-font .cs-item").removeClass("active");
    $(".sub-opacity-font .cs-item[data=\"" + _0x478a83 + "\"]").addClass("active");
    $("a[data-type=\"fontOpacity\"] .csi-current span").text(arrayOpacity.find(_0x15053a => _0x15053a.opacity === _0x478a83).label);
    $("#sub-opacity-font").fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on('click', ".sub-opacity-font-sub .cs-item", function () {
    const _0x227ebc = $(this).attr("data");
    currentConfigSub.opacity = _0x227ebc;
    const _0x21eb66 = $("span[lang=\"su\"]");
    _0x21eb66.css('opacity', _0x227ebc + '%');
    $(".sub-opacity-font-sub .cs-item").removeClass('active');
    $(".sub-opacity-font-sub .cs-item[data=\"" + _0x227ebc + "\"]").addClass('active');
    $("a[data-type=\"fontOpacity-sub\"] .csi-current span").text(arrayOpacity.find(_0x55ce92 => _0x55ce92.opacity === _0x227ebc).label);
    $('#sub-opacity-font-sub').fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on('click', "#toggle-font-family", function () {
    const _0x3b064b = playerInstance.getConfig().captions.fontFamily || "Arial";
    if ($("#sub-font-family").length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-font-family\" class=\"sub-slide level-2 sub-font-family\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Phụ đề chính / Font chữ\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arrayFont.map(_0x4d6752 => "\n          <a class=\"cs-item line-center " + (_0x3b064b === _0x4d6752.font ? 'active' : '') + "\" data=\"" + _0x4d6752.font + "\">\n            <div class=\"csi-title\">" + _0x4d6752.label + "</div>\n            <i class=\"fa-solid fa-check\"></i>\n          </a>\n        ").join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-font-family").fadeIn(0x0);
    });
});
$(document).on("click", "#toggle-font-family-sub", function () {
    const _0x49f249 = "Arial" || "Arial";
    if ($('#sub-font-family-sub').length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-font-family-sub\" class=\"sub-slide level-2 sub-font-family-sub\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Song ngữ / Font chữ\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arrayFont.map(_0x81ea74 => "\n          <a class=\"cs-item line-center " + (_0x49f249 === _0x81ea74.font ? "active" : '') + "\" data=\"" + _0x81ea74.font + "\">\n            <div class=\"csi-title\">" + _0x81ea74.label + "</div>\n            <i class=\"fa-solid fa-check\"></i>\n          </a>\n        ").join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-font-family-sub").fadeIn(0x0);
    });
});
$(document).on("click", ".sub-font-family .cs-item", function () {
    const _0x3f31d9 = $(this).attr("data");
    const _0x535e6e = playerInstance.getConfig().captions;
    playerInstance.setCaptions({
        ..._0x535e6e,
        'fontFamily': _0x3f31d9
    });
    $(".sub-font-family .cs-item").removeClass("active");
    $(".sub-font-family .cs-item[data=\"" + _0x3f31d9 + "\"]").addClass("active");
    $("a[data-type=\"fontFamily\"] .csi-current span").text(arrayFont.find(_0xc30672 => _0xc30672.font === _0x3f31d9).label);
    $("#sub-font-family").fadeOut(0x0, function () {
        $('#sub-caption').fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on("click", ".sub-font-family-sub .cs-item", function () {
    const _0x58fd40 = $(this).attr("data");
    currentConfigSub.font = _0x58fd40;
    const _0x17ee2c = $("span[lang=\"su\"]");
    _0x17ee2c.css("font-family", _0x58fd40);
    $(".sub-font-family-sub .cs-item").removeClass('active');
    $(".sub-font-family-sub .cs-item[data=\"" + _0x58fd40 + "\"]").addClass("active");
    $("a[data-type=\"fontFamily-sub\"] .csi-current span").text(arrayFont.find(_0x45d520 => _0x45d520.font === _0x58fd40).label);
    $("#sub-font-family-sub").fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on("click", "#toggle-border-font", function () {
    if ($('#sub-border-font').length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-border-font\" class=\"sub-slide level-2 sub-border-font\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Phụ đề chính / Viền chữ\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + renderItemBorder() + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-border-font").fadeIn(0x0);
    });
});
$(document).on("click", ".sub-border-font .cs-item", function () {
    const _0x576651 = $(this).attr("data");
    const _0x20fd8a = playerInstance.getConfig().captions;
    playerInstance.setCaptions({
        ..._0x20fd8a,
        'edgeStyle': _0x576651
    });
    $(".sub-border-font .cs-item").removeClass('active');
    $(".sub-border-font .cs-item[data=\"" + _0x576651 + "\"]").addClass("active");
    $("a[data-type=\"edgeStyle\"] .csi-current span").text(_0x576651 === 'none' ? "Không viền" : _0x576651 === "raised" ? "Bo viền" : "Đổ bóng");
    $("#sub-border-font").fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", "none");
});
$(document).on("click", "#toggle-background", function () {
    if ($("#sub-background").length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-background\" class=\"sub-slide level-2 sub-background\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Phụ đề chính / Màu nền\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arrayBackground.map(_0x22a023 => renderItemColor(_0x22a023.background, _0x22a023.label, "backgroundColor", '#000000')).join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-background").fadeIn(0x0);
    });
});
$(document).on("click", ".sub-background .cs-item", function () {
    const _0x5d2340 = $(this).attr('data');
    const _0x438764 = playerInstance.getConfig().captions;
    playerInstance.setCaptions({
        ..._0x438764,
        'backgroundColor': _0x5d2340
    });
    $(".sub-background .cs-item").removeClass("active");
    $(".sub-background .cs-item[data=\"" + _0x5d2340 + "\"]").addClass("active");
    $("a[data-type=\"backgroundColor\"] .csi-current").html("<div class=\"csi-color\" style=\"background-color: " + _0x5d2340 + ";\"></div><span>" + arrayBackground.find(_0x201720 => _0x201720.background === _0x5d2340).label + "</span><i class=\"fa-solid fa-angle-right\"></i>");
    $("#sub-background").fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css('display', "none");
});
$(document).on('click', "#toggle-opacity-background", function () {
    if ($("#sub-opacity-background").length == 0x0) {
        $(".player-dm:has(.content-slide)").append("<div id=\"sub-opacity-background\" class=\"sub-slide level-2 sub-opacity-background\" style=\"display: none;\">\n      <div class=\"dropdown-title\">\n        <span class=\"s-title sub-back line-center\">\n          <i class=\"fa-solid fa-angle-left\"></i>\n          Phụ đề chính / Độ trong Nền\n        </span>\n      </div>\n      <div class=\"cs-list jw-playback-rate\">\n        " + arrayOpacity.map(_0x4f0e13 => renderItemFont(_0x4f0e13.opacity, _0x4f0e13.label, 'backgroundOpacity')).join('') + "\n      </div>\n    </div>");
    }
    $(".sub-slide, .content-slide").fadeOut(0x0, function () {
        $("#sub-opacity-background").fadeIn(0x0);
    });
});
$(document).on("click", ".sub-opacity-background .cs-item", function () {
    const _0x1ad230 = $(this).attr("data");
    const _0x46b280 = playerInstance.getConfig().captions;
    playerInstance.setCaptions({
        ..._0x46b280,
        'backgroundOpacity': parseInt(_0x1ad230)
    });
    $(".sub-opacity-background .cs-item").removeClass('active');
    $(".sub-opacity-background .cs-item[data=\"" + _0x1ad230 + "\"]").addClass("active");
    $("a[data-type=\"backgroundOpacity\"] .csi-current span").text(arrayOpacity.find(_0x53ef04 => _0x53ef04.opacity === _0x1ad230).label);
    $("#sub-opacity-background").fadeOut(0x0, function () {
        $("#sub-caption").fadeIn(0x0);
    });
    $("#video_pop .player-dm").css("display", 'none');
});
$(document).on("click", "#toggle-subs", function () {
    const _0x396d4b = playerInstance.getConfig().captions;
    playerInstance.pause();
    const _0x14aeea = _0x396d4b.color || "white";
    const _0x193246 = (_0x396d4b.fontSize || '14') + 'pt';
    const _0x309169 = (_0x396d4b.fontOpacity || 0x64) + '%';
    const _0x1f2562 = _0x396d4b.edgeStyle || 'none';
    const _0x5ddab6 = _0x396d4b.backgroundColor || "#000000";
    const _0x354e00 = (_0x396d4b.backgroundOpacity || 0x0) + '%';
    const _0x4ef937 = _0x396d4b.fontFamily || "Arial";
    if ($("#video_pop").length == 0x0) {
        $('#rp-player').append("<div id=\"video_pop\">\n                <div class=\"pop-mask\"></div>\n                <div class=\"pop-center pop-sub\">\n                  <div class=\"pc-title w-100\">Tuỳ chỉnh phụ đề</div>\n                  <div class=\"cs-dual\">\n                    <div class=\"csl-primary\">\n                      <div class=\"dropdown-title py-1 mb-2\">\n                        <span class=\"s-title small\">Phụ đề chính</span>\n                      </div>\n                      <div class=\"cs-list jw-main-sub-setting\">\n                      <a class=\"cs-item line-center\" data-type=\"color\" data-title=\"Màu chữ\">\n                          <div class=\"csi-title\">Màu chữ</div>\n                          <div class=\"csi-current line-center\">\n                            <div class=\"csi-color\" style=\"background-color: " + _0x14aeea + ";\"></div>\n                            <span>" + (arrayColor.find(_0x99aaa4 => _0x99aaa4.color === _0x14aeea).label || 'Trắng') + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a><a class=\"cs-item line-center\" data-type=\"fontSize\" data-title=\"Cỡ chữ\">\n                          <div class=\"csi-title\">Cỡ chữ</div>\n                          <div class=\"csi-current line-center\">\n                            <span>" + _0x193246 + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a>\n                        <a class=\"cs-item line-center\" data-type=\"fontOpacity\" data-value=\"" + _0x309169 + "\" data-title=\"Độ trong\">\n                          <div class=\"csi-title\">Độ trong</div>\n                          <div class=\"csi-current line-center\">\n                            <span>" + _0x309169 + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a><a class=\"cs-item line-center\" data-type=\"edgeStyle\" data-value=\"" + _0x1f2562 + "\" data-title=\"Viền chữ\">\n                          <div class=\"csi-title\">Viền chữ</div>\n                          <div class=\"csi-current line-center\">\n                            <span>" + (_0x1f2562 === 'none' ? "Không viền" : _0x1f2562 === 'raised' ? "Bo viền" : "Đổ bóng") + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a><a id=\"toggle-font\" class=\"cs-item line-center\" data-type=\"backgroundColor\" data-value=\"" + _0x5ddab6 + "\" data-title=\"Màu nền\">\n                          <div class=\"csi-title\">Màu nền</div>\n                          <div class=\"csi-current line-center\">\n                            <div class=\"csi-color\" style=\"background-color: " + _0x5ddab6 + ";\"></div>\n                            <span>" + (arrayBackground.find(_0x138d30 => _0x138d30.background === _0x5ddab6).label || "Đen") + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a><a class=\"cs-item line-center\" data-type=\"backgroundOpacity\" data-value=\"" + _0x354e00 + "\" data-title=\"Độ trong Nền\">\n                          <div class=\"csi-title\">Độ trong Nền</div>\n                          <div class=\"csi-current line-center\">\n                            <span>" + _0x354e00 + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a><a class=\"cs-item line-center\" data-type=\"fontFamily\" data-value=\"" + _0x4ef937 + "\" data-title=\"Font chữ\">\n                          <div class=\"csi-title\">Font chữ</div>\n                          <div class=\"csi-current line-center\">\n                            <span>" + _0x4ef937 + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a></div>\n                    </div>\n                    <div class=\"csl-secondary\">\n                      <div class=\"dropdown-title py-1 mb-2\">\n                        <span class=\"s-title small\">Song ngữ</span>\n                      </div>\n                      <div class=\"cs-list jw-sub-sub-setting\">\n                      <a id=\"toggle-color-sub\" class=\"cs-item line-center\" data-type=\"color-sub\" data-title=\"Màu chữ Song ngữ\">\n                          <div class=\"csi-title\">Màu chữ</div>\n                          <div class=\"csi-current line-center\">\n                            <div class=\"csi-color\" style=\"background-color: " + "white" + ";\"></div>\n                            <span>" + (arrayColor.find(_0x3c6311 => _0x3c6311.color === "white").label || "Trắng") + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a><a id=\"toggle-size-sub\" class=\"cs-item line-center\" data-type=\"fontSize-sub\" data-title=\"Cỡ chữ Song ngữ\">\n                          <div class=\"csi-title\">Cỡ chữ</div>\n                          <div class=\"csi-current line-center\">\n                            <span>" + '70' + "%</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a><a class=\"cs-item line-center\" data-type=\"fontOpacity-sub\" data-title=\"Độ trong Song ngữ\">\n                          <div class=\"csi-title\">Độ trong</div>\n                          <div class=\"csi-current line-center\">\n                            <span>" + "100" + "%</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a>\n                        <a class=\"cs-item line-center\" data-type=\"fontFamily-sub\" data-title=\"Font chữ Song ngữ\">\n                          <div class=\"csi-title\">Font chữ</div>\n                          <div class=\"csi-current line-center\">\n                            <span>" + "Arial" + "</span>\n                            <i class=\"fa-solid fa-angle-right\"></i>\n                          </div>\n                        </a></div>\n                    </div>\n                  </div>\n                  <div class=\"pop-buttons w-100 mt-3\">\n                    <a id=\"close-pop-sub\" class=\"btn btn-block w-100 btn-light\">Chọn xong</a>\n                  </div>\n                </div>\n                <div class=\"player-dm level-2\" style=\"display: none;\">\n                  <div class=\"sub-slide level-2 absolute-menu\">\n                    <div class=\"dropdown-title\">\n                      <span class=\"s-title back-level line-center small\">\n                        <i class=\"fa-solid fa-angle-left\"></i>\n                        <spa class=\"sub-menu-title\"></spa>\n                      </span>\n      \n                    </div>\n                    <div class=\"cs-list sub-menu-list-item\">\n                    </div>\n                  </div>\n                </div>\n              </div>");
    }
});
$(document).on('click', "#close-pop-sub", function () {
    $('#video_pop').remove();
    playerInstance.play();
});
$(document).on("click", "#video_pop .cs-item[data-type]", function (_0x119413) {
    const _0x2dd4f7 = _0x119413.pageX;
    const _0x31f89d = _0x119413.pageY;
    const _0xd324e0 = $(this).data("title");
    const _0x106183 = $("#video_pop .player-dm .sub-menu-title").text();
    const _0x4c402e = $(this).data("type");
    if ($("#video_pop .player-dm").css("display") == "block" && _0x106183 == _0xd324e0) {
        $("#video_pop .player-dm").css({
            'display': "none"
        });
        return;
    }
    $("#video_pop .player-dm").css({
        'display': "block",
        'position': "absolute",
        'top': _0x31f89d - 0xa,
        'left': _0x2dd4f7 + 0x1e,
        'zIndex': 0x270f
    });
    $("#video_pop .sub-slide").css({
        'display': 'block'
    });
    $("#video_pop .sub-menu-list-item").css({
        'display': "block"
    });
    $("#video_pop .player-dm .sub-menu-title").text(_0xd324e0);
    switch (_0x4c402e) {
        case 'color':
            $("#video_pop .player-dm .sub-menu-list-item").html("\n        " + arrayColor.map(_0x41b221 => renderItemColor(_0x41b221.color, _0x41b221.label, _0x4c402e)).join('') + "\n      ").addClass('sub-color').removeClass("sub-size sub-opacity-font sub-border-font sub-background sub-opacity-background sub-font-family sub-color-sub sub-size-sub sub-opacity-font-sub sub-font-family-sub");
            break;
        case "fontSize":
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arraySize.map(_0x459c76 => renderItemFont(_0x459c76.size, _0x459c76.label, _0x4c402e)).join('')).addClass('sub-size').removeClass("sub-color sub-opacity-font sub-border-font sub-background sub-opacity-background sub-font-family sub-color-sub sub-size-sub sub-opacity-font-sub sub-font-family-sub");
            break;
        case 'fontOpacity':
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arrayOpacity.map(_0x2cf25f => renderItemFont(_0x2cf25f.opacity, _0x2cf25f.label, _0x4c402e)).join('')).addClass("sub-opacity-font").removeClass("sub-color sub-size sub-border-font sub-background sub-opacity-background sub-font-family sub-color-sub sub-size-sub sub-opacity-font-sub sub-font-family-sub");
            break;
        case "edgeStyle":
            $("#video_pop .player-dm .sub-menu-list-item").html(renderItemBorder());
            $("#video_pop .player-dm .sub-menu-list-item").addClass("sub-border-font").removeClass("sub-color sub-size sub-opacity-font sub-background sub-opacity-background sub-font-family sub-color-sub sub-size-sub sub-opacity-font-sub sub-font-family-sub");
            break;
        case "backgroundColor":
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arrayBackground.map(_0x14e00c => renderItemColor(_0x14e00c.background, _0x14e00c.label, _0x4c402e, '#000000')).join('')).addClass("sub-background").removeClass("sub-color sub-size sub-opacity-font sub-border-font sub-opacity-background sub-font-family sub-color-sub sub-size-sub sub-opacity-font-sub sub-font-family-sub");
            break;
        case 'backgroundOpacity':
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arrayOpacity.map(_0x3cfc2d => renderItemFont(_0x3cfc2d.opacity, _0x3cfc2d.label, _0x4c402e)).join('')).addClass("sub-opacity-background").removeClass("sub-color sub-size sub-opacity-font sub-border-font sub-background sub-font-family sub-color-sub sub-size-sub sub-opacity-font-sub sub-font-family-sub");
            break;
        case "fontFamily":
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arrayFont.map(_0x232bd8 => renderItemFont(_0x232bd8.font, _0x232bd8.label, _0x4c402e)).join('')).addClass("sub-font-family").removeClass("sub-color sub-size sub-opacity-font sub-border-font sub-background sub-opacity-background sub-color-sub sub-size-sub sub-opacity-font-sub sub-font-family-sub");
            break;
        case "color-sub":
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arrayColor.map(_0x506fe8 => renderItemColor(_0x506fe8.color, _0x506fe8.label, "color", "white", currentConfigSub)).join('')).addClass('sub-color-sub').removeClass("sub-size-sub sub-opacity-font-sub sub-border-font-sub sub-background-sub sub-opacity-background-sub sub-font-family-sub sub-color sub-opacity-font sub-border-font sub-background sub-opacity-background sub-font-family");
            break;
        case 'fontSize-sub':
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arraySizeFont.map(_0x5866e8 => renderItemFont(_0x5866e8.size, _0x5866e8.label, "size", currentConfigSub)).join('')).addClass("sub-size-sub").removeClass("sub-color-sub sub-opacity-font-sub sub-border-font-sub sub-background-sub sub-opacity-background-sub sub-font-family-sub sub-color sub-opacity-font sub-border-font sub-background sub-opacity-background sub-font-family");
            break;
        case "fontOpacity-sub":
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arrayOpacity.map(_0x31ad36 => renderItemFont(_0x31ad36.opacity, _0x31ad36.label, "opacity", currentConfigSub)).join('')).addClass('sub-opacity-font-sub').removeClass("sub-color-sub sub-size-sub sub-border-font-sub sub-background-sub sub-opacity-background-sub sub-font-family-sub sub-color sub-opacity-font sub-border-font sub-background sub-opacity-background sub-font-family");
            break;
        case "fontFamily-sub":
            $("#video_pop .player-dm .sub-menu-list-item").html('' + arrayFont.map(_0x3da930 => renderItemFont(_0x3da930.font, _0x3da930.label, "font", currentConfigSub)).join('')).addClass('sub-font-family-sub').removeClass("sub-color-sub sub-size-sub sub-opacity-font-sub sub-border-font-sub sub-background-sub sub-opacity-background-sub sub-color sub-opacity-font sub-border-font sub-background sub-opacity-background sub-font-family");
            break;
    }
});
function renderItemColor(_0x4c52a4, _0x5f3699, _0x46a9ce, _0x1b2570 = 'white', _0x540110 = playerInstance.getConfig().captions) {
    const _0x33ad0d = _0x4c52a4 === (_0x540110[_0x46a9ce] || _0x1b2570) ? "active" : '';
    return "<a class=\"cs-item line-center " + _0x33ad0d + "\" data-menu=\"mainMenu\" data=\"" + _0x4c52a4 + "\" data-label=\"" + _0x5f3699 + "\" data-key=\"" + _0x46a9ce + "\">\n              <div class=\"csi-color\" style=\"background-color: " + _0x4c52a4 + ";\"></div>\n              <div class=\"csi-title\">" + _0x5f3699 + "</div>\n              <i class=\"fa-solid fa-check\"></i>\n            </a>";
}
function renderItemFont(_0x38e9e1, _0x21626c, _0x533c30, _0x39d54f = playerInstance.getConfig().captions) {
    let _0x4a8c6f = _0x38e9e1;
    let _0x5d78d9 = _0x39d54f[_0x533c30];
    if (!isNaN(_0x4a8c6f) && !isNaN(_0x5d78d9)) {
        _0x4a8c6f = parseInt(_0x4a8c6f, 0xa);
        _0x5d78d9 = parseInt(_0x5d78d9, 0xa);
    }
    const _0x1f29be = _0x4a8c6f === _0x5d78d9 ? 'active' : '';
    return "<a class=\"cs-item line-center " + _0x1f29be + "\" data-menu=\"mainMenu\" data=\"" + _0x38e9e1 + "\" data-label=\"" + _0x21626c + "\" data-key=\"" + _0x533c30 + "\">\n              <div class=\"csi-font\">" + _0x21626c + "</div>\n              <i class=\"fa-solid fa-check\"></i>\n            </a>";
}
function renderItemBorder() {
    const _0x140c19 = playerInstance.getConfig().captions;
    const _0x30a3e6 = _0x140c19.edgeStyle === "none" ? 'active' : '';
    const _0x33782f = _0x140c19.edgeStyle === "raised" ? "active" : '';
    const _0x52ebc7 = _0x140c19.edgeStyle === 'uniform' ? "active" : '';
    return "<a class=\"cs-item line-center " + _0x30a3e6 + "\" data-menu=\"mainMenu\" data=\"none\" data-label=\"Không viền\" data-key=\"edgeStyle\">\n              <div class=\"csi-font\">Không viền</div>\n              <i class=\"fa-solid fa-check\"></i>\n            </a>\n            <a class=\"cs-item line-center " + _0x33782f + "\" data-menu=\"mainMenu\" data=\"raised\" data-label=\"Bo viền\" data-key=\"edgeStyle\">\n              <div class=\"csi-font\">Bo viền</div>\n              <i class=\"fa-solid fa-check\"></i>\n            </a>\n            <a class=\"cs-item line-center " + _0x52ebc7 + "\" data-menu=\"mainMenu\" data=\"uniform\" data-label=\"Đổ bóng\" data-key=\"edgeStyle\">\n              <div class=\"csi-font\">Đổ bóng</div>\n              <i class=\"fa-solid fa-check\"></i>\n            </a>\n            ";
}
function hexXorDecrypt(_0x59fba8, _0x2aba08) {
    let _0xc6de27 = '';
    for (let _0x56515f = 0x0; _0x56515f < _0x59fba8.length; _0x56515f += 0x2) {
        const _0x4fd1da = _0x59fba8.substr(_0x56515f, 0x2);
        const _0x47cf44 = parseInt(_0x4fd1da, 0x10);
        const _0x125725 = _0x2aba08.charCodeAt(_0x56515f / 0x2 % _0x2aba08.length);
        const _0x26a983 = _0x47cf44 ^ _0x125725;
        _0xc6de27 += String.fromCharCode(_0x26a983);
    }
    return _0xc6de27;
}
let dataApi = null;
$("#toggle-eps").on('click', function () {
    $('#video_eps').toggleClass("active");
    playerInstance.pause();
    if ($(".item-ep").length > 0x0) {
        return;
    }
    fetch("/api/v1/movies/get-episodes/" + slugMovie).then(_0x18f974 => _0x18f974.json()).then(_0x3d5c66 => {
        dataApi = _0x3d5c66;
        const _0x68be0b = _0x3d5c66.episodes.filter((_0x4f9988, _0x53ecfb, _0x5e5298) => _0x53ecfb === _0x5e5298.findIndex(_0x31b55c => _0x31b55c.name === _0x4f9988.name));
        $(".eps-list-menu").html(_0x68be0b.map(_0x31d5b8 => "<a class=\"item-ep " + (_0x31d5b8.id === parseInt(id) ? 'active' : '') + "\" href=\"#\" data-mid=\"" + _0x31d5b8.id + "\">\n            <div class=\"v-thumbnail\">\n              <img loading=\"lazy\" src=\"" + (_0x31d5b8.poster || background) + "\" onload=\"this.style.display='block';\" onerror=\"this.style.display='none';\">\n            </div>\n            <div class=\"v-info\">\n              <div class=\"v-title\">" + (_0x31d5b8.name.includes('tập') ? _0x31d5b8.name : "Tập " + _0x31d5b8.name) + "</div>            \n            </div>\n          </a>").join(''));
        const _0x62a19c = $(".jw-season-label").data("number");
        $(".jw-season-dropdown").append(_0x3d5c66.otherParts.map(_0x424b82 => "<li>\n                  <a class=\"dropdown-item " + (String(_0x424b82.partNumber) === String(_0x62a19c) ? 'active' : '') + "\" href=\"#\" data-mid=\"" + _0x424b82.id + "\">\n                    <span class=\"s-title\">Phần " + _0x424b82.partNumber + "</span>\n                    <div class=\"w-check\"><i class=\"fa-solid fa-check\"></i></div>\n                  </a>\n                </li>").join(''));
    });
});
$("#eps-close").on("click", function () {
    $("#video_eps").removeClass("active");
});
$(document).on("click", ".jw-season-dropdown .dropdown-item", function () {
    const _0x5ca879 = $(this).data("mid");
    const _0x3f7642 = $(this).text();
    let _0x48f4d2 = [];
    if ($(this).hasClass("default-season")) {
        _0x48f4d2 = dataApi.episodes;
    } else {
        _0x48f4d2 = dataApi.otherParts.find(_0x85140c => _0x85140c.id === _0x5ca879).episodes;
        _0x48f4d2 = _0x48f4d2.filter((_0x32ba07, _0x59711a, _0x46bdcd) => _0x59711a === _0x46bdcd.findIndex(_0x1a2291 => _0x1a2291.name === _0x32ba07.name));
    }
    $('.jw-season-dropdown').dropdown("hide");
    $(".jw-season-dropdown .dropdown-item").removeClass("active");
    $(this).addClass("active");
    $(".jw-season-label").text(_0x3f7642);
    $('.eps-list-menu').html(_0x48f4d2.map(_0x44dc1b => "<a class=\"item-ep " + (_0x44dc1b.id === parseInt(id) ? 'active' : '') + "\" href=\"#\" data-mid=\"" + _0x44dc1b.id + "\">\n        <div class=\"v-thumbnail\">\n          <img loading=\"lazy\" src=\"" + (_0x44dc1b.poster || background) + "\" onload=\"this.style.display='block';\" onerror=\"this.style.display='none';\">\n        </div>\n        <div class=\"v-info\">\n          <div class=\"v-title\">" + (_0x44dc1b.name.toLowerCase().includes("tập") ? _0x44dc1b.name : "Tập " + _0x44dc1b.name) + "</div>            \n        </div>\n      </a>").join(''));
});
$(document).on('click', ".eps-list-menu .item-ep", function () {
    const _0x1d3faa = $(this).data('mid');
    window.parent.postMessage({
        'type': "CHANGE_EPISODE",
        'episodeId': _0x1d3faa,
        'action': "next"
    }, '*');
});
$('.eps-mask').on("click", function () {
    $("#video_eps").removeClass("active");
});
$(document).on("click", "#toggle-sspp-pop", function () {
    $(".ssp-pop-id").remove();
});