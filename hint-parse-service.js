(function (angular, _) {
	'use strict';

	angular.module('battlesnake.dsl')
		.factory('hintParseService', hintParseService);

	function hintParseService(camelCaseFormatter) {
		return {
			process: processHints,
			parse: parseHints,
			stringify: stringifyHints
		};

		function processHints(attrs, defaults) {
			var hints = parseHints(attrs.hints, defaults);
			attrs.hints = stringifyHints(hints);
			return hints;
		}

		/* Parse comma-separated hints to object/array and fill defaults */
		function parseHints(hintstr, defaults, asArray) {
			var hintRx = /(?:^|,)\s*(not\s+)?(\w+)(?:\s*=\s*([^,]*))?/g;
			var res = asArray ? [].slice.apply(defaults || []) : _({}).defaults(defaults);
			var matches;
			while ((matches = hintRx.exec(hintstr)) !== null) {
				var not = matches[1] !== undefined;
				var key = camelCaseFormatter(matches[2]);
				var val = matches[3];
				if (not) {
					if (val !== undefined) {
						throw new Error('Invalid hint: ' + matches[0]);
					} else {
						val = false;
					}
				} else if (val === undefined) {
					val = true;
				} else if (String(Number(val)) === val) {
					val = Number(val);
				} else if (String(Boolean(val)) === val) {
					val = Boolean(val);
				}
				if (asArray) {
					res.push({ key: key, val: val });
				} else {
					res[key] = val;
				}
			}
			return res;
		}

		function stringifyHints(hints) {
			return _(hints).chain()
				.pairs()
				.map(function (kv) {
					if (hints instanceof Array) {
						return kv[1];
					} else {
						return { key: kv[0], val: kv[1] };
					}
				})
				.filter(function (kv) {
					return kv.key.length > 0;
				})
				.map(function (kv) {
					return kv.val === true ? kv.key : kv.val === false ? ('not ' + kv.key) : (kv.key + '=' + kv.val);
				})
				.value()
				.join(',');
		}
	}

})(window.angular, window._);
