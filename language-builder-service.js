(function (angular, _) {
	'use strict';

	angular.module('battlesnake.dsl')
		.factory('languageBuilderService', languageBuilderService);

	function languageBuilderService() {
		return languageBuilder;
	}

	/**
	 * @ngdoc service
	 * @name languageBuilderService
	 *
	 * @param {language_spec} spec
	 * The language specification (using string references)
	 *
	 * @returns {language}
	 * A language spec (using direct references) that can be used with the
	 * {@link simpleParseService}
	 *
	 * @description
	 * Builds a language definition for the {@link simpleParseService}.
	 * Resolves cross-references (specified in string format), and allows
	 * phrases (token groups) to be defined externally to the token subgroups
	 * property, allowing re-use of phrases in multiple subgroups.  This makes
	 * the language definition syntax cleaner and more maintainable than the raw
	 * syntax which the simple parser requires.
	 *
	 * @example
	 * // Used by {@link comprehensionParser}, see {@link comprehensionSyntax}
	 * {
	 *   $root: 'expression',
	 *   expression: ['capture', 'options', 'choice'],
	 *   capture: { start: '{', end: '}' },
	 *   options: { start: '[', end: ']', subgroups: ['expression'] },
	 *   choice: { start: '|', end: '|' }
	 * }
	 */
	function languageBuilder(spec) {

		/* Create token objects */
		var tokens = _(spec).chain()
			.omit(isPhrase)
			.map(function (value, key) {
				return  {
					name: key,
					start: value.start,
					end: value.end,
					subgroups: value.subgroups
				};
			})
			.value();

		/* Extract phrases and resolve referenced tokens */
		var phrases = _(spec).chain()
			.omit('$root')
			.pick(isPhrase)
			.map(resolveTokens)
			.value();

		/* Resolve subgroups of tokens */
		tokens.forEach(function (token) {
			token.subgroups = resolveSubgroups(token.subgroups);
		});

		/* Resolve root phrase */
		var rootPhrase = _(phrases).findWhere({ name: spec.$root });
		if (rootPhrase === undefined) {
			throw new Error('Language root phrase not specified');	
		}

		return rootPhrase.tokens;

		/* Resolve subgroup to array of tokens */
		function resolveSubgroups(subgroups) {
			if (subgroups === undefined || subgroups === null) {
				return [];
			}
			if (typeof subgroups === 'string') {
				subgroups = subgroups.split(',');
			}
			if (subgroups instanceof Array) {
				return _(subgroups).chain()
					.map(function (name) {
						var token = _(tokens).findWhere({ name: name });
						if (token !== undefined) {
							return token;
						}
						var phrase = _(phrases).findWhere({ name: name });
						if (phrase !== undefined) {
							return phrase.tokens;
						}
						throw new Error('Could not resolve subgroup "' + name +
							'"');
					})
					.flatten()
					.value();
			} else {
				throw new Error('Invalid subgroup definition');
			}
		}

		/* Is value a phrase? */
		function isPhrase(value) {
			return value instanceof Array || typeof value === 'string';
		}

		/* Resolve token reference */
		function resolveToken(name) {
			var token = _(tokens).findWhere({ name: name });
			if (token === undefined) {
				throw new Error('Unrecognised token name: "' + name + '"');
			}
			return token;
		}

		/* Convert references to arrays of references, resolve token references */
		function resolveTokens(values, key) {
			values = values instanceof Array ? values :
				typeof values === 'string' ? values.split(',') :
				[];
			return {
				name: key,
				tokens:	_(values).map(resolveToken)
			};
		}
	}


})(window.angular, window._);
