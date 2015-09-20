var RUtil = RUtil || (function() {
  'use strict';

  var debug = false;
  var module = 'RUtil';
  var version = 0.1;

  var AttrFetch = function(character, attr_name) {
    var attr = findObjs({ _type: 'attribute', _characterid: character.id, name: attr_name })[0];
    if (debug) {
      log(module + '#AttrFetch(' + character.get('name') + ', ' + attr_name + '): ' + JSON.stringify(attr));
    }
    return attr;
  };

  var CharacterFetch = function(reference, controller_id) {
    var character = getObj('character', reference);
    if (! character) {
      var token = getObj('graphic', reference);
      if (token) {
        character = getObj('character', token.get('represents'));
      }
    }
    if (! character) {
      character = findObjs({ '_type': 'character', 'name': reference }, { 'caseInsensitive': true })[0];
    }
    if (character && controller_id && ! playerIsGM(controller_id)) {
      var controlled_by = character.get('controlledby').split(',');
      if (! _.contains(controlled_by, controller_id) && ! _.contains(controlled_by, 'all')) {
        var controller = getObj('player', controller_id);
        MessageSend(module, 'Access denied to ' + character.id + ': you are not allowed to control that character', controller_id);
        MessageSend(module, '<b>' + controller.get('_displayname') + '</b> attempted to fetch character <b>' + character.get('name') + '</b> (' + character.id + ')', 'gm');
        character = null;
      }
    }
    if (debug) {
      if (character) {
        log(module + '#CharacterFetch(' + reference + ', ' + controller_id + ') => ' + character.get('name') + ' [' + character.id + ']');
      } else {
        log(module + '#CharacterFetch(' + reference + ', ' + controller_id + ') => ' + character);
      }
    }
    return character;
  };

  // Replace inline rolls with their results within the incoming message.
  // Code is slightly adapted version of what is available in the API Cookbook
  // at https://wiki.roll20.net/API:Cookbook#processInlinerolls.
  var MessageReplaceInlineRolls = function(msg) {
    msg = _(msg).clone();
    if (_.has(msg, 'inlinerolls')) {
      var content = _.chain(msg.inlinerolls)
        .reduce(function(m, v, k) {
          var ti = _.reduce(v.results.rolls, function(m2, v2) {
            if (_.has(v2,'table')) {
              m2.push(
                _.reduce(v2.results, function(m3, v3) {
                  m3.push(v3.tableItem.name);
                  return m3;
                }, []).join(', ')
              );
            }
            return m2;
          }, []).join(', ');
          m['$[['+k+']]'] = (ti.length && ti) || v.results.total || 0;
          return m;
        }, {})
        .reduce(function(m, v, k) {
          return m.replace(k, v);
        }, msg.content)
        .value();
      if (debug) {
        log(module + '#MessageReplaceInlineRolls(' + msg.content + ') => ' + content);
      }
      msg.content = content;
    }
    return msg;
  };

  var MessageSend = function(source, message, destination) {
    var style = {
      'background': '#eeffee',
      'border':    '1px solid #8B4513',
      'color':     '#8B4513',
      'font-size': '80%',
      'padding':   '1px 3px'
    };
    var prefix = '<div style="' + _.reduce(style, function(m, v, k) { return m + k + ': ' + v + ';'; }, '') + '">';
    var suffix = '</div>';
    message = prefix + message + suffix;
    if ((destination !== undefined) && (destination !== null)) {
      if (destination.toLowerCase() !== 'gm' && (typeof destination === 'string' || destination instanceof String)) {
        destination = getObj('player', destination).get('_displayname');
      }
      message = '/w ' + destination + ' ' + message
    }
    sendChat(source, message);
  }

  var MessageTokenizer = function(msg) {
    var tokens = [];
    msg.content.replace(/"((?:\\"|[^"])+)"|(\S+)/g, function(match, g1, g2) {
      if (g1 !== undefined) {
        tokens.push(g1);
      } else if (g2 !== undefined) {
        tokens.push(g2);
      }
    });
    if (debug) {
      log(module + '#MessageTokenizer(' + msg.content + '): ' + tokens);
    }
    return tokens;
  };

  return {
    AttrFetch: AttrFetch,
    CharacterFetch: CharacterFetch,
    MessageReplaceInlineRolls: MessageReplaceInlineRolls,
    MessageSend: MessageSend,
    MessageTokenizer: MessageTokenizer
  };
}());
