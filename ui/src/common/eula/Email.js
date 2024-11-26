import React, { useState } from "react";
import { printDebug } from "../../App";
import { doRedirect } from "../../auth/history";
import auth from "../../auth/localAuth";
import MuiAlert from "@material-ui/lab/Alert";
import { Button, TextField, Snackbar } from "@material-ui/core";
import { encryptV1 } from '../encryption';
import { getDynamicConfigValue } from '../../dynamicConfig';

import Wrapper from "../Wrapper";

const Email = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const validateEmail = (email) => {
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleContinue = async () => {
    //if (email && password && validateEmail(email)) {
    if (email && password) {
      const response = await auth.createUser(email, password);
      if (!response.error) {
        const needsEula = (getDynamicConfigValue("REACT_APP_EULA") === 'eula');
        if (needsEula) {
          const acceptedEula = await auth.acceptedEula(email);
          if (acceptedEula) {
            //auth.setSession(email); // createUser will call setSession
            auth.setAcceptedEula(true);
            doRedirect("/", "Email: acceptedEula is true");
          } else {
            const payload = JSON.stringify({ ex: email, px: encryptV1(password)});
            const encryptedPayload = encryptV1(payload);
            const encoded = encodeURIComponent(encryptedPayload);
            doRedirect(`/eula/${encoded}`, "Email: acceptedEula is false");
          }
        } else {
          doRedirect("/", "Email: needsEula is false");
        }
      } else {
        // do nothing - error message displayed elsewhere
        printDebug('error occurred in handleContinue, should be handled elsewhere');
      }
    } else {
      var message = 'Please fill out all fields';
      if (!email) {
        message = "Please enter a valid email or username";
      } else if (!password) {
        message = "Password cannot be blank";
      } 
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    }
  };

  return (
    <Wrapper
      snackbarOpen={snackbarOpen}
      setSnackbarOpen={setSnackbarOpen}
      snackbarMessage={snackbarMessage}
    >
      <div
        style={{
          width: "350px",
          color: "#37474f",
          fontSize: "24px",
          fontFamily: "lato",
          fontWeight: "500",
        }}
      >
        Login
      </div>
      <div />
      <div style={{ height: "36px" }} />
        <TextField
          id='ds-workbench-email'
          name='ds-workbench-email'
          inputProps={{
            autocomplete: "off"
          }}
          label="email"
          variant="outlined"
          style={{ width: "350px", fontFamily: "lato", fontWeight: "400" }}
          onChange={(e) => setEmail(e.target.value)}
        />
      <div style={{ height: "24px" }} />
        <TextField
          id='ds-workbench-password'
          name='ds-workbench-password'
          inputProps={{
            autocomplete: "off"
          }}
          label="password"
          type='password'
          variant="outlined"
          style={{ width: "350px", fontFamily: "lato", fontWeight: "400" }}
          onKeyDown={(e) => { 
            if (e.key === "Enter") {
              e.preventDefault();
              handleContinue();  
            }            
          }}
          onChange={(e) => setPassword(e.target.value)}
        />
      <div style={{ height: "24px" }} />
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleContinue()}
        style={{
          height: "50px",
          width: "350px",
          fontFamily: "lato",
          fontWeight: "700",
        }}
      >
        Continue
      </Button>
    </Wrapper>
  );
};

export default Email;
