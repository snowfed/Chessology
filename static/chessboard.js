/**
 * (c) snowfed, 2016
 */

var filename = 'chessboard7.txt'
var flipped = true;
var nxsquares = 12;
var chessboard = new Array (8 * nxsquares);
var chessboard_saved = null;
var chess_pieces = ["&#9812;", "&#9813;", "&#9814;", "&#9815;", "&#9816;", "&#9817;", // white
	"&#9818;", "&#9819;", "&#9820;", "&#9821;", "&#9822;", "&#9823;"]; // black
var move_number = 0;
var sendrecv_state = 0;
var last_square = "Z0";

function play_piece_drop_sound()
{
    if (document.getElementById('play_sound').checked) {
        $("#piece_moved").trigger("play");
    }
}

function chessboard_to_string ()
{
	var board_code = chessboard.slice();
	for (var i = 0; i < board_code.length; ++i) {
		board_code[i] += 'b'.charCodeAt(0);
	}
    var move_bytes = [((move_number >> 6) & 0x3F) + 0x21, (move_number & 0x3F) + 0x21];
    return String.fromCharCode.apply(null, move_bytes) +
		String.fromCharCode.apply(null, board_code) + last_square;
}

function string_to_chessboard (board_string)
{
	var imove = (board_string.charCodeAt(0) - 0x21) * 0x40 + board_string.charCodeAt(1) - 0x21;
	if (move_number >= imove) {
		return;
	}
	var board_code = chessboard.slice();
	for (var i = 0; i < board_code.length; ++i) {
		board_code[i] = board_string.charCodeAt(i+2) - 'b'.charCodeAt(0);
	}
	if (board_string.length >= board_code.length + 4) {
		update_last_square(board_string.slice(board_code.length + 2, board_code.length + 4));
	}
	update_chessboard(board_code);
	move_number = imove;
}

function initial_chessboard_setup ()
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
	cnt = nxsquares;
	for (var i = 0; i < 8; ++i) {
		chessboard[cnt++] = 5;
	}
	cnt = nxsquares * 6;
	for (var i = 0; i < 8; ++i) {
		chessboard[cnt++] = 11;
	}
	cnt = nxsquares * 7;
	chessboard[cnt++] = 8;
	chessboard[cnt++] = 10;
	chessboard[cnt++] = 9;
	chessboard[cnt++] = 7;
	chessboard[cnt++] = 6;
	chessboard[cnt++] = 9;
	chessboard[cnt++] = 10;
	chessboard[cnt++] = 8;
	chessboard[cnt+3] = 7;
	move_number = 0;
	if (chessboard_saved == null) {
		chessboard_saved = chessboard.slice();
	}
	move_number = 0;
}

function chessboard_to_html ()
{
	var cnt = 0;
	for (var iy = 0; iy < 8; ++iy) {
		for (var ix = 0; ix < nxsquares; ++ix) {
			var ipiece = chessboard[cnt++];
			if (ipiece >= 0) {
				set_td_text(chess_pieces[ipiece], ix + 1, iy + 1);
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
}

function update_last_square (new_last_square)
{
	$(".last_square").removeClass("last_square");
	var ix = new_last_square.charCodeAt(0) - "A".charCodeAt(0) + 1;
	var iy = new_last_square.charCodeAt(1) - "1".charCodeAt(0) + 1;
	if (ix <= 0 || ix > nxsquares || iy <= 0 || iy > 8) {
		if (new_last_square == "oW" || new_last_square == "oB" ||
			new_last_square == "OW" || new_last_square == "OB")
		{
			iy = (new_last_square.charAt(1) == 'W') ? 1 : 8;
			if (new_last_square.charAt(0) == 'O') {
				ix = [3, 4];
			} else {
				ix = [7, 6];
			}
			if (flipped) {
				iy = 9 - iy;
			} else {
				ix[0] = 9 - ix[0];
				ix[1] = 9 - ix[1];
			}
			$("[id = '" + iy + " " + ix[0] + "']").addClass("last_square");
			$("[id = '" + iy + " " + ix[1] + "']").addClass("last_square");
			last_square = new_last_square;
			return;
		}
		console.log("Unknown last square: " + new_last_square + ".");
		return;
	}
	if (flipped) {
		iy = 9 - iy;
	} else if (ix <= 8) {
		ix = 9 - ix;
	}
	$("[id = '" + iy + " " + ix + "']").addClass("last_square");
	last_square = new_last_square;
}

function update_chessboard (chessboard_update)
{
	for (var iy = 0; iy < 8; ++iy) {
		for (var ix = 0; ix < nxsquares; ++ix) {
			var cnt = ix + iy * nxsquares;
			var ipiece_update = chessboard_update[cnt];
			var ipiece = chessboard[cnt];
			if (ipiece != ipiece_update) {
				set_td_text(( (ipiece_update >= 0) ? chess_pieces[ipiece_update] : null ), ix + 1, iy + 1);
				chessboard[cnt] = ipiece_update;
			}
			++cnt;
		}
	}
}

function get_empty_square (is_white)
{
	for (var offset = 0; offset <= 4; offset += 4) {
		for (var ix = nxsquares-1; ix >= 8; --ix) {
			for (var i = offset; i < 4 + offset; ++i) {
				var iy = i;
				if (is_white != undefined && !is_white) {
					iy = 7 - i;
				}
				var isquare = iy * nxsquares + ix
				if (chessboard[isquare] < 0) {
					return [isquare, ix, iy];
				}
			}
		}
	}
	return null;
}

function try_castling (squares, is_white)
{
	var y = 0;
	var offset = 0;
	var rook_code = 2;
	var tag = 'W';
	if (!is_white) {
		y = 7;
		offset = nxsquares * 7;
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
	var offset = nxsquares * y;
	if (chessboard[offset + irook_old] != rook_code) return null;
	var i1 = Math.min(irook_old, squares[0][1]) + 1;
	var i2 = Math.max(irook_old, squares[0][1]) - 1;
	for (var i = i1; i <= i2; ++i) {
		if (chessboard[offset + i] >= 0) return null;
	}
	chessboard[offset + irook_old] = -1;
	chessboard[offset + irook_new] = rook_code;
	set_td_text(null, irook_old + 1, y + 1);
	set_td_text(chess_pieces[rook_code], irook_new + 1, y + 1);
	return tag;
}

function piece_move (old_td_id, new_td_id)
{
	var squares = [old_td_id.split(" "), new_td_id.split(" ")];
	var tag = null;
	for (var i = 0; i < 2; ++i) {
		for (var j = 0; j < 2; ++j) {
			squares[i][j] = parseInt(squares[i][j]) - 1;
			if (squares[i][j] < 0) {
				console.log("Error in piece_move: accessing wrong squares.");
				return false;
			}
		}
		if (flipped) {
			squares[i][0] = 7 - squares[i][0];
		} else {
			if (squares[i][1] < 8) squares[i][1] = 7 - squares[i][1];
		}
	}
	var isquare_old = nxsquares * squares[0][0] + squares[0][1];
	var isquare_new = nxsquares * squares[1][0] + squares[1][1];
	if (isquare_new == isquare_old) {
		return false;
	} else if (chessboard[isquare_old] < 0) {
		console.log("Error in piece_move(): empty old square.");
		return false;
	} else {
		var ipiece = chessboard[isquare_old];
		var ipiece_captured = chessboard[isquare_new];
		if (ipiece_captured == 0 || ipiece_captured == 6) {
			console.log("Error in piece_move(): you cannot move kings off the board.");
			return false;
		} else if (ipiece <= 5 && ipiece_captured >= 0 && ipiece_captured <= 5 || ipiece > 5 && ipiece_captured > 5) {
			console.log("Error in piece_move(): you cannot capture pieces of your own color.");
			return false;
		} else if ((ipiece == 0 || ipiece == 6) && ipiece_captured < 0) {
			tag = try_castling(squares, (ipiece == 0));
		}
		//$(".updated-square").removeClass("updated-square"); // FIXME: remove class selector
		set_td_text(chess_pieces[ipiece], squares[1][1] + 1, squares[1][0] + 1);
		if (ipiece_captured >= 0) {
			empty_square = get_empty_square(ipiece_captured <= 5);
			if (empty_square == null) {
				console.log("Error in piece_move(): failed to find an empty square.");
				set_td_text(chess_pieces[ipiece_captured], squares[1][1] + 1, squares[1][0] + 1);
				return false;
			}
			chessboard[empty_square[0]] = ipiece_captured;
			set_td_text(chess_pieces[ipiece_captured], empty_square[1] + 1, empty_square[2] + 1);
		}
	}
	set_td_text(null, squares[0][1] + 1, squares[0][0] + 1);
	chessboard[isquare_new] = ipiece;
	chessboard[isquare_old] = -1;
	++move_number;
	if (tag == null) tag = String.fromCharCode.apply(null, [squares[1][1] + "A".charCodeAt(0), squares[1][0] + "1".charCodeAt(0)]);
	update_last_square(tag);
	sendrecv_state = -1;
	play_piece_drop_sound();
	console.log('Move #' + move_number + ': ' + last_square + ' (local).');
	return true;
}

function set_td_text (html_text, ix, iy)
{
	if (flipped) {
		if (iy > 0) iy = 9 - iy;
	} else {
		if (ix >= 1 && ix <= 8) ix = 9 - ix;
	}
	var square = $("[id = '" + iy + " " + ix + "']").empty();
	if (html_text != null) {
		if (ix > 0 && iy > 0) {
			square.html("<div class='piece'>" + html_text + "</div>").children().draggable({revert: true});
			//if (updated_square != undefined && updated_square) {
			//	square.children().addClass("updated-square");
			//}
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
    $.post( "../sendrecv", { chessboard: chessboard_to_string(), filename: filename } );
    sendrecv_state = 5;
}

function load_from_server (manual)
{
    manual = manual || false;
    if (!manual && !document.getElementById('auto_sendrecv').checked) {
        return;
    }
    $("#warning").empty();
    $.post( "../sendrecv", { filename: filename }, function( data ) {
		var old_move_number = move_number;
		string_to_chessboard(data);
        if (move_number > old_move_number) {
			play_piece_drop_sound();
			console.log('Move #' + move_number + ': ' + last_square + ' (remote).');
		}
	});
}

function timed_sendrecv ()
{
    if (sendrecv_state == 0) {
        load_from_server();
    } else if (sendrecv_state > 0) {
        --sendrecv_state;
    } else if (document.getElementById('auto_sendrecv').checked) {
        send_to_server();
    }
    var now = new Date();
    if (flipped) {
        setTimeout(timed_sendrecv, 1500 - now.getMilliseconds());
    } else if (now.getMilliseconds() > 500){
        setTimeout(timed_sendrecv, 2000 - now.getMilliseconds());
    } else {
        setTimeout(timed_sendrecv, 1000 - now.getMilliseconds());
    }
}

// Entry point of the jQuery action
$(function () {
    $("#discard").click(function () {
		update_chessboard(chessboard_saved);
		update_last_square("Z0");
    });
    $("#save").click(function () {
        chessboard_saved = chessboard.slice();
    });
    $("#send").click(function () {
        send_to_server();
    });
    $("#receive").click(function () {
        load_from_server(true);
    });
    $("#flip").click(function () {
        flipped = !flipped;
		chessboard_to_html();
		update_last_square(last_square);
    });
    $("#reset").click(function () {
		initial_chessboard_setup();
		chessboard_to_html();
		update_last_square("Z0");
    });

	initial_chessboard_setup();
	chessboard_to_html();
	timed_sendrecv();
});
