
# Solutions Workbench UI
The Solutions Workbench UI project was initially started with `Create React App`. Therefore the start, test, and build commands shown below are from the original Create React App starter documentation. They still work. 

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Install Dependencies 

Install dependencies:

Run:
```
npm install
```

## Environment variables
Create a `.env` file by copying the `.env.example` file to `.env`. If you haven't changed any of the default port settings, no changes should be required to your `.env` file.

Note that the `.env` gets compiled into the React runtime files. From a deployment perspective, this can leads to unnecessary rebuilds if a `.env` parameter value needs to change. For this reason, there is a `public/config/env-config.js` file that can be used to override any settings in the `.env` file. In docker deployments, the `config` directory can be mounted outside of the docker build, enabling configuration changes without doing a complete rebuild.


## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br>
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `npm run build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify

## Security Auditing
Run this for security auditing:

yarn audit --groups dependencies

## Using Solutions Workbench
Once you have run `npm start`, navigate to http://localhost:3000 to bring up the Solutions Workbench UI. You should be directed to the login page where you can login using the User credentials you created in the parent README file.




