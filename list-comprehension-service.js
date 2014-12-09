(function (angular, _) {
	'use strict';

	angular.module('battlesnake.dsl')
		.factory('listComprehensionSyntax', listComprehensionSyntax)
		.factory('listComprehensionService', listComprehensionService)
		;

	/**
	 * @ngdoc constant
	 * @name listComprehensionSyntax
	 *
	 * @description
	 * Template syntax for list comprehension expressions.
	 */
	function listComprehensionSyntax() {
		return '[{select} as] {label} [group by {group}] for [({key}, {value})|{value}] in {source} [track by {memo}]|{source}';
	}

	/**
	 * @ngdoc service
	 * @name listComprehensionService
	 *
	 * @param {string} expr
	 * A list comprehension expression
	 *
	 * @param {scope} scope
	 * The scope to evaluate the expression in
	 *
	 * @param {function} onchange
	 * function (items, grouped) called when the data changes
	 *
	 * @returns {object}
	 *
	 *   * refresh: function, call to refresh the items array.  Returns a
	 *     promise which is resolved when the items array has been
	 *     refreshed, and oninvalidate has been called.
	 *
	 *   * requery: if the last refresh/requery received a function<promise> from
	 *     the underlying data source, call refresh to re-execute that function
	 *     (presumably returning a new promise).  Otherwise, just return the
	 *     previous result.
	 *
	 * @description
	 * This service takes a {@link listComprehensionSyntax|List Comprehension Expression}
	 * as a parameter and returns a methods for interrogating the data source.
	 * Data is automatically mapped as specified by the list comprehension
	 * expression.  The data source can be a promise.
	 *
	 * @example
	 *
	 *     <my:directive my:source="item.title for item in model.items"/>
	 *
	 *     var binding = listComprehensionService(attrs.mySource, scope, updateItems);
	 *     binding.refresh();
	 *
	 *     function updateItems(items) {
	 *         ...
	 *     }
	 */
	function listComprehensionService($parse, $q, comprehensionService, listComprehensionSyntax) {
		var compParser = comprehensionService(listComprehensionSyntax);

		/* Expose extra functions if Chai is detected */
		if (window.expect || Object.prototype.should) {
			comprehend.test = {
				compile: function () {
					/* Compile from scratch each time for benchmarking */
					return comprehensionService(listComprehensionSyntax);
				},
				parse: function (expr) {
					return compParser(expr);
				},
				fillDefaults: testFillDefaults
			};
		}

		/* See {@link listComprehensionService|list comprehension service} */
		return comprehend;
		
		function comprehend(expr, scope, onchange) {
			var comp = compParser(expr);

			if (!comp) {
				throw new Error('Comprehension is invalid: ' + expr);
			}

			fillDefaults(comp);

			/* Function(scope) which gets the item list */
			var sourceGetter = $parse(comp.source);

			/*
			 * Parse mapping expressions and store accessors as
			 * Function(scope, key, value)
			 */
			var params = {
				group: getter(comp.group),
				label: getter(comp.label),
				select: getter(comp.select),
				memo: getter(comp.memo),
			};

			var isDynamic = null;
			var lastResult = undefined;

			return {
				refresh: refresh,
				requery: requery,
				isDynamic: function () { return !!isDynamic; }
			};

			/* Watch the data source for changes */
			function watchSource() {
				scope.$watch(comp.source, refresh, true);
			}

			/* Re-load item list then call oninvalidate */
			function refresh(vars) {
				return getItems(scope, vars)
					.then(cacheResult)
					.then(callOnChange);

				function cacheResult(items) {
					if (!lastResult && isDynamic === false) {
						watchSource();
					}
					lastResult = items;
					return items;
				}

				function callOnChange(items) {
					onchange(items, comp.group);
					return items;
				}
			}

			/*
			 * If a past query returned a promise then call refresh(), else just
			 * return the items array
			 */
			function requery(/*args*/) {
				if (isDynamic !== false) {
					return refresh.apply(null, arguments);
				} else {
					return $q.when(lastResult);
				}
			}

			/**
			 * @function getItems
			 * @private
			 *
			 * @param {scope} scope
			 * The scope to evaluate the expression in
			 *
			 * @returns {promise}
			 * Array of items from the data source, mapped as specified by the
			 * comprehension expression.
			 */
			function getItems(scope, vars) {
				var data = sourceGetter(scope, vars);

				if (isDynamic === null) {
					isDynamic = !!(data && _(data.then).isFunction());
				}

				return $q.when(data)
					.then(transformData);
					
				function transformData(model) {
					var index = 0;

					return _(model)
						.map(transformDatum);

					function transformDatum(value, key) {
						return {
							index: index++,
							select: params.select(scope, key, value),
							label: params.label(scope, key, value),
							memo: params.memo(scope, key, value),
							group: params.group(scope, key, value),
							key: key,
							value: value
						};
					}
				}
			}

			/**
			 * @function getter
			 * @private
			 *
			 * @param {string} expr
			 * The expression to evaluate
			 *
			 * @returns {function}
			 * A function(scope, key, value) which evaluates the given
			 * expression.
			 */
			function getter(expr) {
				var parsed = $parse(expr);
				/**
				 * @function get
				 * @private
				 *
				 * @param {scope} scope
				 * The scope to evaluate the expression in
				 *
				 * @param {string} key
				 * The key or array-index of the current item
				 *
				 * @param {any} value
				 * The value of the current item
				 *
				 * @returns {any}
				 * Result of expression evaluation
				 *
				 * @description
				 * Evaluates the expression with the given context
				 */
				return function get(scope, key, value) {
					var locals = {};
					locals[comp.value] = value;
					if (comp.key !== undefined) {
						locals[comp.key] = key;
					}
					return parsed(scope, locals);
				};
			}

		}

		/**
		 * @function fillDefaults
		 * @private
		 *
		 * @param {object} comp
		 * The parsed comprehension expression
		 *
		 * @description
		 * Fill defaults in parsed comprehension
		 */
		function fillDefaults(comp) {
			/* No {source} (should result in comp===undefined but check anyway) */
			if (!comp.source) {
				throw new Error('Source not specified invalid');
			}
			/* Only "{source}" */
			if (comp.value === undefined) {
				comp.value = 'item';
				comp.label = 'item.title';
				comp.select = 'item.value';
			}
			/* No "{select} as" */
			if (comp.select === undefined) {
				comp.select = comp.label;
			}
			/* No "track by {memo}" */
			if (comp.memo === undefined) {
				comp.memo = comp.select;
			}
		}

		/**
		 * @function testFillDefaults
		 * @private
		 * @param {string} expr
		 * The expression to fill and return
		 *
		 * @returns {string}
		 * Expression with defaults filled in
		 *
		 * @description
		 * Parses an expression, fills in defaults, rebuilds expression to a
		 * string and returns it.
		 *
		 * If:
		 *   filled = testFillDefaults(expr)
		 * Then:
		 *   filled === testFillDefaults(filled)
		 */
		function testFillDefaults(expr) {
			var comp = compParser(expr);
			fillDefaults(comp);
			return _([
				comp.select,
				'as',
				comp.label,
				comp.group !== undefined ? ['group by', comp.group] : [],
				'for',
				comp.key !== undefined ?
					'(' + comp.key + ', ' + comp.value + ')' :
					comp.value,
				'in',
				comp.source,
				'track by',
				comp.memo
			]).flatten().join(' ');
		}

	}

})(window.angular, window._);
