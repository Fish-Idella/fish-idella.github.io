var LAppDefine = {
    
    
    DEBUG_LOG : true,
    DEBUG_MOUSE_LOG : false, 
    // DEBUG_DRAW_HIT_AREA : false, 
    // DEBUG_DRAW_ALPHA_MODEL : false, 
    
    
    
    
    VIEW_MAX_SCALE : 2,
    VIEW_MIN_SCALE : 0.1,

    VIEW_LOGICAL_LEFT : -1,
    VIEW_LOGICAL_RIGHT : 1,

    VIEW_LOGICAL_MAX_LEFT : -2,
    VIEW_LOGICAL_MAX_RIGHT : 2,
    VIEW_LOGICAL_MAX_BOTTOM : -2,
    VIEW_LOGICAL_MAX_TOP : 2,
    
    
    PRIORITY_NONE : 0,
    PRIORITY_IDLE : 1,
    PRIORITY_NORMAL : 2,
    PRIORITY_FORCE : 3,
    
    
    BACK_IMAGE_NAME : "assets/image/back_class_normal.png",

    
    // 可选模型列表（下拉切换）
    // 优先使用 model-list.js 提供的完整清单（window.LIVE2D_MODEL_LIST），
    // 未加载该文件时回退到下面内置的精简列表。
    MODEL_LIST : (typeof window !== "undefined" && window.LIVE2D_MODEL_LIST && window.LIVE2D_MODEL_LIST.length)
        ? window.LIVE2D_MODEL_LIST
        : [
        { name : "95式", path : "assets/live2d/95type_405/95type_405.model.json" },
        { name : "AA-12", path : "assets/live2d/aa12_2403/aa12_2403.model.json" },
        { name : "ADS", path : "assets/live2d/ads_3601/ads_3601.model.json" },
        { name : "AK-12", path : "assets/live2d/ak12_3302/ak12_3302.model.json" },
        { name : "AN-94", path : "assets/live2d/an94_3303/an94_3303.model.json" },
        { name : "卡尔卡诺1891", path : "assets/live2d/carcano1891_2201/carcano1891_2201.model.json" },
        { name : "卡尔卡诺1938", path : "assets/live2d/carcano1938_2202/carcano1938_2202.model.json" },
        { name : "CBJ-MS", path : "assets/live2d/cbjms_3503/cbjms_3503.model.json" },
        { name : "Contender", path : "assets/live2d/contender_2302/contender_2302.model.json" },
        { name : "DSR-50(1801)", path : "assets/live2d/dsr50_1801/dsr50_1801.model.json" },
        { name : "DSR-50(2101)", path : "assets/live2d/dsr50_2101/dsr50_2101.model.json" },
        { name : "Epsilon2.1", path : "assets/live2d/Epsilon2.1/Epsilon2.1.model.json" },
        { name : "FN-57", path : "assets/live2d/fn57_2203/fn57_2203.model.json" },
        { name : "G36", path : "assets/live2d/g36_2407/g36_2407.model.json" },
        { name : "G36C", path : "assets/live2d/g36c_1202/g36c_1202.model.json" },
        { name : "G41", path : "assets/live2d/g41_2401/g41_2401.model.json" },
        { name : "格琳娜", path : "assets/live2d/gelina/gelina.model.json" },
        { name : "灰熊", path : "assets/live2d/grizzly_2102/grizzly_2102.model.json" },
        { name : "Haru", path : "assets/live2d/haru/haru.model.json" },
        { name : "HK416(805)", path : "assets/live2d/hk416_805/hk416_805.model.json" },
        { name : "HK416(3401)", path : "assets/live2d/hk416_3401/hk416_3401.model.json" },
        { name : "K2", path : "assets/live2d/k2_3301/k2_3301.model.json" },
        { name : "小春", path : "assets/live2d/koharu/koharu.model.json" },
        { name : "KP31(310)", path : "assets/live2d/kp31_310/kp31_310.model.json" },
        { name : "KP31(1103)", path : "assets/live2d/kp31_1103/kp31_1103.model.json" },
        { name : "KP31(3101)", path : "assets/live2d/kp31_3101/kp31_3101.model.json" },
        { name : "刘易斯", path : "assets/live2d/lewis_3502/lewis_3502.model.json" },
        { name : "M950A", path : "assets/live2d/m950a_2303/m950a_2303.model.json" },
        { name : "M1928A1", path : "assets/live2d/m1928a1_1501/m1928a1_1501.model.json" },
        { name : "李-恩菲尔德", path : "assets/live2d/mlemk1_604/mlemk1_604.model.json" },
        { name : "NTW-20", path : "assets/live2d/ntw20_2301/ntw20_2301.model.json" },
        { name : "OTs-14(1203)", path : "assets/live2d/ots14_1203/ots14_1203.model.json" },
        { name : "OTs-14(3001)", path : "assets/live2d/ots14_3001/ots14_3001.model.json" },
        { name : "PKP", path : "assets/live2d/pkp_1201/pkp_1201.model.json" },
        { name : "PX4 Storm", path : "assets/live2d/px4storm_2801/px4storm_2801.model.json" },
        { name : "R93", path : "assets/live2d/r93_3501/r93_3501.model.json" },
        { name : "RFB", path : "assets/live2d/rfb_1601/rfb_1601.model.json" },
        { name : "SAT8(2601)", path : "assets/live2d/sat8_2601/sat8_2601.model.json" },
        { name : "SAT8(3602)", path : "assets/live2d/sat8_3602/sat8_3602.model.json" },
        { name : "Shizuku", path : "assets/live2d/shizuku/shizuku.model.json" },
        { name : "Type64", path : "assets/live2d/type64-ar_2901/type64-ar_2901.model.json" },
        { name : "Type88", path : "assets/live2d/type88_3504/type88_3504.model.json" },
        { name : "UMP9", path : "assets/live2d/ump9_3404/ump9_3404.model.json" },
        { name : "UMP45", path : "assets/live2d/ump45_3403/ump45_3403.model.json" },
        { name : "Vector", path : "assets/live2d/vector_1901/vector_1901.model.json" },
        { name : "WA2000", path : "assets/live2d/wa2000_6/wa2000_6.model.json" },
        { name : "Wanko", path : "assets/live2d/wanko/wanko.model.json" },
        { name : "Welrod", path : "assets/live2d/welrod_1401/welrod_1401.model.json" }
    ],
    
    MOTION_GROUP_IDLE : "idle", 
    MOTION_GROUP_TAP_BODY : "tap_body", 
    MOTION_GROUP_FLICK_HEAD : "flick_head", 
    MOTION_GROUP_PINCH_IN : "pinch_in", 
    MOTION_GROUP_PINCH_OUT : "pinch_out", 
    MOTION_GROUP_SHAKE : "shake", 

    
    HIT_AREA_HEAD : "head",
    HIT_AREA_BODY : "body"
    
};
