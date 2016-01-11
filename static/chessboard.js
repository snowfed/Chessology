/**
 * (c) snowfed, 2016
 */

var flipped = true;
var nxsquares = 12;
var chessboard = new Array (8 * nxsquares);
var chessboard_saved = null;
var chess_pieces = ["&#9812;", "&#9813;", "&#9814;", "&#9815;", "&#9816;", "&#9817;", // white
	"&#9818;", "&#9819;", "&#9820;", "&#9821;", "&#9822;", "&#9823;"]; // black
var move_number = 0;

function playPieceDropSound()
{
    if (document.getElementById('play_sound').checked) {
        $("#piece_moved").trigger("play");
    }
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

function update_chessboard (chessboard_update)
{
	for (var iy = 0; iy < 8; ++iy) {
		for (var ix = 0; ix < nxsquares; ++ix) {
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

// Entry point of the jQuery action
$(function () {
	var i = 0;
    $("#receive").click(function () {
		set_td_text(i++, 1, 3);
    });
    $("#flip").click(function () {
        flipped = !flipped;
		chessboard_to_html();
    });

	initial_chessboard_setup();
	chessboard_to_html();
});
