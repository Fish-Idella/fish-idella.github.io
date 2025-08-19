<?php

// 语言强制
@header("content-Type: application/json; charset=utf-8");

require("mysql.php");

/**
 * 获取元素在数组中的索引，不存在返回 -1
 * 
 * @param $b 数组
 * @param $a 要查找的元素
 */
function array_indexOf($b, $a)
{
	$num = count($b);
	for ($i = 0; $i < $num; $i++) {
		if ($b[$i] == $a) {
			return $i;
		}
	}

	return -1;
}

/*
 * 更新与相关人员的关系，只能属性是数组有效
 * 
 * @param $other 相关人员的id
 * @param $myselfId 当前录入成员的id
 * @param $myselfName 当前录入成员的名字
 * @param $attr 当前录入成员在相关人员的信息中的位置
 * 
 */
function updateRelevantPersonnelInformation($other, $myselfId, $myselfName, $attr)
{

	global $conn;

	# 如果 $other 是数字，则判定此数字为长辈的 id
	if (is_numeric($other)) {

		// 语句 通过 id 获取长辈信息中的 $attr 字段
		$sql = "SELECT `{$attr}` FROM `family` WHERE `id` = {$other}";

		// 如果查询成功
		if ($query = mysqli_query($conn, $sql)) {
			// 遍历查询结果，虽然只有一个
			while ($row = mysqli_fetch_array($query, MYSQLI_ASSOC)) {

				// 获取
				$attribute = json_decode($row[$attr], true);
				
				if (is_null($attribute)) {
					$attribute = array();
				}

				$i = array_indexOf($attribute, $myselfName);

				if ($i >= 0) {
					// 如果存在就更新
					$attribute[$i] = $myselfId;
				} else {
					// 如果不存在就添加
					array_push($attribute, $myselfId);
				}

				// 转换为JSON字符串
				$attributeJson = json_encode($attribute, JSON_UNESCAPED_UNICODE);

				// 更新数据库
				$sql = "UPDATE `family` SET `{$attr}` = '{$attributeJson}' WHERE `family`.`id` = {$other}";

				mysqli_query($conn, $sql);

			}
		}

	}
}

// 高度重合的数据
function isHighCoincidence($row, $obj)
{

	$arr = array("sign", "gender", "father", "residence");

	foreach ($arr as $key) {
		// 属性不相同并且不为 null
		if (($row[$key] != null) && (strcmp($row[$key], $obj[$key]) != 0)) {
			// 有一条不相同则全部不相同
			return false;
		}
	}

	// 全部相同
	return true;
}

$result = array(
	"status" => array("DONE" => 1, "FAIL" => 0, "EXIST" => 2),
	"message" => "",
	"result" => 0,
	"id" => -1
);

function add()
{
	global $result;
	global $conn;

	$name = $_POST['name'];

	// 如果名字为空
	if (strcmp($name, "") == 0) {
		$result['message'] = "数据无效";
		return;
	}

	// ！！！ 强制写入数据
	if ($_POST['enforce'] != "true") {
		// 查询是否存在同名条目
		$sql = "SELECT * FROM `family` WHERE `name` = '{$name}'";

		if ($query = mysqli_query($conn, $sql)) {
			// 遍历查询结果并填充到数组中
			while ($row = mysqli_fetch_array($query, MYSQLI_ASSOC)) {
				if (isHighCoincidence($row, $_POST)) {
					$result['message'] = "存在高度重合的数据";
					$result['id'] = $row['id'];
					$result['result'] = 2;
					return;
				}
			}
		}
	}

	// 性别
	$gender = (is_numeric($_POST['gender']) ? ($_POST['gender'] == '0' ? 0 : 1) : 2);
	// 根据性别确定是 爸爸 还是 妈妈
	$parent = ($gender == 0) ? 'mother' : 'father';

	$sql = "INSERT INTO `family` (`name`, `sign`, `gender`, `birthday`, `father`, `mother`, `spouses`, `siblings`, `children`, `residence`, `disabled`) VALUES ('{$_POST['name']}', '{$_POST['sign']}', {$gender}, '{$_POST['birthday']}', '{$_POST['father']}', '{$_POST['mother']}', '{$_POST['spouses']}', '{$_POST['siblings']}', '{$_POST['children']}', '{$_POST['residence']}', '0')";

	if (mysqli_query($conn, $sql)) {

		$id = mysqli_insert_id($conn);

		$result['result'] = 1;
		$result['message'] = "新记录插入成功";
		$result['id'] = $id;

		// 更新父母的数据库信息
		updateRelevantPersonnelInformation($_POST['father'], $id, $_POST['name'], "children");
		updateRelevantPersonnelInformation($_POST['mother'], $id, $_POST['name'], "children");

		// 更新配偶的信息
		$spouses = json_decode($_POST['spouses'], true);
		if (is_array($spouses)) {
			foreach ($spouses as $value) {
				if (is_numeric($value)) {
					updateRelevantPersonnelInformation($value, $id, $_POST['name'], "spouses");
				}
			}
		}

		// 更新兄弟姐妹的信息
		$siblings = json_decode($_POST['siblings'], true);
		if (is_array($siblings)) {
			foreach ($siblings as $value) {
				if (is_numeric($value)) {
					updateRelevantPersonnelInformation($value, $id, $_POST['name'], "siblings");
				}
			}
		}

		// 更新后代的信息
		$children = json_decode($_POST['children'], true);
		if (is_array($children)) {
			foreach ($children as $value) {
				if (is_numeric($value)) {
					// 更新数据库
					$sql = "UPDATE `family` SET `{$parent}` = '{$id}' WHERE `family`.`id` = {$value}";
					mysqli_query($conn, $sql);
				}
			}
		}

	} else {
		$result['message'] = mysqli_error($conn);
	}

}


$conn = mysqli_connect(MYSQL_SERVER_NAME, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE); //连接数据库

//连接数据库错误提示
if (mysqli_connect_errno($conn)) { 
    die("连接 MySQL 失败: " . mysqli_connect_error());
} else {
	add();
}

echo json_encode($result);

mysqli_close($conn);

?>