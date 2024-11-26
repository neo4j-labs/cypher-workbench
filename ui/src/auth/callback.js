import React, { Component } from "react";
import auth from "./auth0";
import { withRouter } from "react-router-dom";
import { doRedirect } from "./history";
import { getDynamicConfigValue } from '../dynamicConfig';
import { getSystemMessages } from '../persistence/graphql/GraphQLPersistence';

class Callback extends Component {
  async componentDidMount() {
    try {
        await auth.handleAuthentication();
        var systemMessages = await getSystemMessages();
        if (systemMessages.success && systemMessages.messages && systemMessages.messages.length > 0) {
          doRedirect("/messages");
        }
 
        doRedirect("/");
      } catch (err) {
        console.log(err);
        if (err && err.errorDescription) {
            alert(err.errorDescription);
        } else {
            alert('' + err);
        }
        auth.logout();
    }
  }

  render() {
    const style = {
      position: "absolute",
      display: "flex",
      justifyContent: "center",
      height: "100vh",
      width: "100vw",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "white"
    };

    return <div style={style} />;
  }
}

export default withRouter(Callback);
