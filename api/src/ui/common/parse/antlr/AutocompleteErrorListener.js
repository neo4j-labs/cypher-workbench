// from article https://medium.com/dailyjs/compiler-in-javascript-using-antlr-9ec53fd2780f
// and https://blog.rapid7.com/2015/06/29/how-to-implement-antlr4-autocomplete/
//import antlr4 from 'antlr4/src/antlr4';
//import antlr4 from 'antlr4/src/antlr4/index';
import antlr4 from 'antlr4';
import { processTokens } from '../parseUtil';

/**
 * Autocomplete Error Listener
 *
 * @returns {object}
 */
export class AutocompleteErrorListener extends antlr4.error.ErrorListener {

  constructor (originalCypher) {
    super();
    this.errorOccurred = false;
    this.tokens = [];
    this.originalCypher = originalCypher;
    if (this.originalCypher && this.originalCypher.split) {
      this.cypherLines = this.originalCypher.split('\n');
    }
  }

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
  syntaxError = (recognizer, symbol, line, column, message, payload) => {
    // https://blog.rapid7.com/2015/06/29/how-to-implement-antlr4-autocomplete/

    this.errorOccurred = true;

    var parser = recognizer._ctx.parser;
    var tokens = parser.getTokenStream().tokens;

    this.tokens = processTokens(tokens, parser, this.cypherLines, { leaveSpaces: true });
  }
}
