//chrome.runtime.addListener(function() {
  /*  chrome.tabs.getCurrent({currentWindow: true, active: true}, function(tabs) {
      if (tabs[0].url.match(/hypem/)){
      chrome.tabs.executeScript(null, {file: "download_buttons.js"});
      }
    })
//});*/
chrome.runtime.onMessage.addListener(
  function(request) {
    var trackUrl = request.split('{{{}}}')[0];
    var trackName = request.split('{{{}}}')[1] + '.mp3';
    console.log(trackUrl)
    chrome.downloads.download({url: trackUrl, filename: trackName});
  });
