/*
* jQuery UI Numeric Up/Down v1.3
*
* Copyright 2011, Tony Kramer
* Dual licensed under the MIT or GPL Version 2 licenses.
* https://github.com/flamewave/jquery-ui-numeric/raw/master/GPL-LICENSE.txt
* https://github.com/flamewave/jquery-ui-numeric/raw/master/MIT-LICENSE.txt
*
* https://github.com/flamewave/jquery-ui-numeric
*
* Dependencies:
* - jQuery (1.4.2)
* - jQuery-ui (1.8.6 - core, widget, button)
*/
(function($)
{
    // Default CSS Classes:
    // .ui-numeric { display: inline-block; }
    // .ui-numeric input[type=text] { border: none; text-align: right; margin: 0px; vertical-align: top; }
    // .ui-numeric-currency { display: inline-block; padding: 0px 2px; vertical-align: top; }
    // .ui-numeric-buttons { display: inline-block; padding-left: 2px; }
    // .ui-numeric-buttons .ui-button { margin: 0px; width: 1.55em; height: 1.55em; }
    // .ui-numeric-disabled {}

    $.widget('ui.numeric', {
        version: '1.3',
        options: {
            disabled: false,     // Indicates if the widgit is disabled.
            keyboard: true,      // Indicates if keyboard keys should be allowed to increment/decrement the input value.
            showCurrency: false, // A value indicating if the currency symbol should be displayed to the left of the input.
            currencySymbol: '$', // The currency symbol to use.
            title: 'Type a new value or use the buttons or keyboard arrow keys to change the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.', // Input tooltip.

            buttons: true, // Indicates if the up/down buttons should be displayed to the right of the input.
            upButtonIcon: 'ui-icon-triangle-1-n', // Icon of the up button.
            upButtonTitle: 'Increment the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.', // Tooltip text of the up button.
            downButtonIcon: 'ui-icon-triangle-1-s', // Icon of the down button.
            downButtonTitle: 'Decrement the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.', // Tooltip text of the down button.

            emptyValue: 0,   // If the value equals the value specified by this option, then the input is made "empty" so that no value is visible. To disable this functionality, set this option to false.
            minValue: false, // The minimum value allowed. To disable, set this option to false.
            maxValue: false, // The maximum value allowed. To disable, set this option to false.

            smallIncrement: 1,  // The small increment that is used if the "ctrl" key is pressed.
            increment: 5,       // The default increment that is used if no key modifiers are pressed.
            largeIncrement: 10, // The large increment that is used if the "shift" key is pressed, or when "page up" or "page down" are pressed.
            calc: null,         // Function that is called to calculate what the next value is when incrementing/decrementing the value of the input.
                                // Providing this function will override the default functionality which is to add/subtract the increment amount.
                                // Function definition: Number function(value, type, direction)
                                //     where value is the current input value.
                                //     where type is a number: 1 = normal increment, 2 = small increment, and 3 = large increment.
                                //     where direction is a number: 1 = up, 2 = down.
                                //     returns the new value of the input.

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
            var t = this, o = t.options, w = t.widget(), type = w.attr('type').toLowerCase();
            if (type !== 'text' && type !== 'number')
                throw 'numeric widget can only be applied to text and number inputs.';

            t._checkFormat();

            t._name = w.attr('id') || w.attr('name');
            t._value = t._getInputValue(w.attr('value'), true);

            if (o.minValue !== false && t._value < o.minValue)
                t._value = o.minValue;

            if (o.maxValue !== false && t._value > o.maxValue)
                t._value = o.maxValue;

            // Fix for issue #3 - Change event firing when initializing - credit to glittle for the fix.
            t.widget().attr('value', t._format(t._value));
            w.attr('title', o.title).wrap($('<div class="ui-widget ui-widget-content ui-corner-all ui-numeric" />'));

            if (o.showCurrency)
                t._createCurrency();

            if (o.buttons)
                t._createButtons();

            w.bind({
                keydown: function(event) { return t._onKeyDown(event) },
                keyup: function(event) { return t._onKeyUp(event) },
                change: function(event) { return t._onChange(event) }
            });

            if (o.disabled || w.attr('disabled'))
                t._setOption('disabled', true);

            // Prevent memory leaks.
            $(window).bind('unload', function() { t.destroy(); });
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

            // Ensure that once the widget is destoryed, the page doesn't try to destroy it on unload.
            $(window).unbind('unload', function() { t.destroy(); });
        },

        _createCurrency: function()
        {
            this.widget().before($('<div/>').attr('id', this._name + '_currency').addClass('ui-numeric-currency').html(this.options.currencySymbol));
        },

        _createButtons: function()
        {
            var t = this;

            var btnUp = $('<button type="button"></button>')
                .attr('title', t.options.upButtonTitle)
                .bind({
                    keydown: function(event) { keydown(event, false); },
                    keyup: function() { up(); },
                    mousedown: function(event) { down(event, false); },
                    mouseup: function() { up(); }
                })
                .button({ text: false, label: 'U', icons: { primary: t.options.upButtonIcon} });

            var btnDown = $('<button type="button"></button>')
                .attr('title', t.options.downButtonTitle)
                .bind({
                    keydown: function(event) { keydown(event, true); },
                    keyup: function() { up(); },
                    mousedown: function(event) { down(event, true); },
                    mouseup: function() { up(); }
                })
                .button({ text: false, label: 'D', icons: { primary: t.options.downButtonIcon} });

            t._addButtons(btnUp, btnDown);

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
                t._adjustValueRecursive(neg ? -inc.value : inc.value, inc.type);
            }

            function up()
            {
                clearTimeout(t._timer);
            }
        },

        _addButtons: function(btnUp, btnDown)
        {
            this.widget()
                .after(
                    $('<div/>')
                        .attr('id', this._name + '_buttons')
                        .addClass('ui-numeric-buttons')
                        .append(btnUp)
                        .append(btnDown)
                );
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
                        w.removeAttr('disabled').attr('value', t._format(t._value));
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

                case 'title':
                    o.title = value;
                    t.widget().attr('title', value);
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

                case 'upButtonIcon':
                    o.upButtonIcon = value;
                    if (o.buttons)
                        $('#' + t._name + '_buttons').find('button:eq(0)').button('option', 'icons', { primary: value });
                    break;

                case 'upButtonTitle':
                    o.upButtonTitle = value;
                    if (o.buttons)
                        $('#' + t._name + '_buttons').find('button:eq(0)').attr('title', value);
                    break;

                case 'downButtonIcon':
                    o.downButtonIcon = value;
                    if (o.buttons)
                        $('#' + t._name + '_buttons').find('button:eq(1)').button('option', 'icons', { primary: value });
                    break;

                case 'downButtonTitle':
                    o.downButtonTitle = value;
                    if (o.buttons)
                        $('#' + t._name + '_buttons').find('button:eq(1)').attr('title', value);
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

        _getInputValue: function(val, parse)
        {
            // Remove the thousands separator and normalize the decimal character to a '.' if it isn't already so that JavaScript is able to
            // properly parse the value.
            val = val.replace(new RegExp(regExEscape(this.options.format.thousandsChar), 'g'), '');
            if (this.options.format.decimalChar !== '.')
                val = val.replace(new RegExp(regExEscape(this.options.format.decimalChar), 'g'), '.');
            return parse ? _numVal(val) : val;
        },

        _setInputValue: function(val)
        {
            // Set a flag to keep the "onchange" event from calling this method causing an infinate loop.
            this._adjustmentFlag = true;
            this.widget().attr('value', this._format(val)).change();
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
                return { value: this.options.smallIncrement, type: 2 };

            else if (shift)
                return { value: this.options.largeIncrement, type: 3 };

            return { value: this.options.increment, type: 1 };
        },

        _adjustValue: function(amount, type)
        {
            var t = this;
            if (t.options.disabled)
                return;

            t._setValue($.isFunction(t.options.calc) ? t.options.calc(t._value, type, amount < 0 ? 2 : 1) : t._value + amount);
            t.select();
        },

        _adjustValueRecursive: function(amount, type)
        {
            $.ui.numeric._current = this;
            $.ui.numeric._timerCallback(amount, type, true);
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
                case 40: // Down Arrow
                    if (o.keyboard)
                    {
                        var inc = t._getIncrement(event.ctrlKey, event.shiftKey);
                        t._adjustValue(event.which == 40 ? -inc.value : inc.value, inc.type);
                    }
                    return;

                case 33: // Page Up
                    if (o.keyboard)
                        t._adjustValue(o.largeIncrement, 3);
                    return;

                case 34: // Page Down
                    if (o.keyboard)
                        t._adjustValue(-o.largeIncrement, 3);
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
            // Make sure the value gets updated after every keypress if the current value of the input parses to a valid number.
            var t = this, v = parseFloat(t._getInputValue(t.widget().attr('value'), false));
            if (!isNaN(v))
                t._value = v;

            t._keyDownFlag = false;
        },

        _onChange: function(event)
        {
            if (!this._adjustmentFlag && !this._keyDownFlag)
                this._setValue(this._getInputValue(event.target.value), true);
        },

        // Gets or sets the numeric value as a JavaScript Number object.
        value: function(val)
        {
            // Method called as a getter.
            if (val === undefined)
                return this._value;

            this._setValue(val);
            return this;
        },

        // Selects the input value.
        select: function()
        {
            if (!this.options.disabled)
                this.widget().select();

            return this;
        }
    });

    $.ui = $.ui || {};
    $.ui.numeric._current = null;
    $.ui.numeric._timerCallback = function(amount, type, first)
    {
        clearTimeout($.ui.numeric._current._timer);
        $.ui.numeric._current._adjustValue(amount, type);
        $.ui.numeric._current._timer = setTimeout('jQuery.ui.numeric._timerCallback(' + amount + ',' + type + ',false)', first ? 1000 : 50);
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

    function replicate(str, count)
    {
        var v_retval = '';
        for (var i = 0; i < count; i++)
            v_retval += str;

        return v_retval;
    }

    var REGEX_ESCAPE = new RegExp('(\\' + ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'].join('|\\') + ')', 'g');
    function regExEscape(val)
    {
        return val.replace(REGEX_ESCAPE, '\\$1');
    }

    /*
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
    */
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

    // Rounds the decimal part of the number to the specified number of decimals.
    Number.prototype.roundRight = function(numberOfDecimals)
    {
        numberOfDecimals = _numVal(numberOfDecimals);

        var v_pow = Math.pow(10, numberOfDecimals);
        return Math.round(this * v_pow) / v_pow;
    }

    // Pads to the left of the number with zeros until it is the specified number of digits. If the string length of the number is longer than the
    // number of digits specified, then the string value of the number is returned.
    Number.prototype.pad = function(numberOfDigits)
    {
        numberOfDigits = _numVal(numberOfDigits);

        var v_string = String(this.valueOf()), v_s_len = v_string.length;
        if (v_s_len < numberOfDigits)
        {
            for (var i = v_s_len; i < numberOfDigits; i++)
                v_string = '0' + v_string;
        }
        return v_string;
    }

    // Pads to the right of the number with zeros until it is the specified number of digits. If the string length of the number is longer than the
    // number of digits specified, then the string value of the number is returned.
    Number.prototype.padRight = function(numberOfDigits)
    {
        numberOfDigits = _numVal(numberOfDigits);

        var v_string = String(this.valueOf()), v_s_len = v_string.length - (this % 1 > 0 ? 1 : 0);
        if (v_s_len < numberOfDigits)
        {
            for (var i = v_s_len; i < numberOfDigits; i++)
                v_string = v_string + '0';
        }
        return v_string;
    }

    // Pads to the right of the decimal part of the number with zeros until the decimal part of the number is the specified number of digits. If the
    // string length of the decimal digits is longer than the number of digits specified, then the string value of the number is returned.
    Number.prototype.padDecimals = function(numberOfDecimals)
    {
        numberOfDecimals = _numVal(numberOfDecimals);

        var v_parts = String(this.valueOf()).split('.');

        if (v_parts.length <= 0)
            return numberOfDecimals > 0 ? '0.' + replicate('0', numberOfDecimals) : '0';

        if (v_parts.length == 1)
            return v_parts[0] + (numberOfDecimals > 0 ? '.' + replicate('0', numberOfDecimals) : '');

        return v_parts[0] + (numberOfDecimals > 0 ? '.' + parseInt(v_parts[1]).padRight(numberOfDecimals) : '');
    }

    // Gets the ordinal of the integer part of the number.
    Number.prototype.getOrdinal = function()
    {
        if (this > 100)
            return (this % 100).getOrdinal();

        if (this >= 11 && this <= 19)
            return 'th';

        switch (this % 10)
        {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
        }
        return 'th';
    }

    // See formatNumber above for details.
    Number.prototype.format = function(options)
    {
        $.formatNumber(this, options);
    }

    /*
    * Available options:
    * - symbol        : The currency symbol to use. Defaults to '$'.
    * - noParens      : If true and the number is negative, the negative sign will be used, otherwise negative values are returned wrapped in parentheses
    *                   with no negative sign. Defaults to false.
    * - format        : The format string to format the number with. The number will be rounded to the number of digits specified. Defaults to '#,##0.00'.
    *                   0 = A significant digit (always included).
    *                   # = Digit will be used if applicable.
    * - decimalChar   : The decimal character to use when formatting the number. Defaults to '.'.
    * - thousandsChar : The thousands separator character to use when formatting the number. Defaults to ','.
    */
    Number.prototype.formatCurrency = function(options)
    {
        options = $.extend({ symbol: '$', noParens: false, format: '#,##0.00', decimalChar: '.', thousandsChar: ',' }, options);

        var v_retval = Math.abs(this).format(options);

        if (this < 0)
            return options.noParens
                ? '-' + options.symbol + v_retval
                : '(' + options.symbol + v_retval + ')';

        return v_retval;
    }

})(jQuery);