const buttons   = require('sdk/ui/button/action');
const tabs      = require("sdk/tabs");
const {Cc,Ci}   = require("chrome");
const data      = require("sdk/self").data
const selection = require("sdk/selection");
const prefs     = require('sdk/simple-prefs').prefs
const Hotkey    = require("sdk/hotkeys").Hotkey;
const URL       = require('sdk/url').URL;

// does not really work since this buffer is not cleared when the
// selection is cancelled (no event for this
var selected      = null;
var selected_html = null;
selection.on('select', function() {
    selected      = selection.text;
    selected_html = selection.html;
});


function link2org(nodes, url) {
    // replaces A link with org-syntax for links for each node in the list

    var parser = Cc["@mozilla.org/xmlextras/domparser;1"].
        createInstance(Ci.nsIDOMParser);

    var doc = parser.parseFromString('<html><body></body></html>', "text/html");

    for (var i = 0, len = nodes.length; i < len; i++) {
        var node = nodes[i];

        // some null? images do not have parent, ignore them
        parent = node.parentElement;
        if (!parent) {
            continue;
        }

        var href = node.href;
        var text = node.text;

        // if image usr the src intead of href
        if (! node.href) {
            var attrs = node.attributes;
            for(var i = attrs.length - 1; i >= 0; i--) {
                if (attrs[i].name  === "src") {
                    href = attrs[i].value;
                }
            }
        }

        if (! node.text) {
            text = ""
        }

        // this will return absolute url
        href = URL(href, url);

        // remove new lines in links text
        text = text.replace(/(\r\n|\n|\r)/gm,"");

        // escape or replace [ and ] as org-mode does
        href = href.replace("[", "%5B").replace("]", "%5D");
        text = text.replace("[", "{").replace("]", "}");

        if (text) {
            textnode = doc.createTextNode("[[" + href + "][" + text + "]]");
        } else {
            textnode = doc.createTextNode("[[" + href + "]]");
        }
        parent.replaceChild(textnode, node);
    }
}

function filterHTML(html) {
    var parser = Cc["@mozilla.org/xmlextras/domparser;1"].
        createInstance(Ci.nsIDOMParser);
    var doc = parser.parseFromString(html, "text/html");

    // get the base url
    //
    // TODO: this can break if we have a selection from a previous
    // window and click the capture in a more recent one
    var url = URL(tabs.activeTab.url);

    var nodes2 = doc.querySelectorAll('IMG');
    link2org(nodes2, url);

    // replace the link
    var nodes = doc.querySelectorAll('A');
    link2org(nodes, url);

    return doc.documentElement.textContent;
}

function run(path, args) {
    var file = Cc["@mozilla.org/file/local;1"]
        .createInstance(Ci.nsIFile);
    file.initWithPath(path);

    var process = Cc["@mozilla.org/process/util;1"]
        .createInstance(Ci.nsIProcess);
    process.init(file);
    process.run(false, args, args.length);
}

function capture() {
    var url   = tabs.activeTab.url;
    var title = tabs.activeTab.title;

    console.log(url);
    console.log(title);
    console.log(selected);
    console.log(selected_html);

    url   = encodeURIComponent(url);
    title = encodeURIComponent(title);

    var uri;
    var subProtocol = prefs["subprotocol"];
    if (subProtocol == "capture") {
        if (prefs['template'] == "")
            uri = "org-protocol://"+subProtocol+"://"+url+'/'+title+'/';
        else
            uri = "org-protocol://"+subProtocol+"://"+prefs["template"]+'/'+url+'/'+title+'/';
    } else {
        uri = "org-protocol://"+subProtocol+"://"+url+'/'+title+'/';
    }

    switch (prefs["format"]) {
    case "text":
        if (selected) {
            selected = encodeURIComponent(selected);
            uri = uri + selected;
        }
        break;
    case "links":
        if (selected_html) {
            var filtered = filterHTML(selected_html);

            selected = encodeURIComponent(filtered);
            uri = uri + selected;
        }
        break;
    case "html":
        if (selected_html) {
            selected = encodeURIComponent(selected_html);
            uri = uri + selected;
        }
        break;
    }

    if (prefs['newwindow'])
        args = ['-c', uri]
    else
        args = [uri]

    console.log(args);
    run(prefs['emacsclient'], args);

    // clean the selection buffer since it seems there is no event
    // when the selection is cancelled
    selected      = null;
    selected_html = null;
}

var button = buttons.ActionButton({
    id: "org-capture",
    label: "Org Capture",
    icon: {
        "16": "./org-mode-16.png",
        "32": "./org-mode-32.png",
        "64": "./org-mode-64.png"
    },
    onClick: capture
});

var key = Hotkey({
    combo: prefs["key"],
    onPress: capture,
});

