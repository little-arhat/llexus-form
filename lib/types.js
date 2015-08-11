'use strict';

var ou = require('plexus-objective');

var alternative = require('./alternative');


var types = {
  alternative: function(fields, props) {
    var s = alternative.schema(props.getValue(props.path), props.schema, props.context);

    return types.object(fields, ou.merge(props, { schema: s }));
  },
    array: function(fields, props) {
      var tuple_typing = Array.isArray(props.schema.items);
      if (tuple_typing) {
        return props.schema.items.map(function(item, index) {
          return fields.make(fields, ou.merge(props, {
            schema: item,
            path  : props.path.concat(index)
          }));
        });
      } else {
        var n = (props.getValue(props.path) || []).length + 1;
        var list = [];
        for (var i = 0; i < n; ++i) {
          list.push(fields.make(fields, ou.merge(props, {
            schema: props.schema.items,
            path  : props.path.concat(i),
          })));
        }
        return list;
      }
  },
  object: function(fields, props) {
    var keys = fullOrdering(props.schema['x-ordering'], props.schema.properties);
    // set general properties
    var list = keys.map(function(key) {
      return fields.make(fields, ou.merge(props, {
        schema: props.schema.properties[key],
        path  : props.path.concat(key)
      }));
    });
    if (props.schema.additionalProperties) {
      var n = Object.keys(props.getValue(props.path) || {}).length + 1;
      var list = [];
      for (var i = 0; i < n; ++i) {
        var additionalProperty = {
          "type": "object",
          "title": "item:",
          "properties": {
            "key": {
              "type": "string",
              "title": "key",
            },
            "value": props.schema.additionalProperties
          }
        };
        list.push(fields.make(fields, ou.merge(props, {
          schema: additionalProperty,
          path  : props.path.concat("_additionalProperties").concat(i)
        })));
      }
    }
    return list;
  },
};

module.exports = types;

function fullOrdering(list, obj) {
  var keys = Object.keys(obj || {});
  var result = [];
  var i, k;

  for (i in list || []) {
    k = list[i];
    if (keys.indexOf(k) >= 0) {
      result.push(k);
    }
  }

  for (i in keys) {
    k = keys[i];
    if (result.indexOf(k) < 0) {
      result.push(k);
    }
  }

  return result;
}
