import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { css } from 'emotion'
import { Text, Editor, Transforms, Range, createEditor } from 'slate';
import { useSlate } from 'slate-react';
import { withHistory } from 'slate-history';
import {
  Slate,
  Editable,
  ReactEditor,
  withReact,
  useSelected,
  useFocused,
} from 'slate-react';
import { IconButton, Button } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import SecurityRole from '../../../common/SecurityRole';

const pxVal = (px) =>
  typeof px === "string" ? parseInt(px.replace(/px$/, "")) : px;

export const Portal = ({ divRef, children }) => {
    return ReactDOM.createPortal(children, document.body)
}

const SlateScenarioEditorBlock = ({ dataProvider, scenarioSetBuilder }) => {
  const ref = useRef(null);
  const initialValue = dataProvider.getScenario();
  //console.log('initialValue: ', initialValue);
  const [value, setValue] = useState(initialValue);
  const [target, setTarget] = useState(undefined);
  const [addSpaces, setAddSpaces] = useState({ before: false, after: true});
  const [index, setIndex] = useState(0)
  const [search, setSearch] = useState('')
  const renderElement = useCallback(props => <Element {...props} />, [])
  const renderLeaf = useCallback(props => <Leaf {...props} />, [])  
  const editor = useMemo(
    () => withMentions(withReact(withHistory(createEditor()))),
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

  const onKeyDown = (event) => {
    if (!SecurityRole.canEdit()) {
      event.preventDefault();
      return;
    }
    switch (event.key) {
        case 'Enter':
          //event.preventDefault()
          Editor.insertBreak(editor)
          //Transforms.move(editor);
          //Transforms.insertNodes(editor, { text: ''});
          break
      }
    }

  useEffect(() => {
    if (target) {
      const el = ref.current
      try {
        const domRange = ReactEditor.toDOMRange(editor, target)
        const rect = domRange.getBoundingClientRect()
        //const offsets = { top: -190, left: -60 }
        const offsets = { top: 0, left: 0 }
        el.style.top = `${rect.top + window.pageYOffset + 24 + offsets.top}px`
        el.style.left = `${rect.left + window.pageXOffset + offsets.left}px`
        } catch (e) {
          console.log('WARNING: SlateScenarioEditorBlock useEffect() threw error', e);
        }
    }
  }, [0, editor, index, search, target]) //[chars.length, editor, index, search, target])

  const handleOnChange = (value) => {

  }

  const onPaste = (event) => {
    if (SecurityRole.canEdit()) {
      // code from https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
      let paste = (event.clipboardData || window.clipboardData).getData('text');

      var plainText = dataProvider.getPlainTextScenario();
      if (!plainText) {
        // if there is nothing set, then construct appropriate slate structure to handle newline bug
        var slateText = [];
        var lines = paste.split('\n');
        lines.map((x,i) => {
          slateText.push({
            children: [
              {
                text: x,
              }
            ],
          });
          if (i < (lines.length - 1)) {
            slateText.push({
              children: [
                {
                  text: '',
                }
              ],
            });
          }
        })
        //console.log('setting setScenario', slateText);
        dataProvider.setScenario(slateText);
        setValue(slateText);
        event.preventDefault();    
      } 
    }
  }

  return (
    <>
        <div style={{border: '1px solid #CCC', minHeight: '2em', padding: '8px', width: '100%'}}>
        <Slate
            spellCheck={false}
            editor={editor}
            value={value}
            onChange={value => {
                //console.log('slate value: ', value);
                setValue(value);
                dataProvider.setScenario(value);
                handleOnChange(value);
            }}
            >
            <HoveringToolbar scenarioSetBuilder={scenarioSetBuilder}/>              
            <Editable
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                placeholder="Enter Scenario..."
            />
        </Slate>
    </div>
    {target && (
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

const insertMention = (editor, suggestion) => {
    const mention = { type: 'mention', suggestion, children: [{ text: '' }] }
    Transforms.insertNodes(editor, mention);
    Transforms.move(editor);
    //Transforms.insertNodes(editor, { text: text}); 
    //Transforms.move(editor);
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
}

const HoveringToolbar = (props) => {
  const editor = useSlate()
  const ref = useRef();
  //const { slateRef } = props;
  //const ref = slateRef;

  useEffect(() => {

    if (!props.scenarioSetBuilder.isThereAnAssociatedDataModel()) {
      return;
    }
    const el = ref.current
    const { selection } = editor

    //console.log('in Hovering toolbar');
    if (!el) {
      //console.log('Hovering toolbar return');
      return
    }

    /*
    console.log('selection: ', selection);
    console.log('ReactEditor.isFocused(editor): ', ReactEditor.isFocused(editor));
    if (selection) {
      console.log('Range.isCollapsed(selection): ', Range.isCollapsed(selection));
      console.log('Editor.string(editor, selection): ', Editor.string(editor, selection));
    }*/

    if (
      !selection ||
      !ReactEditor.isFocused(editor) ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ''
    ) {
      el.removeAttribute('style');
      //console.log('Hovering toolbar return 2');
      return;
    }

    const domSelection = window.getSelection();
    const domRange = domSelection.getRangeAt(0);
    const rect = domRange.getBoundingClientRect();
    const leftOffset = 130;
    el.style.opacity = '1';
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
    el.style.left = `${rect.left +
      window.pageXOffset -
      el.offsetWidth / 2 +
      rect.width / 2 +
      leftOffset}px`
  });

  const { selection } = editor;  

  const buttonStyle = css`
    border: 2px solid #2E8CC1;
    background: white;
    height: 2em;
    margin: 2px;
    cursor: pointer;
    padding: 3px;
    padding-left: 5px;
    padding-right: 5px;
    font-weight: 500;
    text-transform: uppercase;
  `

  return (
    <Portal>
      <div
        ref={ref}
        open={true}
        className={css`
          //padding: 8px 7px 6px;
          position: absolute;
          z-index: 100;
          top: -10000px;
          left: -10000px;
          margin-top: 4.2em;
          opacity: 0;
          //background-color: #222;
          background: #ddd;
          border-radius: 4px;
          transition: opacity 0.75s;
          display: flex;
          flex-flow: row;
        `}
      >
        <div className={buttonStyle} 
          onMouseDown={(event) => {
            //event.preventDefault();
            const selectionText = Editor.string(editor, selection);
            props.scenarioSetBuilder.addNodeLabel(selectionText);
            //console.log('TODO: add node: ', selectionText);
          }}>
            Add Node Label
        </div>
        <div className={buttonStyle} 
          onMouseDown={(event) => {
            //event.preventDefault();
            const selectionText = Editor.string(editor, selection);
            const el = ref.current;
            props.scenarioSetBuilder.promptAddNodeRelNode(selectionText, {
              x: pxVal(el.style.left) + 120, y: pxVal(el.style.top) + 45
            });
          }}>
            Add Relationship Type
        </div>
      </div>
    </Portal>
  )
}

const isFormatActive = (editor, format) => {
  const [match] = Editor.nodes(editor, {
    match: n => n[format] === true,
    mode: 'all',
  })
  return !!match
}

const FormatButton = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <IconButton
      disabled={!isFormatActive(editor, format)}
      onMouseDown={event => {
        event.preventDefault()
        //toggleFormat(editor, format)
      }}
    >
      <AddIcon/>
    </IconButton>
  )
}

export default SlateScenarioEditorBlock