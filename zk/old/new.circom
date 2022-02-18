pragma circom 2.0.3;

include '../../node_modules/circomlib/circuits/mux1.circom';
include '../../node_modules/circomlib/circuits/bitify.circom';

template Board() {

  var lengths = [5, 4, 3, 3, 2];

  signal input ships[5][3];
  signal isOk[2][5];

  component lt[4][5];
  component muxOk[5];

  /// RANGE CHECKS ///
  for (var i = 0; i < ships.length; i++) {
    /// HORIZONTAL (z = 0) ///
    // x + lengths[i] < 10
    lt[0][i] = LessThan(4);
    lt[0][i].in[0] <== ships[i][0] + lengths[i];
    lt[0][i].in[1] <== 10; 
    // y < 10
    lt[1][i] = LessThan(4);
    lt[1][i].in[0] <== ships[i][1];
    lt[1][i].in[1] <== 10;
    // check constrained ship range
    isOk[0][i] = lt[0][i].out * lt[1][i].out;
    /// VERTICAL (z = 1) ///
    // x < 10
    lt[2][i] = LessThan(4);
    lt[2][i] <== ships[i][0];
    lt[2][i] <== 10;
    // y + length[i] < 10
    lt[3][i] = LessThan(4);
    lt[3][i].in[0] <== ships[i][1] + lengths[i];
    lt[2][i].in[1] <== 10;
    // check constrained ship range
    isOk[1][i] = lt[2][i].out * lt[3][i].out;
    /// SIGNAL MUX ///
    ships[i][2] * (ships[i][2] - 1) === 0;
    muxOk[i] = Mux1();
    muxOk[i].c[0] <== isOk[0][i];
    muxOk[i].c[1] <== isOk[1][i];
    muxOk[i].s <== ships[i][2];
    muxOk[i].out === 1;
  }
  //// COLLISION CHECKS ////
  var board[10][10];
  signal noCollision[2][5];
  component muxCollision[5];
  component muxBoard[5];
  component _bitify[2][5];
  component _debitify[2][5];
  /// SHIP 0 (carrier length = 5) ///
  signal nc0[2][5]; // no collision #0 carrier
  var x0 = ships[0][0] // carrier x
  var y0 = ships[0][0] // carrier y
  var z0 = ships[0][0] // carrier z
  var cbh = board; // "Carrier Board Horizontal"
  // horizontal check
  for (var i = 0; i < 5; i++) {
    cbh[x0 + i][y0] += 1; // increment each cell
    nc0[0][i] <== (cbh[x0 + i][y0] * (cbh[x0 + i][y0] - 1) == 0); // check if cell is binary
  }
  _debitify[0][0] = Bits2Num(100);
  for(let i = 0; i < 100; i++) {
    _debitify[0][0].in[i] <== cbh[i \ 10][i % 10];
  }
  // vertical check
  var cbv = board;
  for (var i = 0; i < 5; i++) {
    cbv[x0][y0 + i] += 1; // increment each cell
    nc0[1][i] <== (cbv[x0][y0 + i] * (cbv[x0][y0 + i] - 1) == 0); // check if cell is binary
  }
  _debitify[1][0] = Bits2Num(100);
  for (let i = 0; i < 100; i++) {
    _debitify[1][0].in[i] <== cbv[i \ 10][i % 10];
  }
  // mux to choose constraint
  //mux to choose board
  muxBoard[0] = Mux1();
  muxBoard[0].c[0] <== _debitify[0][0].out;
  muxBoard[0].c[1] <== _debitify[1][0].out;
  muxBoard[0].s <== z0;
}