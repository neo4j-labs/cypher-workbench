import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Prism from 'prismjs';
import 'prismjs/components/prism-cypher';
import { css } from 'emotion'
import { Text, Editor, Transforms, Range, createEditor } from 'slate';
import { withHistory } from 'slate-history';
import {
  Slate,
  Editable,
  ReactEditor,
  withReact,
  useSelected,
  useFocused,
} from 'slate-react';
import { getPropertyKeysForPatternItem } from './DataModelUtil';
import { getWithPromptInfo, PROMPT_TYPE } from '../../../../common/parse/autocompleteHelper';

import { CypherFunctionHelper } from '../../../../common/parse/cypherFunctionHelper';
import SecurityRole from '../../../common/SecurityRole';

export const Portal = ({ divRef, children }) => {
    return ReactDOM.createPortal(children, document.body)
    //return ReactDOM.createPortal(children, divRef.current);
}

const cypherFunctionHelper = new CypherFunctionHelper();

const SlateCypherEditorBlock = ({ dataProvider }) => {
  const ref = useRef(null);
  const initialValue = dataProvider.getCypherSnippet();
  //console.log('initialValue: ', initialValue);
  const [value, setValue] = useState(initialValue);
  const [target, setTarget] = useState(undefined);
  const [addSpaces, setAddSpaces] = useState({ before: false, after: true});
  const [index, setIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [popupWords, setPopupWords] = useState(KEYWORDS);
  const renderElement = useCallback(props => <Element {...props} />, [])
  const renderLeaf = useCallback(props => <Leaf {...props} />, [])  
  const editor = useMemo(
    () => withMentions(withReact(withHistory(createEditor()))),
    []
  )

  const getVariableProperties = (variableName) => {
      /*
      if (variableName !== undefined) {
        return (variablePropertiesMap[variableName]) ? variablePropertiesMap[variableName] : [];
      } else {
          return [];
      }
      */
      //var list = dataProvider.getVariableScope().getVariableItemList(variableName);
      //var scopedBlockProvider = dataProvider.getScopedBlockProvider();
      var scopedBlockProvider = dataProvider.getScopedBlockProvider().getPreviousScopedBlockProvider();
      if (scopedBlockProvider) {
        var list = scopedBlockProvider.getVariableScope().getVariableItemList(variableName);
        if (list && list.length > 0) {
            var propertyKeys = list
                .map(listItem => getPropertyKeysForPatternItem(scopedBlockProvider, dataProvider.getDataModel(), listItem))                    
                .reduce((allPropertyKeys, propertyKeys) => {
                    propertyKeys
                        .filter(x => !allPropertyKeys.includes(x))
                        .map(x => allPropertyKeys.push(x));
                    return allPropertyKeys;
                }, []);
            return propertyKeys;
        }
      }
      return [];
    }

  const getVariables = () => {
    //var scopedBlockProvider = dataProvider.getScopedBlockProvider();
    var scopedBlockProvider = dataProvider.getScopedBlockProvider().getPreviousScopedBlockProvider();
    if (scopedBlockProvider) {
      var variables = scopedBlockProvider.getVariableSet();
      variables = Array.from(variables).sort();
      return variables;
    } else {
      return [];
    }
  }
  /*
  const chars = KEYWORDS.filter(c =>
    c.toLowerCase().startsWith(search.toLowerCase())
  ).slice(0, 10)
  */
 const chars = popupWords.filter(c =>
    search === '' || 
    c.toLowerCase().startsWith(search.toLowerCase())
  ).slice(0, 10);
  
  const decorate = useCallback(
    ([node, path]) => {
      const ranges = []
      if (!Text.isText(node)) {
        return ranges
      }
      const tokens = Prism.tokenize(node.text, Prism.languages.cypher);
      let start = 0

      for (const token of tokens) {
        const length = getLength(token)
        const end = start + length

        if (typeof token !== 'string') {
          ranges.push({
            [token.type]: true,
            anchor: { path, offset: start },
            focus: { path, offset: end },
          })
        }

        start = end
      }

      return ranges
    },
    []
  )  

  const getLength = token => {
    if (typeof token === 'string') {
      return token.length
    } else if (typeof token.content === 'string') {
      return token.content.length
    } else {
      return token.content.reduce((l, t) => l + getLength(t), 0)
    }
  }
  
  Prism.languages.cypher = Prism.languages.extend('cypher', {})

  const onPaste = (event) => {
    if (SecurityRole.canEdit()) {
      // code from https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
      let paste = (event.clipboardData || window.clipboardData).getData('text');

      var plainText = dataProvider.getCypher();
      if (!plainText) {
        if (paste && paste.split) {
          paste = paste.split('\n')
            // filter out things like "3" or "4" on a standalone line
            //   left side will create an int if possible, right side will cast to int 
            //   because using != instead of !==, therefore if only a single number exists 
            //   it should be filtered out
            .filter(x => {
              x = x.trim();
              const xInt = parseInt(x);
              const decision = xInt != x;
              //console.log(`x: '${x}', xInt: ${xInt}, decision: ${decision}`);
              return decision;
            }) 
            .join('\n');
        }
    
        var slateText = dataProvider.setPlainTextCypherStatement(paste);
        setValue(slateText);
        event.preventDefault();    
      } 
    }
  }
  
  const onKeyDown = useCallback(
    event => {
      if (!SecurityRole.canEdit()) {
        event.preventDefault();
        return;
      }      
      if (target) {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault()
            const prevIndex = index >= chars.length - 1 ? 0 : index + 1
            setIndex(prevIndex)
            break
          case 'ArrowUp':
            event.preventDefault()
            const nextIndex = index <= 0 ? chars.length - 1 : index - 1
            setIndex(nextIndex)
            break
          case 'Tab':
          case 'Enter':
            event.preventDefault()
            const suggestion = chars[index];
            if (suggestion) {
              Transforms.select(editor, target)
              insertMention(editor, suggestion, addSpaces);
            }
            setTarget(null);
            break
          case 'Escape':
            event.preventDefault()
            setTarget(null);
            break
        }
      } else {
        switch (event.key) {
          case 'Enter':
            Editor.insertBreak(editor)
            break
        }        
      }
    },
    [index, search, target]
  )

  useEffect(() => {
    if (target && chars.length > 0) {
      const el = ref.current
      try {
        const domRange = ReactEditor.toDOMRange(editor, target)
        const rect = domRange.getBoundingClientRect()
        //const offsets = { top: -190, left: -60 }
        const offsets = { top: 0, left: 0 }
        el.style.top = `${rect.top + window.pageYOffset + 24 + offsets.top}px`
        el.style.left = `${rect.left + window.pageXOffset + offsets.left}px`
        } catch (e) {
          console.log('WARNING: SlateCypherEditorBlock useEffect() threw error', e);
        }
    }
  }, [chars.length, editor, index, search, target])

  var delayedEnsureVariablesInVariableScopeTimer = null;
  var delayedEnsureVariablesInVariableScopeDelay = 200;
  const delayedEnsureVariablesInVariableScope = () => {
    if (delayedEnsureVariablesInVariableScopeTimer) clearTimeout(delayedEnsureVariablesInVariableScopeTimer);
    delayedEnsureVariablesInVariableScopeTimer = setTimeout(() => {
      dataProvider.ensureVariablesInVariableScope()
      delayedEnsureVariablesInVariableScopeTimer = null;
    }, delayedEnsureVariablesInVariableScopeDelay);
  }


  const handleAutocomplete = () => {
    const { selection } = editor
    var beforeRange, beforeText, searchText, matchToken;

    if (selection && Range.isCollapsed(selection)) {
        const [start] = Range.edges(selection)

        var localVariables = getVariables();

        beforeRange = {
            anchor: {
                path: [0, 0],
                offset: 0,
            },
            focus: start
        }
        beforeText = Editor.string(editor, beforeRange)

        const beforeMatch = beforeText && beforeText.match(/ (\S*)$/)
        //searchText = beforeText;
        var parseResults = getWithPromptInfo(beforeText, localVariables, cypherFunctionHelper.getFunctionPrefixes());
        matchToken = (beforeMatch) ? beforeMatch[1] : '';
        searchText = parseResults.searchText;
        if (beforeMatch) {
            beforeRange = {
                anchor: {
                    path: [0, 0],
                    offset: beforeMatch.index,
                },
                focus: start
            }
        }
        /*
        console.log('beforeText: ', beforeText);
        console.log('searchText: ', searchText);
        console.log('matchToken: ', matchToken);
        */
        
        var variableName = '';
        var variableProperty = '';
        var forceShowPopup = false; 
        var variableProperties = [];
        var popupWords = [];
        var functions = [];

        //console.log('variableName: ', variableName);
        //console.log('parseResults: ', parseResults);
        beforeRange.anchor.offset += 1; // +1 for the space in the regex above
        if (matchToken && matchToken !== searchText && matchToken.endsWith(searchText)) {
          // adjust the target text index so we don't replace more than we should 
          //   with the suggestion
          beforeRange.anchor.offset += (matchToken.length - searchText.length);
        }

        //console.log('beforeRange', beforeRange);

        if (beforeText === '') {
            popupWords = KEYWORDS;
            setAddSpaces({ before: false, after: true});
        } else {
          setAddSpaces({before: false, after: false});
          switch (parseResults.promptType) {
            case PROMPT_TYPE.VariableAndFunction:
              functions = cypherFunctionHelper.getFunctions();
              //beforeRange.anchor.offset += 1;              
              //setVariables(localVariables);
              if (localVariables.includes(searchText) || functions.includes(searchText)) {
                searchText = '';
              } else {
                popupWords = localVariables.concat(functions);
              }
              break;
            case PROMPT_TYPE.FunctionOnly:
              functions = cypherFunctionHelper.getFunctions();
              if (functions.includes(searchText)) {
                searchText = '';
              } else {
                popupWords = functions; 
              }
              break;
            case PROMPT_TYPE.VariableProperty:
              variableName = parseResults.variableOrFunction;
              variableProperty = parseResults.searchText;
              variableProperties = getVariableProperties(variableName);
              console.log('variableProperties: ', variableProperties);
              if (variableProperties.includes(variableProperty)) {
                // property has already been added
                searchText = '';
              } else {
                popupWords = variableProperties;
                searchText = variableProperty;
                forceShowPopup = true;
              }
              break;
            case PROMPT_TYPE.None:
              searchText = '';
              break;
          }
        }
        setPopupWords(popupWords);
        
        // WITH p.name AS actor, count(m)/5 AS score, apoc.coll.randomItem(collect(m)) AS item

        const after = Editor.after(editor, start)
        const afterRange = Editor.range(editor, start, after)
        const afterText = Editor.string(editor, afterRange)
        const afterMatch = afterText.match(/^(\s|$)/)
        //console.log('afterMatch: ', afterMatch);

        if ((forceShowPopup || searchText) && afterMatch && popupWords.length > 0) {
            setTarget(beforeRange)
            setSearch(searchText)
            setIndex(0)
            return
        }
    }

    // setTarget(null)     
    // need to set a timeout or the onClick in the popup <div> event never registers.  
    // instead, the popup disappears first        
    setTimeout(() => {
        setTarget(null);
    }, 250);

  }

  var changeTimer = null;
  var autocompleteDelay = 200;
  const handleOnChange = (value) => {
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      handleAutocomplete(value)
      delayedEnsureVariablesInVariableScope();
      changeTimer = null;
    }, autocompleteDelay);
  }

  //console.log('target: ', target);
  return (
    <>
        <div style={{border: '1px solid #CCC', minHeight: '2em', padding: '8px', width: '100%'}}>
        <Slate
            spellCheck={false}
            editor={editor}
            value={value}
            onChange={value => {
                setValue(value);
                dataProvider.setCypherSnippet(value);
                handleOnChange(value);
            }}
            >
            <Editable
                decorate={decorate}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                onKeyDown={onKeyDown}
                onPaste={onPaste}                
                placeholder="Enter Cypher..."
            />
        </Slate>
    </div>
    {target && chars.length > 0 && (
        <Portal>
                <div
                    ref={ref}
                    style={{
                      top: '-9999px',
                      left: '-9999px',
                      position: 'absolute',
                      zIndex: 1000,
                      padding: '3px',
                      background: 'white',
                      borderRadius: '4px',
                      boxShadow: '0 1px 5px rgba(0,0,0,.2)',
                    }}
                >
                    {chars.map((char, i) => (
                    <div
                        key={char}
                        onClick={() => {
                            //alert('clicked');
                            Transforms.select(editor, target)
                            insertMention(editor, char, addSpaces)
                        }}
                        style={{
                            cursor: 'pointer',
                            padding: '1px 3px',
                            borderRadius: '3px',
                            background: i === index ? '#B4D5FF' : 'transparent',
                        }}
                    >
                        {char}
                    </div>
                    ))}
                </div>
            </Portal>
        )}        
    </>
  )
}

const withMentions = editor => {
  const { isInline, isVoid } = editor

  editor.isInline = element => {
    return element.type === 'mention' ? true : isInline(element)
  }

  editor.isVoid = element => {
    return element.type === 'mention' ? true : isVoid(element)
  }

  return editor
}

const insertMention = (editor, suggestion, addSpaces) => {
    const { children, selection } = editor;
    /*
    const [start, end] = Range.edges(selection);
    //console.log('insertMention: start end: ', start, end);
    const selectionRange = {
        anchor: start,
        focus: end
    }
    const selectionText = Editor.string(editor, selectionRange);
    const grandChildrenText = (children && children[0] && children[0].children && children[0].children[0]) 
                                    ? children[0].children[0].text : '';
    //console.log('insertMention selectionText: ', selectionText);                                    
    //console.log('insertMention grandChildrenText: ', grandChildrenText);
    const text = (selectionText === grandChildrenText) ? `${suggestion} ` : ` ${suggestion} `;
    */
    var text = (addSpaces.before) ? ' ' : '';   
    text += suggestion;
    text += (addSpaces.after) ? ' ' : '';
    Transforms.insertNodes(editor, { text: text}); 
    Transforms.move(editor);
}

const Element = props => {
  const { attributes, children, element } = props
  switch (element.type) {
    case 'mention':
      return <MentionElement {...props} />
    default:
      return <code spellCheck={false} {...attributes}>{children}</code>
  }
}

const Leaf = ({ attributes, children, leaf }) => {
    return (
      <span
        spellCheck={false} 
        {...attributes}
        className={css`
              font-family: monospace;
              background: hsla(0, 0%, 100%, .5);
          ${leaf.comment &&
            css`
              color: slategray;
            `} 
          ${(leaf.operator || leaf.url) &&
            css`
              color: #9a6e3a;
            `}
          ${leaf.keyword &&
            css`
              color: #07a;
            `}
          ${(leaf.variable || leaf.regex) &&
            css`
              color: #e90;
            `}
          ${(leaf.number ||
            leaf.boolean ||
            leaf.tag ||
            leaf.constant ||
            leaf.symbol ||
            leaf.attr ||
            leaf.selector) &&
            css`
              color: #905;
            `}
          ${leaf.punctuation &&
            css`
              color: #999;
            `}
          ${(leaf.string || leaf.char) &&
            css`
              color: #690;
            `}
          ${(leaf.function || leaf.class) &&
            css`
              color: #dd4a68;
            `}
          `}
      >
        {children}
      </span>
    )
  }

const MentionElement = ({ attributes, children, element }) => {
  const selected = useSelected()
  const focused = useFocused()
  return (
    <Leaf {...attributes}>
        {element.character}
    </Leaf>
    )
      {/*
    
    <span
      {...attributes}
      contentEditable={false}
      style={{
        padding: '3px 3px 2px',
        margin: '0 1px',
        verticalAlign: 'baseline',
        display: 'inline-block',
        borderRadius: '4px',
        backgroundColor: '#eee',
        fontSize: '0.9em',
        boxShadow: selected && focused ? '0 0 0 2px #B4D5FF' : 'none',
      }}
    >
      {element.character}
      {children}
    </span>
      */}    
}

const KEYWORDS = [
  'WITH',
  'UNWIND'
]

export default SlateCypherEditorBlock