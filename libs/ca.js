! function ( t, e ) {
	if ( "object" == typeof exports && "object" == typeof module ) module.exports = e( require( "$" ), require( "$s" ) );
	else if ( "function" == typeof define && define.amd ) define( [ "$", "$s" ], e );
	else {
		var a = "object" == typeof exports ? e( require( "$" ), require( "$s" ) ) : e( t.$, t.$s );
		for ( var n in a )( "object" == typeof exports ? exports : t )[ n ] = a[ n ]
	}
}( window, ( function ( __WEBPACK_EXTERNAL_MODULE__1__, __WEBPACK_EXTERNAL_MODULE__2__ ) {
	return function ( t ) {
		var e = {};

		function a ( n ) {
			if ( e[ n ] ) return e[ n ].exports;
			var s = e[ n ] = {
				i: n,
				l: !1,
				exports: {}
			};
			return t[ n ].call( s.exports, s, s.exports, a ), s.l = !0, s.exports
		}
		return a.m = t, a.c = e, a.d = function ( t, e, n ) {
			a.o( t, e ) || Object.defineProperty( t, e, {
				enumerable: !0,
				get: n
			} )
		}, a.r = function ( t ) {
			"undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty( t, Symbol.toStringTag, {
				value: "Module"
			} ), Object.defineProperty( t, "__esModule", {
				value: !0
			} )
		}, a.t = function ( t, e ) {
			if ( 1 & e && ( t = a( t ) ), 8 & e ) return t;
			if ( 4 & e && "object" == typeof t && t && t.__esModule ) return t;
			var n = Object.create( null );
			if ( a.r( n ), Object.defineProperty( n, "default", {
				enumerable: !0,
				value: t
			} ), 2 & e && "string" != typeof t )
				for ( var s in t ) a.d( n, s, function ( e ) {
					return t[ e ]
				}.bind( null, s ) );
			return n
		}, a.n = function ( t ) {
			var e = t && t.__esModule ? function () {
				return t[ "default" ]
			} : function () {
				return t
			};
			return a.d( e, "a", e ), e
		}, a.o = function ( t, e ) {
			return Object.prototype.hasOwnProperty.call( t, e )
		}, a.p = "/sf/deploy/common_ued/js/common/helper/", a( a.s = 0 )
	}( [ function ( module, exports, __webpack_require__ ) {
		var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
		__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__( 1 ), __webpack_require__( 2 ) ], 
        __WEBPACK_AMD_DEFINE_RESULT__ = function ( $, $s ) {
			var g_monthName = [ "正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "腊月" ],
				tInfo = [ 19416, 19168, 42352, 21717, 53856, 55632, 91476, 22176, 39632, 21970, 19168, 42422, 42192, 53840, 119381, 46400, 54944, 44450, 38320, 84343, 18800, 42160, 46261, 27216, 27968, 109396, 11104, 38256, 21234, 18800, 25958, 54432, 59984, 28309, 23248, 11104, 100067, 37600, 116951, 51536, 54432, 120998, 46416, 22176, 107956, 9680, 37584, 53938, 43344, 46423, 27808, 46416, 86869, 19872, 42416, 83315, 21168, 43432, 59728, 27296, 44710, 43856, 19296, 43748, 42352, 21088, 62051, 55632, 23383, 22176, 38608, 19925, 19152, 42192, 54484, 53840, 54616, 46400, 46752, 103846, 38320, 18864, 43380, 42160, 45690, 27216, 27968, 44870, 43872, 38256, 19189, 18800, 25776, 29859, 59984, 27480, 23232, 43872, 38613, 37600, 51552, 55636, 54432, 55888, 30034, 22176, 43959, 9680, 37584, 51893, 43344, 46240, 47780, 44368, 21977, 19360, 42416, 86390, 21168, 43312, 31060, 27296, 44368, 23378, 19296, 42726, 42208, 53856, 60005, 54576, 23200, 30371, 38608, 19415, 19152, 42192, 118966, 53840, 54560, 56645, 46496, 22224, 21938, 18864, 42359, 42160, 43600, 111189, 27936, 44448, 84835, 37744, 18936, 18800, 25776, 92326, 59984, 27424, 108228, 43744, 41696, 53987, 51552, 54615, 54432, 55888, 23893, 22176, 42704, 21972, 21200, 43448, 43344, 46240, 46758, 44368, 21920, 43940, 42416, 21168, 45683, 26928, 29495, 27296, 44368, 84821, 19296, 42352, 21732, 53600, 59752, 54560, 55968, 92838, 22224, 19168, 43476, 41680, 53584, 62034, 54560 ],
				minYear = 1901,
				maxYear = 2049,
				solarMonth = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ],
				Gan = [ "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸" ],
				Zhi = [ "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥" ],
				Animals = [ "鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪" ],
				solarTerm = [ "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至" ],
				sTermInfo = [ 0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758 ],
				nStr1 = [ "日", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十" ],
				nStr2 = [ "初", "十", "廿", "卅", "□" ],
				sFtv = [ "0101*元旦&元旦(新年)", "0106 &中国第13亿人口日", "0108 &周恩来逝世纪念日", "0121 &列宁逝世纪念日 国际声援南非日", "0202 &世界湿地日", "0207 &京汉铁路罢工纪念日(1923)", "0210 &国际气象节", "0214*情人节&西方情人节(圣瓦伦丁节)", "0215 &中国12亿人口日(1995)", "0219 &邓小平逝世纪念日(1997)", "0221 &国际母语日(2000) 反对殖民制度斗争日(1949)", "0224 &第三世界青年日", "0228 &世界居住条件调查日(2003)", "0301 &国际海豹日(1983)", "0303 &全国爱耳日(2000) 桃花节(日本女孩节)", "0305 &学雷锋纪念日(1963) 中国青年志愿者服务日(2000) 周恩来诞辰纪念日(1898)", "0308*妇女节&国际劳动妇女节(1910)", "0309 &保护母亲河日", "0311 &国际尊严尊敬日", "0312*植树节&中国植树节(1979) 孙中山逝世纪念日(1925)", "0314 &国际警察日 白色情人节 马克思逝世纪念日(1883)", "0315 &国际消费者权益日(1983)", "0316 &手拉手情系贫困小伙伴全国统一行动日", "0317 &中国国医节(1929) 国际航海日 爱尔兰圣帕特里克节", "0318 &全国科技人才活动日", "0321 &世界森林日(1972) 消除种族歧视国际日(1966) 世界儿歌日(1976) 世界睡眠日(2001)", "0322 &世界水日(1993)", "0323 &世界气象日(1960)", "0324 &世界防治结核病日(1996)", "0329 &中国黄花岗七十二烈士殉难纪念", "0330 &巴勒斯坦国土日(1962)", "0401*愚人节&国际愚人节 全国爱国卫生运动月(四月) 税收宣传月(四月)", "0402 &国际儿童图书日", "0407 &世界卫生日(1955)", "0411 &世界帕金森病日", "0421 &全国企业家活动日(1994)", "0422 &世界地球日(1970) 世界法律日 列宁诞辰纪念日(1870)", "0423 &世界图书和版权日(1995)", "0424 &亚非新闻工作者日 世界青年反对殖民主义日(1957)", "0425 &全国儿童预防接种宣传日(1986)", "0426 &世界知识产权日(2001)", "0430 &世界交通安全反思日", "0501*劳动节&国际劳动节(1889)", "0503 &世界新闻自由日", "0504*青年节&中国五四青年节(1939) 科技传播日", "0505 &碘缺乏病防治日 日本男孩节 马克思诞辰纪念日(1818) 全国爱眼日(1992)", "0508 &世界微笑日 世界红十字日(1948)", "0512 &国际护士节 汶川大地震纪念(2008)", "0515 &国际家庭日(1994) 全国碘缺乏病防治日(1994)", "0517 &国际电信日(1969)", "0518 &国际博物馆日(1977)", "0520 &全国学生营养日(1990) 全国母乳喂养宣传日(1990)", "0522 &生物多样性国际日(2000)", "0525 &非洲解放日(1963)", "0526 &世界向人体条件挑战日", "0530 &“五卅”反对帝国主义运动纪念日(1925)", "0531 &世界无烟日(1988) 英国银行休假日", "0601*儿童节&国际儿童节(1949)", "0605 &世界环境保护日(1974)", "0606 &世界爱眼日（1996）", "0611 &中国人口日（1974）", "0614 &世界献血者日(2005)", "0617 &防治荒漠化和干旱日(1995)", "0620 &世界难民日(2001)", "0622 &中国儿童慈善活动日", "0623 &国际奥林匹克日(1948)", "0625 &全国土地日(1991)", "0626 &国际禁毒日(1987) 国际宪章日(1945) 禁止药物滥用和非法贩运国际日(1987) 支援酷刑受害者国际日(1997)", "0630 &世界青年联欢节", "0701*建党节&中国共产党诞辰日(1921) 香港回归纪念日(1997) 国际建筑日(1985)", "0702 &国际体育记者日", "0706 &朱德逝世纪念日", "0707 &中国人民抗日战争纪念日(1937)", "0711 &世界人口日(1987) 中国航海节", "0726 &世界语创立日", "0728 &第一次世界大战爆发(1914)", "0730 &非洲妇女日(1962)", "0801*建军节&中国人民解放军建军节(1927)", "0805 &恩格斯逝世纪念日(1895)", "0806 &国际电影节(1932)", "0808 &中国男子节(爸爸节)(1988)", "0812 &国际青年日", "0813 &国际左撇子日(1976)", "0815 &日本正式宣布无条件投降日(1945)", "0822 &邓小平诞辰纪念日(1904)", "0823 &贩卖黑奴及其废除的国际纪念日", "0826 &全国律师咨询日(1993)", "0902 &日本签署无条件投降书日(1945)", "0903 &中国抗日战争胜利纪念日(1945)", "0908 &世界扫盲日(1966) 国际新闻工作者日(1958)", "0909 &毛泽东逝世纪念日(1976)", "0910*教师节&中国教师节(1985) 世界预防自杀日(2003)", "0914 &世界清洁地球日", "0916 &国际臭氧层保护日(1994) 中国脑健康日", "0918 &九·一八事变纪念日(1931)", "0920 &国际爱牙日(1989)", "0921 &国际和平日(1981) 世界预防老年性痴呆宣传日(1994)", "0927 &世界旅游日(1980)", "0928 &孔子诞辰纪念日", "0930 &国际翻译日(1991)", "1001*国庆节&国庆节(1949) 国际音乐日(1980) 国际老人节(1990)", "1002*&国庆节假日 国际和平与民主自由斗争日", "1003*&国庆节假日", "1004 &世界动物日", "1005 &世界教师日(1944)", "1008 &全国高血压日(1998) 世界视觉日", "1009 &世界邮政日", "1010 &辛亥革命纪念日(1911) 世界心理健康日(1992) 世界居室卫生日", "1011 &世界镇痛日(2004)", "1012 &世界60亿人口日(1999)", "1013 &世界保健日(1950) 中国少年先锋队诞辰日(1949) 世界保健日(1950)", "1014 &世界标准日(1969)", "1015 &国际盲人节(白手杖节)", "1016 &世界粮食日", "1017 &世界消除贫困日", "1020 &世界骨质疏松日(1997)", "1022 &世界传统医药日", "1024 &联合国日 世界发展新闻日", "1025 &抗美援朝纪念日(1950)", "1028 &中国男性健康日(2000)", "1031 &世界勤俭日", "1101*万圣节&万圣节 植树造林日", "1106 &防止战争和武装冲突糟蹋环境国际日(2001)", "1107 &十月社会主义革命纪念日(1917)", "1108 &中国记者节", "1109 &全国消防安全宣传日", "1110 &世界青年节", "1111*光棍节&光棍节 国际科学与和平周", "1112 &孙中山诞辰纪念日(1866) 刘少奇逝世纪念日(1969)", "1114 &世界糖尿病日(1995)", "1116 &国际宽容日(1995)", "1117 &国际大学生节", "1120 &国际儿童日", "1121 &世界问候日(1973) 世界电视日", "1125 &消除对妇女的暴力行为国际日(1999)", "1128 &恩格斯诞辰纪念日(1820)", "1129 &声援巴勒斯坦人民国际日(1977)", "1201 &世界艾滋病日", "1202 &废除奴隶制世界日", "1203 &世界残疾人日", "1204 &全国法制宣传日", "1205 &国际经济和社会发展志愿人员日 世界强化免疫日 世界弱能人士日", "1207 &国际民航日", "1208 &国际儿童电视日", "1209 &一二·九运动纪念日(1935) 世界足球日(1863) 国际反腐败日", "1210 &世界人权日(1950)", "1211 &世界防治哮喘日(2001)", "1212 &西安事变纪念日(1935)", "1213*公祭日&南京大屠杀纪念日(1937)", "1215 &世界强化免疫日", "1218 &国际移徙者日(2000)", "1220 &澳门回归纪念日(1999)", "1221 &国际篮球日(1981)", "1224*平安夜&平安夜", "1225*圣诞节&圣诞节", "1226 &毛泽东诞辰纪念日(1893)", "1229 &国际生物多样性日(1994)" ],
				lFtv = [ "0101*春节&春节 大年初一 弥勒佛诞辰", "0115*元宵节&元宵节", "0505*端午节&端午节", "0606*姑姑节&姑姑节", "0624*火把节&火把节", "0707*七夕节&七夕情人节", "0715*中元节&中元节", "0815*中秋节&中秋节", "0909*重阳节&重阳节", "1208*腊八节&腊八节(释迦如来成道日)", "1223*北小年&北小年", "1224*南小年&南小年", "0100*除夕&除夕" ],
				wFtv = [ "0150 &世界麻风日", "0351 &全国中小学生安全教育日(1996)", "0440 &世界儿童日(1986)", "0453 &秘书节", "0512 &国世界哮喘日(1998)", "0520*母亲节&国际母亲节 救助贫困母亲日", "0530 &全国助残日(1990)", "0532 &国际牛奶日(1961)", "0626 &中国文化遗产日(2006)", "0630*父亲节&国际父亲节(1934)", "0716 &国际合作节(1995)", "0932 &国际和平日(1981)", "0936 &全民国防教育日(2001)", "0940 &国际聋人节(1958)", "0950 &世界海事日 世界心脏病日(2000)", "1011 &国际住房日(1986)", "1024 &世界视觉日", "1023 &国际减轻自然灾害日(1990)", "1144*感恩节&感恩节", "1220 &国际儿童电视广播日" ],
				constellationArr = [ "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座" ],
				fuTianArr = [ "20220716*初伏", "20220726*中伏", "20220815*末伏", "20220825*出伏", "20230711*初伏", "20230721*中伏", "20230810*末伏", "20230820*出伏", "20240715*初伏", "20240725*中伏", "20240814*末伏", "20240824*出伏", "20250720*初伏", "20250730*中伏", "20250809*末伏", "20250819*出伏", "20260715*初伏", "20260725*中伏", "20260814*末伏", "20260824*出伏", "20270720*初伏", "20270730*中伏", "20270809*末伏", "20270819*出伏", "20280714*初伏", "20280724*中伏", "20280813*末伏", "20280823*出伏", "20290719*初伏", "20290729*中伏", "20290808*末伏", "20290818*出伏", "20300714*初伏", "20300724*中伏", "20300813*末伏", "20300823*出伏", "20310719*初伏", "20310729*中伏", "20310808*末伏", "20310818*出伏" ],
				constellationLinkArr = [ "http://astro.women.sohu.com/aquarius.shtml", "http://astro.women.sohu.com/pisces.shtml", "http://astro.women.sohu.com/aries.shtml", "http://astro.women.sohu.com/taurus.shtml", "http://astro.women.sohu.com/gemini.shtml", "http://astro.women.sohu.com/cancer.shtml", "http://astro.women.sohu.com/leo.shtml", "http://astro.women.sohu.com/virgo.shtml", "http://astro.women.sohu.com/libra.shtml", "http://astro.women.sohu.com/scorpius.shtml", "http://astro.women.sohu.com/sagittarius.shtml ", "http://astro.women.sohu.com/capricornus.shtml" ],
				constellationEdgeDay = [ 21, 19, 21, 21, 22, 22, 23, 24, 24, 24, 23, 22 ];

			function Ajax ( t ) {
				this.url = t.url || "", this.params = t.params || "", this.mime = t.mime || "text/html", this.onComplete = t.onComplete || this.defaultOnCompleteFunc, this.onLoading = t.onLoading || this.defaultOnLoadingFunc, this.onError = t.onError || this.defaultOnErrorFunc, this.method = t.method || "post", this.loadData()
			}

			function constellate ( t, e ) {
				return e < constellationEdgeDay[ t ] && ( t -= 1 ), t >= 0 ? [ constellationArr[ t ], constellationLinkArr[ t ] ] : [ constellationArr[ 11 ], constellationLinkArr[ 11 ] ]
			}

			function lYearDays ( t ) {
				var e, a = 348;
				for ( e = 32768; e > 8; e >>= 1 ) a += tInfo[ t - 1900 ] & e ? 1 : 0;
				return a + leapDays( t )
			}

			function leapDays ( t ) {
				return leapMonth( t ) ? 65536 & tInfo[ t - 1900 ] ? 30 : 29 : 0
			}

			function leapMonth ( t ) {
				return 15 & tInfo[ t - 1900 ]
			}

			function monthDays ( t, e ) {
				return tInfo[ t - 1900 ] & 65536 >> e ? 30 : 29
			}

			function Lunar ( t ) {
				var e, a, n = 0,
					s = ( Date.UTC( t.getFullYear(), t.getMonth(), t.getDate() ) - Date.UTC( 1900, 0, 31 ) ) / 864e5;
				for ( e = 1900; e <= maxYear && s > 0; e++ ) s -= n = lYearDays( e );
				for ( s < 0 && ( s += n, e-- ), this.year = e, a = leapMonth( e ), this.isLeap = !1, e = 1; e < 13 && s > 0; e++ ) a > 0 && e == a + 1 && !this.isLeap ? ( --e, this.isLeap = !0, n = leapDays( this.year ) ) : n = monthDays( this.year, e ), this.isLeap && e == a + 1 && ( this.isLeap = !1 ), s -= n;
				0 == s && a > 0 && e == a + 1 && ( this.isLeap ? this.isLeap = !1 : ( this.isLeap = !0, --e ) ), s < 0 && ( s += n, --e ), this.month = e, this.day = s + 1
			}

			function solarDays ( t, e ) {
				return 1 == e ? t % 4 == 0 && t % 100 != 0 || t % 400 == 0 ? 29 : 28 : solarMonth[ e ]
			}

			function cyclical ( t ) {
				return Gan[ t % 10 ] + Zhi[ t % 12 ]
			}

			function calElement ( t, e, a, n, s, i, r, l, o, h, c ) {
				this.isToday = !1, this.sYear = t, this.sMonth = e, this.sDay = a, this.week = n, this.lYear = s, this.lMonth = i, this.lDay = r, this.isLeap = l, this.cYear = o, this.cMonth = h, this.cDay = c, this.color = "", this.lunarFestival = "", this.solarFestival = "", this.estDayFestival = "", this.weekFestival = "", this.dateFestival = "", this.lliFestival = "", this.solarTerms = ""
			}
            
			Ajax.prototype = {
				READY_STATE_COMPLETE: 4,
				getRequest: function () {
					for ( var t = [ function () {
						return new ActiveXObject( "Msxml2.XMLHTTP" )
					}, function () {
						return new ActiveXObject( "Microsoft.XMLHTTP" )
					}, function () {
						return new XMLHttpRequest
					} ], e = null, a = 0; a < t.length; a++ ) {
						var n = t[ a ];
						try {
							e = n();
							break
						} catch ( s ) {}
					}
					return e || !1
				},
				parseParams: function () {
					if ( "string" == typeof this.params ) return this.params;
					var t = "";
					for ( var e in this.params ) t += e + "=" + this.params[ e ] + "&";
					return t
				},
				loadData: function () {
					if ( this.req = this.getRequest(), this.req ) {
						this.onLoading();
						try {
							var t = this;
							this.req.onreadystatechange = function () {
								t.req.readyState == t.READY_STATE_COMPLETE && t.onComplete.call( t, t.req )
							}, this.req.open( this.method, this.url, !0 ), "post" == this.method && this.req.setRequestHeader( "Content-Type", "application/x-www-form-urlencoded" ), this.req.overrideMimeType && this.req.overrideMimeType( this.mime ), this.req.send( "post" == this.method ? this.parseParams( this.params ) : null )
						} catch ( e ) {
							this.onError.call( this, e )
						}
					}
				},
				defaultOnCompleteFunc: function () {
					alert( this.req.responseText )
				},
				defaultOnLoadingFunc: function () {},
				defaultOnErrorFunc: function ( t ) {
					alert( t )
				}
			};
			var fixsTerm = {
				19091: 21,
				19102: 5,
				19106: 6,
				19118: 7,
				19120: 7,
				191218: 9,
				191221: 23,
				191317: 24,
				19179: 21,
				192716: 8,
				192811: 21,
				193510: 6,
				19421: 21,
				19432: 5,
				19436: 6,
				19450: 6,
				194723: 23,
				19507: 20,
				195022: 8,
				195123: 23,
				19525: 21,
				195513: 23,
				19563: 20,
				195720: 8,
				195812: 7,
				195815: 23,
				196016: 7,
				196111: 21,
				19738: 5,
				197421: 23,
				19751: 21,
				197517: 23,
				19762: 5,
				19774: 6,
				197714: 7,
				19780: 6,
				197821: 23,
				19799: 21,
				19802: 5,
				198023: 22,
				19814: 6,
				19820: 6,
				198322: 8,
				198413: 22,
				198423: 22,
				19855: 21,
				198712: 7,
				198813: 22,
				19893: 19,
				198916: 7,
				199011: 21,
				199020: 8,
				199112: 7,
				199115: 23,
				199411: 21,
				199710: 5,
				20068: 5,
				200614: 7,
				200721: 23,
				20081: 21,
				200817: 22,
				20092: 4,
				20104: 6,
				201014: 7,
				20110: 6,
				201121: 23,
				20121: 21,
				20129: 20,
				201222: 7,
				20132: 4,
				201313: 22,
				201323: 22,
				20144: 6,
				20150: 6,
				201622: 7,
				201713: 22,
				201723: 22,
				20183: 19,
				20185: 21,
				201911: 21,
				202012: 6,
				202015: 22,
				202022: 7,
				20223: 19,
				202216: 7,
				202311: 21,
				202319: 24,
				202320: 8,
				202415: 22,
				202610: 5,
				203010: 5,
				20358: 5,
				203514: 7,
				20371: 20,
				203914: 7,
				20400: 6,
				204018: 8,
				204021: 22,
				20411: 20,
				20419: 20,
				20422: 4,
				20434: 6,
				204314: 7,
				20440: 6,
				204421: 22,
				20451: 20,
				20457: 19,
				20459: 20,
				204522: 7,
				20462: 4,
				204613: 22,
				204623: 22,
				20474: 6,
				20480: 6,
				204811: 20,
				204912: 6,
				204915: 22,
				204922: 7
			};

			function sTerm ( t, e ) {
				return fixsTerm[ t + "" + e ] ? fixsTerm[ t + "" + e ] : new Date( 31556925974.7 * ( t - 1900 ) + 6e4 * sTermInfo[ e ] + Date.UTC( 1900, 0, 6, 2, 5 ) )
					.getUTCDate()
			}

			function calendar ( t, e, a, n, s ) {
				var i, r, l, o, h, c, d, p, u, m, f, y, v, g, _ = 1,
					C = 0,
					T = new Array( 3 ),
					b = 0,
					E = 0;
				i = new Date( t, e, 1, 0, 0, 0, 0 ), this.length = solarDays( t, e ), this.firstWeek = i.getDay(), this.lastWeek = new Date( t, e, this.length, 0, 0, 0, 0 )
					.getDay(), y = cyclical( e < 2 ? t - 1900 + 36 - 1 : t - 1900 + 36 );
				sTerm( t, 2 );
				var D = sTerm( t, 2 * e );
				v = cyclical( 12 * ( t - 1900 ) + e + 12 );
				for ( var $ = Date.UTC( t, e, 1, 0, 0, 0, 0 ) / 864e5 + 25567 + 10, M = 0; M < this.length; M++ ) {
					if ( _ > C && ( l = ( r = new Lunar( i = new Date( t, e, M + 1 ) ) )
						.year, o = r.month, _ = r.day, C = ( h = r.isLeap ) ? leapDays( l ) : monthDays( l, o ), 0 == b && ( E = o ), T[ b++ ] = M - _ + 1 ), e < 3 ) 1 == new Lunar( new Date( t, e, M + 1 ) )
						.month && ( y = cyclical( t - 1900 + 36 ) );
					M + 1 == D && ( v = cyclical( 12 * ( t - 1900 ) + e + 13 ) ), g = cyclical( $ + M ), this[ M ] = new calElement( t, e + 1, M + 1, nStr1[ ( M + this.firstWeek ) % 7 ], l, o, _++, h, y, v, g )
				}
				if ( c = sTerm( t, 2 * e ) - 1, d = sTerm( t, 2 * e + 1 ) - 1, this[ c ].solarTerms = solarTerm[ 2 * e ], this[ d ].solarTerms = solarTerm[ 2 * e + 1 ], this[ c ].color = "red", this[ d ].color = "red", 2015 != t && ( 2 == e || 3 == e ) ) {
					var w = new easter( t );
					e == w.m && ( this[ w.d - 1 ].solarFestival = "复活节", this[ w.d - 1 ].estDayFestival = "复活节", this[ w.d - 1 ].color = "red" )
				}
				for ( var k = 0, L = wFtv.length; k < L; k++ ) {
					var x;
					if ( wFtv[ k ].match( /^(\d{2})(\d)(\d)([\s\*])(.+)$/ ) && Number( RegExp.$1 ) == e + 1 )
						if ( c = Number( RegExp.$2 ), d = Number( RegExp.$3 ), f = RegExp.$4, ( m = ( u = RegExp.$5 )
							.split( "&" ) )[ 0 ].length > 0 ) c < 5 ? x = ( this.firstWeek > d ? 7 : 0 ) + 7 * ( c - 1 ) + d - this.firstWeek : ( c -= 5, p = ( this.firstWeek + this.length - 1 ) % 7, x = this.length - p - 7 * c + d - ( d > p ? 7 : 0 ) - 1 ), this[ x ].solarFestival = m[ 0 ], this[ x ].weekFestival = m[ 1 ], "*" == f && ( this[ x ].color = "red" )
				}
				for ( var H = 0, A = sFtv.length; H < A; H++ )
					if ( sFtv[ H ].match( /^(\d{2})(\d{2})([\s\*])(.+)$/ ) && ( u = RegExp.$4, Number( RegExp.$1 ) == e + 1 ) ) {
						var I = Number( RegExp.$2 ) - 1,
							S = RegExp.$3;
						( m = u.split( "&" ) )[ 0 ].length > 0 && ( this[ I ].solarFestival = m[ 0 ], "*" == S && ( this[ I ].color = "red" ) ), m[ 1 ].length > 0 && ( this[ I ].dateFestival = m[ 1 ] )
					} for ( var R = 0, j = fuTianArr.length; R < j; R++ )
					if ( fuTianArr[ R ].match( /^(\d{4})(\d{2})(\d{2})([\s*])(.+)$/ ) && ( m = RegExp.$5, Number( RegExp.$1 ) == t && Number( RegExp.$2 ) == e + 1 ) ) {
						var F = Number( RegExp.$3 ) - 1,
							N = RegExp.$4;
						m.length > 0 && ( this[ F ].solarFestival = m, "*" == N && ( this[ F ].color = "red" ) )
					} for ( var Y = 0, q = lFtv.length; Y < q; Y++ )
					if ( lFtv[ Y ].match( /^(\d{2})(.{2})([\s\*])(.+)$/ ) && ( -11 == ( c = Number( RegExp.$1 ) - E ) && ( c = 1 ), c >= 0 && c < b && ( d = T[ c ] + Number( RegExp.$2 ) - 1 ) >= 0 && d < this.length && !this[ d ].isLeap ) ) {
						u = RegExp.$4;
						var G = RegExp.$3;
						m = u.split( "&" ), this[ d ].lunarFestival += m[ 0 ], this[ d ].lliFestival += m[ 1 ], "*" == G && ( this[ d ].color = "red" )
					} t == a && e == n && ( this[ s - 1 ].isToday = !0 )
			}

			function easter ( t ) {
				var e, a = sTerm( t, 5 ),
					n = new Date( Date.UTC( t, 2, a, 0, 0, 0, 0 ) ),
					s = new Lunar( n );
				e = s.day < 15 ? 15 - s.day : ( s.isLeap ? leapDays( t ) : monthDays( t, s.month ) ) - s.day + 15;
				var i = new Date( n.getTime() + 864e5 * e ),
					r = new Date( i.getTime() + 864e5 * ( 7 - i.getUTCDay() ) );
				this.m = r.getUTCMonth(), this.d = r.getUTCDate()
			}

			function cDay ( t ) {
				var e;
				switch ( t ) {
					case 10:
						e = "初十";
						break;
					case 20:
						e = "二十";
						break;
					case 30:
						e = "三十";
						break;
					default:
						e = nStr2[ Math.floor( t / 10 ) ], e += nStr1[ t % 10 ]
				}
				return e
			}

			function GC ( t, e, a ) {
				if ( !t ) return [];
				a = a || "*";
				for ( var n = t.getElementsByTagName( a ), s = [], i = 0; i < n.length; i++ ) {
					var r = n[ i ];
					( " " + r.className + " " )
					.indexOf( " " + e + " " ) > -1 && s.push( r )
				}
				return s
			}

			function jumpMonth ( t, e, a, n ) {
				return a = +a, e = +e, a += t, n && e <= 1901 && 0 === a ? {
					year: 1900,
					month: 12
				} : e <= 1901 && 0 === a ? {
					year: 1901,
					month: 12
				} : e >= 2049 && a > 12 ? {
					year: 2049,
					month: 12
				} : e > 1901 && a < 1 ? {
					year: e - 1,
					month: 12
				} : e < 2050 && a > 12 ? {
					year: e + 1,
					month: 1
				} : {
					year: e,
					month: a
				}
			}

			function cutFestival ( t ) {
				return t.length <= 4 ? t : t.substring( 0, 3 ) + "..."
			}

			function getLunarDay ( t ) {
				var e = {};
				return t.solarFestival ? e.fest = t.solarFestival : t.lunarFestival ? e.fest = t.lunarFestival : t.solarTerms ? e.fest = t.solarTerms : ( e.fest = cDay( t.lDay ), e.className = "" ), "" !== e.className && "red" == t.color && ( e.className = "calendar-festival" ), e
			}

			function getAnimal ( t ) {
				return Animals[ ( t - 1900 ) % 12 ]
			}

			function renderCalendar () {
				var t = [];
				return t.push( renderLeft.call( this ) ), t.push( renderRight.call( this ) ), t.join( "" )
			}

			function renderRightCont ( t ) {
				var e = $( "#" + this.rightId ),
					a = this.year,
					n = this.month,
					s = this.day;
				t || ( t = new calendar( a, n - 1, 2e3, 1, 1 )[ s - 1 ] );
				t && ( a = t.sYear, n = t.sMonth, s = t.sDay );
				var i = getAnimal( t.lYear ),
					r = constellate( n - 1, s )[ 0 ],
					l = [];
				l.push( '<div class="calendar-day-info" data-href="https://wannianli.tianqi.com/laohuangli/' + a + "-" + ( n > 9 ? n : "0" + n ) + "-" + ( s > 9 ? s : "0" + s ) + '.html?qt=sogou">' ), l.push( '<h4 class="fz-big">' + a + "年" + n + "月</h4>" ), l.push( '<div class="calendar-day">' + s + "</div>" ), l.push( '<p class="calendar-info">' ), l.push( "<span>星期" + t.week + "</span>" ), l.push( "<span>" + t.cYear + "年【" + i + "年】</span>" ), l.push( "<span>" + g_monthName[ t.lMonth - 1 ] + cDay( t.lDay ) + "</span>" ), l.push( "<span>" + r + "</span>" ), l.push( "</p>" ), l.push( "</div>" ), l.push( '<div class="calendar-suit-avoid">' ), l.push( '<div id="' + this.fitId + '" class="suit-avoid-item fz-mid"></div>' ), l.push( '<div id="' + this.badId + '" class="suit-avoid-item fz-mid"></div>' ), l.push( "</div>" ), e.html( l.join( "" ) ), gethuangli.call( this, a, n, s )
			}

			function renderRight () {
				var t = [];
				return t.push( '<div id="' + this.rightId + '" class="calendar-right">' ), t.push( "</div>" ), t.join( "" )
			}

			function renderLeft () {
				var t = [];
				return t.push( '<div class="calendar-left">' ), t.push( renderTop.call( this ) ), t.push( renderCenter.call( this ) ), t.push( "</div>" ), t.join( "" )
			}

			function getGuide ( t ) {
				for ( var e = [], a = 0; a < t.length; a++ ) {
					var n = t[ a ].guide;
					e = e.concat( n )
				}
				return e
			}

			function testGuide ( t, e, a ) {
				for ( var n = this.guide, s = {
					vacation: "休",
					work: "班",
					leave: "请"
				}, i = 0; i < n.length; i++ ) {
					var r = n[ i ];
					if ( r.year == t && r.month == e && r.day == a ) return {
						className: "current-" + ( "vacation" == r.type ? "rest" : r.type ),
						txt: s[ r.type ],
						type: "vacation" == r.type ? "rest" : r.type
					}
				}
				return ""
			}

			function getHolidayGap ( t, e, a ) {
				for ( var n = this.guide, s = 0, i = 0, r = 0, l = 0; l < n.length; l++ ) {
					var o = n[ l ];
					if ( o.year == t && o.month == e && o.day == a ) {
						r = l;
						break
					}
				}
				for ( var h = r - 1; h >= 0; h-- ) {
					var c = n[ h ];
					if ( "vacation" == c.type ) s++;
					else if ( "vacation" != c.type ) break
				}
				for ( var d = r + 1; d < n.length; d++ ) {
					var p = n[ d ];
					if ( "vacation" == p.type ) i++;
					else if ( "vacation" != p.type ) break
				}
				return {
					leftGap: s,
					rightGap: i
				}
			}

			function getClass ( t ) {
				var e = this.options,
					a = this.month,
					n = [];
				t.sMonth == a && n.push( "current-month" ), -1 != "六日".indexOf( t.week ) && n.push( "weekend" );
				var s = testGuide.call( this, t.sYear, t.sMonth, t.sDay );
				return s && n.push( s.className ), t.sYear == e.nyear && t.sMonth == e.nmonth && t.sDay == e.nday && n.push( "current-today" ), t.sYear == this.year && t.sMonth == this.month && t.sDay == this.day && n.push( "active" ), n.join( " " )
			}

			function getCellHTML ( t, e, a ) {
				var n = [];
				n.push( '<div class="calendar-date">' ), n.push( '<a class="' + getClass.call( this, t ) + '" href="javascript:void(0);" data-year="' + t.sYear + '" data-month="' + t.sMonth + '" data-day="' + t.sDay + '">' );
				var s = testGuide.call( this, t.sYear, t.sMonth, t.sDay );
				a ? s && n.push( '<i class="tips-' + s.type + '">' + s.txt + "</i>" ) : !s || "rest" != s.type && "work" != s.type && "leave" != s.type || n.push( '<i class="tips-' + s.type + '">' + s.txt + "</i>" ), n.push( '<span class="calendar-daynumber">' + t.sDay + "</span>" );
				var i = getLunarDay( t ),
					r = i.fest;
				return n.push( '<span title="' + ( r.length > 4 ? r : "" ) + '" class="calendar-almanac ' + i.className + '">' + ( "初一" == cutFestival( r ) ? g_monthName[ t.lMonth - 1 ] : cutFestival( r ) ) + "</span>" ), n.push( "</a>" ), n.push( "</div>" ), n.join( "" )
			}

			function renderTable ( t ) {
				for ( var e = this.year, a = this.month, n = ( this.day, this.options ), s = n.nyear, i = n.nmonth, r = n.nday, l = "一二三四五六日".split( "" ), o = $( "#" + this.tableId ), h = o.children(), c = h.length - 1; c >= 0; c-- ) 1 == h[ c ].nodeType && $( h[ c ] )
					.remove();
				var d = document.createElement( "tbody" );
				o.append( d );
				for ( var p = document.createElement( "tr" ), u = 0; u < l.length; u++ ) {
					var m = document.createElement( "th" );
					m.innerHTML = "<span>" + l[ u ] + "</span>", p.appendChild( m )
				}
				d.appendChild( p );
				var f = 0,
					y = new calendar( e, a - 1, s, i - 1, r );
				if ( this.day = this.day < y.length ? this.day : y.length, p = document.createElement( "tr" ), 1 != y.firstWeek )
					for ( var v = jumpMonth( -1, e, a, !0 ), g = new calendar( v.year, v.month - 1, s, i - 1, r ), _ = 0; _ < g.lastWeek; _++ ) {
						var C = g[ g.length - g.lastWeek + _ ],
							T = document.createElement( "td" );
						"一" == C.week ? T.innerHTML = getCellHTML.call( this, C, !0, !1 ) : T.innerHTML = getCellHTML.call( this, C, !1, !1 ), p.appendChild( T )
					}
				for ( var b = 0; b < y.length; b++ ) {
					var E = y[ b ],
						D = document.createElement( "td" );
					"一" == E.week ? D.innerHTML = getCellHTML.call( this, E, !0, !0 ) : D.innerHTML = getCellHTML.call( this, E, !1, !0 ), p.appendChild( D ), "日" == E.week && ( d.appendChild( p ), f++, p = document.createElement( "tr" ) )
				}
				var M = 7;
				if ( 0 == y.lastWeek && f > 4 && ( M = 0 ), o.parent()
					.attr( "class", "calenda-table" ), M > 0 )
					for ( var w = jumpMonth( 1, e, a ), k = new calendar( w.year, w.month - 1, s, i - 1, r ), L = 0; L < 7 - y.lastWeek; L++ ) {
						var x = k[ L ],
							H = document.createElement( "td" );
						H.innerHTML = getCellHTML.call( this, x ), p.appendChild( H ), "日" == x.week && d.appendChild( p )
					}
				var A = getHolidayName.call( this );
				renderTipCont.call( this, A ), t && ( renderHolidayHTML.call( this, e ), renderSelect( this.yselId, "data-year", e ) ), renderSelect( this.mselId, "data-month", a )
			}

			function renderVacationTable ( t, e ) {
				var a = this.year,
					n = this.month,
					s = this.day,
					i = this.options,
					r = i.nyear,
					l = i.nmonth,
					o = i.nday,
					h = 0,
					c = 0,
					d = 0,
					p = 0,
					u = new Date( a, n, 0 )
					.getDate(),
					m = 0 == new Date( a, n - 1, s )
					.getDay() ? 7 : new Date( a, n - 1, s )
					.getDay(),
					f = 0 == new Date( a, n - 1, u )
					.getDay() ? 7 : new Date( a, n - 1, u )
					.getDay(),
					y = ( 0 == new Date( a, n - 1, 1 )
						.getDay() || new Date( a, n - 1, 1 )
						.getDay(), 0 ),
					v = 0,
					g = 0;
				t.leftGap > 0 && s - t.leftGap <= 0 && t.leftGap <= 7 + m - 1 ? h = 1 : t.leftGap > 0 && s - t.leftGap <= 0 && t.leftGap > 7 + m - 1 && ( h = 2 ), t.rightGap > 0 && s + t.rightGap > u && f + t.rightGap <= 7 ? c = 1 : t.rightGap > 0 && s + t.rightGap > u && f + t.rightGap > 7 && ( c = 2 ), 1 == m && 1 == h ? d = 7 : 1 != m && 1 == h ? d = m - 1 : 1 == m && 2 == h ? d = 14 : 1 != m && 2 == h && ( d = m - 1 + 7 ), 7 == f && 1 == c ? p = 7 : 7 != f && 1 == c ? p = 7 - f : 7 == f && 2 == c ? p = 14 : 7 != f && 2 == c && ( p = 7 - f + 7 ), d && ( d + u <= 35 ? ( y = d, v = 35 - ( d + u ), g = u ) : ( y = d, v = 0, g = 35 - d ) ), p && ( p + u <= 35 ? ( y = 35 - ( p + u ), v = p, g = u ) : ( y = 0, v = p, g = 35 - p ) );
				for ( var _ = "一二三四五六日".split( "" ), C = $s.$( this.tableId ), T = C.childNodes, b = T.length - 1; b >= 0; b-- ) 1 == T[ b ].nodeType && C.removeChild( T[ b ] );
				var E = document.createElement( "tbody" );
				C.appendChild( E );
				for ( var D = document.createElement( "tr" ), $ = 0; $ < _.length; $++ ) {
					var M = document.createElement( "th" );
					M.innerHTML = "<span>" + _[ $ ] + "</span>", D.appendChild( M )
				}
				E.appendChild( D );
				var w = new calendar( a, n - 1, r, l - 1, o );
				if ( this.day = this.day < w.length ? this.day : w.length, ( D = document.createElement( "tr" ) )
					.className = "pd", y > 0 )
					for ( var k = jumpMonth( -1, a, n, !0 ), L = new calendar( k.year, k.month - 1, r, l - 1, o ), x = 0; x < y; x++ ) {
						var H = L[ L.length - y + x ],
							A = document.createElement( "td" );
						"一" == H.week ? ( A.innerHTML = getCellHTML.call( this, H, !0, !1 ), D.appendChild( A ) ) : "日" == H.week ? ( A.innerHTML = getCellHTML.call( this, H, !1, !1 ), D.appendChild( A ), E.appendChild( D ), D = document.createElement( "tr" ) ) : ( A.innerHTML = getCellHTML.call( this, H, !1, !1 ), D.appendChild( A ) )
					}
				if ( g > 0 )
					for ( var I = 0; I < g; I++ ) {
						var S = w.length,
							R = void 0;
						R = y > 0 ? w[ I ] : w[ S - g + I ];
						var j = document.createElement( "td" );
						"一" == R.week ? j.innerHTML = getCellHTML.call( this, R, !0, !0 ) : j.innerHTML = getCellHTML.call( this, R, !1, !0 ), D.appendChild( j ), "日" == R.week && ( E.appendChild( D ), D = document.createElement( "tr" ) )
					}
				if ( v > 0 )
					for ( var F = jumpMonth( 1, a, n ), N = new calendar( F.year, F.month - 1, r, l - 1, o ), Y = 0; Y < v; Y++ ) {
						var q = N[ Y ],
							G = document.createElement( "td" );
						G.innerHTML = getCellHTML.call( this, q ), "一" == q.week ? ( G.innerHTML = getCellHTML.call( this, q, !0, !1 ), D.appendChild( G ) ) : "日" == q.week ? ( G.innerHTML = getCellHTML.call( this, q, !1, !1 ), D.appendChild( G ), E.appendChild( D ), D = document.createElement( "tr" ) ) : ( G.innerHTML = getCellHTML.call( this, q, !1, !1 ), D.appendChild( G ) )
					}
				var P = getHolidayName.call( this );
				renderTipCont.call( this, P ), e && ( renderHolidayHTML.call( this, a ), renderSelect( this.yselId, "data-year", a ) ), renderSelect( this.mselId, "data-month", n )
			}

			function renderCenter () {
				var t = [];
				return t.push( '<div class="calenda-table">' ), t.push( '<table id="' + this.tableId + '">' ), t.push( "</table>" ), t.push( "</div>" ), t.join( "" )
			}

			function renderHolidayHTML ( t ) {
				for ( var e = [], a = [], n = $( "#" + this.holiId ), s = this.options.holiday, i = 0; i < s.length; i++ ) {
					var r = s[ i ];
					r.date.substring( 0, 4 ) == t && a.push( r )
				}
				if ( 0 != a.length ) {
					n.show()
						.find( ".select-text" )
						.html( "放假安排" );
					var l = n.find( ".select-option-default" );
					e.push( '<span data-holi="放假安排" data-date=' + this.options.nyear + "-" + this.options.nmonth + "-" + this.options.nday + ">放假安排</span>" );
					for ( var o = 0; o < a.length; o++ ) e.push( '<span data-holi="' + a[ o ].content + '" data-date="' + a[ o ].date + '">' + a[ o ].content + "</span>" );
					l.html( e.join( "" ) )
				} else n.hide()
			}

			function renderTop () {
				var t, e = this.year,
					a = this.month,
					n = this.options.holiday,
					s = this.sYear,
					i = this.eYear,
					r = [];
				r.push( '<div id="' + this.topId + '" class="calendar-top">' ), r.push( '<div class="select-common _ySelect" select-name="_ySelect" style="cursor:pointer;" data-year="' + e + '">' ), r.push( '<p class="select-text">' + e + '年</p><span class="btn-select"></span>' ), r.push( '<div class="select-option-default" id="' + this.yselId + '">' );
				for ( var l = s; l <= i; l++ ) t = l == e ? "active" : "", r.push( '<span class="' + t + '" data-year="' + l + '">' + l + "年</span>" );
				r.push( "</div>" ), r.push( "</div>" ), r.push( '<div class="calendar-month-select">' ), r.push( '<a class="left-btn" href="javascript:void(0);"><i></i></a>' ), r.push( '<a class="right-btn" href="javascript:void(0);"><i></i></a>' ), r.push( '<div class="select-common _mSelect" select-name="_mSelect" style="cursor:pointer;" data-month="' + a + '"><p class="select-text">' + a + '月</p><span class="btn-select"></span>' ), r.push( '<div id="' + this.mselId + '" class="select-option-default">' );
				for ( var o = 1; o <= 12; o++ ) t = o == a ? "active" : "", r.push( '<span class="' + t + '" data-month="' + o + '">' + o + "月</span>" );
				r.push( "</div>" ), r.push( "</div>" ), r.push( "</div>" ), r.push( '<div class="select-common _hSelect" select-name="_hSelect" style="cursor:pointer;width:90px" id="' + this.holiId + '">' ), r.push( '<p class="select-text">放假安排</p><span class="btn-select"></span>' ), r.push( '<div class="select-option-default">' ), r.push( '<span class="active" data-holi="放假安排" data-date=' + this.options.nyear + "-" + this.options.nmonth + "-" + this.options.nday + ">放假安排</span>" );
				for ( var h = 0; h < n.length; h++ ) {
					var c = n[ h ];
					r.push( "<span data-date=" + c.date + ">" + c.content + "</span>" )
				}
				return r.push( "</div>" ), r.push( "</div>" ), r.push( '<a href="javascript:void(0);" class="btn-default backBtn">回到今天</a>' ), r.push( "</div>" ), r.join( "" )
			}

			function renderTip () {
				var t = document.createElement( "div" );
				t.id = this.tipId, t.className = "calendar_text", t.style.display = "none", $( "#" + this.id )
					.parent()
					.append( t )
			}

			function renderTipHtml ( t ) {
				for ( var e = t.tips, a = $( "#" + this.tipId ), n = [], s = 0; s < e.length; s++ ) {
					var i = e[ s ];
					n.push( '<p class="space-txt fz-mid">' + i.col1 + "</p>" ), i.col2 && n.push( '<p class="space-txt fz-mid">' + i.col2 + "</p>" )
				}
				a.html( n.join( "" ) )
					.show()
			}

			function renderTipCont ( t ) {
				$( "#" + this.tipId )
					.hide();
				for ( var e, a = this.options.holiday, n = {
					year: this.year,
					month: this.month,
					day: this.day
				}, s = 0; s < a.length; s++ )
					if ( ( e = a[ s ] )
						.content == t && isCurHolidayDate( n, e.guide ) ) {
						renderTipHtml.call( this, e );
						break
					}
			}

			function isCurHolidayDate ( t, e ) {
				for ( var a, n, s, i = !1, r = 0, l = e.length; r < l; r++ ) a = e[ r ].year, n = e[ r ].month, s = e[ r ].day, t.year == a && t.month == n && t.day == s && ( i = !0 );
				return i
			}

			function renderSelect ( t, e, a ) {
				$( "#" + t )
					.find( "span" )
					.each( ( function ( t, n ) {
						$( n )
							.attr( e ) == a ? $( n )
							.addClass( "active" ) : $( n )
							.removeClass( "active" )
					} ) )
			}

			function $calendar ( t, e, a ) {
				this.id = t + e, this.options = a || {};
				var n = this.options;
				n.holiday = n.holiday || {}, this.guide = getGuide( n.holiday ), this.topId = t + "top" + e, this.cenId = t + "cenId" + e, this.rightId = t + "rId" + e, this.tableId = t + "table" + e, this.fitId = t + "fit" + e, this.badId = t + "bad" + e, this.tipId = t + "tip" + e, this.holiId = t + "holi" + e, this.yselId = t + "ysel" + e, this.mselId = t + "msel" + e, this.huangliId = t + "huangli" + e, this.sYear = 1901, this.eYear = 2049, this.year = n.year, this.month = n.month, this.day = n.day || 1, $( "#" + this.id )
					.html( renderCalendar.call( this ) ), renderTip.call( this ), renderTable.call( this, !0 ), renderRightCont.call( this ), bindEvent.call( this )
			}
			var _sel = "1223";

			function selClick ( t, e, a ) {
				var n = $( e )
					.parent(),
					s = $( e )
					.parent()
					.parent();
				if ( !$( e )
					.hasClass( "active" ) ) {
					$( e )
						.addClass( "active" )
						.siblings()
						.removeClass( "active" );
					var i = +$( e )
						.attr( "data-year" );
					s.attr( "data-year", i )
						.find( ".select-text" )
						.html( i + "年" );
					var r = a.year != i;
					a.year = i, changeBtnStatus.call( a ), s.removeClass( "select-open" ), renderTable.call( a, r ), renderRightCont.call( a ), "function" == typeof a.options.yearClick && a.options.yearClick.call( n ), _sel = t
				}
			}

			function getHolidayName () {
				for ( var t = this.year, e = this.month, a = this.day, n = this.options.holiday, s = 0; s < n.length; s++ )
					for ( var i = n[ s ].guide, r = n[ s ].content, l = 0; l < i.length; l++ ) {
						var o = i[ l ];
						if ( o.year == t && o.month == e && o.day == a ) return r
					}
				return ""
			}

			function jump ( t, e ) {
				var a = t.year,
					n = t.month;
				if ( a != minYear || 1 != n || -1 != e ) {
					var s = jumpMonth( e, a, n ),
						i = t.year != s.year;
					t.year = s.year, t.month = s.month;
					var r = $( "#" + t.id );
					r.find( "._ySelect" )
						.attr( "data-year", s.year )
						.find( ".select-text" )
						.html( s.year + "年" ), r.find( "._mSelect" )
						.attr( "data-month", s.month )
						.find( ".select-text" )
						.html( s.month + "月" ), renderTable.call( t, i ), renderRightCont.call( t ), "function" == typeof t.options.jumpClick && t.options.jumpClick.call( this, e )
				}
			}

			function changeBtnStatus () {
				var t = $( "#" + this.id );
				this.year == maxYear && 12 == this.month ? ( t.find( ".left-btn" )
					.removeClass( "no-link" ), t.find( ".right-btn" )
					.addClass( "no-link" ) ) : this.year == minYear && 1 == this.month ? ( t.find( ".left-btn" )
					.addClass( "no-link" ), t.find( ".right-btn" )
					.removeClass( "no-link" ) ) : ( t.find( ".left-btn" )
					.removeClass( "no-link" ), t.find( ".right-btn" )
					.removeClass( "no-link" ) )
			}

			function bindEvent () {
				var t = this,
					e = $( "#" + t.id );
				e.on( "click", ".select-common", ( function () {
						$( this )
							.hasClass( "select-open" ) ? $( this )
							.removeClass( "select-open" ) : ( e.find( ".select-common" )
								.removeClass( "select-open" ), $( this )
								.addClass( "select-open" ) );
						var t = $( this )
							.find( ".select-option-default" );
						if ( "_ySelect" == $( this )
							.attr( "select-name" ) ) {
							_sel = "_ySelect";
							var a = $( this )
								.attr( "data-year" ) - 1900 - 3;
							a = a > 0 ? a : 0, setTimeout( ( function () {
								t.scrollTop( 26 * a )
							} ), 50 )
						} else _sel = $( this )
							.attr( "select-name" )
					} ) )
					.on( "click", "._ySelect .select-option-default span", ( function ( e ) {
						e.preventDefault(), e.stopPropagation(), selClick( "_ySelect", this, t )
					} ) )
					.on( "click", "._mSelect .select-option-default span", ( function ( e ) {
						if ( e.preventDefault(), e.stopPropagation(), !$( this )
							.hasClass( "active" ) ) {
							$( this )
								.addClass( "active" )
								.siblings()
								.removeClass( "active" );
							var a = $( this )
								.parent(),
								n = $( this )
								.parent()
								.parent(),
								s = +$( this )
								.attr( "data-month" );
							n.find( ".select-text" )
								.html( s + "月" )
								.attr( "data-month", s )
								.parents( ".select-common" )
								.removeClass( "select-open" ), t.month = s, changeBtnStatus.call( t ), renderTable.call( t ), renderRightCont.call( t ), "function" == typeof t.options.monthClick && t.options.monthClick.call( a )
						}
					} ) )
					.on( "click", "._hSelect .select-option-default span", ( function ( e ) {
						if ( e.stopPropagation(), !$( this )
							.hasClass( "active" ) ) {
							$( this )
								.addClass( "active" )
								.siblings()
								.removeClass( "active" );
							var a = $( this )
								.attr( "data-date" );
							if ( a ) {
								var n = a.split( "-" );
								t.year = +n[ 0 ], t.month = +n[ 1 ], t.day = +n[ 2 ], changeBtnStatus.call( t ), $( this )
									.parent()
									.parent()
									.removeClass( "select-open" )
									.find( ".select-text" )
									.html( $( this )
										.attr( "data-holi" ) );
								var s = $( "#" + t.id ),
									i = s.find( "._ySelect" ),
									r = i.find( ".select-text" )
									.html()
									.split( "年" )[ 0 ];
								i.attr( "data-year", n[ 0 ] )
									.find( ".select-text" )
									.html( n[ 0 ] + "年" ), s.find( "._mSelect" )
									.attr( "data-month", n[ 1 ] )
									.find( ".select-text" )
									.html( n[ 1 ] + "月" );
								var l = t.year != r,
									o = getHolidayGap.call( t, t.year, t.month, t.day );
								t.day - o.leftGap >= 1 && new Date( t.year, t.month, 0 )
									.getDate() >= t.day + o.rightGap ? renderTable.call( t, l ) : renderVacationTable.call( t, o, l ), renderRightCont.call( t ), renderTipCont.call( t, $( this )
										.html() ), "function" == typeof t.options.holidayClick && t.options.holidayClick.call( this )
							}
						}
					} ) )
					.on( "click", ".backBtn", ( function ( e ) {
						var a = t.options,
							n = t.year != a.nyear;
						t.year = a.nyear, t.month = a.nmonth, t.day = a.nday;
						var s = $( "#" + t.id );
						s.find( "._ySelect" )
							.attr( "data-year", a.nyear )
							.find( ".select-text" )
							.html( a.nyear + "年" ), s.find( "._mSelect" )
							.attr( "data-month", a.nmonth )
							.find( ".select-text" )
							.html( a.nmonth + "月" ), s.find( "._hSelect" )
							.find( ".select-text" )
							.html( "放假安排" ), changeBtnStatus.call( t ), renderTable.call( t, n ), renderRightCont.call( t ), "function" == typeof t.options.backClick && t.options.backClick.call( this )
					} ) )
					.on( "click", "#" + t.tableId + " .calendar-date a", ( function ( a ) {
						var n = $( this )
							.attr( "data-year" ),
							s = $( this )
							.attr( "data-month" ),
							i = $( this )
							.attr( "data-day" ),
							r = t.year != n;
						( t.year = n, t.month = s, t.day = i, t.year >= 1901 ) && ( e.find( "._ySelect" )
							.attr( "data-year", n )
							.find( ".select-text" )
							.html( n + "年" ), e.find( "._mSelect" )
							.attr( "data-month", s )
							.find( ".select-text" )
							.html( s + "月" ), renderTable.call( t, r ) );
						changeBtnStatus.call( t ), renderRightCont.call( t ), "function" == typeof t.options.dateClick && t.options.dateClick.call( $( this ) )
					} ) ), e.on( "click", ".left-btn", ( function () {
						t.year == minYear && 2 == t.month && e.find( ".left-btn" )
							.addClass( "no-link" ), e.find( ".right-btn" )
							.removeClass( "no-link" ), jump( t, -1 )
					} ) )
					.on( "click", ".right-btn", ( function () {
						t.year == maxYear && 11 == t.month && e.find( ".right-btn" )
							.addClass( "no-link" ), e.find( ".left-btn" )
							.removeClass( "no-link" ), jump( t, 1 )
					} ) )
					.on( "click", ".calendar-right", ( function () {
						var a = e.find( ".calendar-day-info" )
							.attr( "data-href" );
						window.uigsPB( t.huangliId ), window.open( a )
					} ) ), $( "body" )
					.click( ( function ( e ) {
						$( "#" + t.id )
							.find( ".select-common" )
							.each( ( function ( t, e ) {
								$( e )
									.hasClass( _sel ) || $( e )
									.removeClass( "select-open" )
							} ) ), _sel = "1234"
					} ) )
			}

			function filterArray ( t ) {
				for ( var e = [], a = [], n = 0, s = 0; s < t.length; s++ ) t[ s ].length <= 3 && t[ s ].length >= 2 && e.push( t[ s ] );
				e = sortArray( e );
				for ( var i = 0; i < e.length; i++ ) ++n <= 7 && a.push( e[ i ] );
				return a
			}

			function sortArray ( t ) {
				return t.sort( ( function ( t, e ) {
					return t.length - e.length
				} ) )
			}

			function gethuangli ( y, m, d ) {
				var that = this;
				m < 10 && ( m = "0" + m ), d < 10 && ( d = "0" + d );
				var str = y + "%C4%EA" + m + "%D4%C2" + d + "%C8%D5";
				return new Ajax( {
					url: "/websearch/features/baibao/calendar_ajax.jsp?query=" + str,
					method: "get",
					onComplete: function onComplete ( request ) {
						var result = request.responseText;
						if ( eval( "result=(" + result + ")" ), result.error ) $s.$( that.fitId )
							.innerHTML = "", $s.$( that.badId )
							.innerHTML = "";
						else {
							var fit = result.fit,
								bad = result.bad;
							fit = filterArray( fit.split( /\s+/ ) ), bad = filterArray( bad.split( /\s+/ ) );
							var fitHtml = [];
							fitHtml.push( '<div class="fz-bigger">宜</div>' );
							for ( var i = 0; i < fit.length; i++ ) fitHtml.push( "<span>" + fit[ i ] + "</span>" );
							var badHtml = [];
							badHtml.push( '<div class="fz-bigger">忌</div>' );
							for ( var _i15 = 0; _i15 < bad.length; _i15++ ) badHtml.push( "<span>" + bad[ _i15 ] + "</span>" );
							$( "#" + that.fitId )
								.html( fitHtml.join( "" ) ), $( "#" + that.badId )
								.html( badHtml.join( "" ) )
						}
					},
					onError: function ( t ) {}
				} ), !1
			}
			return $calendar
		}.apply( exports, __WEBPACK_AMD_DEFINE_ARRAY__ ), __WEBPACK_AMD_DEFINE_RESULT__ === undefined || ( module.exports = __WEBPACK_AMD_DEFINE_RESULT__ )
	}, function ( t, e ) {
		t.exports = __WEBPACK_EXTERNAL_MODULE__1__
	}, function ( t, e ) {
		t.exports = __WEBPACK_EXTERNAL_MODULE__2__
	} ] )
} ) );