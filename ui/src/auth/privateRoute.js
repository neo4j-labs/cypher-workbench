import React from "react";
import { Route } from "react-router-dom";

const PrivateRoute = ({ auth, path, component: Component, ...rest }) => {
  return (
    <Route
      exact
      path={path}
      auth={auth}
      {...rest}
      render={(props) => {
        if (auth.type === "auth0") {
          if (auth.isAuthenticated()) {
            //console.log('props: ', props);
            return <Component {...props} {...rest} />;
          } else {
            return <>You are not currently authenticated</>;
          }
        } else if (auth.type === "local") {
          if (auth.isAuthenticated()) {
            return <Component {...props} {...rest} />;
          } else if (
            props.location.pathname === "/login" ||
            props.location.pathname.match("/eula/*")
          ) {
            return <>You are not currently authenticated</>;
          }
        } else {
          return <>{`The application auth method ${auth.type} is not supported`}</>;
        }
      }}
    />
  )
}
export default PrivateRoute;
