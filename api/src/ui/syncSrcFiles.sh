#!/bin/sh
cp ../../../ui/src/dataModel/dataModel.js dataModel
cp ../../../ui/src/common/parse/parseCypher.js common/parse
cp -R ../../../ui/src/common/parse/antlr common/parse
cp ../../../ui/src/dataModel/DataTypes.js dataModel
cp ../../../ui/src/dataModel/helper.js dataModel
cp ../../../ui/src/dataModel/dataModelExtension.js dataModel
cp ../../../ui/src/dataModel/JaroWrinker.js dataModel
cp ../../../ui/src/components/canvas/d3/helpers.js components/canvas/d3
cp ../../../ui/src/components/canvas/d3/grid.js components/canvas/d3
echo "=== Important: make the following changes below ==="
echo
echo make these changes in CypherParser.js
echo // commented line was failing until I updated to the line below
echo // https://github.com/antlr/antlr4/issues/4139
echo // const sharedContextCache = new antlr4.PredictionContextCache\(\);
echo const sharedContextCache = new antlr4.atn.PredictionContextCache\(\);
echo
echo make these changes in CypherLexer.js
echo        // commented line was failing until I updated to the line below
echo        // https://github.com/antlr/antlr4/issues/4139        
echo        // this._interp = new antlr4.atn.LexerATNSimulator\(this, atn, decisionsToDFA, new antlr4.PredictionContextCache\(\)\);
echo "       this._interp = new antlr4.atn.LexerATNSimulator(this, atn, decisionsToDFA, new antlr4.atn.PredictionContextCache());"


