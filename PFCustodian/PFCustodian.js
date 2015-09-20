var PFCustodian = PFCustodian || (function() {
  'use strict';

  var debug = false;
  var module = 'PFCustodian';
  var version = 0.1;

  // CarryingCapacity implements the character load calculation formula outlined by Cevah on the Pathfinder forums.
  // Ref: http://paizo.com/threads/rzs2qa0i?I-am-looking-for-the-math-behind-carrying
  var CarryingCapacity = function(character, strength) {
    // TODO: rather than taking strength as an argument, grab it directly from the character attribute
    //       after the Roll20 API is fixed to allow for that.
    //sendChat(module, '/roll @{' + character.get('name') + '|str}', function(results) { log(results); });
    var load_heavy = 0;
    if (strength < 10) {
      load_heavy = strength * 10;
    } else {
      var base = 1 + strength - (10 * Math.floor(strength / 10));
      switch (base) {
        case 1:
          load_heavy = 25;
          break;
        case 2:
          load_heavy = 28.75;
          break;
        case 3:
          load_heavy = 32.5;
          break;
        case 4:
          load_heavy = 37.5;
          break;
        case 5:
          load_heavy = 43.75;
          break;
        case 6:
          load_heavy = 50;
          break;
        case 7:
          load_heavy = 57.5;
          break;
        case 8:
          load_heavy = 65;
          break;
        case 9:
          load_heavy = 75;
          break;
        case 10:
          load_heavy = 87.5;
          break;
      }
      load_heavy *= Math.pow(4, Math.floor(strength / 10));
    }
    var load_light = Math.floor(load_heavy / 3);
    var load_medium = Math.floor(load_heavy * 2 / 3);
    if (debug) {
      log(module + '#CarryingCapacity(' + character.get('name') + ', ' + strength + '): ' + load_light + ' / ' + load_medium + ' / ' + load_heavy);
    }
    RUtil.AttrFetch(character, 'load-light').set('current', load_light);
    RUtil.AttrFetch(character, 'load-medium').set('current', load_medium);
    RUtil.AttrFetch(character, 'load-heavy').set('current', load_heavy);
  }

  var Encumbrance = function(character) {
    var weights = EnumerateWeights(character);
    var item_weight = 0.0;
    var armor_weight = 0.0;
    var weapon_weight = 0.0;

    if (_.has(weights, 'armor')) {
      armor_weight += weights['armor']['weight'] * weights['armor']['equipped'];
    }
    if (_.has(weights, 'shield')) {
      armor_weight += weights['shield']['weight'] * weights['shield']['equipped'];
    }
    if (_.has(weights, 'item')) {
      _.each(weights['item'], function(item, idx, list) {
        item_weight += item['weight'] * item['qty'];
      });
    }
    if (_.has(weights, 'weapon')) {
      _.each(weights['weapon'], function(weapon, idx, list) {
        weapon_weight += weapon['weight'] * weapon['ammo'];
      });
    }
    if (debug) {
      log(module + '#Encumbrance(' + character.get('name') + ') => sum of armor weight is ' + armor_weight + ' pounds');
      log(module + '#Encumbrance(' + character.get('name') + ') => sum of weapon weight is ' + weapon_weight + ' pounds');
      log(module + '#Encumbrance(' + character.get('name') + ') => sum of item weight is ' + item_weight + ' pounds');
    }
    RUtil.AttrFetch(character, 'carried-armor-and-weapons').set('current', armor_weight + weapon_weight);
    RUtil.AttrFetch(character, 'carried-equipment').set('current', item_weight);
    // TODO: calculate current-load (0 = light, 1 = medium, 2 = heavy) by comparing carried-total
    //       against load-{light,medium,heavy} once the Roll20 API is fixed.
    //var roll_string = '/roll [[@{' + character.get('name') + '|carried-total}]]';
    //log('Testing: ' + roll_string);
    //sendChat(module, roll_string, function(results) { log(results); });
    //log(RUtil.AttrFetch(character, 'current-load'));
  };

  var EnumerateWeights = function(character) {
    var weights = {};

    _.each(findObjs({ _type: 'attribute', _characterid: character.id }), function(attr, index, list) {
      var attr_name = attr.get('name');
      var attr_value = parseFloat(attr.get('current'));
      var m;

      if (isNaN(attr_value)) {
        return;
      }
      m = /^(armor|shield)-(equipped|weight)$/.exec(attr_name);
      if (m !== null) {
        weights[m[1]] = weights[m[1]] || {};
        weights[m[1]][m[2]] = attr_value;
        return;
      }
      m = /^repeating_(item|weapon)_(\d+)_(ammo|qty|weight)$/.exec(attr_name);
      if (m !== null) {
        weights[m[1]] = weights[m[1]] || {};
        weights[m[1]][m[2]] = weights[m[1]][m[2]] || {};
        weights[m[1]][m[2]][m[3]] = attr_value;
        return;
      }
    });
    if (debug) {
      _.each(weights, function(collection, obj_type, l) {
        _.each(collection, function(obj, obj_idx, l) {
          log(module + '#EnumerateWeights(' + character.get('name') + ') => [' + obj_type + '][' + obj_idx + ']: ' + JSON.stringify(obj));
        });
      });
    }
    return weights;
  }

  var MessageHandler = function(msg) {
    if (msg.type !== 'api') {
      return;
    }
    var tokens = RUtil.MessageTokenizer(RUtil.MessageReplaceInlineRolls(msg));
    if (tokens.shift().toLowerCase() !== '!pfcustodian') {
      return;
    }
    var character = RUtil.CharacterFetch(tokens.shift(), msg.playerid);
    if (! character) {
      RUtil.MessageSend(module, 'Unable to access requested character.', msg.playerid);
      return;
    }
    while (tokens.length > 0) {
      var command = tokens.shift().toLowerCase();
      switch (command) {
        case 'carrying-capacity':
          CarryingCapacity(character, parseInt(tokens.shift()));
          break;
        case 'encumbrance':
          Encumbrance(character);
          break;
        case 'rest':
          Rest(character);
          break;
        default:
          RUtil.MessageSend(module, 'Unknown command: ' + command, msg.playerid);
          break;
      }
    }
  };

  var Rest = function(character) {

  );

  return {
    RegisterEventHandlers: function() {
      on('chat:message', MessageHandler);
    }
  };
}());
