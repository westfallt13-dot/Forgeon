/*
 * Forgeon Game Planner - C++ Desktop Application
 *
 * A comprehensive game development planning tool.
 * Uses GTK3 and WebKit2GTK to provide a native desktop experience
 * while rendering the application UI via an embedded web view.
 *
 * This replaces the previous Electron-based shell (main.js / preload.js)
 * with a native C++ application that manages the window, file dialogs,
 * and system integration.
 *
 * Author: Thomas Westfall
 * License: SEE LICENSE IN LICENSE
 */

#include <gtk/gtk.h>
#include <webkit2/webkit2.h>
#include <jsc/jsc.h>

#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <unistd.h>
#include <linux/limits.h>
#include <sys/stat.h>

static const char* APP_VERSION = "1.0.0";
static const char* APP_TITLE   = "Forgeon Game Planner";

static WebKitWebView* g_web_view = nullptr;
static GtkWidget*     g_main_window = nullptr;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

// Return the directory that contains the running executable.
static std::string get_executable_directory() {
    char buf[PATH_MAX];
    ssize_t len = readlink("/proc/self/exe", buf, sizeof(buf) - 1);
    if (len <= 0) return ".";
    buf[len] = '\0';
    std::string exe(buf);
    auto pos = exe.find_last_of('/');
    return (pos != std::string::npos) ? exe.substr(0, pos) : ".";
}

// Return the path used for persistent user data.
static std::string get_user_data_path() {
    const char* home = std::getenv("HOME");
    if (!home) home = ".";
    std::string path = std::string(home) + "/.local/share/forgeon";
    g_mkdir_with_parents(path.c_str(), 0755);
    return path;
}

// Locate the web resources directory (index.html, script.js, …).
// Checks several locations in priority order.
static std::string find_resource_directory() {
    std::string exe_dir = get_executable_directory();

    // 1. Resources next to the executable (development / portable)
    if (g_file_test((exe_dir + "/index.html").c_str(), G_FILE_TEST_EXISTS))
        return exe_dir;

    // 2. One level up from build directory (in-tree build)
    std::string parent = exe_dir + "/..";
    if (g_file_test((parent + "/index.html").c_str(), G_FILE_TEST_EXISTS))
        return parent;

    // 3. Installed location under share/forgeon
    std::string share = exe_dir + "/../share/forgeon";
    if (g_file_test((share + "/index.html").c_str(), G_FILE_TEST_EXISTS))
        return share;

    // 4. Fallback: current working directory
    return ".";
}

// ---------------------------------------------------------------------------
// JavaScript bridge
// ---------------------------------------------------------------------------
//
// WebKit2GTK allows JavaScript in the page to call into C++ through
// "user content manager" script-message handlers.  JS posts a message
// with window.webkit.messageHandlers.<name>.postMessage(data), and C++
// receives a callback.  C++ can run arbitrary JS in the page to deliver
// results back (resolving / rejecting promises).
//
// The bridge script below is injected into every page load.  It exposes
// the same `window.electronAPI` object that the Electron preload script
// provided so that script.js works without modification.
// ---------------------------------------------------------------------------

static const char* BRIDGE_JS = R"JS(
(function () {
    'use strict';
    const _pending = {};
    let _nextId = 0;

    function request(action, data) {
        return new Promise(function (resolve, reject) {
            const id = ++_nextId;
            _pending[id] = { resolve: resolve, reject: reject };
            window.webkit.messageHandlers.forgeon.postMessage(
                JSON.stringify({ id: id, action: action, data: data || {} })
            );
        });
    }

    // Called from C++ to resolve a pending promise.
    window.__forgeon_resolve = function (id, result) {
        if (_pending[id]) { _pending[id].resolve(result); delete _pending[id]; }
    };
    window.__forgeon_reject = function (id, error) {
        if (_pending[id]) { _pending[id].reject(new Error(error)); delete _pending[id]; }
    };

    // Provide the same API surface as the Electron preload script.
    window.electronAPI = {
        saveFile:           function (opts)    { return request('save-file', opts); },
        openFile:           function (filters) { return request('open-file', { filters: filters }); },
        getAppVersion:      function ()        { return request('get-app-version'); },
        getUserDataPath:    function ()        { return request('get-user-data-path'); },
        // AI/model stubs (not implemented in the native build)
        loadModel:          function () { return Promise.resolve(false); },
        unloadModel:        function () { return Promise.resolve(); },
        isModelLoaded:      function () { return Promise.resolve(false); },
        generateText:       function () { return Promise.resolve(''); },
        onGenerationProgress: function () {},
        selectGGUFFile:     function () { return Promise.resolve(null); },
        readGgufFile:       function () { return Promise.resolve(null); },
        openModelsFolder:   function () { return Promise.resolve(); },
        scanModelsFolder:   function () { return Promise.resolve([]); }
    };
})();
)JS";

// ---------------------------------------------------------------------------
// Resolve / reject helpers – run a tiny JS snippet in the web view.
// ---------------------------------------------------------------------------

static void resolve_request(int id, const std::string& json_value) {
    // json_value must be a valid JS expression (string literal, object, null…)
    std::string js = "window.__forgeon_resolve(" + std::to_string(id) + ", " + json_value + ");";
    webkit_web_view_evaluate_javascript(
        g_web_view, js.c_str(), static_cast<gssize>(js.size()),
        nullptr, nullptr, nullptr, nullptr, nullptr);
}

static void reject_request(int id, const std::string& message) {
    // Escape single quotes in the message.
    std::string safe;
    for (char c : message) {
        if (c == '\'') safe += "\\'";
        else if (c == '\\') safe += "\\\\";
        else safe += c;
    }
    std::string js = "window.__forgeon_reject(" + std::to_string(id) + ", '" + safe + "');";
    webkit_web_view_evaluate_javascript(
        g_web_view, js.c_str(), static_cast<gssize>(js.size()),
        nullptr, nullptr, nullptr, nullptr, nullptr);
}

// ---------------------------------------------------------------------------
// Minimal JSON helpers (avoids external dependency)
// ---------------------------------------------------------------------------

static std::string json_get_string(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\"";
    auto pos = json.find(search);
    if (pos == std::string::npos) return "";
    pos = json.find(':', pos + search.size());
    if (pos == std::string::npos) return "";
    pos = json.find('"', pos + 1);
    if (pos == std::string::npos) return "";
    auto end = pos + 1;
    while (end < json.size() && json[end] != '"') {
        if (json[end] == '\\') end++; // skip escaped char
        end++;
    }
    return json.substr(pos + 1, end - pos - 1);
}

static int json_get_int(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\"";
    auto pos = json.find(search);
    if (pos == std::string::npos) return 0;
    pos = json.find(':', pos + search.size());
    if (pos == std::string::npos) return 0;
    while (pos < json.size() && (json[pos] == ':' || json[pos] == ' ')) pos++;
    return std::atoi(json.c_str() + pos);
}

// ---------------------------------------------------------------------------
// Escape a C++ string for safe embedding as a JSON string value.
// ---------------------------------------------------------------------------
static std::string json_escape(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 16);
    for (unsigned char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b";  break;
            case '\f': out += "\\f";  break;
            case '\n': out += "\\n";  break;
            case '\r': out += "\\r";  break;
            case '\t': out += "\\t";  break;
            default:
                if (c < 0x20) {
                    char buf[8];
                    snprintf(buf, sizeof(buf), "\\u%04x", c);
                    out += buf;
                } else {
                    out += static_cast<char>(c);
                }
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// Native file-dialog helpers (GTK3)
// ---------------------------------------------------------------------------

// Build a GtkFileFilter from a filter description like "ZIP files" with
// extensions like "zip".
static void add_gtk_filter(GtkFileChooser* chooser,
                           const std::string& name,
                           const std::string& extensions) {
    GtkFileFilter* filter = gtk_file_filter_new();
    gtk_file_filter_set_name(filter, name.c_str());

    // extensions can be a comma-separated list
    std::istringstream ss(extensions);
    std::string ext;
    while (std::getline(ss, ext, ',')) {
        // Trim whitespace
        while (!ext.empty() && ext.front() == ' ') ext.erase(ext.begin());
        while (!ext.empty() && ext.back() == ' ')  ext.pop_back();
        if (ext == "*") {
            gtk_file_filter_add_pattern(filter, "*");
        } else {
            gtk_file_filter_add_pattern(filter, ("*." + ext).c_str());
        }
    }
    gtk_file_chooser_add_filter(chooser, filter);
}

// Show a native "Save File" dialog.  Returns the chosen path or "".
static std::string show_save_dialog(const std::string& default_path,
                                    const std::string& filter_name,
                                    const std::string& filter_ext) {
    GtkWidget* dialog = gtk_file_chooser_dialog_new(
        "Save File", GTK_WINDOW(g_main_window), GTK_FILE_CHOOSER_ACTION_SAVE,
        "_Cancel", GTK_RESPONSE_CANCEL,
        "_Save",   GTK_RESPONSE_ACCEPT,
        nullptr);
    gtk_file_chooser_set_do_overwrite_confirmation(GTK_FILE_CHOOSER(dialog), TRUE);

    if (!default_path.empty())
        gtk_file_chooser_set_current_name(GTK_FILE_CHOOSER(dialog), default_path.c_str());

    if (!filter_name.empty())
        add_gtk_filter(GTK_FILE_CHOOSER(dialog), filter_name, filter_ext);

    // Always add an "All files" filter.
    add_gtk_filter(GTK_FILE_CHOOSER(dialog), "All Files", "*");

    std::string result;
    if (gtk_dialog_run(GTK_DIALOG(dialog)) == GTK_RESPONSE_ACCEPT) {
        char* filename = gtk_file_chooser_get_filename(GTK_FILE_CHOOSER(dialog));
        if (filename) { result = filename; g_free(filename); }
    }
    gtk_widget_destroy(dialog);
    return result;
}

// Show a native "Open File" dialog.  Returns the chosen path or "".
static std::string show_open_dialog(const std::string& filter_name,
                                    const std::string& filter_ext) {
    GtkWidget* dialog = gtk_file_chooser_dialog_new(
        "Open File", GTK_WINDOW(g_main_window), GTK_FILE_CHOOSER_ACTION_OPEN,
        "_Cancel", GTK_RESPONSE_CANCEL,
        "_Open",   GTK_RESPONSE_ACCEPT,
        nullptr);

    if (!filter_name.empty())
        add_gtk_filter(GTK_FILE_CHOOSER(dialog), filter_name, filter_ext);

    add_gtk_filter(GTK_FILE_CHOOSER(dialog), "All Files", "*");

    std::string result;
    if (gtk_dialog_run(GTK_DIALOG(dialog)) == GTK_RESPONSE_ACCEPT) {
        char* filename = gtk_file_chooser_get_filename(GTK_FILE_CHOOSER(dialog));
        if (filename) { result = filename; g_free(filename); }
    }
    gtk_widget_destroy(dialog);
    return result;
}

// ---------------------------------------------------------------------------
// IPC message handler – called when JS posts to "forgeon" handler
// ---------------------------------------------------------------------------

static void on_script_message(WebKitUserContentManager* /*manager*/,
                              WebKitJavascriptResult*    js_result,
                              gpointer                  /*user_data*/) {
    JSCValue* value = webkit_javascript_result_get_js_value(js_result);
    if (!jsc_value_is_string(value)) return;

    char* raw = jsc_value_to_string(value);
    std::string msg(raw);
    g_free(raw);

    int id = json_get_int(msg, "id");
    std::string action = json_get_string(msg, "action");

    if (action == "get-app-version") {
        resolve_request(id, std::string("\"") + APP_VERSION + "\"");

    } else if (action == "get-user-data-path") {
        resolve_request(id, "\"" + json_escape(get_user_data_path()) + "\"");

    } else if (action == "save-file") {
        std::string default_path = json_get_string(msg, "defaultPath");
        // Show native save dialog
        std::string chosen = show_save_dialog(default_path, "", "");
        if (chosen.empty()) {
            resolve_request(id, "null");
        } else {
            // Retrieve the content from JS and write to file.
            // We ask JS to call us back with the content.
            std::string content = json_get_string(msg, "content");
            if (!content.empty()) {
                std::ofstream out(chosen, std::ios::binary);
                if (out) {
                    out << content;
                    out.close();
                    resolve_request(id, "\"" + json_escape(chosen) + "\"");
                } else {
                    reject_request(id, "Failed to write file: " + chosen);
                }
            } else {
                resolve_request(id, "\"" + json_escape(chosen) + "\"");
            }
        }

    } else if (action == "open-file") {
        std::string chosen = show_open_dialog("", "");
        if (chosen.empty()) {
            resolve_request(id, "null");
        } else {
            std::ifstream in(chosen, std::ios::binary);
            if (in) {
                std::ostringstream ss;
                ss << in.rdbuf();
                std::string content = ss.str();
                in.close();
                std::string result = "{\"path\":\"" + json_escape(chosen)
                                   + "\",\"content\":\"" + json_escape(content) + "\"}";
                resolve_request(id, result);
            } else {
                reject_request(id, "Failed to read file: " + chosen);
            }
        }

    } else {
        reject_request(id, "Unknown action: " + action);
    }
}

// ---------------------------------------------------------------------------
// WebView setup
// ---------------------------------------------------------------------------

static WebKitWebView* create_web_view() {
    // Content manager – handles script messages from JS.
    WebKitUserContentManager* cm = webkit_user_content_manager_new();
    g_signal_connect(cm, "script-message-received::forgeon",
                     G_CALLBACK(on_script_message), nullptr);
    webkit_user_content_manager_register_script_message_handler(cm, "forgeon");

    // Inject the bridge script at document start so it runs before page JS.
    WebKitUserScript* bridge = webkit_user_script_new(
        BRIDGE_JS,
        WEBKIT_USER_CONTENT_INJECT_ALL_FRAMES,
        WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START,
        nullptr, nullptr);
    webkit_user_content_manager_add_script(cm, bridge);
    webkit_user_script_unref(bridge);

    // Create the web view.
    WebKitWebView* wv = WEBKIT_WEB_VIEW(
        webkit_web_view_new_with_user_content_manager(cm));

    // Enable localStorage and IndexedDB (required by Forgeon).
    WebKitSettings* settings = webkit_web_view_get_settings(wv);
    webkit_settings_set_enable_javascript(settings, TRUE);
    webkit_settings_set_javascript_can_access_clipboard(settings, TRUE);

    // Allow local file access
    webkit_settings_set_allow_file_access_from_file_urls(settings, TRUE);
    webkit_settings_set_allow_universal_access_from_file_urls(settings, TRUE);

    // Set a custom user-agent so scripts can detect the native shell.
    webkit_settings_set_user_agent_with_application_details(settings,
        "Forgeon", APP_VERSION);

    return wv;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

int main(int argc, char* argv[]) {
    gtk_init(&argc, &argv);

    // ---- Main window ----
    g_main_window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(g_main_window), APP_TITLE);
    gtk_window_set_default_size(GTK_WINDOW(g_main_window), 1400, 900);

    GdkGeometry hints = {};
    hints.min_width  = 1024;
    hints.min_height = 768;
    gtk_window_set_geometry_hints(GTK_WINDOW(g_main_window), nullptr,
                                 &hints, GDK_HINT_MIN_SIZE);

    g_signal_connect(g_main_window, "destroy", G_CALLBACK(gtk_main_quit), nullptr);

    // ---- Web view ----
    g_web_view = create_web_view();
    gtk_container_add(GTK_CONTAINER(g_main_window), GTK_WIDGET(g_web_view));

    // ---- Load the application page ----
    std::string res_dir = find_resource_directory();
    std::string uri = "file://" + res_dir + "/index.html";
    std::cout << "Loading: " << uri << std::endl;
    webkit_web_view_load_uri(g_web_view, uri.c_str());

    // ---- Show ----
    gtk_widget_show_all(g_main_window);

    gtk_main();
    return 0;
}
