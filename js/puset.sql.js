(function (PuSet) {

	var array = [], sql = function (a, b, c, d, e) {
		if (!openDatabase) {
			PuSet.error("当前浏览器不支持本地数据库");
			return;
		}
		if (arguments.length == 0) {
			this.db = openDatabase("Roc", "1.0", "Roc默认数据库", 1024);
		} else {
			this.db = openDatabase(a, b, c, d, e);
		}
		return this;
	};

	sql.getString = function (name) {
		return ('ROC_x_LENGTH'.replace(/x/, name)).toUpperCase();
	};

	sql.prototype = {

		db: null,

		/**
		 * 创建表单
		 * @param {String} name 表单名字
		 * @param {Object} options 表单数据
		 * @param {Function} fn1 成功回调
		 * @param {Function} fn2 失败回调
		 * @returns 
		 */
		createTable: function (name, options, fn1, fn2) {

			var i, obj = {}, out = [];

			obj[sql.getString(name)] = "TEXT";

			PuSet.extend(obj, options);

			for (i in obj) {
				out.push(i + " " + obj[i]);
			}

			var code = ["create table if not exists ", name, " (", out.join(", "), ")"].join("");
			// alert(code);
			this.db.transaction(function (tx) {
				tx.executeSql(code, array, fn1, fn2);
			});
			return this;
		},

		add: function (name, options, f1, f2) {
			this.query(name, function (tx, result) {

				options[sql.getString(name)] = "" + result.rows.length;

				var KEYS = [],
					VALUES = [],
					ARR = [],
					i;

				for (i in options) {
					KEYS.push(i);
					VALUES.push("?");
					ARR.push(options[i])
				}
				var code = ["insert into ", name, " (", KEYS.join(", "), ") values(", VALUES.join(", "), ")"].join("");
				// alert(code);

				tx.executeSql(code, ARR, f1, f2);
			});
			return this
		},

		query: function (name, f1, f2) {
			var code = "select * from " + name;
			// alert(code);
			this.db.transaction(function (tx) {
				tx.executeSql(code, array, f1, f2)
			});
			return this;
		},

		delete: function (name, options, f1, f2) {
			var i;
			for (i in options) {
				break;
			}
			var code = "delete from " + name + " where " + i + " = ?";
			// alert(code);
			this.db.transaction(function (tx) {
				tx.executeSql(code, [options[i]], f1, f2)
			});
			return this
		},

		/*
		  dropTable {
			name: 表单名字
		  }
		*/

		dropTable: function (name) {
			var code = "drop table " + name;
			// alert(code);
			this.db.transaction(function (tx) {
				tx.executeSql(code)
			});
			return this
		},

		/* outerHTML()
		 * {
			 name: 数据表单名称
			 elem: 表单输出到页面的元素，替换原来元素中内容
			 type: 是否显示列表id，默认不显示
		   }
		
		*/

		outerHTML: function (name, elem, types) {

			var bool = !!types,

				string = sql.getString(name);

			if (PuSet.isArray(types)) {
				var obj = {};
				PuSet.each(types, function () {
					obj[this] = "auto";
				});

				types = obj;
			}

			this.query(name, function (a, b) {

				var table = ['<table class="RocSqlTable">'],
					rows = b.rows,
					i;

				if (PuSet.isEmptyObject(types)) {
					types = rows.item(0);
				}

				//   Roc.alert(types);
				for (i = 0; i < rows.length; i++) {
					table.push('<tr>');

					var td = [];

					if (table.length == 2) {
						PuSet.each(types,
							function (i) {
								if (bool || (!bool && i !== string)) {
									td.push('<td>' + i + '</td>');
								}
							});
						td.push('</tr><tr>')
					}

					PuSet.each(types, function (a) {

						var b = rows.item(i)[a];

						if (bool || (!bool && a !== string)) {
							td.push('<td>' + (b == null ? "" : b) + '</td>');
						}
					});

					table.push(td.join(""));
					table.push('</tr>')
				}

				table.push('</table>');
				// alert(table);
				elem.innerHTML = table.join("\n");
			});

			return this;
		},

		select: function (name, fn) {

			var self = this;
			this.query(name, function (a, b) {
				var rows = b.rows,
					i, length = rows.length;
				for (i = 0; i < length; i++) {
					fn.call(self, rows, i, rows.item(i));
				}
			});

			return self;
		},

		addTable: function (name, obj) {
			if (obj.length) {

				var i,

					length = obj.length,

					self = this;

				var input = {};

				for (i in obj[0]) {
					input[i] = "TEXT"
				}

				this.createTable(name, input,
					function () {
						for (i = 0; i < length; i++) {
							self.add(name, obj[i], null,
								function (v, error) {
									//  alert("添加")
									PuSet.alert(error);
								});
						}
					},
					function (a, b) {
						//  alert("创建");
						PuSet.alert(b);
					});
			}
			return this;
		},

		sort: function (name, fn) {
			var array = [];
			return this.select(name, function (rows, i, item) {
				array.push(item);

				if (i + 1 == rows.length) {
					array.sort(fn);

					this.dropTable(name);

					this.addTable(name, array);
				}
			});
		},

		change: function (name, obj, f1, f2) {

			var roc = sql.getString(name),
				type = "",
				code = "update " + name + " set ";

			var arr = [];

			for (i in obj) {
				if (i !== roc) {
					arr.push(obj[i]);
					code += (i + " = ? where " + roc + " = ?");
					break;
				}
			}
			arr.push(obj[roc]);

			// alert(code);
			this.db.transaction(function (tx) {
				tx.executeSql(code, arr, f1, f2);
			});

			return this;
		}

	};

	PuSet.extend({

		dataBase: sql,

		sql: function (name, vision, description, size, callback) {
			return new sql(name, vision, description, size, callback);
		}
	});

}(PuSet));