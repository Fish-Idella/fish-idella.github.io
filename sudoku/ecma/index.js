(function () {

    const data = [];
    const tbody = document.getElementById("sudoku").querySelector('tbody');

    let current = null;

    const onSelect = function (ev) {
        const arr = this.id.split('.');
        current = null;
        if ('data' === arr[0]) {
            let obj = data;
            for (let i = 1; i < 4; i++) {
                obj = obj[arr[i]];
            }
            current = obj;
        }
        console.log(current)
    };

    for (let i = 0; i < 9; i++) {
        const row = [];
        const tr = document.createElement("tr");
        for (let j = 0; j < 9; j++) {
            const td = document.createElement('td');
            td.textContent = 0;
            td.id = `data.${i}.children.${j}`;
            td.addEventListener('click', onSelect);
            row.push({ target: td, value: 0 });
            tr.appendChild(td);
        }
        data.push({ target: tr, children: row });
        tbody.appendChild(tr);
    }

    console.log(data);

}());

function solveSudoku(board) {
	const n = board.length;
	const sqrtN = Math.floor(Math.sqrt(n));
	const rows = Array.from(Array(n), () => new Set());
	const cols = Array.from(Array(n), () => new Set());
	const boxes = Array.from(Array(n), () => new Set());
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < n; j++) {
			if (board[i][j] !== '.') {
				const digit = parseInt(board[i][j]);
				rows[i].add(digit);
				cols[j].add(digit);
				const boxIndex = Math.floor(i / sqrtN) * sqrtN + Math.floor(j / sqrtN);
				boxes[boxIndex].add(digit);
			}
		}
	}

	function backtrack(row, col) {
		if (row === n) {
			return true;
		}
		if (col === n) {
			return backtrack(row + 1, 0);
		}
		if (board[row][col] !== '.') {
			return backtrack(row, col + 1);
		}
		for (let digit = 1; digit <= n; digit++) {
			if (isValid(row, col, digit)) {
				placeDigit(row, col, digit);
				if (backtrack(row, col + 1)) {
					return true;
				}
				removeDigit(row, col, digit);
			}
		}
		return false;
	}

	function isValid(row, col, digit) {
		return !rows[row].has(digit) && !cols[col].has(digit) && !boxes[Math.floor(row / sqrtN) * sqrtN + Math.floor(col / sqrtN)].has(digit);
	}

	function placeDigit(row, col, digit) {
		board[row][col] = String(digit);
		rows[row].add(digit);
		cols[col].add(digit);
		const boxIndex = Math.floor(row / sqrtN) * sqrtN + Math.floor(col / sqrtN);
		boxes[boxIndex].add(digit);
	}

	function removeDigit(row, col, digit) {
		board[row][col] = '.';
		rows[row].delete(digit);
		cols[col].delete(digit);
		const boxIndex = Math.floor(row / sqrtN) * sqrtN + Math.floor(col / sqrtN);
		boxes[boxIndex].delete(digit);
	}
    
	backtrack(0, 0);
}


const board = [
	['5', '3', '.', '.', '7', '.', '.', '.', '.'],
	['6', '.', '.', '1', '9', '5', '.', '.', '.'],
	['.', '9', '8', '.', '.', '.', '.', '6', '.'],
	['8', '.', '.', '.', '6', '.', '.', '.', '3'],
	['4', '.', '.', '8', '.', '3', '.', '.', '1'],
	['7', '.', '.', '.', '2', '.', '.', '.', '6'],
	['.', '6', '.', '.', '.', '.', '2', '8', '.'],
	['.', '.', '.', '4', '1', '9', '.', '.', '5'],
	['.', '.', '.', '.', '8', '.', '.', '7', '9']
];

solveSudoku(board);

console.log("Solution:");
board.forEach(row => {
	console.log(row.join(' '));
});