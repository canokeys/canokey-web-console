import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import * as reducers from './reducers';

let middleware = [thunk];
if (process.env.NODE_ENV !== 'production') {
  middleware = [...middleware, logger];
}
const store = createStore(combineReducers(reducers), applyMiddleware(...middleware));

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
