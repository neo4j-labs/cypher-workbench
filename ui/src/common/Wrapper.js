import React, { useState } from "react";
import { Build } from "@material-ui/icons";

import MuiAlert from "@material-ui/lab/Alert";
import { Snackbar } from "@material-ui/core";
import { getAppName } from "../dynamicConfig";

const Wrapper = (props) => {
  const Alert = (props) => {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
  };

  return (
    <div
      style={{
        //height: "100vh",
        display: "flex",
        alignItems: "center",
        //justifyContent: "space-between",
        flexDirection: "column",
        minHeight: "750px",
        minWidth: "750px",
      }}
    >
      <div
        style={{
          // width: "100%",
          height: "100px",
          display: "flex",
          alignItems: "center",
          // justifyContent: "space-between",
          padding: "0px 48px",
        }}
      >
        <div
          style={{
            height: "40px",
            width: "40px",
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            border: "3px solid #2E8CC1",
            marginRight: "1em"                        
          }}
        >
          <Build style={{ color: "#2E8CC1", fontSize: 24 }} />
        </div>
        <div
          style={{
            // width: "400px",
            color: "#37474f",
            fontSize: "30px",
            fontFamily: "lato",
            fontWeight: "700"
          }}
        >
          {getAppName()}
        </div>
        {/*<div
          style={{
            width: "400px",
            fontFamily: "lato",
            fontWeight: "300",
            fontSize: "14px",
            textAlign: "end",
            marginRight: "6em"
          }}
        >
          neo4j
        </div>*/}
      </div>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          marginTop: "3em",
          //   borderTop: "1px solid #37474f",
          //   borderBottom: "1px solid #37474f",
        }}
      >
        {props.children}
      </div>
      <div
        style={{
          width: "100%",
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: "0px 48px",
          fontFamily: "lato",
          fontWeight: "300",
          fontSize: "14px",
        }}
      >
        {/*<div style={{ fontWeight: "400" }}>have questions?</div>*/}
        <div style={{ height: "6px" }}></div>
        {/*<div>
          contact{" "}
          <a style={{ cursor: "pointer", textDecoration: "underline" }}>
            solutions@neotechnology.com
          </a>
        </div>
        */}
        Powered by Neo4j Labs
      </div>
      <Snackbar
        open={props.snackbarOpen}
        autoHideDuration={6000}
        onClose={() => props.setSnackbarOpen(false)}
      >
        <Alert onClose={() => props.setSnackbarOpen(false)} severity="error">
          {props.snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Wrapper;
