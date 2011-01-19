/*
* jQuery UI Numeric Up/Down v1.0
*
* Copyright 2010, Tony Kramer
* Dual licensed under the MIT or GPL Version 2 licenses.
* http://jquery.org/license
*
* Dependencies:
* - jQuery (1.4.2)
* - jQuery-ui (1.8.6 - core, widget, button)
*/
(function($)
{
    // Default CSS Classes:
    // .ui-numeric { display: inline-block; border: 1px inset #7E7F7F; }
    // .ui-numeric input[type=text] { border: none; text-align: right; margin: 0px; vertical-align: top; }
    // .ui-numeric-currency { display: inline-block; padding: 0px 2px; vertical-align: top; }
    // .ui-numeric-buttons { display: inline-block; padding-left: 2px; }
    // .ui-numeric-buttons .ui-button { margin: 0px; width: 18px; height: 18px; }
    // .ui-numeric-disabled {}

    $.widget('ui.numeric', {
        options: {
            disabled: false,     // Indicates if the widgit is disabled.
            buttons: true,       // Indicates if the up/down buttons should be displayed to the right of the input.
            keyboard: true,      // Indicates if keyboard keys should be allowed to increment/decrement the input value.
            showCurrency: false, // A value indicating if the currency symbol should be displayed to the left of the input.
            currencySymbol: '$', // The currency symbol to use.

            emptyValue: 0,   // If the value equals the value specified by this option, then the input is made "empty" so that no value is visible. To disable this functionality, set this option to false.
            minValue: false, // The minimum value allowed. To disable, set this option to false.
            maxValue: false, // The maximum value allowed. To disable, set this option to false.

            smallIncrement: 1,  // The small increment that is used if the "ctrl" key is pressed.
            increment: 5,       // The default increment that is used if no key modifiers are pressed.
            largeIncrement: 10, // The large increment that is used if the "shift" key is pressed, or when "page up" or "page down" are pressed.

            format: {
                format: '0',       // The string to format the number with. See Number.format() in the jquery.onsharp.number plugin for details.
                decimalChar: '.',  // The decimal character, if the format string specifies that decimal places should be included.
                thousandsChar: ',' // The thousands separator character, if the format string specifies to use one.
            }
        },

        _adjustmentFlag: false,
        _keyDownFlag: false,
        _timer: null,
        _name: 'numeric',
        _value: 0,

        _create: function()
        {
            var t = this, o = t.options, w = t.widget();
            if (w.attr('type').toLowerCase() !== 'text')
                throw 'numeric widget can only be applied to text inputs.';

            t._checkFormat();

            t._name = w.attr('id') || w.attr('name');
            t._value = t._getInputValue(w.attr('value'));

            if (o.minValue !== false && t._value < o.minValue)
                t._value = o.minValue;

            if (o.maxValue !== false && t._value > o.maxValue)
                t._value = o.maxValue;

            t._setInputValue(t._value);
            w.wrap($('<div class="ui-widget ui-corner-all ui-numeric" />'));

            if (o.disabled)
                t._setOption('disabled', true);

            if (o.showCurrency)
                t._createCurrency();

            if (o.buttons)
                t._createButtons();

            w.bind({
                keydown: function(event) { return t._onKeyDown(event) },
                keyup: function(event) { return t._onKeyUp(event) },
                change: function(event) { return t._onChange(event) }
            });
        },

        destroy: function()
        {
            var t = this, w = t.widget();
            w.unbind({
                keydown: function(event) { return t._onKeyDown(event) },
                keyup: function(event) { return t._onKeyUp(event) },
                change: function(event) { return t._onChange(event) }
            });

            if (t.options.showCurrency)
                $('#' + t._name + '_currency').remove();

            if (t.options.buttons)
                $('#' + t._name + '_buttons').remove();

            w.unwrap();
            $.Widget.prototype.destroy.apply(t);
        },

        _createCurrency: function()
        {
            this.widget().before($('<div/>').attr('id', this._name + '_currency').addClass('ui-numeric-currency').html(this.options.currencySymbol));
        },

        _createButtons: function()
        {
            var t = this;

            var btnUp = $('<button type="button">Up</button>')
                .bind({
                    keydown: function(event) { keydown(event, false); },
                    keyup: function() { up(); },
                    mousedown: function(event) { down(event, false); },
                    mouseup: function() { up(); }
                })
                .button({ text: false, label: 'Up', icons: { primary: 'ui-icon-triangle-1-n'} });

            var btnDown = $('<button type="button">Down</button>')
                .bind({
                    keydown: function(event) { keydown(event, true); },
                    keyup: function() { up(); },
                    mousedown: function(event) { down(event, true); },
                    mouseup: function() { up(); }
                })
                .button({ text: false, label: 'Down', icons: { primary: 'ui-icon-triangle-1-s'} });

            t.widget().after(
                $('<div/>')
                    .attr('id', t._name + '_buttons')
                    .addClass('ui-numeric-buttons')
                    .append(btnUp)
                    .append(btnDown)
            );

            function keydown(event, neg)
            {
                // Allow space or enter to trigger the button.
                if (event.which == 32 || event.which == 13)
                {
                    down(event, neg);
                    event.target.focus();
                }
            }

            function down(event, neg)
            {
                // TODO: Fix if there are more than one numeric instances on the page, then if a button on one instance is clicked, then a button on
                // another instance is clicked, both buttons are shown to have focus.

                // Fixes an issue where if the other button is clicked, then both buttons are shown to have focus.
                (neg ? btnUp : btnDown).blur();
                var inc = t._getIncrement(event.ctrlKey, event.shiftKey);
                t._adjustValueRecursive(neg ? -inc : inc);
            }

            function up()
            {
                clearTimeout(t._timer);
            }
        },

        _setOption: function(key, value)
        {
            var t = this, o = t.options;
            switch (key)
            {
                case 'disabled':
                    var w = t.widget();
                    w.parent()[value ? 'addClass' : 'removeClass']('ui-numeric-disabled ui-state-disabled').attr('aria-disabled', value);
                    t._adjustmentFlag = true;
                    if (value)
                        w.attr({ disabled: 'disabled', value: '' });
                    else
                        w.attr({ disabled: '', value: t._format(t._value) });
                    t._adjustmentFlag = false;

                    if (o.buttons)
                        $('#' + t._name + '_buttons button').button(value ? 'disable' : 'enable');
                    break;

                case 'emptyValue':
                    o.emptyValue = value;
                    t._setValue(t._value);
                    break;

                case 'minValue':
                    o.minValue = value === false ? false : _numVal(value);
                    if (o.minValue !== false && t._value < o.minValue)
                        t._setValue(o.minValue);
                    break;

                case 'maxValue':
                    o.maxValue = value === false ? false : _numVal(value);
                    if (o.maxValue !== false && t._value > o.maxValue)
                        t._setValue(o.maxValue);
                    break;

                case 'format':
                    o.format = value;
                    t._checkFormat();
                    t._setValue(t._value);
                    break;

                case 'showCurrency':
                    if (value && !o.showCurrency)
                        t._createCurrency();

                    else if (!value && o.showCurrency)
                        $('#' + t._name + '_currency').remove();

                    o.showCurrency = value;
                    break;

                case 'currencySymbol':
                    o.currencySymbol = value;
                    if (o.showCurrency)
                        $('#' + t._name + '_currency').html(value);
                    break;

                case 'buttons':
                    if (value && !o.buttons)
                        t._createButtons();

                    else if (!value && o.buttons)
                        $('#' + t._name + '_buttons').remove();

                    o.buttons = value;
                    break;

                default:
                    $.Widget.prototype._setOption.apply(t, key, value);
                    break;
            }
            return t;
        },

        _checkFormat: function()
        {
            var o = this.options;
            if (typeof o.format === 'string')
                o.format = { format: o.format, decimalChar: '.', thousandsChar: ',' };
            else
                o.format = $.extend({ format: '0', decimalChar: '.', thousandsChar: ',' }, o.format);
        },

        _getInputValue: function(val)
        {
            // Remove the thousands separator and normalize the decimal character to a '.' if it isn't already so that JavaScript is able to
            // properly parse the value.
            val = val.replace(new RegExp(regExEscape(this.options.format.thousandsChar), 'g'), '');
            if (this.options.format.decimalChar !== '.')
                val = val.replace(new RegExp(regExEscape(this.options.format.decimalChar), 'g'), '.');
            return _numVal(val);
        },

        _setInputValue: function(val)
        {
            // Set a flag to keep the "onchange" event from calling this method causing an infinate loop.
            this._adjustmentFlag = true;
            this.widget().attr('value', this._format(val));
            this._adjustmentFlag = false;
        },

        _setValue: function(val)
        {
            var t = this;
            val = _numVal(val);

            if (t.options.minValue !== false && val < t.options.minValue)
                val = t.options.minValue;

            if (t.options.maxValue !== false && val > t.options.maxValue)
                val = t.options.maxValue;

            t._value = val;
            if (!t.options.disabled)
                t._setInputValue(val);
        },

        _format: function(val)
        {
            var o = this.options;
            return isNaN(val) || (o.emptyValue !== false && val === o.emptyValue) ? '' : $.formatNumber(val, o.format);
        },

        _getIncrement: function(ctrl, shift)
        {
            if (ctrl)
                return this.options.smallIncrement;

            else if (shift)
                return this.options.largeIncrement;

            return this.options.increment;
        },

        _adjustValue: function(amount)
        {
            if (this.options.disabled)
                return;

            this._setValue(this._value + amount);
            this.select();
        },

        _adjustValueRecursive: function(amount)
        {
            $.ui.numeric._current = this;
            $.ui.numeric._timerCallback(amount, true);
        },

        _onKeyDown: function(event)
        {
            var t = this, o = t.options;
            if (o.disabled)
                return;

            switch (event.which)
            {
                // The following are non-control keys that we want to allow through to perform their default function with no other actions.                                                                        
                case 109: // Negative Sign
                case 110: // Decimal (number pad)
                case 190: // Decimal (key pad)
                    t._keyDownFlag = true;
                    return;

                case 38: // Up Arrow
                    if (o.keyboard)
                        t._adjustValue(t._getIncrement(event.ctrlKey, event.shiftKey));
                    return;

                case 40: // Down Arrow
                    if (o.keyboard)
                        t._adjustValue(-t._getIncrement(event.ctrlKey, event.shiftKey));
                    return;

                case 33: // Page Up
                    if (o.keyboard)
                        t._adjustValue(o.largeIncrement);
                    return;

                case 34: // Page Down
                    if (o.keyboard)
                        t._adjustValue(-o.largeIncrement);
                    return;

                    // The following are keyboard shortcuts that we still want to allow.
                case 65: // A (select all)
                case 67: // C (copy)
                case 86: // V (paste)
                case 88: // X (cut)
                case 89: // Y (redo)
                case 90: // Z (undo)
                    if (event.ctrlKey)
                        return;
                    break;
            }

            if (isControlKey(event.which))
                return;

            if (!isNumericKey(event.which))
            {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        },

        _onKeyUp: function()
        {
            this._keyDownFlag = false;
        },

        _onChange: function(event)
        {
            if (!this._adjustmentFlag && !this._keyDownFlag)
                this._setValue(this._getInputValue(event.target.value));
        },

        value: function(val)
        {
            // Method called as a getter.
            if (val === undefined)
                return this._value;

            this._setValue(val);
            return this;
        },

        select: function()
        {
            if (!this.options.disabled)
                this.widget().select();

            return this;
        }
    });

    $.ui = $.ui || {};
    $.ui.numeric._current = null;
    $.ui.numeric._timerCallback = function(amount, first)
    {
        clearTimeout($.ui.numeric._current._timer);
        $.ui.numeric._current._adjustValue(amount);
        $.ui.numeric._current._timer = setTimeout('jQuery.ui.numeric._timerCallback(' + amount + ',false)', first ? 1000 : 50);
    }

    function isControlKey(keyCode)
    {
        return (keyCode <= 47 && keyCode != 32)
            || (keyCode >= 91 && keyCode <= 95)
            || (keyCode >= 112 && [188, 190, 191, 192, 219, 220, 221, 222].indexOf(keyCode) == -1)
    }

    function isNumericKey(keyCode)
    {
        // 48 - 57 are numerical key codes for key pad nubers, 96 - 105 are numerical key codes for num pad numbers.
        return (keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105);
    }

    function _numVal(val)
    {
        if (typeof val !== 'number')
            val = Number(val);

        if (isNaN(val))
            return 0;

        return val;
    }

    var REGEX_ESCAPE = new RegExp('(\\' + ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'].join('|\\') + ')', 'g');
    function regExEscape(val)
    {
        return val.replace(REGEX_ESCAPE, '\\$1');
    }

    /**
    * Formats a number according to a specified format string.
    *
    * Available options:
    * - format        : The format string to format the number with. The number will be rounded to the number of digits specified.
    *                   0 = A significant digit (always included).
    *                   # = Digit will be used if applicable.
    *                   . = Characters to the right of this will be interpreted as decimal places.
    *                   , = Must occur to the left of the decimal (if there is one). If included, indicates the thousands separator will be included every 3 digits on the left of the decimal.
    * - decimalChar   : The decimal character to use when formatting the number. Defaults to '.'.
    * - thousandsChar : The thousands separator character to use when formatting the number. Defaults to ','.
    *
    * Examples:
    *
    * Given the number "1000.0562":
    * --------------------
    * format  | result
    * --------------------
    *       0 | 1000
    *     0.0 | 1000.1
    * #,000.0 | 1,000.1
    *    0.## | 1000.06
    * #,0.00# | 1,000.056
    * 0.00### | 1000.0562
    * 0.00000 | 1000.05620
    **/
    $.formatNumber = function(num, options)
    {
        num = _numVal(num);

        if (typeof options === 'string')
            options = { format: options };

        options = $.extend({ format: null, decimalChar: '.', thousandsChar: ',' }, options);

        // No need to continue if no format string is specified.
        if (typeof options.format !== 'string' || options.format.length <= 0)
            return num.toString();

        // Default to '.' as the decimal character.
        options.decimalChar = typeof options.decimalChar !== 'string' || options.decimalChar.length <= 0 ? '.' : options.decimalChar;

        // Default to ',' as the thousands separator.
        options.thousandsChar = typeof options.thousandsChar !== 'string' ? ',' : options.thousandsChar;

        if (options.decimalChar.length > 1)
            throw 'NumberFormatException: Can not have multiple characters as the decimal character.';

        if (options.thousandsChar.length > 1)
            throw 'NumberFormatException: Can not have multiple characters as the thousands separator.';

        var v_dec_index = options.format.indexOf(options.decimalChar);
        if (v_dec_index >= 0 && options.format.indexOf(options.decimalChar, v_dec_index + 1) >= 0)
            throw 'NumberFormatException: Format string has multiple decimal characters.';

        // Convert the current numeric value to a string, removing the negative sign if the number is negative.
        var v_num_as_string = num.toString().replace(/-/g, ''),

        // Strip out all of the characters that are not formatting characters. Regonized formatting characters are: '0', '#', and the decimal character.
        v_clean_format = options.format.replace(new RegExp('[^0#' + regExEscape(options.decimalChar) + ']', 'g'), ''),

        // Split the numerical value into it's int and decimal parts.
        v_num_parts = v_num_as_string.indexOf(options.decimalChar) < 0 ? [v_num_as_string, ''] : v_num_as_string.split(options.decimalChar),

        // Split the format string into it's respective integer and decimal parts.
        v_format_parts = v_dec_index < 0 ? [v_clean_format, ''] : v_clean_format.split(options.decimalChar);

        // If the int part is zero, then we may not need to have any int part depending on the format string.
        if (parseInt(num) === 0)
            v_num_parts[0] = v_format_parts[0].indexOf('0') >= 0 ? '0' : '';

        // Otherwise no processing is needed, we already have our int part.

        if (options.format.indexOf(options.thousandsChar) >= 0 && v_num_parts[0].length > 3)
        {
            // If we need to include the thousands separator, then we can break the int part into chunks of three characters each (the first chunk does not need
            // to be 3 characters), then join them together separated by the thousands separator.
            var v_int_thousands_array = [],
            j = v_num_parts[0].length,
            m = Math.floor(j / 3),
            n = v_num_parts[0].length % 3 || 3; // If n is zero, an infinite loop will occur, so we have to make sure it is not zero.

            for (var i = 0; i < j; i += n)
            {
                if (i != 0)
                    n = 3;

                v_int_thousands_array[v_int_thousands_array.length] = v_num_parts[0].substr(i, n);
                m -= 1;
            }

            v_num_parts[0] = v_int_thousands_array.join(options.thousandsChar);
        }

        // Do we have a decimal part to format?
        if (v_format_parts[1].length > 0)
        {
            if (v_num_parts[1].length > 0)
            {
                // Get character arrays of the decimal format string and decimal part of the numerical value.
                var v_format_array = v_format_parts[1].split(''), v_dec_part_array = v_num_parts[1].split('');

                // Compile the final formatted decimal part. If there are any # symbols left, we can simply remove them.
                for (var i = 0; i < v_dec_part_array.length; i++)
                {
                    if (i >= v_format_array.length)
                        break;

                    v_format_array[i] = v_dec_part_array[i];
                }

                v_num_parts[1] = v_format_array.join('').replace(/#/g, '');
            }

            // Else if there is no decimal part of the actual number, but the format string specified says to include decimals, then we need to
            // make sure that the number of decimal places specified are included.
            else
            {
                var v_index = 0;
                v_num_parts[1] = '';
                while (v_format_parts[1].charAt(v_index) === '0')
                {
                    v_num_parts[1] += '0';
                    v_index++;
                }
            }
        }
        else
            v_num_parts[1] = ''; // There is no decimal part specified in the format string.

        // Compile the full formatted numerical string.
        var v_retval = (v_num_parts[1].length <= 0) ? v_num_parts[0] : v_num_parts[0] + options.decimalChar + v_num_parts[1];

        // If the number is negative, then add the negative sign.
        if (num < 0)
            v_retval = '-' + v_retval;

        // Replace the number portion of the format string with the compiled result
        return options.format.replace(new RegExp('[0|#|' + regExEscape(options.thousandsChar) + '|' + regExEscape(options.decimalChar) + ']+'), v_retval);
    }

})(jQuery);