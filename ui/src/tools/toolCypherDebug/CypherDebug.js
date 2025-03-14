import React, { Component } from 'react'
import { CypherEditor } from '@neo4j-cypher/react-codemirror'; 
import { highlightActiveLine } from '@codemirror/view';
import { EditorView } from "@codemirror/view"
import { 
  breakpointGutter, 
  addBreakpointListener,
  setReadonlyFunc,
  setBreakpoint
} from './components/BreakpointExtension';
import Alert from '@material-ui/lab/Alert'
import { CommunicationHelper } from "../common/communicationHelper";
import DebugToolbar, { Sizes as ToolbarSizes } from './components/DebugToolbar';
import DebugCanvasPlainNvl from './components/DebugCanvasPlainNvl';
import MiniResultsTable from './components/MiniResultsTable';
import ExecuteCypher from "../common/execute/executeCypher";
import CypherStringConverter from "../../dataModel/cypherStringConverter";
import { 
  DebugSteps,
  debugStep,
  getClauseDebugSnippets,
  getClauseDebugSnippetStringPairs
} from '../../dataModel/debugSteps';
import {
  SnippetStringWithContext
} from '../../dataModel/cypherSnippetSet'
import {
  closeMainDriverCurrentSession
} from "../../common/Cypher";
import { getCurrentConnectionInfo } from '../../common/Cypher';

import { CypherVariableScope } from '../../dataModel/cypherVariableScope';
import { Pattern } from "../../dataModel/cypherPattern";
import { stripComments } from '../../common/parse/antlr/commentUtil';
import { ALERT_TYPES } from '../../common/Constants';
import { DividerType } from './components/divider';
import Divider from './components/divider';
import { findObjectsContainingAllKeys, findValues } from '../../dataModel/graphUtil';
import { Integer } from 'neo4j-driver';
import GeneralTextDialog from '../../components/common/GeneralTextDialog';
import ExportDataImporterDialog from '../../components/common/ExportDataImporterDialog';
import { getDataType } from '../../dataModel/graphUtil';
import DataTypes from '../../dataModel/DataTypes';
import { InjectLimit } from '../../dataModel/cypherSubQuery';
import { getExplanation } from '../../dataModel/explanations';
import { WhereClause } from '../../dataModel/cypherWhere';
import { runValidation, ValidationTerms } from './validation/validateCypher';
import { getValidationIcon } from '../common/validation/ValidationSection';
import { ValidationStatus } from '../common/validation/ValidationStatus';
import { DividerTitleWidthOrHeight } from './components/divider';
import { currentlyConnectedToNeo, connectionIsProxied } from '../../common/Cypher';
import { runAndExportData } from './export/runAndExportData';

const REMOTE_GRAPH_DOC_TYPE = 'CypherDebug';
const CYPHER_RETURN = '\nRETURN *';

export const pxVal = (px) => typeof(px) === 'string' ? parseInt(px.replace(/px$/,'')) : px;

const Sizes = {
  MinCypherEditorWidth: '300px',
  MaxCypherEditorWidth: '1400px',
  DefaultCypherEditorWidth: '600px',
  MinCypherEditorHeight: '200px',
  MaxCypherEditorHeight: '1000px',
  DefaultCypherEditorHeight: '300px',
  InitResultTableHeight: '200px',
  InitCanvasWidth: '300px',
  MinCanvasWidth: '200px',
  ClosedSidebar: '72px',
  Divider: '7px',
  MarginLeft: '0px',
  MarginRight: '1px',
  ResultTableMarginBottom: '11px',
  MainToolbarHeight: '64px'
}

export default class CypherDebug extends Component {

    closeParamDialog = () => {
      this.setState({ paramDialog: { ...this.state.paramDialog, open: false }});
    }

    setParamText = (e) => {
      this.setState({ paramDialog: { ...this.state.paramDialog, text: e.target.value }});
    }

    closeExportAsDialog = () => {
      this.setState({ exportAsDialog: { ...this.state.exportAsDialog, open: false }});
    }

    setExportAsText = (e) => {
      this.setState({ exportAsDialog: { ...this.state.exportAsDialog, text: e.target.value }});
    }

    convertValueToJson = (value) => {
      if (value) {
        let newValue = value.trim();

        let hasComma = false;
        let commaMatch = newValue.match(/(.+),/);
        if (commaMatch) {
          hasComma = true;
          newValue = commaMatch[1].trim();
        }

        let match = newValue.match(/^'(.+)'$/);
        if (match) {
          newValue = `"${match[1]}"`;
        }
        value = `${newValue}${hasComma ? ',' : ''}`;
      }
      return value;
    }

    onParamPaste = (event, setText) => {
      // code from https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
      let paste = (event.clipboardData || window.clipboardData).getData('text');
  
      // strip line numbers if pasting from keymaker
      if (paste && paste.split) {
        paste = paste.split('\n')
          .map(line => {
            let str = line.trim();
            // trying to parse stuff like
            //   param: 'foo' 
            //   `pa ram`: 30,
            // and skip over stuff like
            //   {
            //   "param": "value"
            let match = str.match(/`?([\s\w]+)`?:(.+)/);
            if (match) {
              let key = `"${match[1]}"`;
              let value = match[2].trim();
              let jsonValue = this.convertValueToJson(value);
              return `    ${key}:${jsonValue}`;              
            } else {
              return str; 
            }
          }) 
          .join('\n');
      }
  
      //console.log('paste: ', paste);
      const syntheticEvent = {
        target: {
          value: paste
        }
      }
      setText(syntheticEvent);
  
      event.preventDefault();    
    }    

    state = {
        internalTabActivated: false,
        originalCypherQuery: '', 
        cypherQuery: '',
        cypherParameters: {},
        readonly: false,
        limit: '10',
        numRows: '0',
        isBusy: false,
        debugSteps: null,
        canStepBackward: false,
        canStepForward: false,
        areStepping: false,
        showQueryResults: false,
        codeDebugWidth: pxVal(Sizes.DefaultCypherEditorWidth),
        codeDebugHeight: pxVal(Sizes.DefaultCypherEditorHeight),
        resultTableHeight: pxVal(Sizes.InitResultTableHeight),
        canvasWidth: Sizes.InitCanvasWidth,
        headers: [],
        rows: [],
        isError: false,
        errorMessage: '',
        isExplanationAvailable: false,
        explanation: '',
        breakpointLines: [],
        validationIcon: <></>,
        resultsTableIsCollapsed: false,
        graphVisualizationIsCollapsed: false,
        paramDialog: {
          open: false,
          handleClose: this.closeParamDialog,
          title: '',
          text: '',
          placeholder: ``,
          setText: this.setParamText,
          onPaste: this.onParamPaste,
          buttons: []
        },
        exportAsDialog: {
          open: false,
          handleClose: this.closeExportAsDialog,
          setText: this.setExportAsText
      },

    }

    executeCypher = new ExecuteCypher();

    breakpointListener = (breakpointEvent) => {
      if (this.cypherEditorRef.current && breakpointEvent) {

        let { debugSteps, debugExtraLines, breakpointLines } = this.state;

        let editorView = this.cypherEditorRef.current.cypherEditor.codemirror;
        let { pos, on } = breakpointEvent;

        let line = editorView.state.doc.lineAt(pos);
        let { number } = line;

        debugSteps.setBreakpointLine({
          oneBasedLineNumber: number - debugExtraLines, 
          breakpointOn: on
        });
        
        // console.log('breakpointEvent: ', breakpointEvent);
        // console.log('breakpointEvent line: ', line);

        let newBreakpointLines = breakpointLines.slice();
        let index = newBreakpointLines.indexOf(number);

        if (index >= 0 && !on) {
          newBreakpointLines.splice(index,1);
        } else if (index === -1 && on) {
          newBreakpointLines.push(number);
        }
        newBreakpointLines.sort();
        console.log('breakpointLines: ', newBreakpointLines);
        this.setState({
          breakpointLines: newBreakpointLines
        })
      }
    }

    isReadonly = () => this.state.readonly;

    constructor (props) {
        super(props);
        props.setSureRef(this);

        setReadonlyFunc(this.isReadonly);

        this.lineHighlighter = highlightActiveLine();

        this.miniResultsTableRef = React.createRef();
        this.debugCanvasRef = React.createRef();
        this.schemaBarRef = React.createRef();
        this.cypherEditorRef = React.createRef();
        this.ewDividerRef = React.createRef();
        this.nsDividerRef = React.createRef();
        this.paramDialogRef = React.createRef();
        this.exportAsDialogRef = React.createRef();

        this.communicationHelper = new CommunicationHelper({
            graphDocContainer: this,
            //persistenceHelper: this.persistenceHelper,
            persistenceHelper: {},
            getNetworkStatus: this.props.getNetworkStatus,
            setNetworkStatus: this.props.setNetworkStatus,
            //setStatus: this.setStatus,
            setStatus: () => {},
            //showDialog: this.showGeneralDialog,
            showDialog: () => {},
            //GraphDocType: this.cypherBlockDataProvider.getRemoteGraphDocType(),
            GraphDocType: REMOTE_GRAPH_DOC_TYPE
          });

        addBreakpointListener('cypherDebug', this.breakpointListener);

        // debug
        window.cypherEditor = () => this.cypherEditorRef.current;
    }

    componentDidMount() {
      const { codeDebugHeight } = this.state;
      this.setCanvasWidth();
      this.setCodeHeight(codeDebugHeight);
      this.setResultTableHeight();

      window.addEventListener("resize", () => {
        this.setCanvasWidth();
        this.setResultTableHeight();
      });
    }

    setCanvasWidthState = (newValue) => {
      const { internalTabActivated } = this.state;
      this.setState({
        canvasWidth: newValue
      }, () => {
        setTimeout(() => {
          if (this.debugCanvasRef.current && internalTabActivated) {
            // console.log("calling this.debugCanvasRef.current.setCanvasRect")
            this.debugCanvasRef.current.setCanvasRect();
          }
        }, 50)
      })      
    }

    setCanvasWidth = () => {
      const { codeDebugWidth, internalTabActivated } = this.state;
      let newCanvasWidth = this.getCanvasWidth(codeDebugWidth);

      // console.log('codeDebugWidth: ', codeDebugWidth);
      // console.log('canvasWidth: ', canvasWidth);

      this.setCanvasWidthState(newCanvasWidth);
    }

    handleRunAndExportData = (params) => {
      this.clearState(() => {
        this.handleRunAndExportDataAction(params)
      })    
    }

    handleRunAndExportDataAction = async ({ prefix, skipItems, skipProperties, dataModel }) => {

      let { cypherQuery, cypherParameters } = this.state;
      let cypherQueries = [];
      if (cypherQuery) {
        cypherQueries = cypherQuery.split(';')
          .map(x => x.trim())
          .filter(x => x)
          .map(x => {
            let lastLine = this.getLastLine(x).trim().toUpperCase();          
            if (!lastLine.match(/LIMIT\s+\d+$/)) {
              x = this.prepCypherBeforeAddingLimit(x);
              x += this.getLimitClause();
            }
            return x;
        })
      }
      if (cypherQueries.length === 0) {
        this.setState({
          headers: ['status', 'about'],
          numRows: 1,
          rows: [
            { 
              status: 'Please enter a Cypher query',
              about: ''
            }
          ]
        })
        return;
      }

      await runAndExportData(cypherQueries, cypherParameters, {
        prefix: prefix,
        skipItems,
        skipProperties, 
        dataModel,
        executeCypherAsPromise: this.executeCypher.runQueryAsPromise,
        checkIfUserHasCancelledFunction: () => {
          let { userRequestedStop } = this.state;
          // console.log('userRequestedStop: ', userRequestedStop)
          return userRequestedStop;
        },
        statusFunction: async (result) => {
          return await new Promise ((resolve, reject) => {
            let {
              about, status,
              isError, errorMessage
            } = result;
  
            let resultTableRows = this.state.rows;
        
            let resultRow = {}
            if (isError) {
              resultRow = {
                status: errorMessage,
                about: about
              }
            } else {
              resultRow = {
                status: status,
                about: about
              }
            }

            let updatedRows = resultTableRows.slice();
            updatedRows.push(resultRow);
            let stateUpdate = {
              headers: ['status', 'about'],
              numRows: updatedRows.length,
              rows: updatedRows
            };

            this.setState(stateUpdate, () => {
              // ok to go to next query
              resolve();
            })
          })
        }
      })
    }

    getMenus = () => {
      var menus = [];
  
      var exportMenuItems = [
        { id: "runAndExportData", text: `Run and Export Data` },
      ];
    
      var exportMenu = {
        id: "reveal-export",
        text: "Export",
        handler: (menu, menuItem) => {
          switch (menuItem.id) {
            case "runAndExportData":
              this.showExportAsDialog();
              break;
            default:
              break;
          }
        },
        menuItems: exportMenuItems,
      };

      menus.push(exportMenu);
    
      return menus;
    };

    tabActivated = () => {
        const { codeDebugHeight } = this.state;
        const { setTitle, setMenus } = this.props;
        setTitle("Reveal");  // Cypher Debugger
        setMenus(this.getMenus());

        this.setState({
          internalTabActivated: true
        }, () => {
          setTimeout(() => {
            this.setCanvasWidth();
            this.setCodeHeight(codeDebugHeight);
            this.setResultTableHeight();
            // this.refreshSchemaBar();
            const connectionActive = (getCurrentConnectionInfo()) ? true : false;
            if (connectionActive) {
              this.onNeoConnect();
            }
          }, 100)
        })
    }

    onNeoConnect = () => {
      // let connectionInfo = getCurrentConnectionInfo();
      // console.log('connectionInfo: ', connectionInfo);

      this.setState({
        showQueryResults: false          
      })
      // this.refreshSchemaBar();
      if (this.debugCanvasRef.current) {
        this.clearState(() => {
          this.debugCanvasRef.current.clearCanvas({
            clearStats: true, 
            clearConfig: true, 
            callback: () => {
              this.refreshGraphSummary();
            }
          });
        });
      }
    }

    onNeoDisconnect = () => {

      this.setState({
        showQueryResults: false          
      })
            
      if (this.debugCanvasRef.current) {
        this.debugCanvasRef.current.handleDisconnect();
      }
    }

    refreshGraphSummary = () => {
      if (this.debugCanvasRef.current) {
        this.debugCanvasRef.current.refreshGraphSummary();
      }
    }

    // refreshSchemaBar = () => {
    //   // TODO: refreshSchemaBar
    //   if (this.schemaBarRef.current) {
    //     this.schemaBarRef.current.refresh();
    //   }
    // }

    tryToGoOnline = () => this.communicationHelper.tryToGoOnline();

    tabDeactivated = () => {
        // TODO
    }

    setParameters = () => {
      var paramJson = this.state.paramDialog.text;
      if (!paramJson) {
        this.setState({
          cypherParameters: {}
        });
        this.closeParamDialog();
      } else {
        try {
          let params = JSON.parse(paramJson);
          this.setState({
            cypherParameters: params
          });          
          this.closeParamDialog();
        } catch (e) {
          alert(`Error parsing JSON: ${e}`, ALERT_TYPES.WARNING);
        }
      }
    }

    showSetParameters = () => {
        let { cypherParameters } = this.state;
        let cypherParameterString = '';
        if (Object.keys(cypherParameters).length > 0) {
          cypherParameterString = JSON.stringify(cypherParameters, null, 2);
        }
        this.setState({
            paramDialog: {
                ...this.state.paramDialog,
                open: true,
                title: 'Set Parameters',
                text: cypherParameterString,
                placeholder: `Enter parameters as JSON here. Pasting Neo4j params will attempt to convert them to JSON. \n\nJSON Example:\n
{
  "booleanKey": true,
  "intKey": 23,
  "stringKey": "stringValue",
  "mapKey": { "key1": "val1", "key2": "val2" },
  "arrayKey": ["val1", "val2", "val3"]
}
                `,
                buttons: [{
                    text: 'Set Parameters',
                    onClick: (button, index) => this.setParameters(),
                    autofocus: true
                },{
                    text: 'Cancel',
                    onClick: (button, index) => this.closeParamDialog(),
                    autofocus: false
                }]
            }
        }, () => {
            this.paramDialogRef.current.focusTextBox();
        });
    }      

    showExportAsDialog = () => {
        this.setState({
          exportAsDialog: {
                ...this.state.exportAsDialog,
                open: true
            }
        }, () => {
            this.exportAsDialogRef.current.focusTextBox();
        });
    }

    setCypherQuery = (value) => {
        this.setState({
            cypherQuery: value
        });
    }

    runQuery = (cypherQueryToRun, isDebug, options = {}) => {
        var { cypherQuery, cypherParameters } = this.state;
        cypherQueryToRun = cypherQueryToRun ? cypherQueryToRun : cypherQuery;
    
        var lastReturnClause = null;
        if (!isDebug) {
          const cypherStringConverter = new CypherStringConverter();
          try {
            var clauses = cypherStringConverter.convertToClauses(cypherQueryToRun);
            var returnClauses = clauses.filter(clause => clause.keyword === 'RETURN')
            if (returnClauses.length > 0) {
                lastReturnClause = returnClauses[returnClauses.length - 1].clauseInfo;
            } 
          } catch (e) {
            console.log("Cannot parse query", e);

            // Note we don't need to fail here or report to the user
            //  the lastReturnClause above is a convenience in case we get no results to show the headers

            // this.setState({
            //   isError: true,
            //   errorMessage: `${e}`
            // })
          }
        }

        this.setState({
          isBusy: true
        }, () => {
          this.executeCypher.runQuery(cypherQueryToRun, cypherParameters, lastReturnClause, (results) => {
            var { headers, rows, isError } = results;
            if (isError) {
              this.setState({ 
                isBusy: false,
                numRows: `${rows.length}`,
                rows: rows,
                headers: headers,
                showQueryResults: true,
                isError: true,
                errorMessage: rows[0][headers[0]]
              });
            } else {
              this.updateDebugCanvas(headers, rows, options)
              this.setState({ 
                isBusy: false,
                numRows: `${rows.length}`,
                rows: rows,
                headers: headers,
                showQueryResults: true,
                isError: false,
                errorMessage: ''
              });
            }
          }, { dontStringify: true });
        })
      }      
      
    updateDebugCanvas = (headers, rows, options = {}) => {
        let layoutOptions = {}
        if (options.fit) {
          layoutOptions.fit = true;
        } else {
          layoutOptions.zoomToSelectedNodes = true;
        }

        const { areStepping } = this.state;
        console.log('updateDebugCanvas headers + rows', headers, rows);
        if (this.debugCanvasRef.current) {
            this.debugCanvasRef.current.updateData(headers, rows, {
              isDebug: areStepping,
              relationshipPlaceholderNodes: true,
              ...layoutOptions
            });
        }
    }      

    clearState = (callback) => {
      this.setState({
        headers: [],
        rows: [],
        isError: false,
        errorMessage: '',
        showQueryResults: false,
        isExplanationAvailable: false,
        explanation: '',
        validationIcon: <></>
      }, () => {
        if (callback) {
          callback();
        }
      })
    }

    clear = () => {
      if (this.debugCanvasRef.current) {
        this.debugCanvasRef.current.clearCanvas();
        this.clearState();
      }      
    }

    getClauseCypher = (clause, variableScope) => {
      if (clause.clauseInfo && clause.clauseInfo.toCypherString) {
        if (clause.clauseInfo instanceof Pattern) {
          return `${clause.keyword} ${clause.clauseInfo.toCypherString({addMissingVars: true, variableScope })}`
        } else {
          return clause.clauseInfo.toCypherString();
        }
      } else if (clause.toCypherString) {
        return clause.toCypherString();
      } else {
        return `${clause.keyword} ${clause.clauseInfo}`;
      }      
    }

    shouldAddReturn = (cypher, currentKeyword) => {
      if (currentKeyword === 'RETURN') {
          return false;
      } else if (['ORDER BY','LIMIT','SKIP'].includes(currentKeyword)) {
          let cypherLines = cypher.split('\n');
          let keywords = cypherLines.map(line => this.getLineKeyword(line));
          let returnIndex = keywords.lastIndexOf('RETURN');
          let withIndex = keywords.lastIndexOf('WITH');
          if (returnIndex === -1) {
              return true;
          } else if (withIndex > returnIndex) {
              return true;
          } else {
              return false;
          }
      } else {
          return true;
      }
  }

  handleUnion = (cypher) => {
      if (cypher) {
          let cypherLines = cypher.split('\n');
          let unionIndex = cypherLines
              .map(line => this.getLineKeyword(line))
              .findIndex(keyword => ['UNION', 'UNION ALL'].includes(keyword))
          if (unionIndex >= 0) {
              let beforeLines = cypherLines.slice(0,unionIndex+1);
              let afterLines = cypherLines.slice(unionIndex+1);
              let beforeCypher = beforeLines.map(x => `// ${x}`).join('\n');
              let afterCypher = '';
              if (unionIndex === (cypherLines.length - 1)) {
                  afterCypher = `WITH 'Debug now will return only the second part of the UNION (ALL) until you reach the end' as message`;
              } else {
                  afterCypher = afterLines.join('\n');
              }
              return `${beforeCypher}\n${afterCypher}`;
          }
      } 
      return cypher;
  }    

  getLineKeyword = (line) => {
    var tokens = line.split(' ');
    var keyword = tokens[0].trim().toUpperCase();
    var token2 = (tokens[1]) ? tokens[1].trim().toUpperCase() : '';
    keyword = (token2 === 'BY' || token2 === 'MATCH') ? `${keyword} ${token2}` : keyword;
    return keyword;
  }  

  getLimitClause = (limitOverride) => {
    let limit = 10;
    if (limitOverride) {
      limit = limitOverride;
    } else {
      limit = this.state.limit;
    }
    limit = parseInt(limit);
    var cypherLimit = '';
    if (!isNaN(limit)) {
        cypherLimit = `\nLIMIT ${limit}`;
    }
    return cypherLimit;
  }

  getLastLine = (cypher) => {
    cypher = stripComments(cypher);
    let cypherLines = cypher.split('\n')
      .map(x => x.trim())
      .filter(x => x);
        
    let lastLine = cypherLines[cypherLines.length-1];
    return lastLine;
  }

  stopQueryExecution = () => {
    try {
      closeMainDriverCurrentSession();
    } catch (e) {
      console.log('error closing driver session: ', e);
    }
    this.setState({
      isBusy: false,
      userRequestedStop: true
    })
  }

  stopDebugging = () => {
    let { originalCypherQuery } = this.state;
    if (originalCypherQuery) {
      this.setState({
        userRequestedStop: true,
        readonly: false,
        areStepping: false,
        canStepBackward: false,
        canStepForward: false,
        debugSteps: null,
        cypherQuery: originalCypherQuery,
        breakpointLines: []
      });
    }
  }

  prepCypherBeforeAddingLimit = (cypherQuery) => {
    if (cypherQuery) {
      cypherQuery = cypherQuery.trim();
      if (cypherQuery.match(/;$/)) {
        cypherQuery = cypherQuery.substring(0, cypherQuery.length - 1)
      }  
    }
    return cypherQuery;
  }

  executeQuery = () => {
      let { cypherQuery, areStepping, debugSteps } = this.state;
      if (areStepping) {
        debugSteps.runToNextBreakpoint();
        this.executeDebugQuery();
        return;
        // this.stopDebugging();
        // cypherQuery = originalCypherQuery;
      } else {
        this.setState({
          userRequestedStop: false,          
          originalCypherQuery: cypherQuery
        })
      }
      
      if (cypherQuery) {
        let lastLine = this.getLastLine(cypherQuery).trim().toUpperCase();          
        if (!lastLine.match(/LIMIT\s+\d+$/)) {
          cypherQuery = this.prepCypherBeforeAddingLimit(cypherQuery);
          cypherQuery += this.getLimitClause();
        }
      }
      this.runQuery(cypherQuery, false, {fit: true})
      // fit
  }

  setActiveLine = (currentDebugCypher) => {
    var { debugSteps } = this.state;

    if (!currentDebugCypher || !this.cypherEditorRef.current) {
      return;
    }

    let editorView = this.cypherEditorRef.current.cypherEditor.codemirror;
    
    // let lines = currentDebugCypher.split('\n');
    let activeStepCypher = debugSteps.getActiveStep()?.getCypher();
    if (activeStepCypher) {
      let index = currentDebugCypher.indexOf(activeStepCypher);

      // console.log('activeStepCypher: ', activeStepCypher);
      // console.log('index: ', index);
  
      // let index = lines.findIndex(line => line === activeStepCypher);
      // if (index >= 0) {
      if (index >= 0) {
          // let currentLine = index+1;
          // let line = editorView.state.doc.line(currentLine);
          // console.log('currentLine: ', currentLine);
          // console.log('line: ', line);
          editorView.dispatch({
              // we could select the entire line, but we really just want to highlight it
              //  if we knew the text coordinates of the specific thing that was being executed
              //  we could highlight just that part
              // selection: { head: line.from, anchor: line.from },
              selection: { head: index, anchor: index },
              // selection: { head: line.from, anchor: line.to },
              scrollIntoView: true
          });        
      }
    } else {
      let line = editorView.state.doc.line(1);
      editorView.dispatch({
        // we could select the entire line, but we really just want to highlight it
        //  if we knew the text coordinates of the specific thing that was being executed
        //  we could highlight just that part
        selection: { head: line.from, anchor: line.from },
        scrollIntoView: true
      });
    }
  }

  setDebugCypherToDisplay = () => {
    var { debugSteps, breakpointLines } = this.state;

    var cypherToDisplay = '// Debug version - click Stop to revert\n';
    cypherToDisplay += debugSteps.getCypher(true);
    cypherToDisplay = cypherToDisplay.replace(new RegExp(InjectLimit, 'g'), '')    

    this.setState({
      cypherQuery: cypherToDisplay,
      // used when setting breakpoints to get the offsets right
      //   since we added the // Debug version... line above
      debugExtraLines: 1          
    }, () => {
      this.setActiveLine(cypherToDisplay);

      // the breakpoints get wiped out, so I need to re-add them
      let editorView = this.cypherEditorRef.current.cypherEditor.codemirror;

      breakpointLines.forEach(lineNumber => {
        let line = editorView.state.doc.line(lineNumber);
        setBreakpoint(line.from, true);
      })      
    })
  }

  isCypherDirective = (activeStepCypher) => {
    var { debugSteps } = this.state;
    if (debugSteps && typeof(activeStepCypher) === 'string') {
      let step = activeStepCypher.toLowerCase().trim();
      let match = step.match(/^cypher\s+runtime/);
      if (match) {
        return true;      
      }
    }
    return false;
  }

  validate = () => {

    if (currentlyConnectedToNeo() && connectionIsProxied()) {
      alert('Validation not available on Proxied connections', ALERT_TYPES.WARNING);
      return;
    };

    this.startDebugging(() => {
      var { debugSteps, cypherParameters } = this.state;

      this.clearState(async () => {
        await runValidation(debugSteps, cypherParameters, {
          executeCypherAsPromise: this.executeCypher.runQueryAsPromise,
          getDebugCypherToRunFunction: this.getDebugCypherToRun,
          checkIfUserHasCancelledFunction: () => {
            let { userRequestedStop } = this.state;
            // console.log('userRequestedStop: ', userRequestedStop)
            return userRequestedStop;
          },
          reportStatusFunction: async (validationResult) => {
            return await new Promise ((resolve, reject) => {
              let {
                cypher, activeStep, activeInternalStep,
                rows, headers,
                isError, errorMessage
              } = validationResult;
    
              let resultTableRows = this.state.rows;
    
              let explanationStep = (activeInternalStep) ? activeInternalStep : activeStep;
              let explanation = getExplanation(explanationStep);
        
              let resultRow = {}
              if (isError) {
                resultRow = {
                  icon: () => getValidationIcon(ValidationStatus.Error),
                  result: ValidationTerms.Error,
                  details: errorMessage,
                  cypher: cypher
                }
              } else {
                resultRow = {
                  icon: () => getValidationIcon(rows.length > 0 ? ValidationStatus.Valid : ValidationStatus.Invalid),
                  result: rows.length > 0 ? ValidationTerms.Pass : ValidationTerms.NoData,
                  details: explanation,
                  cypher: cypher
                }
              }

              let updatedRows = resultTableRows.slice();
              updatedRows.push(resultRow);
              let stateUpdate = {
                headers: ['icon', 'result', 'details', 'cypher'],
                numRows: updatedRows.length,
                rows: updatedRows
              };

              // console.log('stateUpdate: ', stateUpdate);
              // resolve();
              this.setState(stateUpdate, () => {
                // ok to go to next query
                resolve();
              })
            })
          }
        })    

        this.setOverallValidationStatus();
        this.stopDebugging();
      })
    })
  }

  setOverallValidationStatus = () => {
    let { rowIndex, overallStatus } = this.getOverallValidationStatusAndRowIndex();
    this.setState({
      validationIcon: getValidationIcon(overallStatus)
    })
    if (this.miniResultsTableRef.current && rowIndex >= 0) {
      this.miniResultsTableRef.current.setSelectedIndex(rowIndex);
    } 
  }

  getOverallValidationStatusAndRowIndex = () => {
    let { rows } = this.state;

    let indexToSelect = -1;
    let overallStatus = ValidationStatus.Valid;

    let noDataIndex = rows.findIndex(row => row.result === ValidationTerms.NoData);

    if (noDataIndex >= 0) {
      indexToSelect = noDataIndex;
      overallStatus = ValidationStatus.Invalid;
    } else {
      let lastRow = rows[rows.length-1];
      // there may be some errors due to bad query re-writing...but if the last row is an Error
      //  then that means the overall result is Error
      if (lastRow.result === ValidationTerms.Error) {
        // but we want the first Error to show
        let firstErrorIndex = rows.findIndex(row => row.result === ValidationTerms.Error);
        if (firstErrorIndex >= 0) {
          indexToSelect = firstErrorIndex;
        }
        overallStatus = ValidationStatus.Error;
      }
    }
    return {
      rowIndex: indexToSelect, 
      overallStatus    
    }
  }

  getDebugCypherToRun = (debugSteps, options = {}) => {
    let { limitOverride } = options;
    var cypherToRun = '';

    cypherToRun = debugSteps.getCypher();

    var activeStep = debugSteps.getActiveStep();
    var activeInternalStep = debugSteps.getActiveInternalStep();

    var activeStepCypher = (activeStep) ? activeStep.getCypher() : '';
    if (this.isCypherDirective(activeStepCypher)) {
      return cypherToRun;
    }

    if (cypherToRun) {
        var keyword = '';
        if (activeStepCypher) {
            keyword = this.getLineKeyword(activeStepCypher);
        }
        let shouldAddReturn = this.shouldAddReturn(cypherToRun, keyword);
        var shouldAddLimit = (keyword !== 'LIMIT')

        if (shouldAddReturn) {
            cypherToRun = this.handleUnion(cypherToRun);
        }                
        cypherToRun = (shouldAddReturn) ? `${cypherToRun}${CYPHER_RETURN}` : cypherToRun;
        cypherToRun = this.prepCypherBeforeAddingLimit(cypherToRun);
        let limitClause = this.getLimitClause(limitOverride);
        cypherToRun = cypherToRun.replace(new RegExp(InjectLimit, 'g'), limitClause)
        cypherToRun = (shouldAddLimit) ? `${cypherToRun}${limitClause}` : cypherToRun;
    }
    return {
      cypherToRun,
      activeStep, 
      activeInternalStep
    }

  }

  executeDebugQuery = () => {
      var { debugSteps } = this.state;

      this.setDebugCypherToDisplay();
      if (!debugSteps) {
        alert('There are no debug steps to execute', ALERT_TYPES.WARNING);
        return;
      }

      let { cypherToRun, activeStep, activeInternalStep } = this.getDebugCypherToRun(debugSteps);
      if (!cypherToRun) {
        return;
      }

      let explanationStep = (activeInternalStep) ? activeInternalStep : activeStep;
      let explanation = getExplanation(explanationStep);
      // console.log('Explanation: ', explanation)
      //this.setCypherEditorCypherQuery(cypherToDisplay);        
      this.setState({
          isBusy: true,
          canStepForward: debugSteps.canStepForward(),
          canStepBackward: debugSteps.canStepBackward(),
          isExplanationAvailable: (explanation) ? true : false,
          explanation: explanation
      }, () => {
          if (cypherToRun) {
              console.log('cypherToRun: ', cypherToRun);
              this.runQuery(cypherToRun, true);
          } else {
              this.updateDebugCanvas([], []);
              this.setState({ 
                isBusy: false,
                numRows: '0' 
              });
            }
      });
    }    

    getDebugSteps = () => {

      var { cypherQuery } = this.state;

      var debugSteps = new DebugSteps();
      var variableScope = new CypherVariableScope();

      const cypherStringConverter = new CypherStringConverter();

      let response = null;
      try {
        response = cypherStringConverter.convertToClausesAndVariables(cypherQuery);
      } catch (e) {
        console.log("Cannot parse query", e);
        this.setState({
          isError: true,
          errorMessage: `${e}`
        });
        return;
      }
      let { returnClauses, returnVariables } = response;
      
      returnClauses = returnClauses.reduce((acc, x) => {
          if (x.getOrderedClauses) {
            return acc.concat(x.getOrderedClauses());
          } else {
            return acc.concat([x]);
          }
      }, [])      

      returnClauses.forEach(returnClause => {
        // start old
        // let debugSnippets = getClauseDebugSnippets(returnClause, variableScope, {addMissingVars: true});
        // var blockCypher = this.getClauseCypher(returnClause, variableScope);
        // console.log('blockCypher: ', blockCypher);
        // var step = debugStep(blockCypher, debugSnippets);
        // debugSteps.addStep(step);
        // end old

        // start new
        let debugSnippetPairs = getClauseDebugSnippetStringPairs(returnClause, variableScope, {addMissingVars: true});
        let debugSnippetsWithContext = debugSnippetPairs.map(x => {
          // this should be true
          if (x instanceof SnippetStringWithContext) {
            if (returnClause.clauseInfo instanceof Pattern ||
              returnClause.clauseInfo instanceof WhereClause
            ) {
              let str = `${returnClause.keyword} ${x.snippetStr}`
              let newSnippet = x.clone();
              newSnippet.snippetStr = str;
              return newSnippet;
            } else {
              return x;
            }
          } else {
            return x;
          }
        });

        var blockCypher = this.getClauseCypher(returnClause, variableScope);
        // console.log('blockCypher: ', blockCypher);
        var step = debugStep(blockCypher, debugSnippetsWithContext, returnClause);
        debugSteps.addStep(step);

        // end new
      });

      return debugSteps;
    }

    startDebugging = (callback) => {

      var { cypherQuery } = this.state;

      this.clear();

      let debugSteps = this.getDebugSteps();

      this.setState({
        userRequestedStop: false,
        readonly: true,
        debugSteps: debugSteps,
        areStepping: true,
        originalCypherQuery: cypherQuery,
        canStepBackward: debugSteps.canStepBackward(),
        canStepForward: debugSteps.canStepForward()
      }, () => {
        this.setDebugCypherToDisplay();
        if (callback) {
          callback();
        }
      });      
    }

    stepBackward = () => {
      const { debugSteps } = this.state;
      debugSteps.stepBackward();      
      this.executeDebugQuery();   
    }

    stepForward = () => {
      const { debugSteps } = this.state;
      debugSteps.stepForward();      
      this.executeDebugQuery();   
    }

    internalStepForward = () => {
      const { debugSteps } = this.state;
      debugSteps.internalStepForward();        
      this.executeDebugQuery();
    }

    internalStepBackward = () => {
      const { debugSteps } = this.state;
      debugSteps.internalStepBackward();        
      this.executeDebugQuery();      
    }

    handleRowSelection = (selectedRowIndexes) => {
        let { rows } = this.state;
        let selectedRows = rows.filter((_, index) => selectedRowIndexes.includes(index));

        // deal with paths to get start and end nodes
        let paths = findObjectsContainingAllKeys(selectedRows, ['start','end','segments']);
        let { pathStartIds, pathEndIds } = paths.reduce((acc, path) => {
          let startId = path.start.identity;
          let startIdStr = new Integer(startId.low, startId.high).toString();

          let endId = path.end.identity;
          let endIdStr = new Integer(endId.low, endId.high).toString();
          acc.pathStartIds.push(startIdStr);
          acc.pathEndIds.push(endIdStr);
  
          return acc;
        }, { pathStartIds: [], pathEndIds: [] })

        // deal with nodes and rels

        // NOTE: Neo4j can use the same id for both a node and a relationship
        //  we need to split the ids up so therefore can't use this function
        // let allIds = findValues(selectedRows, 'identity');
        // let allStrIds = allIds.map(id => new Integer(id.low, id.high).toString());

        let nodeStrIds = findObjectsContainingAllKeys(selectedRows, ['identity','labels','properties'])
                          .map(node => node.identity)
                          .map(id => new Integer(id.low, id.high).toString());                          
        let relStrIds = findObjectsContainingAllKeys(selectedRows, ['identity','start','end','type','properties'])
                          .map(rel => rel.identity)
                          .map(id => new Integer(id.low, id.high).toString());                          

        if (this.debugCanvasRef.current) {
          this.debugCanvasRef.current.selectAndFocusOnIds(nodeStrIds, relStrIds, pathStartIds, pathEndIds);
        }
    }

    setLimit = (limit) => {
      this.setState({
          limit: limit
      }); 
    }    

    dividerMouseUp = (e) => {
      if (this.ewDividerRef.current) {
        this.ewDividerRef.current.dividerMouseUp(e);
      }
      if (this.nsDividerRef.current) {
        this.nsDividerRef.current.dividerMouseUp(e);
      }
    };

    dividerMouseMove = (e) => {
      if (this.ewDividerRef.current) {
        this.ewDividerRef.current.dividerMouseMove(e);
      }
      if (this.nsDividerRef.current) {
        this.nsDividerRef.current.dividerMouseMove(e);
      }
    };    

    setCodeHeight = (newHeight) => {
        // console.log('setting height to: ', newHeight);
        document.querySelector("#cypherDebugToolDebugEditor .cm-editor").style.height = `${newHeight}px`;
        // if (this.cypherEditorRef.current) {
        //   this.cypherEditorRef.current.cypherEditor.codemirror.requestMeasure();
        // }
    }

    getMaxCodeWidthWhenDividerCollapsed = () => {
      let maxWidth = window.innerWidth
          - pxVal(Sizes.ClosedSidebar) - pxVal(DividerTitleWidthOrHeight) + 5

      return maxWidth;
    }

    getMaxCodeHeightWhenDividerCollapsed = () => {
      let maxHeight = window.innerHeight - pxVal(ToolbarSizes.ToolbarHeight)
          - pxVal(DividerTitleWidthOrHeight)
          - pxVal(Sizes.MainToolbarHeight);

      return maxHeight;
    }

    setResultTableHeight = () => {
      const { codeDebugHeight } = this.state;
      // let parentHeight = document.getElementById('debugContent').getBoundingClientRect().height;
      let newHeight = window.innerHeight - codeDebugHeight - pxVal(ToolbarSizes.ToolbarHeight)
          - pxVal(Sizes.Divider) - pxVal(Sizes.MainToolbarHeight) - pxVal(Sizes.ResultTableMarginBottom);      
      if (newHeight < 0) {
        newHeight = 0;
      }
      // console.log('setting newHeight:', newHeight);
      this.setState({
        resultTableHeight: newHeight
      })
    }

    getCanvasWidth = (codeDebugWidth) => {
        let computedWidth = window.innerWidth - pxVal(codeDebugWidth)
                            - pxVal(Sizes.ClosedSidebar) - pxVal(Sizes.Divider)
                            - pxVal(Sizes.MarginLeft) - pxVal(Sizes.MarginRight);
        let width = (computedWidth < pxVal(Sizes.MinCanvasWidth)) ? pxVal(Sizes.MinCanvasWidth) : computedWidth;
        //console.log('getCanvasWidth: ', width)
        return width;
    }

    errorClose = () => {
      this.setState({ isError: false, errorMessage: '' })
    }

    getNodeText = (nodeInfo) => {
      if (this.debugCanvasRef.current) {
        return this.debugCanvasRef.current.getNodeCaptionExternal(nodeInfo); 
      } else {
        return '';
      }      
    }

    getNodeColor = (nodeInfo) => {
      if (this.debugCanvasRef.current) {
        return this.debugCanvasRef.current.getColorForLabelsExternal(nodeInfo.labels);
      } else {
        return null;
      }      
    }

    handleNodeLabelConfigChange = (nodeLabelConfig) => {
      if (this.miniResultsTableRef.current) {
        this.miniResultsTableRef.current.reRender();
      }
    }

    handleNodeColorConfigChange = (nodePaletteConfig) => {
      if (this.miniResultsTableRef.current) {
        this.miniResultsTableRef.current.reRender();
      }
    }

    handleSetCodeWidth = (width, extraState = {}) => {
      let newCanvasWidth = this.getCanvasWidth(width);
      this.setCanvasWidthState(newCanvasWidth);                  
      this.setState({
        ...extraState,
        codeDebugWidth: width,
      });

    }

    handleSetCodeHeight = (height, extraState = {}) => {
      this.setCodeHeight(height);
      this.setState({
          ...extraState,
          codeDebugHeight: height
      }, () => {
        this.setResultTableHeight();
      });
    }

    render() {
      const { 
        cypherQuery, 
        canStepBackward, canStepForward, 
        limit, numRows, areStepping,
        codeDebugWidth, canvasWidth, resultTableHeight,
        rows, headers,
        isError, errorMessage,
        readonly, paramDialog, exportAsDialog,
        showQueryResults, isBusy,
        isExplanationAvailable, explanation, validationIcon,
        resultsTableIsCollapsed, graphVisualizationIsCollapsed
      } = this.state;

      return (
          <div
            onMouseMove={this.dividerMouseMove}
            onMouseUp={this.dividerMouseUp}
          >
            <DebugToolbar 
              onExecute={this.executeQuery} 
              areStepping={areStepping}
              clear={this.clear}
              validate={this.validate}
              validationIcon={validationIcon}
              setParameters={this.showSetParameters}
              startDebugging={this.startDebugging}
              stopDebugging={this.stopDebugging}
              stopQueryExecution={this.stopQueryExecution}              
              stepBackward={this.stepBackward}
              stepForward={this.stepForward}
              internalStepForward={this.internalStepForward}
              internalStepBackward={this.internalStepBackward}
              canStepBackward={canStepBackward}
              canStepForward={canStepForward}
              limit={limit}
              setLimit={this.setLimit}
              numRows={numRows}
              isBusy={isBusy}
            />
            <div id={'debugContent'} style={{display: 'flex', flexFlow: 'row'}}>
              <div style={{display: 'flex', flexFlow: 'column'}}>
                  <div style={{display: (isError) ? 'block':'none'}}>
                    <Alert onClose={this.errorClose} severity="warning">
                        {errorMessage}
                    </Alert>
                  </div>
                  <div id='cypherDebugToolDebugEditor' style={{
                    // marginTop: '5px', 
                    width: `${codeDebugWidth}px`
                  }}
                  >
                      <CypherEditor
                          ref={this.cypherEditorRef}
                          readOnly={readonly}
                          //initialValue={cypherQuery}
                          lineWrapping={true}
                          value={cypherQuery}
                          onValueChanged={(value) => this.setCypherQuery(value)}
                          preExtensions={[this.lineHighlighter, breakpointGutter,
                            EditorView.domEventHandlers({
                              paste: (event) => {
                                // console.log('paste event: ', event)
                                // // https://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser
                                // let clipboardData = event.clipboardData || window.clipboardData;
                                // let pastedData = clipboardData.getData('Text');                                
                                // console.log(pastedData);

                                // just clear the breakpoints when we detect a paste
                                //   because code mirror will 
                                // this.setState({
                                //   breakpointLines: []
                                // })
                              }
                            })
                          ]}
                          //onEditorCreated={this.setCypherEditor}
                          //cypherLanguage={false}
                          // onSelectionChanged={(e) => {
                          //     console.log("Selection Changed (ResultsTable): ", e);
                          // }}
                          classNames={["cypherEditor"]}                            
                      />
                  </div>
                  <Divider
                    ref={this.nsDividerRef}
                    min={Sizes.MinCypherEditorWidth}
                    max={Sizes.MaxCypherEditorWidth}
                    size={Sizes.Divider}
                    getHeight={() => this.state.codeDebugHeight}
                    type={DividerType.NorthSouth}
                    title="Results Table"
                    onOpen={() => {
                      let { previousCodeDebugHeight } = this.state;
                      let height = (previousCodeDebugHeight) ? previousCodeDebugHeight : 300;
                      this.handleSetCodeHeight(height, {
                        resultsTableIsCollapsed: false                          
                      })
                    }}
                    onCollapse={() => {
                      let { codeDebugHeight } = this.state;
                      let height = this.getMaxCodeHeightWhenDividerCollapsed();
                      this.handleSetCodeHeight(height, {
                        resultsTableIsCollapsed: true,
                        previousCodeDebugHeight: codeDebugHeight
                      })
                    }}
                    dragCallback={(height) => {
                      this.handleSetCodeHeight(height)
                    }}
                  />              
                  <MiniResultsTable    
                    ref={this.miniResultsTableRef}
                    visible={!resultsTableIsCollapsed}
                    width={codeDebugWidth} resultTableHeight={resultTableHeight}
                    rows={rows} headers={headers} 
                    handleRowSelection={this.handleRowSelection}
                    getNodeText={this.getNodeText}
                    getNodeColor={this.getNodeColor}
                    numRows={numRows}
                  />
              </div>
              <Divider
                ref={this.ewDividerRef}
                min={Sizes.MinCypherEditorWidth}
                max={Sizes.MaxCypherEditorWidth}
                size={Sizes.Divider}
                title="Graph Visualization"
                onOpen={() => {
                  let { previousCodeDebugWidth } = this.state;
                  let width = (previousCodeDebugWidth) ? previousCodeDebugWidth : 300;
                  this.handleSetCodeWidth(width, {
                    graphVisualizationIsCollapsed: false                          
                  })
                }}
                onCollapse={() => {
                  let { codeDebugWidth } = this.state;
                  let width = this.getMaxCodeWidthWhenDividerCollapsed();
                  this.handleSetCodeWidth(width, {
                    graphVisualizationIsCollapsed: true,
                    previousCodeDebugWidth: codeDebugWidth
                  })
                }}
                getWidth={() => this.state.codeDebugWidth}
                type={DividerType.EastWest}
                dragCallback={(width) => {
                  this.handleSetCodeWidth(width);
                }}
              />
              <div style={{display: 'flex', flexFlow: 'column', position: 'relative'}}>
                <DebugCanvasPlainNvl ref={this.debugCanvasRef} 
                  width={canvasWidth}
                  visible={!graphVisualizationIsCollapsed}
                  isExplanationAvailable={isExplanationAvailable}
                  explanation={explanation}
                  showQueryResults={showQueryResults}
                  onNodeLabelConfigChange={this.handleNodeLabelConfigChange}
                  onNodeColorConfigChange={this.handleNodeColorConfigChange}
                />
              </div>
              {/* <div style={{width: '300px', height: '200px', border: '1px solid black'}}></div> */}
            </div>
            <GeneralTextDialog maxWidth={'md'} open={paramDialog.open} onClose={paramDialog.handleClose}
                    ref={this.paramDialogRef}
                    title={paramDialog.title} placeholder={paramDialog.placeholder}
                    text={paramDialog.text} setText={paramDialog.setText}
                    pasteHandler={paramDialog.onPaste}
                    buttons={paramDialog.buttons} rows={15} />         
            <ExportDataImporterDialog maxWidth={'md'} 
                    open={exportAsDialog.open} 
                    onClose={exportAsDialog.handleClose}
                    ref={this.exportAsDialogRef}
                    handleRunAndExportData={this.handleRunAndExportData}/>
          </div>
      )
    }

}
