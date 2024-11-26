import React, { useState } from "react";
//import auth from "../../auth/localAuth";
import { doRedirect } from "../../auth/history";
import { Button, Typography } from "@material-ui/core";
import auth from "../../auth/auth0"
import Wrapper from "../Wrapper";
import { getSystemMessages, acknowledgeMessages } from "../../persistence/graphql/GraphQLPersistence"

const SystemMessages = () => {

  var messages = localStorage.getItem('systemMessages');
  if (messages) {
    messages = JSON.parse(messages);
  }
  //console.log('SystemMessages messages: ', messages);

  const acknowledgeMessagesInternal = async () => {
    var messageKeys = messages.map(x => x.key);
    var response = await acknowledgeMessages(messageKeys);
    if (response.error) {
      localStorage.setItem('systemMessagesAcknowledgeError', `${response.error}`);
      alert(`Error acknowledging messages: ${response.error}. The system may be experiencing technical difficulties.`);
      doRedirect("/", "SystemMessages error acknowledging messages");
    } else {
      doRedirect("/", "SystemMessages acknowledge message successful");
    }
  };

  return (
    <Wrapper
      snackbarOpen={false}
      setSnackbarOpen={() => {}}
      snackbarMessage={"Oops! Please acknowledge the message(s)."}
    >
      <div
        style={{
          width: "550px",
          color: "#37474f",
          fontSize: "24px",
          fontFamily: "lato",
          fontWeight: "500",
        }}
      >
        Messages
      </div>
      <div style={{ height: "24px" }} />
      <div style={{border: '1px solid gray', height: '400px', width: '550px', overflowY: 'auto'}}>
        {
          messages.map((message, index) => {
            return (
              <div key={index}>
                <Typography>
                  {message.message}
                </Typography>
                <br/>
              </div>
            )
          })
        }
      </div>
      <div style={{ height: "12px" }} />
      <div
        style={{
          width: "550px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={() => acknowledgeMessagesInternal()}
          style={{
            height: "50px",
            width: "270px",
            fontFamily: "lato",
            fontWeight: "700",
          }}
        >
          Acknowledge
        </Button>
      </div>
    </Wrapper>
  );
};

export default SystemMessages;
