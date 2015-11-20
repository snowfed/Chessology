/**
 * (c) snowfed, 2015
 */


var pieces = ["&#9814;", "&#9816;", "&#9815;", "&#9813;", "&#9812;", "&#9815;", "&#9816;", "&#9814;",
              "&#9817;", "&#9817;", "&#9817;", "&#9817;", "&#9817;", "&#9817;", "&#9817;", "&#9817;",
              "&#9823;", "&#9823;", "&#9823;", "&#9823;", "&#9823;", "&#9823;", "&#9823;", "&#9823;",
              "&#9820;", "&#9822;", "&#9821;", "&#9819;", "&#9818;", "&#9821;", "&#9822;", "&#9820;",
              "&#9813;", "&#9819;"]; // two extra queens
var x_offset = "A".charCodeAt(0);
var y_offset = "1".charCodeAt(0);
var positions = null;
var positions_saved = null;
var extra_squares = null;
var flipped = true;
var filename = 'chessboard7.txt'
var ncolumns = 13; // row_name + 8*chess_square + k*extra_square
var move_number = 0;
var updated_squares = null;
var sendrecv_state = 0;

function playPieceDropSound()
{
    if (document.getElementById('play_sound').checked) {
        $("#piece_moved").trigger("play");
    }
}

function findRookForCastling (king_code, rook_code, rooks_file, rank)
{
    var kings_file = 'E'.charCodeAt(0);
    var lfile, rfile;
    if (rooks_file == x_offset) {
        lfile = rooks_file;
        rfile = kings_file;
    } else {
        lfile = kings_file;
        rfile = rooks_file;
    }
    var other = false;
    var iking = -1;
    var irook = -1;
    for (i = 0; i < positions.length; i += 2) {
        if (positions[i] >= lfile && positions[i] <= rfile && positions[i+1] == rank) {
            if (positions[i] == kings_file) {
                iking = i / 2;
                if (pieces[iking] != "&#" + king_code + ";") {
                    console.error('Unexpected piece on the king\'s square: %s.', pieces[iking]);
                    other = true;
                    break;
                }
            } else if (positions[i] == rooks_file) {
                irook = i / 2;
                if (pieces[irook] != "&#" + rook_code + ";") {
                    other = true;
                    break;
                }
            } else {
                other = true;
                break;
            }
        }

    }
    if (other || iking < 0 || irook < 0) {
        return null;
    } else {
        return [iking, irook, [rooks_file, rank], [kings_file + ((rooks_file == x_offset) ? -1 : 1), rank]];
    }
}

function tryCastling (chess_symbol_code, kings_old_square, kings_new_square)
{
    var rook_code, rank;
    if (chess_symbol_code == 9812) { // white king
        rook_code = 9814;
        rank = 1;
    } else if (chess_symbol_code == 9818) { // black king
        rook_code = 9820;
        rank = 8;
    }
    else {
        return null; // neither a white king nor a black one.
    }
    old_square_str = String.fromCharCode.apply(null, kings_old_square);
    if (old_square_str != 'E' + rank) {
        return null; // king has to be on its initial position when castling
    }
    new_square_str = String.fromCharCode.apply(null, kings_new_square);
    if (new_square_str == 'C' + rank) { // long castling
        return findRookForCastling(chess_symbol_code, rook_code, 'A'.charCodeAt(0), y_offset + rank - 1);
    } else if (new_square_str == 'G' + rank) { // short castling
        return findRookForCastling(chess_symbol_code, rook_code, 'H'.charCodeAt(0), y_offset + rank - 1);
    } else { // wrong castling
        return null;
    }
}

function boardToString (my_move_number, my_positions)
{
    move_bytes = [((my_move_number >> 6) & 0x3F) + 0x21, (my_move_number & 0x3F) + 0x21];
    return String.fromCharCode.apply(null, move_bytes) + String.fromCharCode.apply(null, my_positions);
}

function stringToBoard (board_string, my_positions)
{
    imove = (board_string.charCodeAt(0) - 0x21) * 0x40 + board_string.charCodeAt(1) - 0x21;
    offset = 2;
    pos = [];
    changed = [];
    if (my_positions,length + offset > board_string.length) {
        console.log('Bad data in board_string.');
        return null;
    }
    for (i = offset, j = 0; j < my_positions.length; i += 2, j += 2) {
        pos.push(board_string.charCodeAt(i), board_string.charCodeAt(i+1));
        if (pos[j] != my_positions[j] || pos[j+1] != my_positions[j+1]) {
            changed.push(j >> 1);
        }
    }
    return [imove, pos, changed];
}

function pieceSquareId (ipiece, my_positions)
{
    var j = ipiece * 2;
    if (j >= my_positions.length) {
        return null;
    } else {
        var c = my_positions[j] - x_offset;
        var r = my_positions[j+1] - y_offset;
        if (flipped) {
            r = 7 - r;
        } else {
            if (c <= 7) {
                c = 7 - c;
            }
        }
        return (r + 1) + " " + (c + 1);
    }
}

function addPositionUpdate (current_updates, changed, my_positions)
{
    if (changed == null || changed.length <= 0) {
        return current_updates;
    } else if (current_updates == null) {
        current_updates = [];
    }
    iupdate = 0;
    for (i = 0; i < changed.length; ++i) {
        var new_change = true;
        while (iupdate < current_updates.length) {
            if (current_updates[0][iupdate] < changed[i]) {
                ++iupdate;
            } else {
                if (current_updates[0][iupdate] == changed[i]) {
                    new_change = false;
                }
                break;
            }
        }
        if (new_change) {
            current_updates.splice(iupdate, 0, changed[i]);
        }
    }
    //$(".updated-square").removeClass("updated-square");
    for (i = 0; i < current_updates.length; ++i) {
        $("[id = '" + pieceSquareId(current_updates[i], my_positions) + "']").addClass("updated-square");
    }
    return current_updates;
}

function extraSquares ()
{
    if (extra_squares == null || extra_squares.length < ncolumns - 9) {
        extra_squares = new Array (ncolumns - 9);
        for (j = 0; j < extra_squares.length; ++j) {
            extra_squares[j] = new Array (8);
        }
    }
    for (j = 0; j < extra_squares.length; ++j) {
        for (i = 0; i < 8; ++i) {
            extra_squares[j][i] = true;
        }
    }
    var nfree = 8 * extra_squares.length;
    for (i = 0; i < positions.length; i += 2) {
        var j = positions[i] - x_offset - 8;
        if (j >= 0) {
            extra_squares[j][positions[i+1] - y_offset] = false;
            --nfree;
        }
    }
    if (nfree <= 0) {
        return null;
    }
    best = [ null, null ]; // white position, black position
    white_weight = -1;
    black_weight = -1;
    for (j = 0; j < extra_squares.length; ++j) {
        for (i = 0; i < 8; ++i) {
            if (extra_squares[j][i]) {
                var weight = j * 8 - i + ((i < 4) ? 10000 : 7); // white
                if (weight > white_weight) {
                    best[0] = [j + 9, i + 1];
                    white_weight = weight;
                }
                weight = weight + 2 * i + ((i < 4) ? 0 : 20000); // black
                if (weight > black_weight) {
                    best[1] = [j + 9, i + 1]
                    black_weight = weight;
                }
            }
        }
    }
    for (i = 0; i < best.length; ++i) {
        var r = best[i][1];
        if (flipped) {
            r = 9 - r;
        }
        best[i] = r.toString() + ' ' + best[i][0].toString(); // td id
    }
    return best;
}

function sendToServer ()
{
    $("#warning").empty();
    $.post( "../sendrecv", { chessboard: boardToString(++move_number, positions), filename: filename } );
    updated_squares = null;
    $(".updated-square").removeClass("updated-square");
    sendrecv_state = 5;
}

function loadFromServer (manual)
{
    manual = manual || false;
    if (!manual && !document.getElementById('auto_sendrecv').checked) {
        return;
    }
    $("#warning").empty();
    $.post( "../sendrecv", { filename: filename }, function( data ) {
        board_state = stringToBoard(data, positions);
        if (board_state == null || (board_state[0] <= move_number && !manual) || board_state[2].length <= 0) {
            return;
        }
        playPieceDropSound();
        positions = board_state[1];
        move_number = board_state[0];
        $("#chessboard_tbody_id").empty();
        initialize();
        updated_squares = addPositionUpdate(updated_squares, changed, positions);
	});
}

function timedSendRecv ()
{
    if (sendrecv_state == 0) {
        loadFromServer();
    } else if (sendrecv_state > 0) {
        --sendrecv_state;
    } else if (document.getElementById('auto_sendrecv').checked) {
        sendToServer();
    }
    var now = new Date();
    if (flipped) {
        setTimeout(timedSendRecv, 1500 - now.getMilliseconds());
    } else if (now.getMilliseconds() > 500){
        setTimeout(timedSendRecv, 2000 - now.getMilliseconds());
    } else {
        setTimeout(timedSendRecv, 1000 - now.getMilliseconds());
    }
}

function savePositions ()
{
    for (i = 0; i < positions.length; ++i) {
        positions_saved[i] = positions[i];
    }
}

function loadPositions ()
{
    for (i = 0; i < positions.length; ++i) {
        positions[i] = positions_saved[i];
    }
}

function transformCoordinates (row, column)
{
    var r = row - 1;
    var c = column - 1;
    if (flipped) {
        r = 7 - r;
    } else {
        if (c <= 7) {
            c = 7 - c;
        }
    }
    return [c + x_offset, r + y_offset];
}

function pieceBySquare(coordinates)
{
    for (i = 0; i < positions.length; i += 2) {
        if (positions[i] == coordinates[0] && positions[i+1] == coordinates[1]) {
            return i / 2;
        }
    }
    return -1; // not found
}

function initPositions() {
    if (positions == null || positions.length < pieces.length * 2) {
        positions = new Uint8Array (pieces.length * 2); // 2 coordinates per piece
    }

    var initial_ranks = [1, 2, 7, 8];
    var cnt = 0;
    for (irank = 0; irank < initial_ranks.length; ++irank) {
        for (ifile = 0; ifile < 8; ++ifile) {
            positions[cnt++] = ifile + x_offset;
            positions[cnt++] = initial_ranks[irank] - 1 + y_offset;
        }
    }
    var ifile = ncolumns - 2;
    var irank = 0;
    while (cnt < positions.length) {
        positions[cnt++] = ifile + x_offset;
        positions[cnt++] = irank + y_offset;
        positions[cnt++] = ifile + x_offset;
        positions[cnt++] = 7 - irank + y_offset;
        ++irank;
        if (irank > 3) {
            irank = 0;
            --ifile;
            if (ifile < 8) {
                ifile = 255; // no more pieces will fit the board
            }
        }
    }
    if (positions_saved == null || positions_saved.length < positions.length) {
        positions_saved = new Uint8Array (positions.length);
        savePositions();
    }
    move_number = 0;
    updated_squares = null;
}

function initTable() {
    var tbody = $("#chessboard_tbody_id");
    var square_colors = ["white-square", "grey-square", "black-square"]
    for (var i = 0; i <= 8; i++) {
        tbody.append("<tr></tr>");
        for (var j = 0; j < ncolumns; j++) {
            var td;
            background_color = square_colors[(i+j)%2+1];
            if (i == 0 || j == 0 || j > 8) {
                background_color = square_colors[0];
            }

			if (j === 0) {
                if (i === 0) {
                    td = "<td class=\"" + background_color + "\"><div class=\"notation\"></div></td>";
                } else if (flipped) {
                    td = "<td class=\"" + background_color + "\"><div class=\"notation\">" + (9 - i).toString() + "</div></td>";
                } else {
                    td = "<td class=\"" + background_color + "\"><div class=\"notation\">" + i.toString() + "</div></td>";
                }
                tbody.children().last().append(td);
            } else if (i === 0) {
                if (j > 8) {
                    //td = "<td class=\"" + background_color + " unassigned drop\" id=\"" + i + " " + j + "\"></td>";
                    td = "<td class=\"" + background_color + "\"><div></div></td>";
                } else if (flipped) {
                    td = "<td class=\"" + background_color + "\"><div class=\"notation\">" + String.fromCharCode("A".charCodeAt(0) + j - 1) + "</div></td>";
                } else {
                    td = "<td class=\"" + background_color + "\"><div class=\"notation\">" + String.fromCharCode("H".charCodeAt(0) - j + 1) + "</div></td>";
                }
                tbody.children().last().append(td);
            } else {
                var ipiece = pieceBySquare(transformCoordinates(i, j));
                if (ipiece < 0) {
                    td = "<td class=\"" + background_color + " unassigned drop\" id=\"" + i + " " + j + "\"></td>";
                } else {
                    td = "<td class=\"" + background_color + " assigned drop\" id=\"" + i + " " + j + "\">" + "<div class=\"item\">" + pieces[ipiece] + "</div>" + "</td>";
                }
                tbody.children().last().append(td);
            }
        }
    }
}

/*
 * Initialize all needed javascript elements
 */
function initialize() {
    //console.log("Calling initialize!!!!!!");
    initTable();
    timedSendRecv();

    $(".item").draggable({
        revert: true
    });

    $(".drop").droppable({

        /*
         * Sets what decides which droppable is active. Pointer means
         * the droppable under the mouse is active. The default is intersect,
         * meaning that 50% of the target have to be covered in order for it
         * to become active
         */
        tolerance: "pointer",

        /*
         * Handles the drop of an element on a certain position.
         */
        drop: function (ev, ui) {
            var parent = $(ui.draggable).parent();
            var oldTR = parent.parent().attr("class");
            var newTR = $(this).parent().attr("class");
            var element = $(ui.draggable).clone();

            // Delete all hoverclasses and warnings
            $(this).removeClass("over-green");
            $(this).removeClass("over-red");
            $("#warning").empty();
            $("#success").empty();

            // Handle the actual drop piece
            if ($(this).hasClass("unassigned")) {
                var pos_old = parent.attr("id").split(" ");
                pos_old = transformCoordinates(parseInt(pos_old[0]), parseInt(pos_old[1]));
                var pos_new = $(this).attr("id").split(" ");
                pos_new = transformCoordinates(parseInt(pos_new[0]), parseInt(pos_new[1]));
                var castling_data = tryCastling(parent.text().charCodeAt(0), pos_old, pos_new);
                var ipiece = -1;
                if (castling_data != null) {
                    //console.log(pieces[castling_data[0]] + pieces[castling_data[1]] + String.fromCharCode.apply(null, castling_data[2].concat(castling_data[3])));
                    ipiece = castling_data[0] * 2;
                    var rook_td_old = $("[id = '" + pieceSquareId(0, castling_data[2]) + "']");
                    var rook_td_new = $("[id = '" + pieceSquareId(0, castling_data[3]) + "']");
                    rook_td_new.html("<div class=\"item\">" + rook_td_old.text() + "</div>");
                    rook_td_new.addClass("assigned");
                    rook_td_new.removeClass("unassigned");
                    rook_td_new.find("div").draggable({
                        revert: true
                    });
                    rook_td_old.find("div").remove();
                    rook_td_old.addClass("unassigned");
                    rook_td_old.removeClass("assigned");
                    positions[castling_data[1] * 2] = castling_data[3][0];
                    positions[castling_data[1] * 2 + 1] = castling_data[3][1];
                } else {
                    ipiece = pieceBySquare(pos_old) * 2;
                }
                positions[ipiece] = pos_new[0];
                positions[ipiece+1] = pos_new[1];
                parent.addClass("unassigned");
                parent.removeClass("assigned");
                $(ui.draggable).remove();
                element.attr("style", "");
                element.draggable({
                    revert: true
                });
                $(this).append(element);
                $(this).removeClass("unassigned");
                $(this).addClass("assigned");
                sendrecv_state = -1;
                playPieceDropSound();
            } else if ($(this).attr("id") != parent.attr("id")) {
                if (parseInt($(this).attr("id").split(" ")[1]) > 8) {
                    $("#warning").html("Please, show some respect for the dead.");
                } else {
                    best_pos = extraSquares();
                    if (best_pos == null) {
                        $("#warning").html("In order to take a piece move that piece off the board.");
                        //$("#warning").html(String.fromCharCode.apply(null, positions));
                    } else {
                        old_color = ($(this).text().charCodeAt(0) <= 9817) ? 0 : 1;
                        new_color = (parent.text().charCodeAt(0) <= 9817) ? 0 : 1;
                        if (old_color == new_color) {
                            $("#warning").html("It is considered a bad practice to capture pieces of your own color.");
                            //console.log(stringToBoard(boardToString(move_number, positions), positions));
                            //console.log(pieceSquareId(0, positions), pieceSquareId(31, positions));
                        } else {
                            var td_id = best_pos[old_color];
                            var extra_td = $("[id = '" + td_id + "']");
                            extra_td.html("<div class=\"item\">" + $(this).text() + "</div>");
                            extra_td.addClass("assigned");
                            extra_td.removeClass("unassigned");
                            extra_td.find("div").draggable({
                                revert: true
                            });
                            $(this).find("div").text(parent.text());
                            parent.addClass("unassigned");
                            parent.removeClass("assigned");
                            $(ui.draggable).remove();
                            $(this).removeClass("unassigned");
                            $(this).addClass("assigned");
                            var pos_old = parent.attr("id").split(" ");
                            pos_old = transformCoordinates(parseInt(pos_old[0]), parseInt(pos_old[1]));
                            var pos_new = $(this).attr("id").split(" ");
                            pos_new = transformCoordinates(parseInt(pos_new[0]), parseInt(pos_new[1]));
                            var iassasin = pieceBySquare(pos_old) * 2;
                            var ivictim = pieceBySquare(pos_new) * 2;
                            positions[iassasin] = pos_new[0];
                            positions[iassasin+1] = pos_new[1];
                            pos_new = td_id.split(" ");
                            pos_new = transformCoordinates(parseInt(pos_new[0]), parseInt(pos_new[1]));
                            positions[ivictim] = pos_new[0];
                            positions[ivictim+1] = pos_new[1];
                            sendrecv_state = -1;
                            playPieceDropSound();
                        }
                    }
                }
            }
        },

        /*
         * Triggered when a draggable is dragged over an element
         */
        over: function (ev, ui) {
            var parent = $(ui.draggable).parent();

            if ($(this).attr("id") != parent.attr("id")) {
                if ($(this).hasClass("unassigned")) {
                    $(this).addClass("over-green");
                } else {
                    $(this).addClass("over-red");
                }
            }
        },

        /*
         * Triggered when a draggable moves away from an element
         */
        out: function (ev, ui) {
            $(this).removeClass("over-green");
            $(this).removeClass("over-red");
        }
    });

}

// Entry point of the jQuery action
$(function () {
    initPositions();
    initialize();

    $("#discard").click(function () {
        if (positions_saved != null) {
            loadPositions();
            $("#chessboard_tbody_id").empty();
            initialize();
        } else {
            $("#warning").html("positions_saved == null");
        }
    });

    $("#save").click(function () {
        $("#warning").empty();
        savePositions();
    });
    $("#send").click(function () {
        sendToServer();
    });
    $("#receive").click(function () {
        loadFromServer(true);
    });
    $("#flip").click(function () {
        flipped = !flipped;
        $("#chessboard_tbody_id").empty();
        initialize();
    });
    $("#reset").click(function () {
        initPositions();
        $("#chessboard_tbody_id").empty();
        initialize();
    });
});
