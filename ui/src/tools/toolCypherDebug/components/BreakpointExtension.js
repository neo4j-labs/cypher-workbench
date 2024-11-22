// from https://codemirror.net/examples/gutter/

import {EditorView, gutter, GutterMarker} from "@codemirror/view"
import {StateField, StateEffect, RangeSet} from "@codemirror/state"

const breakpointEffect = StateEffect.define({
  map: (val, mapping) => ({pos: mapping.mapPos(val.pos), on: val.on})
})

const breakpointState = StateField.define({
  create() { return RangeSet.empty },
  update(set, transaction) {
    set = set.map(transaction.changes)
    for (let e of transaction.effects) {
      if (e.is(breakpointEffect) && isReadonly()) { // only allow breakpoints in read-only (debug) mode
        if (e.value.on) {
            set = set.update({add: [breakpointMarker.range(e.value.pos)]})
        }
        else {
            set = set.update({filter: from => from != e.value.pos})
        }
        notifyListeners(e.value);
      }
    }
    return set
  }
})

export function setBreakpoint(pos, on) {
    if (savedEditorView) {
        let view = savedEditorView;
        // this is copied from toggleBreakpoint
        // let breakpoints = view.state.field(breakpointState)
        // let hasBreakpoint = false
        // breakpoints.between(pos, pos, () => {hasBreakpoint = true})
        view.dispatch({
          effects: breakpointEffect.of({pos, on})
        })
    }
}

export function getBreakpointState () {
    if (savedEditorView) {
        return savedEditorView.state.field(breakpointState);
    } else {
        return null;
    }
}

function toggleBreakpoint(view, pos) {
  let breakpoints = view.state.field(breakpointState)
//   console.log('breakpoints: ', breakpoints)
  let hasBreakpoint = false
  breakpoints.between(pos, pos, () => {hasBreakpoint = true})
  view.dispatch({
    effects: breakpointEffect.of({pos, on: !hasBreakpoint})
  })
}

const breakpointMarker = new class extends GutterMarker {
    toDOM() { return document.createTextNode("●") }
}

export const breakpointGutter = [
    breakpointState,
    gutter({
        class: "cm-breakpoint-gutter",
        markers: v => v.state.field(breakpointState),
        initialSpacer: () => breakpointMarker,
        domEventHandlers: {
            mousedown(view, line) {
                setSavedEditorView(view);
                toggleBreakpoint(view, line.from)
                return true
            }
        }
    }),
    EditorView.baseTheme({
        ".cm-breakpoint-gutter .cm-gutterElement": {
            color: "red",
            paddingLeft: "2px",
            cursor: "default"
        }
    })
]

// these are my "helper" functions because the intricacies of the wrapped codemirror library are
//  beyond me at the moment
//
let savedEditorView = null;
let breakpointListeners = {};

const setSavedEditorView = (view) => savedEditorView = view;

export const addBreakpointListener = (id, listener) => {
    breakpointListeners[id] = listener;
}

export const removeBreakpointListener = (id) => {
    delete breakpointListeners[id];
}

const notifyListeners = (breakpointData) => {
    Object.values(breakpointListeners).forEach(listener => listener(breakpointData))
}
  
let readonlyFunc = null;
export const setReadonlyFunc = (readonlyFuncArg) => readonlyFunc = readonlyFuncArg;

const isReadonly = () => {
    if (typeof(readonlyFunc) === 'function') {
        return readonlyFunc();
    }
    return false;
}