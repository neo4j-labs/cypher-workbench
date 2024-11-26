If you make changes to the Cypher.g4 Antlr grammar, you should run this command from the folder that contains the Cypher.g4 file

This is the new way (from Jon Harris enhanced cypher-editor project):
### cypher-antlr4

This package contains:

- JavaScript code generated from an antlr4 g4 grammar file.
- The antlr4 g4 grammar file.
- An antlr 4 java jar file used to generate the code.

The `antlrGenerate` script in `package.json` gives an example of how to generate the source code yourself.

### General usage of Antlr
https://github.com/antlr/antlr4/blob/master/doc/javascript-target.md

### Testing
For testing, I was getting this error a lot: 

SyntaxError: Cannot use import statement outside a module

until I added this to the package.json from the suggestion of this article: https://github.com/facebook/create-react-app/issues/9938

  "jest": {
    "transform": {
      "^.+\\.[t|j]s?$": "babel-jest"
    },
    "transformIgnorePatterns": ["node_modules/(?!@antlr4)/"]
  }  


This is the old way, but as of Antlr 4.7.1 this way no longer works:
(error(31):  ANTLR cannot generate Javascript code as of version 4.7.1)  

antlr4 -Dlanguage=JavaScript Cypher.g4


You may need to change these lines:
require('antlr4/index');

to this:
require('antlr4/src/antlr4/index');
