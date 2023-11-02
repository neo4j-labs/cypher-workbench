
# Solutions Workbench UI
The React UI code for Solutions Workbench.

## Install Dependencies 

Install dependencies:

Run:
```
npm install
```

## Environment variables
Create a `.env` file by copying the `.env.example` file to `.env`. If you haven't changed any of the default port settings, no changes should be required to your `.env` file.

## Start the UI

In the project directory, you can run:

### `npm start`
```
npm start
```

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `npm test`
```
npm test
```

Launches the test runner in the interactive watch mode.<br>
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`
```
npm run build
```

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Using Solutions Workbench
Once you have run `npm start`, navigate to http://localhost:3000 to bring up the Solutions Workbench UI. You should be directed to the login page where you can login using the User credentials you created in the parent README file.

## Notes

### Environment Variable Notes
Note that the `.env` gets compiled into the React runtime files. From a deployment perspective, this can leads to unnecessary rebuilds if a `.env` parameter value needs to change. For this reason, there is a `public/config/env-config.js` file that can be used to override any settings in the `.env` file. In docker deployments, the `config` directory can be mounted outside of the docker build, enabling configuration changes without doing a complete rebuild.

### Security Auditing
Run this for security auditing:

yarn audit --groups dependencies

### Create React App
This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).


