/*!
* jQuery UI Numeric Up/Down v1.4.2
*
* Copyright 2011, Tony Kramer
* Dual licensed under the MIT or GPL Version 2 licenses.
* https://github.com/flamewave/jquery-ui-numeric/raw/master/GPL-LICENSE.txt
* https://github.com/flamewave/jquery-ui-numeric/raw/master/MIT-LICENSE.txt
*/

/*
* For documentation and for the latest version, see:
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
    // .ui-numeric input[type=text], .ui-numeric input[type=number] { border: none; text-align: right; margin: 0px; vertical-align: top; }
    // .ui-numeric-currency { display: inline-block; padding: 0px 2px; vertical-align: top; }
    // .ui-numeric-buttons { display: inline-block; padding-left: 2px; }
    // .ui-numeric-buttons .ui-button { margin: 0px; width: 1.55em; height: 1.55em; }
    // .ui-numeric-disabled {}

    $.widget('ui.numeric', {
        version: '1.4.2',
        options: {
            disabled: false,
            keyboard: true,
            showCurrency: false,
            currencySymbol: null,
            title: null,

            buttons: true,
            upButtonIcon: 'ui-icon-triangle-1-n',
            upButtonTitle: null,
            downButtonIcon: 'ui-icon-triangle-1-s',
            downButtonTitle: null,

            emptyValue: 0,
            minValue: false,
            maxValue: false,

            smallIncrement: 1,
            increment: 5,
            largeIncrement: 10,
            calc: null,
            format: null
        },

        _adjustmentFlag: false,
        _keyDownFlag: false,
        _timer: null,
        _name: 'numeric',
        _value: 0,

        _create: function()
        {
            var type = this.element.attr('type').toLowerCase();
            if (type !== 'text' && type !== 'number')
                throw 'numeric widget can only be applied to text and number inputs.';

            this._checkFormat();

            this._name = this.element.attr('id') || this.element.attr('name');
            this._value = this._getInputValue(this.element.attr('value'), true);

            if (this.options.minValue !== false && this._value < this.options.minValue)
                this._value = this.options.minValue;

            if (this.options.maxValue !== false && this._value > this.options.maxValue)
                this._value = this.options.maxValue;

            // Fix for issue #3 - Change event firing when initializing - credit to glittle for the fix.
            this.element.attr('value', this._format(this._value));
            this.element.attr('title', this.options.title || $.ui.numeric.globalization.defaultTooltip).wrap($('<div class="ui-widget ui-widget-content ui-corner-all ui-numeric" />'));

            if (this.options.showCurrency)
                this._createCurrency();

            if (this.options.buttons)
                this._createButtons();

            var self = this;
            this.element.bind({
                keydown: function(event) { return self._onKeyDown(event) },
                keyup: function(event) { return self._onKeyUp(event) },
                change: function(event) { return self._onChange(event) }
            });

            if (this.options.disabled || this.element.attr('disabled'))
                this._setOption('disabled', true);

            // Prevent memory leaks.
            $(window).bind('unload', function() { self.destroy(); });
        },

        destroy: function()
        {
            var self = this;
            this.element.unbind({
                keydown: function(event) { return self._onKeyDown(event) },
                keyup: function(event) { return self._onKeyUp(event) },
                change: function(event) { return self._onChange(event) }
            });

            if (this.options.showCurrency)
                $('#' + this._name + '_currency').remove();

            if (this.options.buttons)
                $('#' + this._name + '_buttons').remove();

            this.element.unwrap();
            $.Widget.prototype.destroy.call(this);

            // Ensure that once the widget is destoryed, the page doesn't try to destroy it on unload.
            $(window).unbind('unload', function() { self.destroy(); });
        },

        _createCurrency: function()
        {
            this.element.before($('<div/>').attr('id', this._name + '_currency').addClass('ui-numeric-currency').html(this.options.currencySymbol || Number.globalization.defaultCurrencyFormat.symbol));
        },

        _createButtons: function()
        {
            var btnUp = $('<button type="button"></button>')
                .attr('title', this.options.upButtonTitle || $.ui.numeric.globalization.defaultUpTooltip)
                .bind({
                    keydown: function(event) { keydown(event, false); },
                    keyup: function() { up(); },
                    mousedown: function(event) { down(event, false); },
                    mouseup: function() { up(); }
                })
                .button({ text: false, label: 'U', icons: { primary: this.options.upButtonIcon} });

            var btnDown = $('<button type="button"></button>')
                .attr('title', this.options.downButtonTitle || $.ui.numeric.globalization.defaultDownTooltip)
                .bind({
                    keydown: function(event) { keydown(event, true); },
                    keyup: function() { up(); },
                    mousedown: function(event) { down(event, true); },
                    mouseup: function() { up(); }
                })
                .button({ text: false, label: 'D', icons: { primary: this.options.downButtonIcon} });

            this._addButtons(btnUp, btnDown);
            var self = this;

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

                /* Fixes an issue where if the other button is clicked, then both buttons are shown to have focus. */
                (neg ? btnUp : btnDown).blur();
                var inc = self._getIncrement(event.ctrlKey, event.shiftKey);
                self._adjustValueRecursive(neg ? -inc.value : inc.value, inc.type);
            }

            function up()
            {
                clearTimeout(self._timer);
            }
        },

        _addButtons: function(btnUp, btnDown)
        {
            this.element.after(
                $('<div/>')
                    .attr('id', this._name + '_buttons')
                    .addClass('ui-numeric-buttons')
                    .append(btnUp)
                    .append(btnDown)
            );
        },

        _setOption: function(key, value)
        {
            switch (key)
            {
                case 'disabled':
                    this.element.parent()[value ? 'addClass' : 'removeClass']('ui-numeric-disabled ui-state-disabled').attr('aria-disabled', value);
                    this._adjustmentFlag = true;
                    if (value)
                        this.element.attr({ disabled: 'disabled', value: '' });
                    else
                        this.element.removeAttr('disabled').attr('value', this._format(this._value));
                    this._adjustmentFlag = false;

                    if (this.options.buttons)
                        $('#' + this._name + '_buttons button').button(value ? 'disable' : 'enable');
                    break;

                case 'emptyValue':
                    this.options.emptyValue = value;
                    this._setValue(this._value);
                    break;

                case 'minValue':
                    this.options.minValue = value === false ? false : _numVal(value);
                    if (this.options.minValue !== false && this._value < this.options.minValue)
                        this._setValue(this.options.minValue);
                    break;

                case 'maxValue':
                    this.options.maxValue = value === false ? false : _numVal(value);
                    if (this.options.maxValue !== false && this._value > this.options.maxValue)
                        this._setValue(this.options.maxValue);
                    break;

                case 'format':
                    this.options.format = value;
                    this._checkFormat();
                    this._setValue(this._value);
                    break;

                case 'title':
                    this.options.title = value || $.ui.numeric.globalization.defaultTooltip;
                    this.element.attr('title', this.options.title);
                    break;

                case 'showCurrency':
                    if (value && !this.options.showCurrency)
                        this._createCurrency();

                    else if (!value && this.options.showCurrency)
                        $('#' + this._name + '_currency').remove();

                    this.options.showCurrency = value;
                    break;

                case 'currencySymbol':
                    this.options.currencySymbol = value || Number.globalization.defaultCurrencyFormat.symbol;
                    if (this.options.showCurrency)
                        $('#' + this._name + '_currency').html(this.options.currencySymbol);
                    break;

                case 'buttons':
                    if (value && !this.options.buttons)
                        this._createButtons();

                    else if (!value && this.options.buttons)
                        $('#' + this._name + '_buttons').remove();

                    this.options.buttons = value;
                    break;

                case 'upButtonIcon':
                    this.options.upButtonIcon = value;
                    if (this.options.buttons)
                        $('#' + this._name + '_buttons').find('button:eq(0)').button('option', 'icons', { primary: value });
                    break;

                case 'upButtonTitle':
                    this.options.upButtonTitle = value || $.ui.numeric.globalization.defaultUpTooltip;
                    if (this.options.buttons)
                        $('#' + this._name + '_buttons').find('button:eq(0)').attr('title', this.options.upButtonTitle);
                    break;

                case 'downButtonIcon':
                    this.options.downButtonIcon = value;
                    if (this.options.buttons)
                        $('#' + this._name + '_buttons').find('button:eq(1)').button('option', 'icons', { primary: value });
                    break;

                case 'downButtonTitle':
                    this.options.downButtonTitle = value || $.ui.numeric.globalization.defaultDownTooltip;
                    if (this.options.buttons)
                        $('#' + this._name + '_buttons').find('button:eq(1)').attr('title', this.options.downButtonTitle);
                    break;

                default:
                    $.Widget.prototype._setOption.call(this, key, value);
                    break;
            }
            return this;
        },

        _checkFormat: function()
        {
            this.options.format = $.extend({}, Number.globalization.defaultFormat, typeof this.options.format === 'string' ? { format: this.options.format} : this.options.format);
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
            this.element.attr('value', this._format(val)).change();
            this._adjustmentFlag = false;
        },

        _setValue: function(val)
        {
            val = _numVal(val);

            if (this.options.minValue !== false && val < this.options.minValue)
                val = this.options.minValue;

            if (this.options.maxValue !== false && val > this.options.maxValue)
                val = this.options.maxValue;

            this._value = val;
            if (!this.options.disabled)
                this._setInputValue(val);
        },

        _format: function(val)
        {
            return isNaN(val) || (this.options.emptyValue !== false && val === this.options.emptyValue) ? '' : $.formatNumber(val, this.options.format);
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
            if (this.options.disabled)
                return;

            this._setValue($.isFunction(this.options.calc) ? this.options.calc(this._value, type, amount < 0 ? 2 : 1) : this._value + amount);
            this.select();
        },

        _adjustValueRecursive: function(amount, type)
        {
            $.ui.numeric._current = this;
            $.ui.numeric._timerCallback(amount, type, true);
        },

        _onKeyDown: function(event)
        {
            if (this.options.disabled)
                return;

            // Fix for issue #4: format characters were not allowed for non-standard format character values.
            // toLowerCase is used to normalize characters in case the user has caps lock on.
            // Note: The $.keyCodeToCharCode() method is written for use with the standard US 101 keyboard. It may need to be modified for other keyboard layouts.
            var v_char = String.fromCharCode($.keyCodeToCharCode(event.which, event.shiftKey)).toLowerCase();
            if (v_char === this.options.format.decimalChar.toLowerCase() || v_char == this.options.format.thousandsChar.toLowerCase())
            {
                this._keyDownFlag = true;
                return;
            }

            switch (event.which)
            {
                // The following are non-control keys that we want to allow through to perform their default function with no other actions.                                
                case 109: // Negative Sign
                    this._keyDownFlag = true;
                    return;

                case 38: // Up Arrow
                case 40: // Down Arrow
                    if (this.options.keyboard)
                    {
                        var inc = this._getIncrement(event.ctrlKey, event.shiftKey);
                        this._adjustValue(event.which == 40 ? -inc.value : inc.value, inc.type);
                    }
                    return;

                case 33: // Page Up
                    if (this.options.keyboard)
                        this._adjustValue(this.options.largeIncrement, 3);
                    return;

                case 34: // Page Down
                    if (this.options.keyboard)
                        this._adjustValue(-this.options.largeIncrement, 3);
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
            var v = parseFloat(this._getInputValue(this.element.attr('value'), false));
            if (!isNaN(v))
                this._value = v;

            this._keyDownFlag = false;
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
                this.element.select();

            return this;
        }
    });

    $.ui.numeric.globalization = {
        defaultTooltip: 'Type a new value or use the buttons or keyboard arrow keys to change the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.',
        defaultUpTooltip: 'Increment the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.',
        defaultDownTooltip: 'Decrement the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.'
    };

    $.ui = $.ui || {};
    $.ui.numeric._current = null;
    $.ui.numeric._timerCallback = function(amount, type, first)
    {
        clearTimeout($.ui.numeric._current._timer);
        $.ui.numeric._current._adjustValue(amount, type);
        $.ui.numeric._current._timer = setTimeout('jQuery.ui.numeric._timerCallback(' + amount + ',' + type + ',false)', first ? 1000 : 50);
    }

    var KEY_CODE_MAP_SHIFT = {
        48: 41, // )
        49: 33, // !
        50: 64, // @
        51: 35, // #
        52: 36, // $
        53: 37, // %
        54: 94, // ^
        55: 38, // &
        56: 42, // *
        57: 40, // (

        59: 58,   // : for geko and opera
        61: 43,   // + for geko and opera
        186: 58,  // : for webkit and IE
        187: 43,  // + for webkit and IE
        188: 60,  // <
        109: 95,  // _ for geko
        189: 95,  // _ for webkit and IE
        190: 62,  // >
        191: 63,  // ?
        192: 126, // ~
        219: 123, // {
        220: 124, // |
        221: 125, // }
        222: 34   // "
    };

    var KEY_CODE_MAP_NORMAL = {
        59: 59, // ; for geko and opera
        61: 61, // = for geko and opera

        96: 48,  // numpad 0
        97: 49,  // numpad 1
        98: 50,  // numpad 2
        99: 51,  // numpad 3
        100: 52, // numpad 4
        101: 53, // numpad 5
        102: 54, // numpad 6
        103: 55, // numpad 7
        104: 56, // numpad 8
        105: 57, // numpad 9

        106: 42, // numpad *
        107: 43, // numpad +
        109: 45, // numpad -
        110: 46, // numpad .
        111: 47, // numpad /

        186: 59, // ; for webkit and IE
        187: 61, // = for webkit and IE
        188: 44, // ,
        109: 45, // - for geko
        189: 45, // - for webkit and IE
        190: 46, // .
        191: 47, // /
        192: 96, // `
        219: 91, // [
        220: 92, // \
        221: 93, // ]
        222: 39  // '
    };

    $.keyCodeToCharCode = function(keyCode, shift)
    {
        if (keyCode >= 48 && keyCode <= 57 && !shift) // 0-9
            return keyCode;

        if (keyCode >= 65 && keyCode <= 90) // A-Z and a-z
            return shift ? keyCode : keyCode + 32;

        if (keyCode === 9 || keyCode === 32) // tab, space
            return keyCode;

        return shift ? KEY_CODE_MAP_SHIFT[keyCode] : KEY_CODE_MAP_NORMAL[keyCode];
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
        options = $.extend({}, Number.globalization.defaultFormat, typeof options === 'string' ? { format: options} : options);

        // Default to '.' as the decimal character.
        options.decimalChar = typeof options.decimalChar !== 'string' || options.decimalChar.length <= 0 ? Number.globalization.defaultFormat.decimalChar : options.decimalChar;

        // Default to ',' as the thousands separator.
        options.thousandsChar = typeof options.thousandsChar !== 'string' ? Number.globalization.defaultFormat.thousandsChar : options.thousandsChar;

        if (options.decimalChar.length > 1)
            throw 'NumberFormatException: Can not have multiple characters as the decimal character.';

        if (options.thousandsChar.length > 1)
            throw 'NumberFormatException: Can not have multiple characters as the thousands separator.';

        // If the value passed in is not a number object, it needs to be parsed to a number object.
        if (typeof num !== 'number')
        {
            // If the value passed in is a string, then remove any thousands characters and normalize the decimal to a decimal point.
            if (typeof num === 'string')
            {
                num = num.replace(new RegExp(regExEscape(options.thousandsChar), 'g'), '');

                if (options.decimalChar !== '.')
                    num = num.replace(new RegExp(regExEscape(options.decimalChar), 'g'), '.');
            }

            num = Number(num);

            if (isNaN(num))
                num = 0;
        }

        // No need to continue if no format string is specified.
        if (typeof options.format !== 'string' || options.format.length <= 0)
            return options.decimalChar === '.' ? num.toString() : num.toString().replace(/\./g, options.decimalChar);

        var v_dec_index = options.format.indexOf('.');
        if (v_dec_index >= 0 && options.format.indexOf('.', v_dec_index + 1) >= 0)
            throw 'NumberFormatException: Format string has multiple decimal characters.';

        // Convert the current numeric value to a string, removing the negative sign if the number is negative.
        var v_num_as_string = num.toString().replace(/-/g, ''),

        // Strip out all of the characters that are not formatting characters. Regonized formatting characters are: '0', '#', and '.'.
        v_clean_format = options.format.replace(new RegExp('[^0#\.]', 'g'), ''),

        // Split the numerical value into it's int and decimal parts.
        v_num_parts = v_num_as_string.indexOf('.') < 0 ? [v_num_as_string, ''] : v_num_as_string.split('.'),

        // Split the format string into it's respective integer and decimal parts.
        v_format_parts = v_dec_index < 0 ? [v_clean_format, ''] : v_clean_format.split('.');

        // If the int part is zero, then we may not need to have any int part depending on the format string.
        if (parseInt(num) === 0)
            v_num_parts[0] = v_format_parts[0].indexOf('0') >= 0 ? Number.globalization.padChar : '';

        // Otherwise no processing is needed, we already have our int part.

        var i;
        if (options.format.indexOf(',') >= 0 && v_num_parts[0].length > 3)
        {
            // If we need to include the thousands separator, then we can break the int part into chunks of three characters each (the first chunk does not need
            // to be 3 characters), then join them together separated by the thousands separator.
            var v_int_thousands_array = [],
            j = v_num_parts[0].length,
            m = Math.floor(j / 3),
            n = v_num_parts[0].length % 3 || 3; // If n is zero, an infinite loop will occur, so we have to make sure it is not zero.

            for (i = 0; i < j; i += n)
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
                // If there are more decimal digits then what we are displaying, then we need to make sure the decimal part gets rounded.
                if (v_num_parts[1].length > v_format_parts[1].length)
                    v_num_parts[1] = Number('0.' + v_num_parts[1]).roundRight(v_format_parts[1].length).toString().split('.')[1];

                // Get character arrays of the decimal format string and decimal part of the numerical value.
                var v_format_array = v_format_parts[1].split(''), v_dec_part_array = v_num_parts[1].split('');

                // Compile the final formatted decimal part. If there are any # symbols left, we can simply remove them.
                for (i = 0; i < v_dec_part_array.length; i++)
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
                    v_num_parts[1] += Number.globalization.padChar;
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
        return options.format.replace(new RegExp('[0|#|,|\.]+'), v_retval);
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
                v_string = Number.globalization.padChar + v_string;
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
                v_string = v_string + Number.globalization.padChar;
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
            return numberOfDecimals > 0 ? Number.globalization.padChar + '.' + replicate(Number.globalization.padChar, numberOfDecimals) : Number.globalization.padChar;

        if (v_parts.length == 1)
            return v_parts[0] + (numberOfDecimals > 0 ? '.' + replicate(Number.globalization.padChar, numberOfDecimals) : '');

        return v_parts[0] + (numberOfDecimals > 0 ? '.' + parseInt(v_parts[1]).padRight(numberOfDecimals) : '');
    }

    // Gets the ordinal of the integer part of the number.
    Number.prototype.getOrdinal = function()
    {
        if (this > 100)
            return (this % 100).getOrdinal();

        if (this >= 11 && this <= 19)
            return Number.globalization.ordinals.th;

        switch (this % 10)
        {
            case 1: return Number.globalization.ordinals.st;
            case 2: return Number.globalization.ordinals.nd;
            case 3: return Number.globalization.ordinals.rd;
        }
        return Number.globalization.ordinals.th;
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
        options = $.extend({}, Number.globalization.defaultCurrencyFormat, options);

        var v_retval = Math.abs(this).format(options);

        if (this < 0)
            return options.noParens
                ? '-' + options.symbol + v_retval
                : '(' + options.symbol + v_retval + ')';

        return v_retval;
    }

    Number.globalization = {
        defaultFormat: { format: null, decimalChar: '.', thousandsChar: ',' },
        defaultCurrencyFormat: { symbol: '$', noParens: false, format: '#,##0.00', decimalChar: '.', thousandsChar: ',' },
        padChar: '0',
        ordinals: { th: 'th', st: 'st', nd: 'nd', rd: 'rd' }
    };

})(jQuery);