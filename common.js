(function () {
	/**
	 * @description ownAlert 重构
	 * @param {String} str 提示内容，若只有str则1500ms后消失
	 * @param {String} obj1 按钮文案，当为string时，只有一个按钮
	 * @param {Function} obj2 回调函数，obj2位回调函数，
	 * @param {Array} obj1 多个按钮对象
	 * @param {String} obj1.text 多个按钮的文案
	 * @param {Function} obj1.cb 按钮对应的回调函数
	 */
	var layerMsg = function (str, obj1, obj2) {
		if (!str || typeof str !== 'string') return;
		// 加载弹框
		var htmlStr =
			'<div class="own_alert_div">' +
			'<div class="own_alert_cover"></div>' +
			'<div class="own_alert_con">' +
			'<div class="own_alert_title">提示</div>' +
			'<p>' +
			str +
			'</p>' +
			'<div class="own_alert_btn">' +
			'</div>' +
			'</div>' +
			'</div>';
		$('body').append(htmlStr);
		var btnStr = '<input type="button" class="own_alert_btn_sure" />';
		var $msg = $('.own_alert_div');
		var cbList = [];
		if (typeof obj1 === 'string') {
			cbList.push({
				text: obj1,
				cb: obj2
			});
		} else if (typeof obj1 === 'object' && obj1 instanceof Array) {
			cbList = obj1;
		} else {
			setTimeout(function () {
				$msg.remove();
			}, 1500);
			return;
		}
		for (var i = 0; i < cbList.length; i++) {
			var cur = cbList[i];
			if (cur.text) {
				var $ele = $(btnStr).val(cur.text);
				$msg.find('.own_alert_btn').append($ele);
			}
		}
		$msg.find('.own_alert_btn').click(function (e) {
			var $btn = $(e.target);
			var index = 0;
			var fn;
			if ($btn.attr('type') === 'button') {
				index = $btn.index();
				$msg.remove();
				fn = cbList[index].cb;
				if (fn && typeof fn === 'function') {
					fn.call($btn);
				}
			}
		});
	};

	// 开发错误提示，使用window.console，即便使用typeof console在IE下也会报错
	var error = (window.console && window.console.error) || alert;

	/**
	 * 异步请求returnCode 处理 upload fetch使用
	 * @param {Number} code returnCode码
	 * @param {Promise} sync jqueryPromise
	 * @param {Object} option promise参数
	 * @param {Function} fn 成功的回调函数
	 * @return {Promise}
	 */
	function resolveSyncCode(code, sync, option, fn) {
		var _res = option.res,
			msg = option.msg,
			obj = option.obj;
		if (code === -1 || code === -9 || code === -10 || code === -11) {
			layerMsg(_res.returnMsg, '确定');
			sync.reject(_res, msg, obj);
		} else if (code === -2) {
			layerMsg(_res.returnMsg, '确定', function () {
				// window.location.href = conf.urlLogin;
				window.location.href = conf.urlPrefix + '/error.html?code=4';

			});
			sync.reject(_res, msg, obj);
		} else if (code === 1) {
			// 只有接口调用成功，并且返回的returnCode为1的情况下，才执行后续的成功操作
			typeof fn === 'function' && fn.call(null, _res);
			sync.resolve(_res, msg, obj);
		} else {
			layerMsg(_res.returnMsg, '确定');
			sync.reject(_res, msg, obj);
		}
		return sync;
	}

	/**
	 * 基于jqueryPromise 的ajax异步封装
	 * @param {object} options 同ajax，
	 * 若options为string，则参数会被当成get请求的url
	 * @return {promise} promise 对象
	 */
	function fetch(options) {
		var deferred = new $.Deferred();
		var opts = null;
		if (typeof options === 'string') {
			opts = {
				url: options
			};
		} else {
			opts = options;
		}
		var ajaxType = opts.type ? opts.type.toLowerCase() : 'get';

		if (
			(ajaxType === 'post' || ajaxType === 'put') &&
			typeof opts.data === 'object'
		) {
			opts.data = JSON.stringify(opts.data);
		}
		// success: a:data,b:msg,c:jqueryStateObj
		// fail: a:jqueryStateObj ,b:code, c:msg
		$.ajax(opts)
			.done(function (res, msg, obj) {
				var unknowErrorMsg = '未知错误请稍后再试';
				var _res = {};
				try {
					_res = typeof res === 'object' ? res : JSON.parse(res);
				} catch (err) {
					_res.returnMsg = unknowErrorMsg;
				}
				var code = parseInt(_res.returnCode, 10);
				resolveSyncCode(code, deferred, {
					res: _res,
					msg: msg,
					obj: obj
				});
			})
			.fail(function (obj, code, msg) {
				layerMsg('服务器开小差，请稍后再试', '确定', function () {
					// window.location.href = conf.urlLogin;
				});

				deferred.reject(obj, code, msg);
			});

		return deferred.promise();
	}
	/**
	 * 序列化参数为get查询字符擦混
	 * @param {Object} obj plainObj 参数对象
	 * @return {String} str 序列化的对象
	 */
	function serialize(obj) {
		var str = '';
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				str += '&' + i + '=' + encodeURI(obj[i]);
			}
		}
		return str.substring(str.indexOf('&') + 1);
	}

	/**
	 * 时间补零
	 * @param {Number|String} str 需要处理的字符
	 */
	function fixTimeZero(str) {
		var _str = str.toString();
		return _str.length > 1 ? _str : '0' + _str;
	}

	/**
	 *  获取url上的参数 url+"?name=value&name2=value"
	 *  返回值为 object {name:value,name2:value},值为字符串
	 */
	function paramObj() {
		if (window.location.search.indexOf('?') !== -1) {
			var cs = window.location.search.split('?')[1].split('&');
			var str = '{';
			for (var i = 0; i < cs.length; i++) {
				var obj = cs[i].split('=');
				if (i === cs.length - 1) {
					str = str + '"' + obj[0] + '"' + ':' + '"' + decodeURI(obj[1]) + '"}';
				} else {
					str = str + '"' + obj[0] + '"' + ':' + '"' + decodeURI(obj[1]) + '",';
				}
			}
			var csobj = JSON.parse(str);
			return csobj;
		}
		return '';
	}

	/**
	 * base64 转成图片
	 * @param {String} url url
	 */
	function base64(url) {
		var fileExtendName = url.split('.')[1];
		return 'data:image/' + fileExtendName + ';base64,';
	}
	/**
	 * 字符串替换
	 * @param {String} str
	 * @return {String}
	 * @desc 要替换的字符串
	 */
	function replaceBlank(str) {
		if (str) {
			return str
				.split('\n')
				.join('<br>')
				.replace(/\s/g, '&nbsp;');
		}
	}
	/**
	 * 生成关于路由对照表的跳转，
	 * 路由表依据的为className
	 * var CONF_ROUTER = {
			approve: './approve.html',
			recommend: './recommend.html',
			project: '../project.html'
		};
	 * @param {object} obj 路由对照表
	 * @return {function} fn
	 */
	function initGoNewWindow(obj) {
		/**
		 * window.open 弹出新页面，
		 * 通过className ---> url一一对应
		 * @param {JqueryElement} $ele jquery对象
		 * @param {Object} query url的查询字符串
		 */
		function goNewWindow($ele, query) {
			var url = '';
			for (var i in obj) {
				if ($ele.hasClass(i)) {
					url = obj[i];
				}
			}
			return window.open(url + objToQuery(query), '', $.newWindowFeature);
		}
		return goNewWindow;
	}

	/**
	 * 使用window.open方法打开页面关闭时，重新刷新本页面
	 * @param {Window} win 新开窗口的window对象
	 */
	function reloadOnClose(win) {
		if (!win) return;
		var now = new Date().getTime();
		$(win).on('unload', function () {
			if (new Date().getTime() - now > 500) {
				window.location.reload(true);
			}
		});
	}
	/**
	 * 把对象转换为查询字符串
	 * @param {Object} obj 要转换的对象，对象是扁平的
	 */
	function objToQuery(obj) {
		if (typeof obj !== 'object') return '';
		var str = '?';
		for (var i in obj) {
			str += i + '=' + obj[i] + '&';
		}
		return str.substr(0, str.length - 1);
	}
	/**
	 * 基于artTemplate的异步渲染，在fetch上的封装
	 * @param {Object} obj 选项对象，为ajax选项加上一下模板选项
	 * @param {Sting} obj.tem artTemplate模板选择器的地址，或者直接是字符串
	 * @param {String} obj.pos 要渲染的data层级，例如returnData
	 * @param {String} obj.wrap 模板渲染位置，默认为tem的父元素
	 * @param {Function} obj.prefix 接口数据预处理，对data继续处理，
	 * 传入的参数为异步请求的data，this为渲染wrap的jquery对象，
	 * prefix函数的返回值将被用于模板引擎的渲染，其次就是obj.pos指定的对象
	 * 若两种都不满足，则不渲染，可以在返回的jqueryPromise.done(function (result){...})
	 * 进行渲染，renderFn为缓存在$(obj.wrap).data('render')里
	 * 在prefix 阶段模板还未渲染成功，需要在返回的promise.done() 为完成后；
	 * @return {jqueryPromise} 返回jqueryPromise
	 */
	function asyncRender(obj) {
		if (!obj.tem) return error('tem 模板选择器参数不存在');
		// 依赖artTemplate的template
		var $temEle = $(obj.tem);
		var $wrap = obj.wrap ? $(obj.wrap) : $temEle.parent();
		var renderFn = null;
		if (!$wrap.data('renderFn')) {
			if ($temEle.length > 0) {
				renderFn = template.compile($temEle.html());
				$temEle.remove();
				$wrap.data('renderFn', renderFn);
			} else {
				renderFn = template.compile(obj.tem);
			}
		} else {
			renderFn = $wrap.data('renderFn');
		}
		var realRenderData = null;
		var fetchPromise = fetch(obj)
			.done(function (data) {
				if (typeof obj.prefix === 'function') {
					realRenderData = obj.prefix.call($wrap, data);
				}
			})
			.done(function (data) {
				if (realRenderData) {
					// $wrap.html(
					//   renderFn({
					//     data: realRenderData
					//   })
					// );
					var xhtml = renderFn({
						data: realRenderData
					});
					$wrap[0].innerHTML = xhtml;
				} else if (obj.pos) {
					$wrap.html(
						renderFn({
							data: dataQueue(data, obj.pos)
						})
					);
				}
			});
		return fetchPromise;
	}

	/**
	 * 根据层级关系获取对象中的内容
	 * @param {Object} data 数据对象
	 * @param {String} str 层级关系
	 */
	function dataQueue(data, str) {
		var arr = str.split('.');
		var res = data;
		for (var i = 0, len = arr.length; i < len; i++) {
			if (typeof res === 'object') {
				res = res[arr[i]];
			}
		}
		return res;
	}
	/**
	 * 异步渲染代码表，对应于select元素
	 * @param {String|Object}  $ele jqueryDOM对象或者jquery选择器
	 * @param {String} name 表名多个用逗号隔开
	 * @param {String} val 默认选中值
	 * @param {Boolean} flag flag为true时渲染列表不含有空值
	 */
	function renderCode($ele, name, val, flag) {
		var $el;
		if ($ele instanceof $) {
			$el = $ele;
		} else if (typeof $ele === 'string') {
			$el = $($ele);
		}
		return fetch({
			url: '/common/dmb',
			type: 'get',
			data: {
				dmbm: name
			}
		}).done(function (result) {
			var data = result.returnData;
			if (+data.executeResult === 1) {
				var codeList = data['data'];
				var str = '';
				!flag &&
					codeList.unshift({
						dmid: '',
						dmmc: '请选择',
						xl: []
					});
				for (var i = 0, len = codeList.length; i < len; i++) {
					var current = codeList[i];
					if (current.dmid == val) {
						str +=
							'<option selected="selected" value="' + current.dmid + '"title="' + current.dmmc + '">' +
							current.dmmc +
							'</option>';
					} else {
						str +=
							'<option value="' + current.dmid + '"title="' + current.dmmc + '">' +
							current.dmmc +
							'</option>';
					}
				}
				$el.append(str);
			} else {
				error('异步获取代码表失败');
			}
		});
	}

	/**
	 * 新建Loading实例
	 * @param {Object} obj 配置对象
	 * @param {String} obj.text 提示文字
	 * @return {Object} this.text 提示文字, this.$ele loading元素
	 */
	function Loading(obj) {
		var opt = obj ? obj : {};
		this.text = opt.text || '加载中...';
		var $loading = $('.J_loading_com');
		if ($loading.length === 0) {
			var str =
				'<div class="co_loading J_loading_com">' +
				'<div class="co_wrapper"></div>' +
				'<div class="co_content">' +
				// '<img src="./styles/loading.gif" alt="" class="img">' +
				'<p class="co_text">' +
				this.text +
				'</p>' +
				'</div>' +
				'</div>';
			var ele = $(str);
			var img = new Image();
			img.src = '../styles/loading.gif';
			ele.hide();
			ele.find('.co_content').prepend($(img));
			this.$ele = ele;
			$('body').append(ele);
		} else {
			this.$ele = $loading;
		}
	}
	// loading 开启
	/**
	 * loading and 禁用按钮
	 * @param {DOM|jQueryDOM} ele 传入的DOM对象或者jQueryDOM对象
	 */
	Loading.prototype.on = function (element) {
		var $ele = this.$ele;
		if (element instanceof $) {
			this.btnElement = element;
			element.prop('disabled', true);
		} else if (typeof element === 'object') {
			this.btnElement = element;
			element.disabled = true;
		}
		$ele.find('.text').text(this.text);
		$ele.fadeIn(100);
	};

	// loading 关闭
	/**
	 * loading 关闭
	 * @param {DOM|jQueryDOM} ele 传入的DOM对象或者jQueryDOM对象
	 */
	Loading.prototype.off = function (element) {
		if (element instanceof $) {
			element.prop('disabled', false);
		} else if (typeof element === 'object') {
			element.disabled = false;
		} else if (this.btnElement instanceof $) {
			this.btnElement.prop('disabled', false);
		} else if (typeof this.btnElement === 'object') {
			this.btnElement.disabled = false;
		}
		if (typeof element === 'object') {
			element.disabled = false;
		}
		this.$ele.fadeOut(90);
	};
	/*
	全选方法
	参数说明： allcheck: 全选按钮的class名；
						parentcheck：是table的class名；
						checked：除全选框，其他CheckBox的class名
	*/
	function checking(allcheck, parentcheck, checked) {
		$(document).on('click', allcheck, function () {
			var checks = $(allcheck).prop('checked');
			$(allcheck).parents(parentcheck).find('input[type="checkbox"]').prop('checked', checks);
		});
		$(document).on('click', checked, function () {
			var checkLength = $(checked + ':checked').length;
			if (checkLength == $(checked).length) {
				$(allcheck).prop('checked', true);
			} else {
				$(allcheck).prop('checked', false);
			}
		});
	}
	/*
	  切换下拉框的校验方式 （仅限身份证和姓名的下拉框使用）
	  参数说明： tag: select框的class名    input： select后的input框的class名
	*/
	function exchange_valiflag(tag, input) {
		$(document).on('change', tag, function () {
			if ($(tag).val() == 'xm' || $(tag).val() == '02') {
				$(input).attr('valiflag', '20,chinese,姓名');
			} else if ($(tag).val() == 'sfzhm' || $(tag).val() == '01') {
				$(input).attr('valiflag', '18,sfzhm,身份证号码');
			} else if ($(tag).val() == 'xydm') {
				$(input).attr('valiflag', '32,full,信用代码');
			} else if ($(tag).val() == 'dwmc') {
				$(input).attr('valiflag', '128,full,单位名称');
			}
		});
	}
	/**
	 * 异步代码表渲染
	 * @param {Object|Array} obj 配置对象或者数组
	 * @param {jQueryDom} obj.ele 配置jQueryDom
	 * @param {String} obj.name 代码表名
	 * @param {String} obj.default 默认选中值
	 * @param {Boolean} obj.flag 以何种方式进行添加内容，默认为append方式，ture：HTML方式
	 */
	function asyncCodeTable(obj) {
		var arr = obj instanceof Array ? obj : [obj];
		var names = '';
		$.each(arr, function (index, item) {
			if (names.indexOf(item.name) < 0) {
				names += item.name + ',';
			}
		});
		names = names.substr(0, names.length - 1);
		var arrStr = names.split(',');
		// 获取接口
		$.fetch({
			url: '/dafwgl/dmb/dmb',
			data: {
				dmbm: names
			},
			type: 'get'
		}).done(function (res) {
			var resData = res.returnData;
			var objStr = {};
			$.each(arrStr, function (index, item) {
				objStr[item] = codeToOptions(resData[item]);
			});
			$.each(arr, function (index, item) {
				// 填充方式
				item.ele[item.flag ? 'html' : 'append'](objStr[item.name]);
				// 默认值
				item['default'] && (item.ele.val(item['default']));
			});
		});
	}
	/**
	 * 代码对象返回字符串
	 * @param {Array} arr codeTable数组
	 * @return {String} 返回拼接好的字符串
	 */
	function codeToOptions(arr) {
		var str = '';
		for (var i = 0, j = arr.length; i < j; i++) {
			var cur = arr[i];
			str += '<option value="' + cur.dmid + '" title="' + cur.dmmc + '">' + cur.dmmc + '</option>';
		}
		return str;
	}
	//  封装好的storage可以传任何类型 不限于字符串
	function sessionStorageSetItem(name, param) {
		var param = JSON.stringify(param);
		sessionStorage.setItem(name, param);
	}

	function sessionStorageGetItem(name) {
		var param = sessionStorage.getItem(name);
		if (param != "") {
			param = jQuery.parseJSON(param);
		} else {
			param = null;
		}
		return param;
	}
	// 扩展到$上
	$.extend({
		sessionStorageSetItem: sessionStorageSetItem,
		sessionStorageGetItem: sessionStorageGetItem,
		fetch: fetch,
		paramObj: paramObj,
		serialize: serialize,
		fixTimeZero: fixTimeZero,
		layerMsg: layerMsg,
		base64: base64,
		asyncRender: asyncRender,
		replaceBlank: replaceBlank,
		initGoNewWindow: initGoNewWindow,
		reloadOnClose: reloadOnClose,
		renderCode: renderCode,
		Loading: Loading,
		checking: checking,
		asyncCodeTable: asyncCodeTable,
		exchange_valiflag: exchange_valiflag,
		newWindowFeature: 'menubar=no, location=no, menubar=no, top=0, width=1000, resizable=yes,titlebar=no,toolbar=no,scrollbars=yes,  status=no'
	});

	// 异步上传接口封装
	$.fn.extend({
		/**
		 * @desc  action 上传的接口，默认为：/common/wjsc/wjsc/fileUpload'，也可以通过两种方式配置
		 * 1、input的action属性
		 * 2、通过$.config.upload配置
		 * input 元素 obj.mode > mode属性必填（为上传的服务器的路径，询问后台）
		 * 3、优先级 obj.action > input[action] > $.config.upload > default
		 * @param {Object} obj 包含成功和失败的回调函数
		 * @param {Function} obj.error 失败的回调函数
		 * @param {Function} obj.success 成功的回调函数
		 * @param {String} obj.mode mode参数
		 * @param {String} obj.action 接口地址
		 * @return {}
		 */
		upload: function (obj) {
			var deferred = new $.Deferred();
			var ele = this[0],
				$ele = this;
			// 判断调用元素
			if (ele.nodeName.toLowerCase() !== 'input' || ele.type !== 'file') {
				return alert('upload上传方法使用错误；请对input[type=file]的元素使用');
			}
			// 使用的变量
			var CONFIG_UPLOAD = $.config ? $.config.upload : '';
			var action =
				obj.action ||
				$ele.attr('action') ||
				CONFIG_UPLOAD ||
				conf.urlPrefix + '/cyxm/wjsc';
			var mode = obj.mode || $ele.attr('mode');
			var jsonErrorMsg = '返回值json解析错误，请处理好后台的返回值';
			// IE 10+ 使用formData方式上传
			if (window.FormData) {
				var formData = new FormData();
				formData.append('file', ele.files[0]);
				formData.append('mode', mode);
				// var _getName = ele.files[0].name.substring(0,ele.files[0].name.lastIndexOf('.'));
				// console.log(_getName)
				// var pat=new RegExp("[^a-zA-Z0-9\_\u4e00-\u9fa5]","i");
				// if(pat.test(_getName)==true) {
				//   alert('非法字符');
				//   return '';
				// }
				var xhr = new XMLHttpRequest();
				xhr.open('POST', action);
				xhr.onload = function (e) {
					// 请求成功
					if (xhr.status === 200 && xhr.readyState === 4) {
						var result = xhr.response;
						var json;
						try {
							json = JSON.parse(result);
						} catch (event) {
							json = {
								result: result,
								msg: jsonErrorMsg,
								error: true
							};
						}
						if (!json.error) {
							var code = +json.returnCode;
							resolveSyncCode(code, deferred, {
								res: json
							}, typeof obj.success === 'function' ? obj.success : null);
						} else {
							deferred.reject(json);
							(typeof obj.error === 'function') && obj.error.call(ele, result);
						}
					} else {
						deferred.reject(e);
						(typeof obj.error === 'function') && obj.error.call(ele, xhr);
					}
				};
				xhr.send(formData);
				// IE8 9 使用form表单提交的方式上传
			} else {
				// 初始化form和iframe元素，并进行配置
				var form = $(
					'<form method="POST" enctype="multipart/form-data"></form>'
				);
				var num = Math.random() * 10e9;
				var iframe = $(
					'<iframe frameborder="0" name="' +
					num +
					'" style="display: none"></iframe>'
				);
				form.attr('action', action).attr('target', num);
				$ele.wrap(form);
				$ele.after('<input type="hidden" value="' + mode + '" name="mode">');
				iframe.appendTo($('body'));
				// 提交表单
				$ele.attr('name', 'file');
				$ele.parent().submit();
				// 处理返回事件
				iframe.on('load', function (e) {
					$ele
						.parent()
						.after($ele)
						.remove();
					var json, result;
					try {
						result = this.contentDocument.body.innerText;
					} catch (event) {
						result = '{"error":true}';
					}

					$(iframe).remove();
					try {
						json = JSON.parse(result);
					} catch (event) {
						json = {
							result: result,
							msg: jsonErrorMsg,
							error: true
						};
					}

					if (!json.error) {
						var code = +json.returnCode;
						resolveSyncCode(code, deferred, {
							res: json
						}, typeof obj.success === 'function' ? obj.success : null);
					} else {
						deferred.reject(json);
						(typeof obj.error === 'function') && obj.error.call(ele, result);
					}
				});
			}
			return deferred.promise();
		},
		// 获取参数方法(可获取input和自己写的select下拉框的值)
		getFormData: function () {
			var returnData = {};
			var falgObj = {};
			$(this)
				.find('[paramete]')
				.each(function (index, element) {
					var paramAttr = $(this)
						.attr('paramete')
						.split(',');
					for (var i = 0; i < paramAttr.length; i++) {
						if ($(this).is('select')) {
							if (i === 0) {
								if (!falgObj[paramAttr[i]]) {
									returnData[paramAttr[i]] =
										$(this).attr('data') || $(this).val();
								}
							} else {
								returnData[paramAttr[i]] = $(this).attr(paramAttr[i]);
							}
						} else if (
							$(this).prop('type') === 'text' ||
							$(this).is('textarea')
						) {
							if (i === 0) {
								returnData[paramAttr[i]] = $(this).val();
								if ($(this).val() === $(this).attr('placeholder')) {
									returnData[paramAttr[i]] = '';
								}
							} else {
								returnData[paramAttr[i]] = $(this).attr(paramAttr[i]);
							}
						} else if (!falgObj[paramAttr[i]]) {
							returnData[paramAttr[i]] = $(this).attr(paramAttr[i]);
						}
						falgObj[paramAttr[i]] = true;
					}
				});
			return returnData;
		}
	});
	/*
	 *  将多级联动的数据放到localstorage里
	 *  包括 行政区划、职位、行业、专业
	 */
	var xzqh = {};
	$.setLinkageLocl = function () {
		var returnResult = {};
		if (JSON.stringify(xzqh) !== '{}') {
			returnResult = xzqh;
		} else {
			// var formXzqh = {
			// 	dmbm: 'ggfwgb_d_xzqh_ss'
			// };
			returnResult = ajaxRun('../common/xzqh.json');
			xzqh = returnResult;
		}
		return returnResult;
	};
	// 联动请求方法，url请求地址，
	// localClass，存localstroage里的名字
	function ajaxRun(url) {
		var resultData = '';
		$.ajax({
			url: url,
			type: 'get',
			async: false,
			success: function (result) {
				resultData = result.returnData.xzqhlb;
			}
		});
		return resultData;
	}
	// lastIndexof 兼容写法
	if (!Array.prototype.lastIndexOf) {
		Array.prototype.lastIndexOf = function (searchElement /*, fromIndex*/) {
			'use strict';
			if (this === void 0 || this === null) {
				throw new TypeError();
			}
			var n, k,
				t = Object(this),
				len = t.length >>> 0;
			if (len === 0) {
				return -1;
			}
			n = len - 1;
			if (arguments.length > 1) {
				n = Number(arguments[1]);
				if (n != n) {
					n = 0;
				} else if (n != 0 && n != (1 / 0) && n != -(1 / 0)) {
					n = (n > 0 || -1) * Math.floor(Math.abs(n));
				}
			}
			for (k = n >= 0 ?
				Math.min(n, len - 1) :
				len - Math.abs(n); k >= 0; k--) {
				if (k in t && t[k] === searchElement) {
					return k;
				}
			}
			return -1;
		};
	}

	$("#CitySelect").mouseenter(function () {
		$(this).attr('size', '6')
	})
	$("#CitySelect").mouseleave(function () {
		$(this).attr('size', '1');
	})
	$(document).on('mouseenter', '.header_r>li', function () {
		$(this).addClass('fff')
		$(this).children('.header_r_two').show()
	})
	$(document).on('mouseleave', '.header_r>li', function () {
		$(this).removeClass('fff')
		$(this).children('.header_r_two').hide()
	})
	$(document).on('click', '.Close', function () {
		$('.search_r').hide()
	})
	// 左侧菜单
	$(document).on('mouseenter', '.menu_y_li', function () {
		$(this).children('.service-float').show()
	})
	$(document).on('mouseleave', '.menu_y_li', function () {
		$(this).children('.service-float').hide()
	})
	var ht = $('.menu_y>ul').html()
	for (var i = 0; i < 15; i++) {
		$('.menu_y>ul').append(ht)
	}


	
	Tab()
	function Tab() {
		$(".tab>div").hide()
		$(".tab>div").eq(0).show();
		$(".tab_tit>li").on('click', function () {
			$(".tab>div").eq($(this).index()).fadeIn().siblings('div').hide();
			$(".tab_tit>li").eq($(this).index()).addClass('tab_tit_active').siblings('li').removeClass('tab_tit_active');
		})

		$(".yhzx_second>div").hide()
		$(".yhzx_second>div").eq(0).show();
		$(".yhzx_second>.tab_tit>li").on('click', function () {
			$(".yhzx_second>div").eq($(this).index()).fadeIn().siblings('div').hide();
			$(".yhzx_second>.tab_tit>li").eq($(this).index()).addClass('tab_tit_active').siblings('li').removeClass('tab_tit_active');
		})
	}

})();