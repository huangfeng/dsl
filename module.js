(function (angular) {
	'use strict';

	/**
	 * @ngdoc module
	 * @module battlesnake.dsl
	 * @requires battlesnake.transformations
	 * @requires {@link http://underscorejs.org|Underscore}
	 *
	 * @description
	 * Domain-specific languages (DSLs).  Hints DSL and parser, used by the
	 * {@link battlesnake.fields|fields} module for giving implementation and
	 * constraint hints, and also used by the
	 * {@link battlesnake.transformations|transformations} module to parse lists
	 * of formatter / parser names and parameters.
	 *
	 * This module also contains utilities for building domain-specific
	 * languages and associated parsers:
	 *
	 *  * {@link simpleParseService}: converts a stream of one-char tokens
	 *     to a parse tree, and the
	 *
	 *  * {@link comprehensionService}: parses expressions written using the
	 *    {@link comprehensionLanguage}, then compiles them to a regular
	 *    expression which can be used to quickly parse conforming
	 *    comprehensions.
	 *
	 *  * {@link listComprehensionService}: uses the {@link comprehensionService}
	 *    to generate a parser for list comprehensions, which is used by the
	 *    {@link choice|choice directive} to create transformations and bindings.
	 */
	angular.module('battlesnake.dsl', ['battlesnake.transformations']);

})(window.angular);
