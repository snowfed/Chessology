/**
 * (c) snowfed, 2018
 */

var snowfed_chess_game = {
	filename: 'chess_state.txt',
	flipped: true,
	nxsquares: 12,
	chessboard: new Array (8 * 12), //(8 * snowfed_chess_game.nxsquares),
	chessboard_saved: null,
	chess_pieces: ["&#9812;", "&#9813;", "&#9814;", "&#9815;", "&#9816;", "&#9817;", // white
		"&#9818;", "&#9819;", "&#9820;", "&#9821;", "&#9822;", "&#9823;"], // black
	chess_race: "wwwwwwbbbbbb",
	chess_pieces_txt: "KQRBN KQRBN ",
	move_number: 0,
	game_id: null, // uninitialized
	frame_id: 0, // number of steps back from the latest chess move (currently unused)
	sendrecv_state: 0,
	last_square: "Z0",
	list_of_moves: "",
	standard_number_length: 2, // number of bytes
	standard_message_length: 4, // number of bytes (symbols)
};


function play_piece_drop_sound()
{
	if (document.getElementById('play_sound').checked) {
		$("#piece_moved").trigger("play");
	}
}

function num2str (number)
{
	var res = '';
	if (number == null) return;
	while (number > 0) {
		res = String.fromCharCode(number & 0xFF) + res;
		number >>= 8;
	}
	return res;
}

function str2num (str_number)
{
	var res = 0;
	for (var i = 0; i < str_number.length; ++i) {
		res = (res << 8) + str_number.charCodeAt(i);
	}
	return res;
}

function num2str_fixed (number, length)
{
	var res = num2str(number);
	if (res.length > length) {
		console.log('Overflow in num2str_fixed!', length, res.length, number);
		return num2str((256 << ((length-1)<<3)) - 1);
	}
	return '\0'.repeat(length-res.length) + res;
}

function chess_state_to_string ()
{
	if (snowfed_chess_game.game_id == null) { // generate a random new game id
		var id_limit = (1 << (8 << snowfed_chess_game.standart_number_length)); // 8^num_bytes
		snowfed_chess_game.game_id = Math.floor((Math.random() * id_limit) + 1);
	}
	var numbers = [snowfed_chess_game.game_id, snowfed_chess_game.move_number, snowfed_chess_game.frame_id];
	if ($('#debug_mode').prop("checked")) {
		console.log('IDs (send):', numbers[0], numbers[1], numbers[2]);
	}
	var chess_string = "";
	for (var i = 0; i < numbers.length; ++i)
		chess_string += num2str_fixed(numbers[i], snowfed_chess_game.standard_number_length);
	chess_string += '?'.repeat(snowfed_chess_game.standard_message_length);
	chess_string += snowfed_chess_game.list_of_moves;
	return chess_string;
}

function string_to_chess_state (board_string)
{
	// Extract data.
	var numbers = new Array (3); // [game_id, move_id, frame_id]
	var k = snowfed_chess_game.standard_number_length;
	for (var i = 0; i < numbers.length; ++i)
		numbers[i] = str2num(board_string.slice(i*k, (i+1)*k));
	var m = k * numbers.length;
	var message = board_string.slice(m, m + snowfed_chess_game.standard_message_length);
	var new_list_of_moves = board_string.slice(m + snowfed_chess_game.standard_message_length);
	var game_id = numbers[0];
	var imove = numbers[1]; // to be renamed into move_id
	if ($('#debug_mode').prop("checked")) {
		console.log('IDs (begin): %d(%d) %d(%d) %d(%d)',
				snowfed_chess_game.game_id, numbers[0],
				snowfed_chess_game.move_number, numbers[1],
				snowfed_chess_game.frame_id, numbers[2]);
	}
	// New game or not.
	if (game_id != snowfed_chess_game.game_id) { // Chess position at the server has a different ID.
		reset_local_game_dialog(game_id); // (probably) Replace with a choice of what to reset (local, remote, none).
		return;
	}
	if (snowfed_chess_game.move_number >= imove) {
		return;
	}
	// Update the position.
	chessboard_update = snowfed_chess_game.chessboard.slice();
	var tag = digest_new_moves (chessboard_update, new_list_of_moves, snowfed_chess_game.list_of_moves);
	if ($('#debug_mode').prop("checked") && !tag) {
		console.log('Indigestion: ', tag);
	}
	if (!tag) return false;
	snowfed_chess_game.list_of_moves = new_list_of_moves;
	update_chessboard(chessboard_update);
	update_last_square(tag);
	snowfed_chess_game.move_number = imove;
	if ($('#debug_mode').prop("checked")) {
		console.log('IDs (end):', snowfed_chess_game.game_id, snowfed_chess_game.move_number, snowfed_chess_game.frame_id);
	}
	return true;
}

function square_to_char (square)
{
	return String.fromCharCode((square[1] << 3) + square[0] + 32);
}

function char_to_square (char_square)
{
	var code = char_square.charCodeAt(0) - 32;
	return [code & 0b111, code >> 3];
}

function human_move (square1, square2, ipiece, ipiece_captured, tag)
{
	str = snowfed_chess_game.chess_pieces_txt[ipiece] + ' ';
	if (tag) {
		if (tag[0] == 'o')
			str = '  O-O  ';
		else if (tag[0] == 'O')
			str = '  O-O-O';
		else
			tag = null;
	}
	if (!tag) {
		if (square1[1] < 8)
			str += String.fromCharCode(square1[1] + 'a'.charCodeAt(0), square1[0] + '1'.charCodeAt(0));
		else
			str += '??';
		if (ipiece_captured >= 0)
			str += 'x';
		else
			str += '-';
		if (square2[1] < 8)
			str += String.fromCharCode(square2[1] + 'a'.charCodeAt(0), square2[0] + '1'.charCodeAt(0));
		else
			str += '??';
	}
	if (snowfed_chess_game.chess_race[ipiece] == 'w') {
		return [0, str];
	} else {
		if (snowfed_chess_game.chess_race[ipiece] != 'b')
			console.log('Unknown chess race in human_move(): ' + snowfed_chess_game.chess_race[ipiece] + '.')
		return [1, str];
	}
}

function snowfed_game_notation (human_list_of_moves, rebuild_html = null)
{
	// rebuild_html:
	//		null - leaved html untouched
	//		true - rebuild html from scratch
	//		false - append to html
	var imove = 0;
	var moves_div = $("#list_of_moves");
	var moves_html = "";
	var imove_space = "      ";
	var white_space = "       ";
	var black_space = "       ";
	var last_race = 1;
	if (rebuild_html != null) {
		if (rebuild_html) {
			moves_html += "<table>";
		} else {
			var first_move = human_list_of_moves[0];
			var last_row = $("#list_of_moves table tr:last");
			var ntd = last_row.children("td").length;
			if (ntd < 3) {
				if (first_move[0] == 0) {
					last_row.append("<td></td>"); // no black move
					last_race = 0;
				} else {
					last_row.append("<td>" + first_move[1] + "</td>");
					human_list_of_moves = human_list_of_moves.slice(1);
				}
			}
			imove = parseInt($("#list_of_moves table tr:last td:first").children().first().html(), 10);
		}
	}
	var sgn_text = "Chess Game\r\n" + (new Date()).toString() + "\r\n";
	var imove_str = imove.toString();
	for (var i = 0; i < human_list_of_moves.length; ++i) {
		var move = human_list_of_moves[i];
		if (last_race == 0) {
			if (move[0] == 0) {
				if (i > 0)
					moves_html += "</tr>";
				sgn_text += "\r\n" + imove_space + move[1];
				moves_html += "\n<tr> <td><span style='display: none;'>" + imove_str + "</span></td> <td>" + move[1] + "</td>";
			} else {
				sgn_text += "  " + move[1];
				moves_html += " <td>" + move[1] + "</td>";
			}
		} else {
			if (i > 0)
				moves_html += "</tr>";
			if (move[0] == 0) {
				imove_str = (++imove).toString();
				imove_str = imove_space.slice(0, imove_space.length-imove_str.length-2) + imove_str + ". ";
				sgn_text += "\r\n" + imove_str + move[1];
				moves_html += "\n<tr> <td><span>" + imove_str + "</span></td> <td>" + move[1] + "</td>";
			} else {
				sgn_text += "\r\n" + imove_space + white_space + "  " + move[1];
				moves_html += "\n<tr> <td><span style='display: none;'>" + imove_str + "</span></td> <td></td> <td>" + move[1] + "</td>";
			}
		}
		last_race = move[0];
	}
	if (rebuild_html != null) {
		if (human_list_of_moves.length > 0)
			moves_html += "</tr>";
		if (rebuild_html) {
			moves_html += "</table>";
			moves_div.html(moves_html);
		} else {
			moves_div.children("table").append(moves_html);
		}
		moves_div.scrollTop(moves_div.prop("scrollHeight"));
	} else {
		return sgn_text;
	}
}

function digest_new_moves (chessboard, new_list_of_moves, old_list_of_moves = "")
{
	var print_out = !chessboard;
	var idiff = 0;
	if (print_out) {
		chessboard = new Array (8 * snowfed_chess_game.nxsquares);
		initial_chessboard_setup(chessboard, true);
	} else {
		for (idiff = 0; idiff < new_list_of_moves.length && idiff < old_list_of_moves.length; ++idiff) {
			if (new_list_of_moves[idiff] != old_list_of_moves[idiff]) break;
		}
		idiff -= idiff & 0b1;
		if (old_list_of_moves.length - (old_list_of_moves.length & 0b1) > idiff) {
			initial_chessboard_setup(chessboard, true);
			idiff = 0;
		}
	}
	var human_list = [];
	var tag = 'Z0';
	if (idiff >= 2) {
		var square = char_to_square(new_list_of_moves[idiff-1]);
		tag = String.fromCharCode(square[1] + "A".charCodeAt(0), square[0] + "1".charCodeAt(0));
	}
	var N = new_list_of_moves.length - (new_list_of_moves.length & 0b1);
	for (var i = idiff; i < new_list_of_moves.length; i += 2) {
		tag = null;
		var square1 = char_to_square(new_list_of_moves[i]);
		var square2 = char_to_square(new_list_of_moves[i+1]);
		var isquare_old = snowfed_chess_game.nxsquares * square1[0] + square1[1];
		var isquare_new = snowfed_chess_game.nxsquares * square2[0] + square2[1];
		if (isquare_new == isquare_old) {
			return null;
		} else if (chessboard[isquare_old] < 0) {
			console.log("Error in digest_new_moves(): empty old square.");
			return null;
		} else {
			var ipiece = chessboard[isquare_old];
			var ipiece_captured = chessboard[isquare_new];
			if (ipiece_captured == 0 || ipiece_captured == 6) {
				console.log("Error in digest_new_moves(): you cannot move kings off the board.");
				return null;
			} else if (ipiece <= 5 && ipiece_captured >= 0 && ipiece_captured <= 5 || ipiece > 5 && ipiece_captured > 5) {
				console.log("Error in digest_new_moves(): you cannot capture pieces of your own color.");
				return null;
			} else if ((ipiece == 0 || ipiece == 6) && ipiece_captured < 0) {
				tag = try_castling(chessboard, [square1, square2], (ipiece == 0));
			}
			if (ipiece_captured >= 0) {
				empty_square = get_empty_square(chessboard, ipiece_captured <= 5);
				if (empty_square == null) {
					console.log("Error in digest_new_moves(): failed to find an empty square.");
					return null;
				}
				chessboard[empty_square[0]] = ipiece_captured;
			}
			human_list.push(human_move(square1, square2, ipiece, ipiece_captured, tag));
		}
		chessboard[isquare_new] = ipiece;
		chessboard[isquare_old] = -1;
		if (tag == null) tag = String.fromCharCode(square2[1] + "A".charCodeAt(0), square2[0] + "1".charCodeAt(0));
	}
	if (print_out)
		return snowfed_game_notation(human_list);
	else {
		snowfed_game_notation(human_list, (idiff == 0));
		return tag;
	}
}

function initial_chessboard_setup (chessboard, keep_move_number = false)
{
	for (var i = 0; i < chessboard.length; ++i) {
		chessboard[i] = -1;
	}
	var cnt = 0;
	chessboard[cnt++] = 2;
	chessboard[cnt++] = 4;
	chessboard[cnt++] = 3;
	chessboard[cnt++] = 1;
	chessboard[cnt++] = 0;
	chessboard[cnt++] = 3;
	chessboard[cnt++] = 4;
	chessboard[cnt++] = 2;
	chessboard[cnt+3] = 1;
	cnt = snowfed_chess_game.nxsquares;
	for (var i = 0; i < 8; ++i) {
		chessboard[cnt++] = 5;
	}
	cnt = snowfed_chess_game.nxsquares * 6;
	for (var i = 0; i < 8; ++i) {
		chessboard[cnt++] = 11;
	}
	cnt = snowfed_chess_game.nxsquares * 7;
	chessboard[cnt++] = 8;
	chessboard[cnt++] = 10;
	chessboard[cnt++] = 9;
	chessboard[cnt++] = 7;
	chessboard[cnt++] = 6;
	chessboard[cnt++] = 9;
	chessboard[cnt++] = 10;
	chessboard[cnt++] = 8;
	chessboard[cnt+3] = 7;
	if (snowfed_chess_game.chessboard_saved == null) {
		snowfed_chess_game.chessboard_saved = chessboard.slice();
	}
	if (!keep_move_number)
		snowfed_chess_game.move_number = 0;
}

function chessboard_to_html ()
{
	var cnt = 0;
	for (var iy = 0; iy < 8; ++iy) {
		for (var ix = 0; ix < snowfed_chess_game.nxsquares; ++ix) {
			var ipiece = snowfed_chess_game.chessboard[cnt++];
			if (ipiece >= 0) {
				set_td_text(snowfed_chess_game.chess_pieces[ipiece], ix + 1, iy + 1);
			} else {
				set_td_text(null, ix + 1, iy + 1);
			}
		}
	}
	for (var ix = 0; ix < 8; ++ix) {
		set_td_text(String.fromCharCode("A".charCodeAt(0) + ix), ix + 1, 0);
	}
	for (var iy = 1; iy < 9; ++iy) {
		set_td_text(iy, 0, iy);
	}
	$("#list_of_moves").html("<p>The list of moves will appear here.</p>");
}

function update_last_square (new_last_square)
{
	$(".last_square").removeClass("last_square");
	var ix = new_last_square.charCodeAt(0) - "A".charCodeAt(0) + 1;
	var iy = new_last_square.charCodeAt(1) - "1".charCodeAt(0) + 1;
	if (ix <= 0 || ix > snowfed_chess_game.nxsquares || iy <= 0 || iy > 8) {
		if (new_last_square == "oW" || new_last_square == "oB" ||
			new_last_square == "OW" || new_last_square == "OB")
		{
			iy = (new_last_square.charAt(1) == 'W') ? 1 : 8;
			if (new_last_square.charAt(0) == 'O') {
				ix = [3, 4];
			} else {
				ix = [7, 6];
			}
			if (snowfed_chess_game.flipped) {
				iy = 9 - iy;
			} else {
				ix[0] = 9 - ix[0];
				ix[1] = 9 - ix[1];
			}
			$("[id = '" + iy + " " + ix[0] + "']").addClass("last_square");
			$("[id = '" + iy + " " + ix[1] + "']").addClass("last_square");
			snowfed_chess_game.last_square = new_last_square;
			return;
		}
		console.log("Unknown last square: " + new_last_square + ".");
		return;
	}
	if (snowfed_chess_game.flipped) {
		iy = 9 - iy;
	} else if (ix <= 8) {
		ix = 9 - ix;
	}
	$("[id = '" + iy + " " + ix + "']").addClass("last_square");
	snowfed_chess_game.last_square = new_last_square;
}

function update_chessboard (chessboard_update)
{
	for (var iy = 0; iy < 8; ++iy) {
		for (var ix = 0; ix < snowfed_chess_game.nxsquares; ++ix) {
			var cnt = ix + iy * snowfed_chess_game.nxsquares;
			var ipiece_update = chessboard_update[cnt];
			var ipiece = snowfed_chess_game.chessboard[cnt];
			if (ipiece != ipiece_update) {
				set_td_text(( (ipiece_update >= 0) ? snowfed_chess_game.chess_pieces[ipiece_update] : null ), ix + 1, iy + 1);
				snowfed_chess_game.chessboard[cnt] = ipiece_update;
			}
			++cnt;
		}
	}
}

function get_empty_square (chessboard, is_white)
{
	for (var offset = 0; offset <= 4; offset += 4) {
		for (var ix = snowfed_chess_game.nxsquares-1; ix >= 8; --ix) {
			for (var i = offset; i < 4 + offset; ++i) {
				var iy = i;
				if (is_white != undefined && !is_white) {
					iy = 7 - i;
				}
				var isquare = iy * snowfed_chess_game.nxsquares + ix
				if (chessboard[isquare] < 0) {
					return [isquare, ix, iy];
				}
			}
		}
	}
	return null;
}

function try_castling (chessboard, squares, is_white)
{
	var y = 0;
	var offset = 0;
	var rook_code = 2;
	var tag = 'W';
	if (!is_white) {
		y = 7;
		offset = snowfed_chess_game.nxsquares * 7;
		rook_code = 8;
		tag = 'B';
	}
	if (squares[0][1] != 4 || squares[1][1] != 2 && squares[1][1] != 6) return null; // X
	if (squares[0][0] != y || squares[1][0] != y) return null; // Y
	var irook_old = 0;
	var irook_new = 3;
	if (squares[1][1] == 6) {
		irook_old = 7;
		irook_new = 5;
		tag = 'o' + tag;
	} else {
		tag = 'O' + tag;
	}
	var offset = snowfed_chess_game.nxsquares * y;
	if (chessboard[offset + irook_old] != rook_code) return null;
	var i1 = Math.min(irook_old, squares[0][1]) + 1;
	var i2 = Math.max(irook_old, squares[0][1]) - 1;
	for (var i = i1; i <= i2; ++i) {
		if (chessboard[offset + i] >= 0) return null;
	}
	chessboard[offset + irook_old] = -1;
	chessboard[offset + irook_new] = rook_code;
	return tag;
}

function piece_move (old_td_id, new_td_id)
{
	var squares = [old_td_id.split(" "), new_td_id.split(" ")];
	for (var i = 0; i < 2; ++i) {
		for (var j = 0; j < 2; ++j) {
			squares[i][j] = parseInt(squares[i][j]) - 1;
			if (squares[i][j] < 0) {
				console.log("Error in piece_move: accessing wrong squares.");
				return false;
			}
		}
		if (snowfed_chess_game.flipped) {
			squares[i][0] = 7 - squares[i][0];
		} else {
			if (squares[i][1] < 8) squares[i][1] = 7 - squares[i][1];
		}
	}
	new_list_of_moves = snowfed_chess_game.list_of_moves + square_to_char(squares[0]) + square_to_char(squares[1]);
	chessboard_update = snowfed_chess_game.chessboard.slice();
	var tag = digest_new_moves (chessboard_update, new_list_of_moves, snowfed_chess_game.list_of_moves);
	if (!tag) return false;
	++snowfed_chess_game.move_number;
	snowfed_chess_game.list_of_moves = new_list_of_moves;
	update_chessboard(chessboard_update);
	update_last_square(tag);
	snowfed_chess_game.sendrecv_state = -1;
	play_piece_drop_sound();
	console.log('Move #' + snowfed_chess_game.move_number + ': ' + snowfed_chess_game.last_square + ' (local).');
	return true;
}

function set_td_text (html_text, ix, iy)
{
	if (snowfed_chess_game.flipped) {
		if (iy > 0) iy = 9 - iy;
	} else {
		if (ix >= 1 && ix <= 8) ix = 9 - ix;
	}
	var square = $("[id = '" + iy + " " + ix + "']").empty();
	if (html_text != null) {
		if (ix > 0 && iy > 0) {
			square.html("<div class='piece'>" + html_text + "</div>").children().draggable({revert: true});
		} else {
			square.html("<div class='coord'>" + html_text + "</div>");
		}
	}
	if (ix > 0 && iy > 0) {
		square.droppable({
			tolerance: "pointer",
			drop: function (ev, ui) {
				piece_move($(ui.draggable).parent().attr("id"), iy + " " + ix);
			}
		});
	}
}

function send_to_server ()
{
	$("#warning").empty();
	$.post( "../sendrecv", { chessboard: chess_state_to_string(), filename: snowfed_chess_game.filename } );
	snowfed_chess_game.sendrecv_state = 5;
}

function load_from_server (manual)
{
	manual = manual || false;
	if (!manual && !document.getElementById('auto_sendrecv').checked) {
		return;
	}
	$("#warning").empty();
	$.post( "../sendrecv", { filename: snowfed_chess_game.filename }, function( data ) {
		var old_move_number = snowfed_chess_game.move_number;
		string_to_chess_state(data);
		if (snowfed_chess_game.move_number > old_move_number) {
			play_piece_drop_sound();
			console.log('Move #' + snowfed_chess_game.move_number + ': ' + snowfed_chess_game.last_square + ' (remote).');
		}
	});
}

function reset_local_game_dialog (game_id)
{
	var auto_sendrecv_box = $('#auto_sendrecv');
	var was_checked = auto_sendrecv_box.prop("checked");
	if (was_checked) auto_sendrecv_box.prop("checked", false);
	reset_confirmation = $("#reset-confirm");
	reset_confirmation.html("<center><p>The current game will be lost.</p></center>");
	reset_confirmation.dialog({
		dialogClass: 'no-close',
		resizable: false,
		height: "auto",
		width: 300,
		modal: true,
		buttons: {
			Yes: function() {
				snowfed_chess_game.game_id = game_id;
				snowfed_chess_game.move_number = 0;
				snowfed_chess_game.list_of_moves = "";
				initial_chessboard_setup(snowfed_chess_game.chessboard);
				chessboard_to_html();
				update_last_square("Z0");
				load_from_server(true);
				if (was_checked) auto_sendrecv_box.prop("checked", true);
				reset_confirmation.dialog("close");
			},
			No: function() {
				send_to_server();
				if (was_checked) auto_sendrecv_box.prop("checked", true);
				reset_confirmation.dialog("close");
			}
		}
	});
}

function reset_server_game_dialog ()
{
	var auto_sendrecv_box = $('#auto_sendrecv');
	var was_checked = auto_sendrecv_box.prop("checked");
	if (was_checked) auto_sendrecv_box.prop("checked", false);
	var reset_confirmation = $("#reset-confirm");
	reset_confirmation.html("<center><p>The current game will be lost.</p></center>");
	reset_confirmation.dialog({
		dialogClass: 'no-close',
		resizable: false,
		height: "auto",
		width: 300,
		modal: true,
		buttons: {
			Yes: function() {
				reset_confirmation.dialog('widget').find(".ui-dialog-buttonset button").button('disable');
				reset_confirmation.html(" \
						<center><table style='text-align: center; vertical-align: middle;'><tr> \
							<td> \
								<img src='/static/loading_icon.gif'/> \
							</td> \
							<td style='padding-left:0.5em'> \
								<p>Syncing...</p> \
							</td></tr> \
						</table></center>");
				if (snowfed_chess_game.game_id != null) {
					snowfed_chess_game.game_id = (snowfed_chess_game.game_id + 1) %
						(1 << (8 << snowfed_chess_game.standart_number_length)); // 8^num_bytes
				}
				snowfed_chess_game.sendrecv_state = 5;
				snowfed_chess_game.move_number = 0;
				snowfed_chess_game.list_of_moves = "";
				initial_chessboard_setup(snowfed_chess_game.chessboard);
				chessboard_to_html();
				update_last_square("Z0");
				send_to_server();
				load_from_server(true);
				setTimeout(function(){
					if (was_checked) auto_sendrecv_box.prop("checked", true);
					reset_confirmation.dialog("close");
				}, 2000);
			},
			No: function() {
				if (was_checked) auto_sendrecv_box.prop("checked", true);
				reset_confirmation.dialog("close");
			}
		}
	});
}

function timed_sendrecv ()
{
	if (snowfed_chess_game.sendrecv_state == 0) {
		load_from_server();
	} else if (snowfed_chess_game.sendrecv_state > 0) {
		--snowfed_chess_game.sendrecv_state;
	} else if (document.getElementById('auto_sendrecv').checked) {
		send_to_server();
	}
	var now = new Date();
	if (snowfed_chess_game.flipped) {
		setTimeout(timed_sendrecv, 1500 - now.getMilliseconds());
	} else if (now.getMilliseconds() > 500){
		setTimeout(timed_sendrecv, 2000 - now.getMilliseconds());
	} else {
		setTimeout(timed_sendrecv, 1000 - now.getMilliseconds());
	}
}

// Entry point of the jQuery action
$(function () {
	$("#moves_td").click(function () {
		$(this).children().toggle();
		$("#list_of_moves").toggle();
	});
	$("#discard").click(function () {
		update_chessboard(snowfed_chess_game.chessboard_saved);
		update_last_square("Z0");
	});
	$("#save").click(function () {
		snowfed_chess_game.chessboard_saved = snowfed_chess_game.chessboard.slice();
	});
	$("#send").click(function () {
		send_to_server();
	});
	$("#receive").click(function () {
		load_from_server(true);
	});
	$("#flip").click(function () {
		snowfed_chess_game.flipped = !snowfed_chess_game.flipped;
		chessboard_to_html();
		update_last_square(snowfed_chess_game.last_square);
	});
	$("#reset").click(function () {
		reset_server_game_dialog();
	});
	$("#download_moves").click(function () {
		this.download = "moves-" + (new Date()).toISOString().slice(0,10) + ".sgn";
		this.href = "data:text/plain;charset=UTF-8," + encodeURIComponent(digest_new_moves(null, snowfed_chess_game.list_of_moves));
	});

	initial_chessboard_setup(snowfed_chess_game.chessboard);
	chessboard_to_html();
	timed_sendrecv();
});
