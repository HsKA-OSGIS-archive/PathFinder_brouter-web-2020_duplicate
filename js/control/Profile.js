BR.Profile = L.Evented.extend({
    cache: {},

    initialize: function() {
        var textArea = L.DomUtil.get('profile_upload');
        this.editor = CodeMirror.fromTextArea(textArea, {
            lineNumbers: true
        });

        var that = this;
        L.DomUtil.get('profile_advanced').addEventListener('click', function() {
            that._toggleAdvanced();
        });

        L.DomUtil.get('upload').onclick = L.bind(this._upload, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);

        this.message = new BR.Message('profile_message', {
            alert: true
        });
    },

    clear: function(evt) {
        var button = evt.target || evt.srcElement;

        evt.preventDefault();
        this._setValue('');

        this.fire('clear');
        button.blur();
    },

    update: function(options) {
        var profileName = options.profile,
            profileUrl,
            empty = !this.editor.getValue(),
            clean = this.editor.isClean();

        this.profileName = profileName;
        if (profileName && BR.conf.profilesUrl && (empty || clean)) {
            if (!(profileName in this.cache)) {
                profileUrl = BR.conf.profilesUrl + profileName + '.brf';
                BR.Util.get(
                    profileUrl,
                    L.bind(function(err, profileText) {
                        if (err) {
                            console.warn('Error getting profile from "' + profileUrl + '": ' + err);
                            return;
                        }

                        this.cache[profileName] = profileText;

                        // don't set when option has changed while loading
                        if (!this.profileName || this.profileName === profileName) {
                            this._setValue(profileText);
                        }
                    }, this)
                );
            } else {
                this._setValue(this.cache[profileName]);
            }
        }
    },

    show: function() {
        this.editor.refresh();
    },

    onResize: function() {
        this.editor.refresh();
    },

    _upload: function(evt) {
        var button = evt.target || evt.srcElement,
            profile = this.editor.getValue();

        this.message.hide();
        $(button).button('uploading');
        evt.preventDefault();

        this.fire('update', {
            profileText: profile,
            callback: function() {
                $(button).button('reset');
                $(button).blur();
            }
        });
    },

    _setValue: function(profileText) {
        var global = profileText.split('---context:').filter(function(e) {
            return e.startsWith('global');
        });
        if (global) {
            global = global[0].split('\n').slice(1);
            // Comment is mandatory
            var assignRegex = /assign\s*(\w*)\s*=?\s*([\w\.]*)\s*#\s*(.*)\s*$/;
            var params = {};
            global.forEach(function(item) {
                var match = item.match(assignRegex);
                var value;
                if (match) {
                    if (match[2] == 'true' || match[2] == 'false') {
                        paramType = 'checkbox';
                        value = match[2] == 'true';
                    } else {
                        value = Number.parseFloat(match[2]);
                        if (Number.isNaN(value)) {
                            return;
                        }
                        paramType = 'number';
                    }
                    params[match[1]] = {
                        comment: match[3],
                        type: paramType,
                        value: value
                    };
                }
            });
        }
        var paramsSection = L.DomUtil.get('profile_params');
        paramsSection.innerHTML = '';
        Object.keys(params).forEach(function(param) {
            var div = document.createElement('div');
            var label = document.createElement('label');
            var input = document.createElement('input');
            input.type = params[param].type;
            if (input.type == 'checkbox') {
                input.checked = params[param].value;
                label.appendChild(input);
                label.append(' ' + param);
            } else {
                input.value = params[param].value;
                label.append(param + ' ');
                label.appendChild(input);
            }
            div.appendChild(label);
            var small = document.createElement('small');
            small.innerHTML = ' (' + params[param].comment + ')';
            div.appendChild(small);
            paramsSection.appendChild(div);
        });

        this.editor.setValue(profileText);
        this.editor.markClean();
    },

    _toggleAdvanced: function() {
        L.DomUtil.get('profile_params_container').style.display = 'none';
        L.DomUtil.get('profile_editor').style.display = 'flex';
    }
});
