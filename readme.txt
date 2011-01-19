/*
* jQuery UI Numeric Up/Down v1.1
*
* Copyright 2011, Tony Kramer
* Dual licensed under the MIT or GPL Version 2 licenses.
* https://github.com/flamewave/jquery-ui-numeric/raw/master/GPL-LICENSE.txt
* https://github.com/flamewave/jquery-ui-numeric/raw/master/MIT-LICENSE.txt
*
* https://github.com/flamewave/jquery-ui-numeric
*/

This widget allows you to turn any text input box (input[type=text]) into a numeric "up/down" picker. Users can use
keyboard arrow keys or page up/down keys to adjust the number, or they can click the up/down buttons that are added
to the right of the input.

You are also able to format the way the number is displayed in the input so that a specific numeric format is enforced.
This is done through the use of the $.numberFormat() function included with this widget.

****************
* Dependencies *
****************
jQuery (1.4.2)
jQuery-ui (1.8.6 - core, widget, button)

*******
* Use *
*******
$('#myInput').numeric([options]);

*****************
* Documentation *
*****************

---------------------------------------------
Available Options (and their default values):
---------------------------------------------

disabled: false
    Indicates if the widget is disabled.

keyboard: true
    Indicates if keyboard keys should be allowed to increment/decrement the input value.

showCurrency: false
    A value indicating if the currency symbol should be displayed to the left of the input.

currencySymbol: '$'
    The currency symbol to use.

title: 'Type a new value or use the buttons or keyboard arrow keys to change the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.'
    The tool tip text of the input.

buttons: true
    Indicates if the up/down buttons should be displayed to the right of the input.

upButtonIcon: 'ui-icon-triangle-1-n'
    Icon of the up button.

upButtonTitle: 'Increment the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.'
    Tooltip text of the up button.

downButtonIcon: 'ui-icon-triangle-1-s'
    Icon of the down button.

downButtonTitle: 'Decrement the value. Hold Ctrl or Shift for a smaller or larger increment, respectively.'
    Tooltip text of the down button.

emptyValue: 0
    If the value equals the value specified by this option, then the input is made "empty" so that no value is visible. To
    disable this functionality, set this option to false.

minValue: false
    The minimum value allowed. To disable, set this option to false.

maxValue: false
    The maximum value allowed. To disable, set this option to false.

smallIncrement: 1
    The small increment that is used if the "ctrl" key is pressed.

increment: 5
    The default increment that is used if no key modifiers are pressed.

largeIncrement: 10
    The large increment that is used if the "shift" key is pressed, or when "page up" or "page down" are pressed.

format: { format: '0', decimalChar: '.', thousandsChar: ',' }
    The format information to use to format the number in the input. The "format" property is the format string to use (see
    below for details). The "decimalChar" property is the decimal character to use if the format string specifies to include
    decimal places. The "thousandsChar" is the thousands separator character to use, if the format string specifies to use a
    thousands separator.
    
    If the value of this setting is a string, then it is the same as { format: "value", decimalChar: '.', thousandsChar: ',' },
    where "value" is the value of the string.

    See the $.formatNumber() documentation below for more details.

------
Events
------
The standard HTML input events are available.

-------
Methods
-------
numeric('destroy')
    Removes the numeric functionality completely. This will return the input back to its pre-init state.

numeric('disable')
    Disable the numeric input and buttons.

numeric('enable')
    Enable the numeric input and buttons.

numeric('option', optionName, [value])
    Get or set any numeric option. If no value is specified, will act as a getter.

numeric('option', options)
    Set multiple numeric options at once by providing an options object.

numeric('widget')
    Returns the input.

numeric('value', [newValue])
    Gets or sets the numeric value as a JavaScript Number object.

numeric('select')
    Selects the input value.

---------------
Utility Methods
---------------
$.formatNumber(number, options)
    Formats a number according to a specified format string.

    Available options:
    - format        : The format string to format the number with. The number will be rounded to the number of digits specified.
                      0 = A significant digit (always included).
                      # = Digit will be used if applicable.
                      . = Characters to the right of this will be interpreted as decimal places.
                      , = Must occur to the left of the decimal (if there is one). If included, indicates the thousands separator
                          will be included every 3 digits on the left of the decimal.
    - decimalChar   : The decimal character to use when formatting the number. Defaults to '.'.
    - thousandsChar : The thousands separator character to use when formatting the number. Defaults to ','.

    Examples:
    Given the number "1000.0562":
    --------------------
    format  | result
    --------------------
          0 | 1000
        0.0 | 1000.1
    #,000.0 | 1,000.1
       0.## | 1000.06
    #,0.00# | 1,000.056
    0.00### | 1000.0562
    0.00000 | 1000.05620

Number.roundRight(numberOfDecimals)
    This method is an extension of the JavaScript Number object.
    Rounds the decimal part of the number to the specified number of decimals.

Number.pad(numberOfDigits)
    This method is an extension of the JavaScript Number object.
    Pads to the left of the number with zeros until it is the specified number of digits. If the string length of the number
    is longer than the number of digits specified, then the string value of the number is returned.

Number.padRight(numberOfDigits)
    This method is an extension of the JavaScript Number object.
    Pads to the right of the number with zeros until it is the specified number of digits. If the string length of the number
    is longer than the number of digits specified, then the string value of the number is returned.

Number.padDecimals(numberOfDecimals)
    This method is an extension of the JavaScript Number object.
    Pads to the right of the decimal part of the number with zeros until the decimal part of the number is the specified number
    of digits. If the string length of the decimal digits is longer than the number of digits specified, then the string value
    of the number is returned.

Number.getOrdinal()
    This method is an extension of the JavaScript Number object.
    Gets the ordinal of the integer part of the number.

Number.format(options)
    This method is an extension of the JavaScript Number object.
    Calls $.formatNumber() using the number as the first parameter. See $.formatNumber() above for details.

Number.formatCurrency(options)
    This method is an extension of the JavaScript Number object.
    Available options:
    - symbol        : The currency symbol to use. Defaults to '$'.
    - noParens      : If true and the number is negative, the negative sign will be used, otherwise negative values are returned
                      wrapped in parentheses with no negative sign. Defaults to false.
    - format        : The format string to format the number with. See $.formatNumber() above for details.
    - decimalChar   : The decimal character to use when formatting the number. Defaults to '.'.
    - thousandsChar : The thousands separator character to use when formatting the number. Defaults to ','.