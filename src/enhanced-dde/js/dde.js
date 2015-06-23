/*global $j,_,set_comp*/
/*
 * It seems that the code that processes the search form (on the server side) can only accept two
 * filters (form rows) at a time. This limitation can be bypassed by manually sending a POST request to
 * home.html one or two filters at a time until all filters have been processed. At that point,
 * refresh the page to show the new record selection.
 */

(function() {
    'use strict';

    var extras = 3;
    // Select the div tag that is the parent of the last headerSelect box in the DOM.
    var template = $j('select[name="fieldnum_2"]').parent().parent();

    /**
     * Declare this function outside of the for loop so it isn't created on each iteration of the loop.
     * @param elem - "this"
     */
    function callSetComp() {
        set_comp(this, $j(this).parent().next('span').find('select').get(0));
    }

    if (template !== undefined) {
        var i;
        for (i = extras; i > 0; i = i - 1) {
            var clone = $j(template).clone().removeAttr('id');
            $j('select[name="fieldnum_2"]', clone).attr('name', 'fieldnum_' + (i + 2))
                .removeAttr('onchange')
                .change(callSetComp);
            $j('select[name="comparator2"]', clone).attr('name', 'comparator' + (i + 2));
            $j(template).after(clone);
        }
    }


    $j('form').on('submit', function(event) {
        event.preventDefault();
        submitForm();
    });

    $j('input[type=submit]').on('click', function(event) {
        // Create a clicked attribute so the submitForm function below can tell which button was
        // pressed to submit the form.
        $j(this).attr('clicked', 'true');
    });

    /**
     * Create an array of objects that contains form data within the specified row of the form.
     * Note that this does NOT include the filenum and ac fields.txt.
     *
     * @param {Array} rowIndex - Array of Numbers. Denotes which rows of the form should have data extracted.
     * @returns {Array} - return an Array of Objects that follows this format:
     * [
     * { name: "first", value: "Rick" },
     * { name: "last", value: "Astley" },
     * { name: "job", value: "Rock Star" }
     * ]
     * See http://api.jquery.com/jQuery.param/ for more details.
     */
    function getFormRowData(rowIndex) {
        var arr = [];
        var formRows = $j('fieldset div').has('input[type=text]');

        _.each(rowIndex, function(elem) {
            var currentRow = formRows.eq(elem);
            var firstSelect = currentRow.find('select').eq(0);
            var secondSelect = currentRow.find('select').eq(1);
            var textInput = currentRow.find('input');
            if (elem === 0) {
                arr.push({ name: 'fieldnum_1', value: firstSelect.val() });
                arr.push({ name: 'comparator1', value: secondSelect.val() });
            } else {
                arr.push({ name: 'fieldnum_2', value: firstSelect.val() });
                arr.push({ name: 'comparator2', value: secondSelect.val() });
            }
            arr.push({ name: 'value', value: textInput.val() });
        });

        return arr;
    }


    function submitForm() {
        var values = [];
        var inputFields = $j('[name=value]');

        // Put all input values into an array.
        _.each(inputFields, function(input, index) {
            values[index] = input.value;
        });

        // If two form rows are applied at once, the current element and element right after that are processed at once.
        // When the "next" element becomes the "current" element, the skip variable will have been set true,
        // so skip it because it's already been processed.
        var skip = false;
        var deferred = [];

        _.each(values, function(value, index) {

            // Form row's input value is not empty, so apply it to current result set
            // If the current form row was already processed, skip it. See also previous comment.
            if (value && !skip) {
                if (skip) {
                    skip = false;
                }
                var searchDataArr = [];
                searchDataArr.push({ name: 'filenum', value: $j('[name=filenum]').val() });
                searchDataArr.push({ name: 'ac', value: 'usm' });

                // when searching all records in the table, use "search" for field name.
                // else, use "searchselection"
                if ($j('[clicked=true').val().indexOf('all') !== -1) {
                    searchDataArr.push({ name: 'search', value: $j('[clicked=true]').val() });
                } else {
                    searchDataArr.push({ name: 'searchselection', value: $j('[clicked=true]').val() });
                }


                var formRowData;
                // current element is not the last element of array
                if (values[index + 1]) {
                    formRowData = getFormRowData([index, index + 1]);
                    skip = true;
                } else {
                    formRowData = getFormRowData([index]);
                }
                _.each(formRowData, function(elem) {
                    searchDataArr.push(elem);
                });

                // If submitting with a single form row's fields, add blank data for fieldnum_2, etc. fields.
                // (see original form's fields).
                var searchDataArrNames = _.map(searchDataArr, function(elem) {
                    return elem.name;
                });

                if (searchDataArrNames.indexOf('fieldnum_2') === -1) {
                    searchDataArr.push({name: 'fieldnum_2', value: '0'});
                    searchDataArr.push({name: 'comparator2', value: '='});
                    searchDataArr.push({name: 'value', value: ''});
                }

                var encodedSearchData = $j.param(searchDataArr);
                // Create ajax call objects (Deferred objects in jQuery speak), but don't call them yet.
                var ajaxCall = $j.post('home.html', encodedSearchData);
                deferred.push(ajaxCall);
            }
        });

        // Call ajax (deferred) objects in deferred Array. Once all ajax calls are made, call function
        // passed to .then().
        $j.when.apply($j, deferred).then(function() {
            window.location = '';
        });
    }
}());