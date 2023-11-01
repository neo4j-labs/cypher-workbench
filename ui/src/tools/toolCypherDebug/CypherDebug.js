import React, { Component } from 'react'

export default class CypherDebug extends Component {

    state = {
    }

    constructor (props) {
        super(props);
        props.setSureRef(this);
    }

    tabActivated = () => {
        const { setTitle, setMenus } = this.props;
        setTitle("Cypher Debugger");
        setMenus([]);
    }

    tabDeactivated = () => {
        // TODO
    }

    render() {
      return (
          <div>
            Cypher Debugger placeholder
          </div>
      )
    }

}
