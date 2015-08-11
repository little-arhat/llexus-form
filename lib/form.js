'use strict';

var React = require('react');
var $ = React.DOM;

var ou = require('plexus-objective');

var fields = require('./fields');
var normalise = require('./normalise');
var resolve = require('./resolve');


module.exports = React.createClass({
  displayName: 'Form',

  propsToAdditionalPropsInPlace: function(schema, result, original, globalContext) {
    if (typeof original != "object" || Array.isArray(original))
      return;
    var schemaProperties = schema.properties || {};
    var ctx = globalContext || schema;
    var key;
    var additionalSchema;
    if (schema.additionalProperties) {
      result["_additionalProperties"] = [];
      additionalSchema = resolve(schema.additionalProperties, ctx);
    }
    for (key in original) {
      if (key in schemaProperties) {
        // Schema defined prop, recursively check for insides
        this.propsToAdditionalPropsInPlace(schemaProperties[key],
                                           result[key],
                                           original[key],
                                           ctx);
      } else {
        // Property isn't found in schema.properties...
        if (schema.additionalProperties) {
          // And schema supports additional properties
          // this is additional prop and has to be moved
          var new_prop = JSON.parse(JSON.stringify(original[key]));
          this.propsToAdditionalPropsInPlace(additionalSchema,
                                             new_prop,
                                             original[key],
                                             ctx);
          result["_additionalProperties"].push({
            key: key,
            value: new_prop
          });
          // delete additionalProp from top-level of object:
          delete result[key];
        } else {
          // if it's property without schema, leave it for validation, don't go further
        }
      }
    }
  },
  getInitialState: function() {
    if (this.props.values) {
      var transformed = JSON.parse(JSON.stringify(this.props.values));
      this.propsToAdditionalPropsInPlace(this.props.schema,
                                         transformed,
                                         this.props.values);
    } else {
      var transformed = this.props.values;
    }
    // Validate converts _additionalProperties stuff to correct form, so send
    // original properties to it
    var errors = this.validate(this.props.schema,
                               this.props.values,
                               context(this.props));
    console.log(errors);
    return { values: transformed,
             output: transformed,
             errors: errors };
  },
  componentWillReceiveProps: function(props) {
    var values = props.values || this.state.values;
    var output = props.values || this.state.output;
    this.setState({
      values: values,
      output: output,
      errors: this.validate(props.schema, output, context(props))
    });
  },
  setValue: function(path, raw, parsed) {
    var schema = this.props.schema;
    var ctx    = context(this.props);
    var values = normalise(ou.setIn(this.state.values, path, raw),
                           schema, ctx);
    var output = normalise(ou.setIn(this.state.output, path, parsed),
                           schema, ctx);
    var errors = this.validate(schema, output, ctx);

    if (this.props.submitOnChange) {
      this.props.onSubmit(output, null, errors);
    }
    else {
      this.setState({
        values: values,
        output: output,
        errors: errors
      });
    }
  },
  getValue: function(path) {
    return ou.getIn(this.state.values, path);
  },
  getErrors: function(path) {
    return this.state.errors[makeKey(path)];
  },
  validate: function(schema, values, context) {
    return hashedErrors(this.props.validate(schema,
                                            this.additionalPropsToProps(values),
                                            context));
  },
  preventSubmit: function(event) {
    event.preventDefault();
  },
  additionalPropsToProps: function(item) {
    if (typeof item == "object" && !Array.isArray(item)) {
      var res = {};
      var k;
      for (k in item) {
        if (k == "_additionalProperties") {
          item[k].forEach(function(prop) {
            var key = prop["key"];
            var value = prop["value"];
            res[key] = this.additionalPropsToProps(value);
          }.bind(this));
        } else {
          res[k] = this.additionalPropsToProps(item[k]);
        }
      }
      return res;
    } else {
      return item;
    }
  },
  handleSubmit: function(event) {
    this.props.onSubmit(this.additionalPropsToProps(this.state.output),
                        event.target.value,
                        this.state.errors);
  },
  handleKeyPress: function(event) {
    if (event.keyCode === 13 && this.props.enterKeySubmits) {
      this.props.onSubmit(this.state.output, this.props.enterKeySubmits);
    }
  },
  renderButtons: function() {
    var submit = this.handleSubmit;

    if (typeof this.props.buttons === 'function') {
      return this.props.buttons(submit);
    }
    else {
      var buttons = (this.props.buttons || ['Cancel', 'Submit'])
        .map(function(value) {
          return $.input({ type   : 'submit',
                           key    : value,
                           value  : value,
                           onClick: submit });
        });
      return $.p(null, buttons);
    }
  },
  render: function() {
    var renderedFields = fields.make(fields, {
      schema        : this.props.schema,
      context       : context(this.props),
      fieldWrapper  : this.props.fieldWrapper,
      sectionWrapper: this.props.sectionWrapper,
      handlers      : this.props.handlers,
      hints         : this.props.hints,
      path          : [],
      update        : this.setValue,
      getValue      : this.getValue,
      getErrors     : this.getErrors
    });

    return $.form({ onSubmit  : this.preventSubmit,
                    onKeyPress: this.handleKeyPress,
                    className : this.props.className
                  },
                  this.props.extraButtons ? this.renderButtons() : $.span(),
                  renderedFields,
                  this.renderButtons());
  }
});

function hashedErrors(errors) {
  var result = {};
  var i, entry;
  for (i = 0; i < errors.length; ++i) {
    entry = errors[i];
    result[makeKey(entry.path)] = entry.errors;
  }
  return result;
}

function makeKey(path) {
  return path.join('_');
}

function context(props) {
  return props.context || props.schema;
}
