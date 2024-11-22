// from article https://medium.com/dailyjs/compiler-in-javascript-using-antlr-9ec53fd2780f
//import antlr4 from 'antlr4/src/antlr4';
import antlr4 from 'antlr4';
                            
export class SyntaxGenericError extends Error {
  constructor(syntaxObject) {
    super("Syntax error");
    this.name = "SyntaxGenericError";
    this.symbol = syntaxObject.symbol;
    //Object.keys(syntaxObject.symbol).map(key => console.log('symbol key ' + key + ' = ' + syntaxObject.symbol[key]));
    this.line = syntaxObject.line;
    this.column = syntaxObject.column;
    //this.message = `Unexpected symbol ${this.symbol}, line: ${this.line}, column: ${this.column}, message: ${syntaxObject.message}`;
    this.message = syntaxObject.message;
  }
}

/**
 * Custom Error Listener
 *
 * @returns {object}
 */
export class CustomErrorListener extends antlr4.error.ErrorListener {
  /**
   * Checks syntax error
   *
   * @param {object} recognizer The parsing support code essentially. Most of it is error recovery stuff
   * @param {object} symbol Offending symbol
   * @param {int} line Line of offending symbol
   * @param {int} column Position in line of offending symbol
   * @param {string} message Error message
   * @param {string} payload Stack trace
   */
  syntaxError(recognizer, symbol, line, column, message, payload) {
    throw new SyntaxGenericError({symbol, line, column, message});
  }
}
