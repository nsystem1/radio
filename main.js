let stations = [];
let volumeBeforeMute = 1;
let hlsTypes = ['m3u8'];
let hls = new Hls();

let current_track = 1;

// On Load
$(function(){

    // Load Stations
    LoadStations();

    SetUpVolumeSlider();

    $('#background').hide();

    setTimeout(function() {
        $('#background').fadeIn();
    }, 100);

    // Setup HLS
    HLSErrorHandling();

    setUpTracks();

});

function setUpTracks(){
    $('audio').on('playing', function(){
        console.log('Stoping Track'+current_track);
        let current_audio = $(`#stationAudioTrack${current_track}`);
        let new_track = current_track === 2 ? 1 : 2;
        let new_audio = $(`#stationAudioTrack${new_track}`)
        let vol = Math.min(Math.max(current_audio[0].volume / 10, 0), 1);
    
        let fade = setInterval(function(){
            current_audio[0].volume -= vol;
            new_audio[0].volume += vol;
        }, 100);

        setTimeout(function(){
            current_audio[0].pause();
            current_track = current_track === 2 ? 1 : 2;
            clearInterval(fade);
            console.log('Track Stopped');
        }, 1000);
    });
}

function LoadStations()
{
    ajaxGet('stations.json', data => {
        stations = JSON.parse(data);
        populateStationsDataList();
    }); 
}

function populateStationsDataList()
{
    let html = '';
    let i = 0;
    stations.forEach( station => {
        html += `
        <option value='${station.DisplayName}'
            data-id='${i}'>
        `;
        i++;
    });
    $('#stationsDataList').html(html);
}

function onStationModelOpen()
{
    clearStationModel();
    autoFocusStationModel();
}

function clearStationModel()
{
    $('#stationSelector').val("");
}

function autoFocusStationModel()
{
    $('#stationModel').on('shown.bs.modal', function () {
        $('#stationSelector').focus()
    });
}

function stationSelectorKeyHandler(event)
{
    // keyCode 13 - Enter
   if(event.keyCode !== 13) return;

    modelStationSelected();
}

function muteToggle()
{
    // Check if it has the muted class
    const d = $('#mute');
    const v = $('#VolumeSlider');
    const a = $('#stationAudio');

    if (d.hasClass('muted'))
    {
        d.removeClass('muted');
        v.removeClass('disabled');
        a.prop("volume", volumeBeforeMute);
    }
    else
    {
        d.addClass('muted');
        v.addClass('disabled');
        volumeBeforeMute = a.prop("volume");;
        a.prop("volume", 0);
    }
}

function modelStationSelected()
{
    let option = $("#stationsDataList option[value='" + $('#stationSelector').val() + "']");

    // Does not exist
    if (option.length === 0)
    {
        const childCount = $('errors').children().length;
        const error = `
            <div id="error${childCount}" class="alert alert-danger alert-dismissible fade show" role="alert" data-dismiss="alert">
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                <strong>Oh No!</strong> That station does not exist!
            </div>
        `;

        $('#errors').prepend(error);
        setTimeout( id => {
            $(`#error${id}`).remove();
        }, 3000, [childCount]);

        return;
    }

    let stationID = option.data('id');
    changeStation(stationID);
    $('#stationModel').modal('toggle');
}

function changeStation (id)
{
    let stationURL = stations[id].audioURL;
    let stationName = stations[id].DisplayName;

    $('#stationName').text(stationName);
    updateStationAudio(stationURL);
}

function updateStationAudio(stationurl)
{
    var track = current_track === 2 ? 1 : 2;
    let new_audio = $(`#stationAudioTrack${track}`);

    let split = stationurl.split('.');
    let ext = split[split.length - 1];

    if(hlsTypes.indexOf(ext) !== -1){
        // Is HLS
        audio[0].pause();
        playHLS(stationurl);
        return;
    }

    // Regular Audio

    console.log(new_audio);

    hls.destroy();
    console.log('Starting Track: '+track);
    new_audio.attr('src', stationurl);
    new_audio[0].volume = 0;
    new_audio[0].play();
}

function playHLS(stationurl)
{
    if (Hls.isSupported()) {
        let video = $('#HLSStationAudio')[0];

        hls.destroy();
        hls = new Hls();

        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            hls.loadSource(stationurl);
            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                video.play();
            });
        });
    }
}

function HLSErrorHandling()
{
    hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
            switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    // try to recover network error
                    console.log("fatal network error encountered, try to recover");
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log("fatal media error encountered, try to recover");
                    hls.recoverMediaError();
                    break;
                default:
                    // cannot recover
                    console.log('fatal error, cannot recover so destroying self!');
                    hls.destroy();
                    break;
            }
        }
    });
}

function SetUpVolumeSlider()
{
    $( "#VolumeSlider" ).slider({
      orientation: "horizontal",
      range: "min",
      min: 0,
      max: 100,
      value: 90,
      slide: function( event, ui ) {
        $(`#stationAudioTrack${current_track}`)[0].volume = ui.value/100;
      }
    });
}

function toggleBG()
{
    var fade = $('#background').is(':visible') ? 'fadeOut' : 'fadeIn';
    $('#background')[fade]();
}

function ajaxGet(page, callback)
{
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            callback(this.responseText);
        }
    };
    xhttp.open("GET", page, true);
    xhttp.send();
}