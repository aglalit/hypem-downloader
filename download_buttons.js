function injectScript(file, node) {
    var s = document.createElement('script');
    var h = document.documentElement;
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', file);
    h.appendChild(s);
}

injectScript( chrome.extension.getURL('inject_script.js'), 'body');
window.addEventListener('message', function(event) {
    if (event){
    chrome.runtime.sendMessage(event.data);
    }
});
