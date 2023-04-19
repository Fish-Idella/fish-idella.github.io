<?php

// 语言强制
@header("content-Type: application/json; charset=utf-8");

require("mysql.php");

// 连接数据库
$conn = mysqli_connect(MYSQL_SERVER_NAME, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE);

//连接数据库错误提示
if (mysqli_connect_errno($conn)) { 
    die("连接 MySQL 失败: " . mysqli_connect_error()); 
}

function getArrayById($sql)
{
	global $conn;
	
	// 执行查询语句
	// 如果查询结果有效
	if ($query = mysqli_query($conn, $sql)) {
		// 遍历查询结果并填充到数组中
		while ($row = mysqli_fetch_array($query, MYSQLI_ASSOC)) {
			return $row;
			// array(
			// 	'name' => $row['name'], 
			// 	'sign' => $row['sign'], 
			// 	'gender' => $row['gender'],  
			// 	'birthday' => $row['birthday'], 
			// 	'father' => $row['father'], 
			// 	'mother' => $row['mother'], 
			// 	'spouses' => json_decode($row['spouses'], true), 
			// 	'siblings' => json_decode($row['siblings'], true), 
			// 	'children' => json_decode($row['children'], true), 
			// 	'residence' => $row['residence'],
			// 	'photos' => json_decode($row['photos'], true),
			// 	'life' => $row['life']
			// );
		}
	}

	return null;
}

$result = array();
$relevant = array();

if ("{$_POST['key']}" == "id") {
	
	if (($arr = getArrayById("SELECT * FROM `family` WHERE `id` = '{$_POST['value']}'")) != null) {

		array_push($result, $arr);

		// 如果有 oneself 字段，不获取相关成员的信息
		if ("{$_POST['oneself']}" != "true") {

			if (is_numeric($arr['father'])) {
				$sql = "SELECT * FROM `family` WHERE `id` = '{$arr['father']}'";
				array_push($relevant, getArrayById($sql));
			}

			if (is_numeric($arr['mother'])) {
				$sql = "SELECT * FROM `family` WHERE `id` = '{$arr['mother']}'";
				array_push($relevant, getArrayById($sql));
			}

			if (is_array($spouses = json_decode( $arr['spouses'], true) )) {
				foreach ($spouses as $value) {
					if (is_numeric($value)) {
						$sql = "SELECT * FROM `family` WHERE `id` = '{$value}'";
						array_push($relevant, getArrayById($sql));
					}
				}
			}

			if (is_array($siblings = json_decode( $arr['siblings'], true) )) {
				foreach ($siblings as $value) {
					if (is_numeric($value)) {
						$sql = "SELECT * FROM `family` WHERE `id` = '{$value}'";
						array_push($relevant, getArrayById($sql));
					}
				}
			}

			if (is_array($children = json_decode( $arr['children'], true) )) {
				foreach ($children as $value) {
					if (is_numeric($value)) {
						$sql = "SELECT * FROM `family` WHERE `id` = '{$value}'";
						array_push($relevant, getArrayById($sql));
					}
				}
			}

		}
	}

} else {
	// 查找 至少1个中文字符 或 3个英文字符
	if (strlen($_POST['value']) > 2) {
		$sql = "SELECT * FROM `family` WHERE {$_POST['key']} LIKE '%{$_POST['value']}%'";
		
		// 执行查询语句
		// 如果查询结果有效
		if ($query = mysqli_query($conn, $sql)) {
			// 遍历查询结果并填充到数组中
			while ($row = mysqli_fetch_array($query, MYSQLI_ASSOC)) {
				array_push($result, $row);
			}
		}
	}
	
}

echo json_encode(array("result" => $result, "relevant" => $relevant));

// 关闭数据库
mysqli_close($conn);

?>